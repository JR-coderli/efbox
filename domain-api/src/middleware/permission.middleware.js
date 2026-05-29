const { OPERATION_IS_NOT_ALLOWED } = require('../config/error')
const permissionService = require("../service/permission.service")


const verifyPermission = async (ctx, next) => {

  const { id } = ctx.user



  const keyName = Object.keys(ctx.params)[0] // 获取到 "momentId"
  const resourceId = ctx.params[keyName] // 获取到 4
  const resourceName = keyName.replace('Id', '') // 将'momentId' 变成 'monent'


  let idType = undefined
  if (resourceName === 'product') {
    idType = 'cms_user_id'
  }


  const isPermission = await permissionService.checkResource(resourceName, resourceId, id, idType)
  if (!isPermission) {
    return ctx.app.emit('error', OPERATION_IS_NOT_ALLOWED, ctx)
  }


  await next()
}


module.exports = {

  verifyPermission
}