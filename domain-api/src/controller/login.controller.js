const jwt = require('jsonwebtoken')
const { PRIVATE_KEY } = require('../config/secret')
const operationLogService = require('../service/operation-log.service')

class LoginController {
  sign(ctx, next) {

    const { id, name, role_id } = ctx.user


    const token = jwt.sign({ id, name }, PRIVATE_KEY, {
      expiresIn: 3 * 24 * 60 * 60,
      algorithm: 'RS256'
    })


    operationLogService.log(id, name, 'system', 'login', '用户登录')


    // role_id 一并返回：前端拿到后可立即并行请求菜单，不必再等用户信息接口
    ctx.body = { code: 0, data: { token, id, name, roleId: role_id } }

  }

  test(ctx, next) {
    ctx.body = '验证管理员身份通过~'
  }
}

module.exports = new LoginController()