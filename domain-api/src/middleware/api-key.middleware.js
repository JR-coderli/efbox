/**
 * API Key 认证中间件
 * 用于公开接口的验证，不需要登录 token
 */
const { PUBLIC_API_KEY } = require('../config/secret')

const verifyApiKey = async (ctx, next) => {

  const apiKey = ctx.headers['api-key'] || ctx.headers['x-api-key']

  if (!apiKey) {
    ctx.status = 401
    ctx.body = {
      code: 401,
      message: '缺少 api-key 请求头'
    }
    return
  }


  const validKeys = Array.isArray(PUBLIC_API_KEY) ? PUBLIC_API_KEY : [PUBLIC_API_KEY]

  if (!validKeys.includes(apiKey)) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      message: 'api-key 无效'
    }
    return
  }


  await next()
}

module.exports = {
  verifyApiKey
}
