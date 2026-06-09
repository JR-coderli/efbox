const monetstatusService = require('../service/domain-monetstatus-notice.service')

class DomainMonetstatusNoticeController {

  async receive(ctx) {
    const { domain, status } = ctx.request.body

    if (!domain || !status) {
      ctx.body = { code: 1, message: 'domain 和 status 不能为空' }
      return
    }

    const result = await monetstatusService.create(domain, status)
    ctx.body = { code: 0, message: '接收成功', data: result }
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
