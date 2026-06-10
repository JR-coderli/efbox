const monetstatusService = require('../service/domain-monetstatus-notice.service')

class DomainMonetstatusNoticeController {

  async receive(ctx) {
    const { domain, status } = ctx.request.body

    if (!domain || !status) {
      ctx.body = {
        code: 400,
        error: 'Bad Request',
        message: 'Fields "domain" and "status" are required. Please send a JSON body: { "domain": "example.com", "status": "flag" } with Content-Type: application/json'
      }
      return
    }

    if (status !== 'flag') {
      ctx.body = {
        code: 400,
        error: 'Bad Request',
        message: 'Invalid status value. Only "flag" is accepted.'
      }
      return
    }

    try {
      await monetstatusService.create(domain, status)
      ctx.body = { code: 200, data: 'received' }
    } catch (err) {
      ctx.body = {
        code: 500,
        error: 'Internal Server Error',
        message: 'Failed to process the notification. Please try again later.'
      }
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
