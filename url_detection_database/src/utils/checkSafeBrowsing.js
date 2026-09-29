const fetch = global.fetch
const logReplacementEvent = require('./replacementLog')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const TIMEOUT_MS = 10000  // 不设超时的话网络黑洞会让整轮检测卡死
const RETRIES = 1         // 失败后重试 1 次(共 2 次尝试)


async function checkSafeBrowsingOnce(urls) {
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.SAFE_BROWSING_API_KEY}`
  const body = {
    client: { clientId: "your-app", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.map(url => ({ url }))
    }
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  return await res.json()
}


// 批量检测 URL 安全性。
// 网络/超时失败重试 1 次(间隔 3s); 两次都失败返回 {} —— 调用方按"无匹配 = 安全"处理
// (宁可漏报, 也不因 API 抖动误触发危险替换)。
async function checkSafeBrowsing(urls) {
  for (let attempt = 1; attempt <= RETRIES + 1; attempt++) {
    try {
      return await checkSafeBrowsingOnce(urls)
    } catch (err) {
      const reason = err?.cause?.code || err?.name || err.message
      if (attempt <= RETRIES) {
        console.log(`⚠️ Safe Browsing API 调用失败(${reason}), 3s 后重试一次`)
        await sleep(3000)
      } else {
        console.error(`Safe Browsing API 重试仍失败(${reason}), 本轮按"未发现威胁"处理`)
        // 两次都失败才入替换日志(成功不记, 避免每轮刷屏): 本轮危险检测实际未生效, 留痕备查
        const zh = { ETIMEDOUT: '连接超时', ENOTFOUND: '域名解析失败', ECONNREFUSED: '连接被拒绝', ECONNRESET: '连接被重置' }[reason] || reason
        logReplacementEvent('(system)', 'safe_browsing', `谷歌安全检测接口调用失败（${zh}），重试后仍失败，本轮按"未发现威胁"处理（危险检测未生效）`)
        return {}
      }
    }
  }
}

module.exports = checkSafeBrowsing
