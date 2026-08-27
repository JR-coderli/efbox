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


/**
 * 软鉴权：尝试从 token 解析当前用户，token 缺失或无效都不报错（按未登录处理）。
 * 用于「无论是否登录都必须能返回数据」的接口（如 /lander/list）。
 * 仅当 token 有效时附带 ctx.user，供收藏等个性化功能使用；token 过期不会让请求失败。
 */
const verifyAuthOptional = async(ctx, next) => {
  let token = null

  const authorization = ctx.headers.authorization
  if (authorization) {
    token = authorization.replace('Bearer ', '')
  }

  if (!token && ctx.query.token) {
    token = ctx.query.token
  }

  ctx.user = null
  if (token) {
    try {
      ctx.user = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ['RS256']
      })
    } catch(error) {
      ctx.user = null
    }
  }

  await next()
}

/**
 * 数据权限加固：从数据库查当前用户的真实角色名，写入 ctx.user.role_name。
 * 放在 verifyAuth 之后使用；后续接口以 ctx.user.role_name / ctx.user.id 做数据过滤，
 * 不再信任请求体里前端自报的 role_name / user_id（可被任意伪造）。
 */
const attachRole = async(ctx, next) => {
  if (!ctx.user || !ctx.user.id) {
    return ctx.app.emit('error', UNAUTHORIZATION, ctx)
  }

  try {
    const [rows] = await userService.queryRoleNameById(ctx.user.id)
    if (!rows[0]) {
      return ctx.app.emit('error', UNAUTHORIZATION, ctx)
    }
    ctx.user.role_name = rows[0].role_name
  } catch (err) {
    console.log('[attachRole] 查询角色失败:', err)
    return ctx.app.emit('error', UNAUTHORIZATION, ctx)
  }

  await next()
}

module.exports = {
  verifyLogin,
  verifyAuth,
  verifyAuthOptional,
  attachRole
}