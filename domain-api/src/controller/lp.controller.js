const lpService = require('../service/lp.service')


class LpController {

  // ============ 管理端(需登录) ============

  async list(ctx) {
    const result = await lpService.list()
    ctx.body = { code: 0, message: '获取LP产品列表成功', data: result }
  }


  async create(ctx) {
    const data = ctx.request.body || {}
    if (!data.name) {
      ctx.body = { code: 1, message: '产品短名不能为空' }
      return
    }
    const result = await lpService.create(data)
    ctx.body = { code: 0, message: '新增产品成功', data: result }
  }


  async update(ctx) {
    const { id } = ctx.params
    const data = ctx.request.body || {}
    await lpService.update(id, data)
    ctx.body = { code: 0, message: '更新产品成功' }
  }


  async remove(ctx) {
    const { id } = ctx.params
    await lpService.remove(id)
    ctx.body = { code: 0, message: '删除产品成功' }
  }


  // 拖拽排序: { products: [{id, sort}] }
  async updateSort(ctx) {
    const { products } = ctx.request.body || {}
    if (!Array.isArray(products) || products.length === 0) {
      ctx.body = { code: 1, message: '参数错误' }
      return
    }
    await lpService.updateSort(products)
    ctx.body = { code: 0, message: '更新排序成功' }
  }


  async getPageConfig(ctx) {
    const result = await lpService.getPageConfig()
    ctx.body = { code: 0, message: '获取页面配置成功', data: result }
  }


  async updatePageConfig(ctx) {
    const data = ctx.request.body || {}
    await lpService.updatePageConfig(data)
    ctx.body = { code: 0, message: '更新页面配置成功' }
  }


  // 媒体上传(multer 已在路由层处理,file 字段名 media)
  async upload(ctx) {
    const file = ctx.file
    if (!file) {
      ctx.body = { code: 1, message: '请选择要上传的图片或视频' }
      return
    }
    const mediaType = file.mimetype && file.mimetype.startsWith('video/') ? 2 : 1
    const url = `/lp/uploads/${file.filename}`
    ctx.body = {
      code: 0,
      message: '上传成功',
      data: {
        media_type: mediaType,
        media_url: url,
        mimetype: file.mimetype,
        size: file.size
      }
    }
  }


  // ============ LP 公开端(无需登录) ============

  async publicData(ctx) {
    const result = await lpService.getPublicData()
    // LP 每个访客都会请求,给一分钟浏览器缓存,减轻数据库压力
    ctx.set('Cache-Control', 'public, max-age=60')
    ctx.body = { code: 0, message: 'ok', data: result }
  }
}


module.exports = new LpController()
