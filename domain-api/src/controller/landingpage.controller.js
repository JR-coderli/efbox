const fileService = require('../service/file.service')
const landingService = require('../service/landingpage.service')
const { PICTURE_IS_NOT_EXISTS } = require('../config/error')
const fs = require('fs')
const { captureScreenshot } = require('../services/screenshot.service')
const { SERVER_HOST, SERVER_PORT } = require('../config/server')

const isProd = process.env.NODE_ENV === 'production'

/**
 * 构建完整的预览图 URL
 */
function getFullPreviewUrl(relativePath) {

  const baseUrl = isProd
    ? `${SERVER_HOST}/api`  // 生产环境: https://efbox.work/api
    : `${SERVER_HOST}:${SERVER_PORT}`  // 开发环境: http://localhost:8001
  return `${baseUrl}${relativePath}`
}

class LandingController {

  async create(ctx, next) {

    const landingpage_info = ctx.request.body
    const { visibility, landing_url, screenshot_type } = ctx.request.body
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1


    const result = await landingService.create(landingpage_info, userId, visibility || 'private')


    if (landing_url && result.insertId) {

      captureScreenshot(result.insertId, landing_url, userId, screenshot_type || 'mobile').catch(err => {
        console.error('[Screenshot] 异步截图失败:', err.message)
      })
    }


    ctx.body = {
      code: 0,
      message: '新建落地页信息成功~',
      data: result
    }
  }


  async showLandPreview(ctx, next) {

    const { landingId, picName } = ctx.params


    const pictureInfo = await fileService.queryPicConfig(landingId, picName)

    if (pictureInfo) {

      const { filename, mimetype, destination } = pictureInfo

      ctx.type = mimetype // 告诉浏览器是图片后, 浏览器拿到流后会自动转换为图片, 并在浏览器页面显示。
      ctx.body = fs.createReadStream(`${destination}/${filename}`)
    } else {
      ctx.app.emit('error', PICTURE_IS_NOT_EXISTS, ctx)
    }
  }



  async remove(ctx, next) {

    const { landingId } = ctx.params
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1


    const isOwner = await landingService.isOwner(landingId, userId)
    if (!isOwner) {
      ctx.body = {
        code: 1,
        message: '只能删除自己创建的落地页'
      }
      return
    }


    await landingService.remove(landingId, userId)


    ctx.body = {
      code: 0,
      message: '删除落地页成功'
    }
  }


  async update(ctx, next) {

    const { landingId } = ctx.params

    const { landingname, landing_url, category_id, visibility, nas_filename, effect, remark } = ctx.request.body
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1


    const isOwner = await landingService.isOwner(landingId, userId)


    const landingInfo = await landingService.getById(landingId)
    const isPublic = landingInfo && landingInfo.visibility === 'public'

    if (!isOwner) {

      if (!isPublic) {
        ctx.body = {
          code: 1,
          message: '只能编辑自己创建的落地页或公共落地页'
        }
        return
      }


      if (landing_url !== undefined || category_id !== undefined || visibility !== undefined) {
        ctx.body = {
          code: 1,
          message: '只能修改落地页名称、NAS文件名、效果、备注'
        }
        return
      }


      await landingService.updatePartial(landingId, { landingname, nas_filename, effect, remark })
    } else {


      await landingService.update(landingId, landingname, landing_url, category_id, visibility, nas_filename, effect, remark)
    }

    ctx.body = {
      code: 0,
      message: '更新落地页成功~'
    }
  }



  async list(ctx, next) {

    let { offset = 0, size = 10, landingname = '', landing_url = '', category_id = '' } = ctx.request.body
    const createAt = ctx.request.body.createAt
    let createAtStart = undefined
    let createAtEnd = undefined
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1


    if (createAt !== null && createAt !== undefined) {
      createAtStart = createAt[0]
      createAtEnd = createAt[1]
    }
    try {
      const result = await landingService.list(userId, landingname, String(offset), String(size), createAtStart, createAtEnd, landing_url, category_id)
      const [ list, totalCount, allCount ] = result


      ctx.body = {
        code: 0,
        message: '获取落地页列表~',
        data: {
          list: list,
          total: totalCount,
          landing_url_list: list.map(item => item.landing_url),
          totalCount: totalCount,
          allCount: allCount[0].allCount
        }
      }
    } catch (error) {
      console.log(error)
    }
  }



  async uploadPreview(ctx, next) {
    const { landingId } = ctx.params
    const userId = ctx.user?.id || 1


    const isOwner = await landingService.isOwner(landingId, userId)
    if (!isOwner) {
      ctx.body = {
        code: 1,
        message: '只能上传自己创建的落地页预览图'
      }
      return
    }


    const file = ctx.file
    if (!file) {
      ctx.body = {
        code: 1,
        message: '请选择要上传的图片'
      }
      return
    }


    await fileService.updateLandPreview(
      file.filename,
      file.mimetype,
      file.size,
      landingId,
      file.destination
    )


    const relativePath = `${file.destination.replace(/^\./, '')}/${file.filename}`
    const previewUrl = getFullPreviewUrl(relativePath)

    ctx.body = {
      code: 0,
      message: '上传预览图成功',
      data: {
        previewUrl,
        filename: file.filename
      }
    }
  }
}

module.exports = new LandingController()
