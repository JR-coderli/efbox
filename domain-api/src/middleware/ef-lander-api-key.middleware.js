/**
 * ef-lander 截图回调接口的 API Key 认证中间件
 * 与公开接口的 PUBLIC_API_KEY（api-key.middleware.js）相互独立，密钥不同。
 */
const { EF_LANDER_API_KEY } = require('../config/secret')

const verifyEfLanderApiKey = async (ctx, next) => {
  const apiKey = ctx.headers['api-key'] || ctx.headers['x-api-key']

  if (!apiKey) {
    ctx.status = 401
    ctx.body = {
      code: 401,
      message: '缺少 api-key 请求头'
    }
    return
  }

  const validKeys = Array.isArray(EF_LANDER_API_KEY) ? EF_LANDER_API_KEY : [EF_LANDER_API_KEY]

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
  verifyEfLanderApiKey
}
