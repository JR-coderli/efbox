const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const handleCors = require('../utils/handle-cors')
const registerRouters = require('../router')
const serve = require('koa-static')
const mount = require('koa-mount')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { initWebSocket } = require('../services/websocket.service')


const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, '..', '..', 'output'),
    path.join(__dirname, '..', '..', 'uploads'),
    path.join(__dirname, '..', '..', 'uploads', 'cms_user_avatar'),
    path.join(__dirname, '..', '..', 'crawler_output'),
    path.join(__dirname, '..', '..', 'uploads', 'lander_screenshots'),
    path.join(__dirname, '..', '..', 'uploads', 'lp')
  ]

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`[App] 创建目录: ${dir}`)
    }
  })
}


ensureDirectories()


const app = new Koa()

// 错误监听必须在 app.callback()（即下方 createServer）之前挂上：
// Koa 的 callback() 发现没有 error 监听时会注册默认 onerror（对字符串错误直接抛 TypeError）。
// 因此在创建 server 之前先 require 错误处理器，保证业务 emit('error', 错误码字符串) 由它接管。
require('../utils/handle-error').attachErrorHandler(app)

// 慢请求耗时日志(2026-11-24 登录卡顿排查): 记录每个请求的耗时, >1s 打 WARN。
// 目的=把"登录偶发卡顿"做实成证据: 复现时看日志就知道是哪个请求慢、慢几秒、发生在何时,
// 从而区分三类根因——①MySQL 等连接/慢查询(配合 SHOW FULL PROCESSLIST) ②Node 进程被
// 定时任务(截图 puppeteer/域名检测 crawler)阻塞 ③网络层。观测本身零行为影响。
app.use(async (ctx, next) => {
  const start = Date.now()
  try {
    await next()
  } finally {
    const dur = Date.now() - start
    if (dur > 1000) {
      console.warn(`[slow-req] ${dur}ms ${ctx.method} ${ctx.url} -> ${ctx.status}`)
    }
  }
})

// LP 公开域名守卫:zorfell.com 只放行 /lp/ 前缀,其余一律 404(必须挂在最前,
// 连 CORS 头都不给被拦截的请求返回),后台管理域名不受任何影响
app.use(require('../middleware/lp-host-guard.middleware'))

app.use(handleCors)
app.use(bodyParser())


const staticMiddleware = serve(path.join(__dirname, '..', '..', 'output'))

const mountedMiddleware = mount('/output', staticMiddleware)

app.use(mountedMiddleware)


const avatarMiddleware = serve(path.join(__dirname, '..', '..', 'uploads', 'cms_user_avatar'))
const mountedAvatarMiddleware = mount('/cms_users/avatar', avatarMiddleware)
app.use(mountedAvatarMiddleware)


const uploadsMiddleware = serve(path.join(__dirname, '..', '..', 'uploads'))
const mountedUploadsMiddleware = mount('/uploads', uploadsMiddleware)
app.use(mountedUploadsMiddleware)


const crawlerMiddleware = serve(path.join(__dirname, '..', '..', 'crawler_output'))
const mountedCrawlerMiddleware = mount('/crawler/preview', crawlerMiddleware)
app.use(mountedCrawlerMiddleware)


// LP 产品媒体(公开,LP 页面直接 <img>/<video> 引用;zorfell.com 域名下由守卫放行 /lp/ 前缀)
const lpUploadsMiddleware = serve(path.join(__dirname, '..', '..', 'uploads', 'lp'))
const mountedLpUploadsMiddleware = mount('/lp/uploads', lpUploadsMiddleware)
app.use(mountedLpUploadsMiddleware)



registerRouters(app)


const server = http.createServer(app.callback())
initWebSocket(server)


module.exports = server