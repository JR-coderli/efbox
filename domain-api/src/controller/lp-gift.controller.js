const lpGiftService = require('../service/lp-gift.service')


class LpGiftController {

  // ============ 管理端(需登录) ============

  async list(ctx) {
    const result = await lpGiftService.list()
    ctx.body = { code: 0, message: '获取Gift LP产品列表成功', data: result }
  }


  async create(ctx) {
    const data = ctx.request.body || {}
    if (!data.title) {
      ctx.body = { code: 1, message: '板块标题不能为空' }
      return
    }
    const result = await lpGiftService.create(data)
    ctx.body = { code: 0, message: '新增产品成功', data: result }
  }


  async update(ctx) {
    const { id } = ctx.params
    const data = ctx.request.body || {}
    await lpGiftService.update(id, data)
    ctx.body = { code: 0, message: '更新产品成功' }
  }


  async remove(ctx) {
    const { id } = ctx.params
    await lpGiftService.remove(id)
    ctx.body = { code: 0, message: '删除产品成功' }
  }


  // 拖拽排序: { products: [{id, sort}] }
  async updateSort(ctx) {
    const { products } = ctx.request.body || {}
    if (!Array.isArray(products) || products.length === 0) {
      ctx.body = { code: 1, message: '参数错误' }
      return
    }
    await lpGiftService.updateSort(products)
    ctx.body = { code: 0, message: '更新排序成功' }
  }


  async getPageConfig(ctx) {
    const result = await lpGiftService.getPageConfig()
    ctx.body = { code: 0, message: '获取页面配置成功', data: result }
  }


  async updatePageConfig(ctx) {
    const data = ctx.request.body || {}
    await lpGiftService.updatePageConfig(data)
    ctx.body = { code: 0, message: '更新页面配置成功' }
  }


  // ============ LP 公开端(无需登录) ============

  async publicData(ctx) {
    const result = await lpGiftService.getPublicData()
    // 不缓存:后台改完产品,访客下一次刷新页面立即看到新数据
    ctx.set('Cache-Control', 'no-store')
    ctx.body = { code: 0, message: 'ok', data: result }
  }
}


module.exports = new LpGiftController()
