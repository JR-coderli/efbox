const domainPurposeInheritService = require('../service/domain-purpose-inherit.service')

/**
 * 域名 purpose 继承控制器（手动触发入口）。
 * 自动流程在替换成功后由替换服务内部调用，这里提供手动补偿接口：
 * 自动继承失败或历史遗留数据需要补改标签时使用。
 */
class DomainPurposeInheritController {
  /**
   * 按替换记录 ID 手动触发 purpose 继承
   * body: { record_id }
   */
  async inheritByRecord(ctx) {
    const { record_id } = ctx.request.body

    if (!record_id) {
      ctx.body = { code: 400, message: 'record_id 不能为空', data: null }
      return
    }

    const result = await domainPurposeInheritService.inheritByRecordId(record_id)
    ctx.body = { code: result.success ? 0 : 500, message: result.message, data: result }
  }

  /**
   * 按域名对手动触发 purpose 继承
   * body: { dangerous_domain, replacement_domain }
   */
  async inherit(ctx) {
    const { dangerous_domain, replacement_domain } = ctx.request.body

    if (!dangerous_domain || !replacement_domain) {
      ctx.body = { code: 400, message: 'dangerous_domain 和 replacement_domain 不能为空', data: null }
      return
    }

    const result = await domainPurposeInheritService.inheritPurpose(dangerous_domain, replacement_domain)
    ctx.body = { code: result.success ? 0 : 500, message: result.message, data: result }
  }
}

module.exports = new DomainPurposeInheritController()
