const fetch = global.fetch; // Node 18+ 内置 fetch
const delay = require('./delay'); // 延迟函数
const logReplacementEvent = require('./replacementLog'); // 过程日志(记录 domain-verify 调用)

// 从 URL 提取 hostname 作为日志归属域名(提取失败就用原串)
function extractHost(url) {
  try { return new URL(url).hostname } catch { return String(url) }
}

// 网络错误码转用户能看懂的描述(日志展示用)
function errorTextCN(code) {
  const map = {
    ETIMEDOUT: '连接超时',
    ETIMEOUT: '连接超时',
    ENOTFOUND: '域名解析失败',
    ECONNREFUSED: '连接被拒绝',
    ECONNRESET: '连接被重置',
    EAI_AGAIN: '域名解析临时失败',
    CERT_HAS_EXPIRED: '证书已过期'
  }
  return map[code] || String(code || '未知错误')
}

// 本机单次检测配置
const LOCAL_TIMEOUT_MS = 10000 // 显式超时: undici 默认 headers 超时长达 5 分钟, 网络黑洞会拖死整轮检测
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * 单次可访问性检测
 * - GET + 浏览器 UA: 不用 HEAD(很多服务器/WAF 对 HEAD 返回 405 或丢弃);
 *   不带 UA 会被 Cloudflare 等 bot 规则拦截, 造成"浏览器能开、脚本说挂"的假不可访问
 * - 状态码分级: 拿到任何 <500 的响应都算域名活着(403/405/429 = WAF 拦截/方法限制,
 *   服务器本身在线); 5xx 或网络层错误(DNS/连接/超时)才算不可访问
 * - 失败时打印具体原因(HTTP 状态码 / ETIMEDOUT / ENOTFOUND...), 便于排查
 */
async function checkAccessibleOnce(url) {
  const startedAt = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS)
    });
    // 响应头拿到了就够判断存活, 不需要读 body
    try { await res.body?.cancel() } catch (e) { /* 忽略取消 body 的错误 */ }

    if (res.status < 500) {
      console.log(`可访问(HTTP ${res.status}): ${res.url} (${Date.now() - startedAt}ms)`)
      return true
    }
    console.log(`不可访问(HTTP ${res.status} 服务端错误): ${url}`)
    return false
  } catch (err) {
    // err.cause.code 是底层网络错误码(ETIMEDOUT/ENOTFOUND/ECONNREFUSED...)
    console.log(`不可访问(${err?.cause?.code || err?.name || err?.message}): ${url}`)
    return false
  }
}


/**
 * 调用二次核验服务 domain-verify(部署在不同网络位置的服务器上)。
 * 本机多次检测全部失败后, 用另一条网络路径复核:
 *   复核可访问   → 判"疑似本机网络问题", 不告警不替换
 *   复核也不可访问 → 两条路径都到不了, 判真不可访问
 *   复核服务不可达 → 返回 null, 调用方按本机结果处理(与未接入时行为一致)
 * 配置(.env, 惰性读取, 未配置 VERIFY_API_URL 时完全不启用复核):
 *   VERIFY_API_URL     如 http://detlp.dazzlingplay.com 或 http://1.2.3.4:8100
 *   VERIFY_API_KEY     对应 domain-verify .env 里的 API_KEYS
 *   VERIFY_TIMEOUT_MS  复核整体超时, 默认 30000(服务端最坏情况约 23s)
 * @param {string} url
 * @returns {Promise<boolean|null>}
 */
async function verifyRemoteAccessible(url, round) {
  const verifyUrl = (process.env.VERIFY_API_URL || '').replace(/\/+$/, '')
  if (!verifyUrl) return null

  const verifyKey = process.env.VERIFY_API_KEY || ''
  const timeoutMs = Number(process.env.VERIFY_TIMEOUT_MS) || 30000

  // 最多尝试 2 次(间隔 5s), 覆盖核验服务瞬时重启/网络抖动; 两次都失败返回 null 按本机结果判定
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${verifyUrl}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(verifyKey ? { 'x-api-key': verifyKey } : {})
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(timeoutMs)
      })

      const data = await res.json()
      if (data?.code !== 0 || !data?.data) {
        console.log(`⚠️ 二次核验服务返回异常: code=${data?.code} message=${data?.message}, 按本机检测结果判定`)
        logReplacementEvent(extractHost(url), 'verify_call', `异地核验服务返回异常，已按本机检测结果判定`)
        return null
      }

      const d = data.data
      console.log(`二次核验(异地视角): ${url} -> accessible=${d.accessible} ` +
        `(HTTP ${d.detail?.httpStatus ?? '-'}${d.detail?.error ? ' err=' + d.detail.error : ''}, ${d.detail?.elapsedMs ?? '?'}ms)`)
      // 中文摘要 + 接口原始返回一并入日志, 可据此确认"真的调用了该接口"及完整响应内容
      logReplacementEvent(extractHost(url), 'verify_call', (d.accessible
        ? `异地核验结果：可以访问（HTTP ${d.detail?.httpStatus ?? '-'}，耗时 ${d.detail?.elapsedMs ?? '?'} 毫秒）`
        : `异地核验结果：也不可访问（${errorTextCN(d.detail?.error)}），确认域名真的无法访问`)
        + `｜接口原始返回：${JSON.stringify(d)}`, round)
      return d.accessible === true
    } catch (err) {
      const reason = err?.cause?.code || err.message
      if (attempt < 2) {
        console.log(`⚠️ 二次核验服务调用失败(${reason}), 5s 后重试一次`)
        await delay(5000)
      } else {
        console.log(`⚠️ 二次核验重试仍失败(${reason}), 按本机检测结果判定`)
        logReplacementEvent(extractHost(url), 'verify_call', `异地核验服务调用失败（${errorTextCN(reason)}），已按本机检测结果判定`)
      }
    }
  }
  return null
}


/**
 * 可访问性检测(带重试 + 异地复核)
 * 判定链: 本机尝试(默认 3 次, 间隔 10s)全部失败 → 调二次核验服务(最多再测 2 次, 换网络路径):
 *   复核通过 → 视为可访问(疑似本机网络问题, 不触发告警/替换)
 *   复核也失败 → 5 次全挂、两条路径都不通, 才判不可访问
 * 未配置 VERIFY_API_URL 时行为与旧版一致(仅本机检测)。
 */
async function checkAccessible(url, retries = 1, delayMs = 10000, round) {
  let attempt = 0;
  while (attempt <= retries) {
    const ok = await checkAccessibleOnce(url);
    if (ok) return true;

    if (attempt < retries) {
      await delay(delayMs);
    }
    attempt++;
  }

  if (process.env.VERIFY_API_URL) {
    const verified = await verifyRemoteAccessible(url, round);
    if (verified === true) {
      console.log(`⚠️ 本机 ${retries + 1} 次检测均失败, 但异地核验可访问, 判定: 疑似本机网络问题, ${url} 视为可访问`)
      return true
    }
  } else {
    // 未配置核验服务也要留痕, 让"为什么没有异地复核"在日志里有答案
    logReplacementEvent(extractHost(url), 'verify_call', '未配置异地核验服务（VERIFY_API_URL 为空），按本机检测结果判定')
  }

  return false;
}

module.exports = checkAccessible
