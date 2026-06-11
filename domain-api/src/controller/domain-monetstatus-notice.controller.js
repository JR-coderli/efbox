const monetstatusService = require('../service/domain-monetstatus-notice.service')

class DomainMonetstatusNoticeController {

  async receive(ctx) {
    const body = ctx.request.body

    console.log('[Webhook] 收到回调数据:', JSON.stringify(body))

    try {
      const result = await monetstatusService.create(body)
      ctx.body = { code: 0, message: 'received', data: { id: result.insertId } }
    } catch (err) {
      console.error('[Webhook] 存储失败:', err)
      ctx.body = { code: 500, message: 'save failed', data: null }
    }
  }

  async list(ctx) {
    const { offset = 0, size = 20 } = ctx.request.body
    const result = await monetstatusService.getList(offset, size)
    ctx.body = { code: 0, message: '获取成功', data: result }
  }

  async remove(ctx) {
    const { id } = ctx.params
    const result = await monetstatusService.remove(id)
    ctx.body = { code: 0, message: '删除成功', data: result }
  }
}

module.exports = new DomainMonetstatusNoticeController()
