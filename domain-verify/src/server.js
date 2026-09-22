/**
 * domain-verify 服务入口
 *
 * 只做两件事:
 * 1. POST /check  —— 检测传入域名的可访问性 + 安全性, 返回结果(含失败原因明细)
 * 2. GET  /health —— 存活探针
 *
 * 供 url_detection_database 等主检测方在"本地重试仍失败"时调用,
 * 用本机(不同网络位置)的视角做二次核验, 降低单点网络误判。
 * 不做通知、不做替换、不落库 —— 纯无状态检测服务。
 */
require('dotenv').config()

const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const { checkDomain } = require('./checker')

const app = new Koa()
const router = new Router()

const PORT = Number(process.env.PORT) || 8100
const API_KEYS = (process.env.API_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean)

const CHECK_CONFIG = {
  timeoutMs: Number(process.env.CHECK_TIMEOUT_MS) || 10000,
  retries: Number(process.env.RETRIES ?? 1),
  retryDelayMs: Number(process.env.RETRY_DELAY_MS) || 3000,
  safeBrowsingKey: process.env.SAFE_BROWSING_API_KEY || ''
}

app.use(bodyParser())

// 可选鉴权: .env 配置了 API_KEYS 就启用, 未配置则开放(仅限有防火墙/内网保护时)
// /ping 和 /health 是状态探针, 免鉴权(供外部拨测/监控随时调用, 不泄露敏感信息)
app.use(async (ctx, next) => {
  if (API_KEYS.length > 0 && !['/ping', '/health'].includes(ctx.path)) {
    const key = ctx.get('x-api-key')
    if (!API_KEYS.includes(key)) {
      ctx.status = 401
      ctx.body = { code: 401, message: '无效的 x-api-key', data: null }
      return
    }
  }
  await next()
})

/**
 * POST /check
 * body: { "url": "pro.xxx.com" 或 "https://pro.xxx.com" }
 *
 * 返回 data.accessible   域名是否可访问(拿到 <500 的 HTTP 响应即算活着)
 *      data.isDanger     Safe Browsing 是否标记危险
 *      data.detail       失败原因明细(HTTP 状态码 / 网络错误码 / 尝试次数 / 耗时 / SB 状态)
 */
router.post('/check', async (ctx) => {
  const { url } = ctx.request.body || {}

  if (!url || !String(url).trim()) {
    ctx.body = { code: 400, message: 'url 不能为空', data: null }
    return
  }

  try {
    const result = await checkDomain(url, CHECK_CONFIG)
    console.log(`[check] ${result.url} -> accessible=${result.accessible} ` +
      `(HTTP ${result.detail.httpStatus ?? '-'}${result.detail.error ? ' err=' + result.detail.error : ''}` +
      `, ${result.detail.attempts}次/${result.detail.elapsedMs}ms, SB=${result.detail.safeBrowsing})`)
    ctx.body = { code: 0, message: '检测完成', data: result }
  } catch (error) {
    console.error('[check] 检测失败:', error.message)
    ctx.body = { code: 500, message: '检测失败: ' + error.message, data: null }
  }
})

/**
 * GET /ping
 * 最简存活探针: 返回纯文本 ok(不是 JSON, 不带引号)。
 * 拿到 ok = 服务正常运行; 无响应/超时 = 服务暂停。
 * 免鉴权, 供外部拨测/监控(UptimeRobot、宝塔监控、自写脚本等)直接调用:
 *   curl http://<服务器>:8100/ping   →   ok
 */
router.get('/ping', async (ctx) => {
  ctx.type = 'text/plain; charset=utf-8'
  ctx.body = 'ok'
})

// 存活探针(带配置摘要, 部署后验证配置是否生效: curl http://127.0.0.1:8100/health)
router.get('/health', async (ctx) => {
  ctx.body = {
    code: 0,
    message: 'ok',
    data: {
      uptime: Math.floor(process.uptime()),
      node: process.version,
      safeBrowsingConfigured: Boolean(CHECK_CONFIG.safeBrowsingKey),
      authEnabled: API_KEYS.length > 0
    }
  }
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(PORT, () => {
  console.log(`[domain-verify] 服务已启动: http://0.0.0.0:${PORT}`)
  console.log(`[domain-verify] 超时=${CHECK_CONFIG.timeoutMs}ms 重试=${CHECK_CONFIG.retries}次 ` +
    `SafeBrowsing=${CHECK_CONFIG.safeBrowsingKey ? '已配置' : '未配置(安全检测将返回 disabled)'} ` +
    `鉴权=${API_KEYS.length > 0 ? '开启' : '关闭'}`)
})
