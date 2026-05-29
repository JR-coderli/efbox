/**
 * WebSocket 服务
 * 用于向前端推送截图完成等实时事件
 */
const { Server } = require('socket.io')

let io = null

function getWsConfig() {
  const isProd = process.env.NODE_ENV === 'production'

  const path = isProd
    ? process.env.PROD_WS_PATH
    : process.env.DEV_WS_PATH

  const origin = isProd
    ? process.env.PROD_CORS_ORIGIN
    : process.env.DEV_CORS_ORIGIN

  return {
    path: path || '/socket.io',
    origin: origin || '*'
  }
}

/**
 * 初始化 WebSocket 服务
 * @param {http.Server} server
 */
function initWebSocket(server) {
  const { path, origin } = getWsConfig()

  io = new Server(server, {
    path,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log('[WebSocket] 客户端连接')
    console.log('  id:', socket.id)
    console.log('  origin:', socket.handshake.headers.origin)
    console.log('  path:', path)

    socket.on('disconnect', () => {
      console.log('[WebSocket] 客户端断开:', socket.id)
    })
  })

  console.log('[WebSocket] 服务已启动')
  console.log('  env:', process.env.NODE_ENV)
  console.log('  ws path:', path)
  console.log('  cors origin:', origin)
}

/**
 * 获取 IO 实例
 */
function getIO() {
  return io
}

module.exports = {
  initWebSocket,
  getIO
}
