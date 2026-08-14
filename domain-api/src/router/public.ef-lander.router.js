/**
 * 公开 ef-lander 截图接口路由
 * 供对方系统（ef-tracker）服务器调用：新建 lander 后传 { id, url }，我方截图并回写 preview_url。
 * 需要 api-key 验证（专用 EF_LANDER_API_KEY，与 /public/lander 的 PUBLIC_API_KEY 不同）。
 */
const KoaRouter = require('@koa/router')
const { verifyEfLanderApiKey } = require('../middleware/ef-lander-api-key.middleware')
const { publicScreenshot } = require('../controller/ef-lander.controller')

const publicEfLanderRouter = new KoaRouter({ prefix: '/public/ef-lander' })

// 触发截图（同步等待结果，puppeteer 较慢，对方调用方需给足超时，建议 ≥60s）
publicEfLanderRouter.post('/screenshot', verifyEfLanderApiKey, publicScreenshot)

module.exports = publicEfLanderRouter
