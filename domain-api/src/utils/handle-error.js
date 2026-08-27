const { NAME_OR_PASSWORD_IS_REQUIRED, NAME_OR_PASSWORD_OR_ROLE_IS_REQUIRED, NAME_IS_ALREADY_EXISTS, NAME_IS_NOT_EXISTS, PASSWORD_IS_INCORRECT, UNAUTHORIZATION, AUTHORIZATION_IS_INCORRECT, OPERATION_IS_NOT_ALLOWED, PICTURE_IS_NOT_EXISTS, PICTURE_URLS_IS_NOT_EXISTS, ROOM_PICTURE_IS_NOT_EXISTS } = require('../config/error')

// 挂到 Koa 实例上（ctx.app.emit 触发的是它）。必须在 app.callback() 之前调用 attach，
// 否则 Koa 会注册默认 onerror（对字符串错误码直接抛 TypeError: non-error thrown）。
// 注意不能在模块加载时 require('../app') 自行挂载：app/index.js 顶层已执行 createServer，时机太晚。
function attachErrorHandler(koaApp) {
  koaApp.on('error', (error, ctx, extra) => {
    let code = 0
    let message = ''

    switch(error) {
      case NAME_OR_PASSWORD_IS_REQUIRED:
        code = -1001
        message = '用户名或密码不能为空~'
        break
      case NAME_IS_ALREADY_EXISTS:
        code = -1002
        message = `用户名${extra}已经被注册~`
        break
      case NAME_IS_NOT_EXISTS:
        code = -1003
        message = `用户名不存在, 请检查用户名~`
        break
      case PASSWORD_IS_INCORRECT:
        code = -1004
        message = `${extra}密码错误, 请检查密码~`
        break
      case UNAUTHORIZATION:
        code = -1005
        message = '没有携带token~'
        break
      case AUTHORIZATION_IS_INCORRECT:
        code = -1006
        message = '无效token或者token已经过期~'
        break
      case NAME_OR_PASSWORD_OR_ROLE_IS_REQUIRED:
        code = -1007
        message = '用户名、密码和角色都不能为空~'
        break
      case OPERATION_IS_NOT_ALLOWED:
        code = -1008
        message = '没有操作该资源的权限~'
        break
      case PICTURE_IS_NOT_EXISTS:
        code = -2001
        message = '该图片资源不存在~'
        break
      case PICTURE_URLS_IS_NOT_EXISTS:
        code = -2002
        message = `房间图片列表资源不存在~`
        break
      case ROOM_PICTURE_IS_NOT_EXISTS:
        code = -2003
        message = '房间图片资源不存在~'
        break
    }


    if (ctx) {
      ctx.body = { code, message }
    }
  })
}

module.exports = { attachErrorHandler }
