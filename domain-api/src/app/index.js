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
    path.join(__dirname, '..', '..', 'uploads', 'lander_screenshots')
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



registerRouters(app)


const server = http.createServer(app.callback())
initWebSocket(server)


module.exports = server