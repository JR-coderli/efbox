const cors = require('@koa/cors');

const handleCros = cors({
  origin: '*', // 允许所有域名访问，也可以指定具体域名，例如：'http://example.com'
  credentials: true, // 允许携带 Cookie
  exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'], // 允许暴露的自定义响应头
  allowMethods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'], // 允许的 HTTP 方法
  allowHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
  maxAge: 5, // 预检请求的有效期（单位：秒）
})

module.exports = handleCros