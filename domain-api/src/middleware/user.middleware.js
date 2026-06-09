const userService = require("../service/user.service")
const { NAME_OR_PASSWORD_OR_ROLE_IS_REQUIRED, NAME_IS_ALREADY_EXISTS } = require('../config/error')
const md5password = require("../utils/md5-password")

const verifyUser = async (ctx, next) => {


  const { name, password, roleId, role_id } = ctx.request.body
  const finalRoleId = roleId || role_id

  if (!name || !password || !finalRoleId) {
    return ctx.app.emit('error', NAME_OR_PASSWORD_OR_ROLE_IS_REQUIRED, ctx)
  }


  const users = await userService.findUserByName(name)
  if (users.length) {
    return ctx.app.emit('error', NAME_IS_ALREADY_EXISTS, ctx, name)
  }


  ctx.request.body.role_id = finalRoleId


  await next()
}

const handlePassword = async (ctx, next) => {

  const { password } = ctx.request.body


  ctx.request.body.password = md5password(password)


  await next()
}

module.exports = {
  verifyUser,
  handlePassword
}
