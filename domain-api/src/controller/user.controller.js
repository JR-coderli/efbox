const fileService = require('../service/file.service')
const userService = require('../service/user.service')
const { PICTURE_IS_NOT_EXISTS } = require('../config/error')
const fs = require('fs')
const md5password = require('../utils/md5-password')
const operationLogService = require('../service/operation-log.service')

class UserController {

  async create(ctx, next) {

    const user = ctx.request.body


    const result = await userService.create(user)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'user',
      'create',
      `新增用户: ${user.name}`,
      null,
      { name: user.name, roleId: user.role_id }
    )


    ctx.body = {
      code: 0,
      message: '创建用户成功~',
      data: {
        insertId: result.insertId
      }
    }
  }


  async remove(ctx, next) {

    const { userId } = ctx.params


    const userInfo = await userService.queryById(userId)


    await userService.remove(userId)


    if (userInfo.length > 0) {
      operationLogService.log(
        ctx.user.id,
        ctx.user.name,
        'user',
        'delete',
        `删除用户: ${userInfo[0].name}`,
        { name: userInfo[0].name },
        null
      )
    }


    ctx.body = {
      code: 0,
      message: '删除用户成功'
    }
  }


  async update(ctx, next) {

    const { userId } = ctx.params

    let updateData = ctx.request.body


    const oldUserInfo = await userService.queryById(userId)
    const oldValue = oldUserInfo.length > 0 ? {
      name: oldUserInfo[0].name,
      roleId: oldUserInfo[0].role_id,
      nickname: oldUserInfo[0].nickname
    } : null


    if (updateData.password && updateData.password !== '') {
      updateData.password = md5password(updateData.password)
    }


    const result = await userService.update(userId, updateData)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'user',
      'update',
      `修改用户: ${oldValue?.name || userId}`,
      oldValue,
      { ...updateData, password: updateData.password ? '***' : undefined }
    )

    ctx.body = {
      code: 0,
      message: '修改用户成功~',
      data: result
    }
  }


  async detail(ctx, next) {

    const { userId } = ctx.params


    const result = await userService.queryById(userId)


    ctx.body = {
      code: 0,
      data: result[0]
    }
  }


  async list(ctx, next) {

    const { name = '', size = 10, offset = 0 } = ctx.request.body
    const createAt = ctx.request.body.createAt
    let createAtStart = undefined
    let createAtEnd = undefined

    if (createAt !== null && createAt !== undefined) {
      createAtStart = createAt[0]
      createAtEnd = createAt[1]
    }


    const result = await userService.list(name, size, offset, createAtStart, createAtEnd)


    ctx.body = {
      code: 0,
      data: result
    }
  }


  async showAvatarImage(ctx, next) {

    const { userId, picName } = ctx.params


    const avatarInfo = await fileService.queryAvatarPicConfig(userId, picName)

    if (avatarInfo) {
      try {

        const { filename, mimetype, destination } = avatarInfo

        ctx.type = mimetype // 告诉浏览器是图片后, 浏览器拿到流后会自动转换为图片, 并在浏览器页面显示。
        ctx.body = fs.createReadStream(`${destination}/${filename}`)
      } catch (error) {
        console.log(error)
      }
    } else {
      ctx.app.emit('error', PICTURE_IS_NOT_EXISTS, ctx)
    }
  }
}

module.exports = new UserController()
