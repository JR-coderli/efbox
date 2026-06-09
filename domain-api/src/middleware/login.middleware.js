const jwt = require('jsonwebtoken')
const { NAME_OR_PASSWORD_IS_REQUIRED, NAME_IS_NOT_EXISTS, PASSWORD_IS_INCORRECT, UNAUTHORIZATION, AUTHORIZATION_IS_INCORRECT } = require('../config/error')
const { PUBLIC_KEY } = require('../config/secret')
const userService = require('../service/user.service')
const md5password = require('../utils/md5-password')



const verifyLogin = async (ctx, next) => {
  const { name, password } = ctx.request.body


  if (!name || !password) {
    return ctx.app.emit('error', NAME_OR_PASSWORD_IS_REQUIRED, ctx)
  }


  const users = await userService.findUserByName(name) 
  const user = users[0] 
  if (!user) {
    return ctx.app.emit('error', NAME_IS_NOT_EXISTS, ctx)
  }


  if (user.password !== md5password(password)) {
    return ctx.app.emit('error', PASSWORD_IS_INCORRECT, ctx, user.name)
  }


  ctx.user = user


  await next()
}


const verifyAuth = async(ctx, next) => {

  let token = null


  const authorization = ctx.headers.authorization
  if (authorization) {
    token = authorization.replace('Bearer ', '')
  }


  if (!token && ctx.query.token) {
    token = ctx.query.token
  }

  if (!token) {
    return ctx.app.emit('error', UNAUTHORIZATION, ctx)
  }


  try {

    const result = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ['RS256']
    })


    ctx.user = result


    await next()
  } catch(error) {
    return ctx.app.emit('error', AUTHORIZATION_IS_INCORRECT, ctx)
  }
}

module.exports = {
  verifyLogin,
  verifyAuth
}