const fetch = global.fetch
const logReplacementEvent = require('./replacementLog')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const TIMEOUT_MS = 10000   // 不设超时的话网络黑洞会让整轮检测卡死
const CALLS_PER_ROUND = 3  // 每轮真实调用 3 次: 谷歌 API 单次可能漏报, 任一次报告危险即判危险
const CALL_INTERVAL_MS = 5000 // 两次调用的间隔, 避免过于频繁


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


// 批量检测 URL 安全性(每轮多次调用)。
// 每轮真实调用 3 次(间隔 5s), 任一次返回危险匹配即判定危险并提前结束(后续调用不改变结论);
// 成功调用的 matches 合并返回, 调用方仍按"无匹配 = 安全"处理(index.js 逻辑不变)。
// 单次调用网络失败不影响其余调用; 3 次全部失败返回 {} ——
// (宁可漏报, 也不因 API 抖动误触发危险替换)。
async function checkSafeBrowsing(urls) {
  const allMatches = []
  let okCalls = 0
  let lastReason = ''

  for (let i = 1; i <= CALLS_PER_ROUND; i++) {
    try {
      const data = await checkSafeBrowsingOnce(urls)
      okCalls++
      const matches = data?.matches
      if (Array.isArray(matches) && matches.length > 0) {
        allMatches.push(...matches)
        console.log(`⚠️ Safe Browsing 第 ${i}/${CALLS_PER_ROUND} 次调用报告危险(${matches.length} 条匹配), 本轮判定为危险, 提前结束后续调用`)
        break // OR 逻辑: 已有危险结论, 再调也不改变判定, 省配额省时间
      }
    } catch (err) {
      lastReason = err?.cause?.code || err?.name || err.message
      console.log(`⚠️ Safe Browsing 第 ${i}/${CALLS_PER_ROUND} 次调用失败(${lastReason})`)
    }
    if (i < CALLS_PER_ROUND) await sleep(CALL_INTERVAL_MS)
  }

  // 至少一次调用成功: 按(合并后的)匹配结果判定
  if (okCalls > 0) {
    return allMatches.length > 0 ? { matches: allMatches } : {}
  }

  // 3 次全部失败才入替换日志(成功不记, 避免每轮刷屏): 本轮危险检测实际未生效, 留痕备查
  console.error(`Safe Browsing API 连续 ${CALLS_PER_ROUND} 次调用均失败, 本轮按"未发现威胁"处理`)
  const zh = { ETIMEDOUT: '连接超时', ENOTFOUND: '域名解析失败', ECONNREFUSED: '连接被拒绝', ECONNRESET: '连接被重置' }[lastReason] || lastReason
  logReplacementEvent('(system)', 'safe_browsing', `谷歌安全检测接口连续 ${CALLS_PER_ROUND} 次调用失败（${zh}），本轮按"未发现威胁"处理（危险检测未生效）`)
  return {}
}

module.exports = checkSafeBrowsing
