/**
 * 域名可访问性 + 安全性检测器
 *
 * 设计要点(吸取 url_detection_database 踩过的坑):
 * 1. GET + 浏览器 UA —— 不用 HEAD: 很多服务器/WAF 对 HEAD 返回 405 或直接丢弃;
 *    不带 UA 的请求会被 Cloudflare 等 bot 规则拦截 → 浏览器能开、脚本 403 的"假不可访问"
 * 2. 显式超时 —— 不用默认值: undici 默认 headers 超时长达 5 分钟, 网络黑洞时单次检测就拖死一轮
 * 3. 状态码分级 —— 拿到任何 < 500 的响应都算"域名活着"(403/405/429 = WAF 拦截/方法限制,
 *    服务器本身在线); 5xx = 服务端异常才算不可访问。网络层错误(DNS/连接/超时) = 不可访问
 * 4. ipv4first —— 规避服务器 IPv6 路由不通导致的挂死(浏览器有 Happy Eyeballs 自动回退,
 *    Node 18 不会), 部署机 IPv6 正常时此设置无副作用
 * 5. 所有失败原因都带错误码返回(HTTP 状态码 / ETIMEDOUT / ENOTFOUND / ECONNREFUSED...),
 *    调用方可以直接区分"真挂了"和"被 WAF 拦了"和"网络抖动"
 */
require('dns').setDefaultResultOrder('ipv4first')

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 规范化输入: 支持 "pro.xxx.com" / "https://pro.xxx.com" / "https://pro.xxx.com/path"
 * @param {string} input
 * @returns {string} 带 https:// 协议的完整 URL
 */
function normalizeUrl(input) {
  let url = String(input || '').trim()
  if (!url) return url
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }
  return url
}

/**
 * 单次可访问性检测
 * @returns {Promise<{ok: boolean, status?: number, finalUrl?: string, error?: string, elapsedMs: number}>}
 */
async function checkOnce(url, timeoutMs) {
  const startedAt = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(timeoutMs)
    })
    // 响应头拿到了就够判断存活, 不需要读 body
    try { await res.body?.cancel() } catch (e) { /* 忽略取消 body 的错误 */ }
    return { ok: true, status: res.status, finalUrl: res.url, elapsedMs: Date.now() - startedAt }
  } catch (err) {
    // err.cause.code 是底层网络错误码(ETIMEDOUT/ENOTFOUND/ECONNREFUSED/EAI_AGAIN...)
    const error = err?.cause?.code || err?.cause?.message || err?.name || err?.message || 'unknown'
    return { ok: false, error, elapsedMs: Date.now() - startedAt }
  }
}

/**
 * 可访问性检测(带重试)
 * 拿到 < 500 的响应立即返回成功; 网络错误/5xx 重试(5xx 常是瞬时过载, 值得再试一次)
 * @returns {Promise<{accessible: boolean, httpStatus: number|null, error: string|null, finalUrl: string|null, attempts: number, elapsedMs: number}>}
 */
async function checkAccessible(url, { timeoutMs = 10000, retries = 1, retryDelayMs = 3000 } = {}) {
  const totalAttempts = retries + 1
  let last = null

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    last = await checkOnce(url, timeoutMs)
    last.attempt = attempt

    if (last.ok && last.status < 500) {
      return {
        accessible: true,
        httpStatus: last.status,
        error: null,
        finalUrl: last.finalUrl,
        attempts: attempt,
        elapsedMs: last.elapsedMs
      }
    }

    if (attempt < totalAttempts) {
      await sleep(retryDelayMs)
    }
  }

  return {
    accessible: false,
    httpStatus: last.ok ? last.status : null,
    // 失败原因: HTTP 5xx 或网络层错误码
    error: last.ok ? `HTTP ${last.status}` : last.error,
    finalUrl: last.finalUrl || null,
    attempts: totalAttempts,
    elapsedMs: last.elapsedMs
  }
}

/**
 * Google Safe Browsing 安全检测
 * @returns {Promise<{isDanger: boolean, threatTypes: string[], status: 'ok'|'unavailable'|'disabled', error?: string}>}
 *   status=disabled: 未配置 API Key(只测可访问性)
 *   status=unavailable: Google API 不可达/超时(此时 isDanger=false 不可信, 调用方按需处理)
 */
async function checkSafeBrowsing(url, apiKey, { timeoutMs = 5000 } = {}) {
  if (!apiKey) {
    return { isDanger: false, threatTypes: [], status: 'disabled' }
  }

  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'domain-verify', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }]
          }
        }),
        signal: AbortSignal.timeout(timeoutMs)
      }
    )

    if (!res.ok) {
      return { isDanger: false, threatTypes: [], status: 'unavailable', error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    const matches = data.matches || []
    return {
      isDanger: matches.length > 0,
      threatTypes: matches.map((m) => m.threatType),
      status: 'ok'
    }
  } catch (err) {
    return {
      isDanger: false,
      threatTypes: [],
      status: 'unavailable',
      error: err?.cause?.code || err?.message || 'unknown'
    }
  }
}

/**
 * 检测入口: 可访问性 + 安全性并行检测
 * @param {string} inputUrl 域名或完整 URL
 * @param {object} config { timeoutMs, retries, retryDelayMs, safeBrowsingKey }
 */
async function checkDomain(inputUrl, config = {}) {
  const url = normalizeUrl(inputUrl)

  const [access, safe] = await Promise.all([
    checkAccessible(url, {
      timeoutMs: config.timeoutMs ?? 10000,
      retries: config.retries ?? 1,
      retryDelayMs: config.retryDelayMs ?? 3000
    }),
    checkSafeBrowsing(url, config.safeBrowsingKey)
  ])

  return {
    url,
    accessible: access.accessible,
    isDanger: safe.isDanger,
    isSafe: !safe.isDanger,
    threatTypes: safe.threatTypes,
    detail: {
      httpStatus: access.httpStatus,
      error: access.error,
      finalUrl: access.finalUrl,
      attempts: access.attempts,
      elapsedMs: access.elapsedMs,
      safeBrowsing: safe.status,
      safeBrowsingError: safe.error || null
    },
    checkedAt: new Date().toISOString()
  }
}

module.exports = { checkDomain, normalizeUrl }
