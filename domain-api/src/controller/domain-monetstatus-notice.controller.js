const monetstatusService = require('../service/domain-monetstatus-notice.service')
const { getMailConfig } = require('../utils/email-transporter')

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

      // 入库后发送预警邮件
      try {
        const mailConfig = getMailConfig()
        const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        await mailConfig.transporter.sendMail({
          from: `"${mailConfig.senderTitle}" <${mailConfig.user}>`,
          to: 'netapop@outlook.com',
          subject: `[EFBox 变现预警] 域名被标记 - ${domain}`,
          html: `
            <h3>域名变现状态预警</h3>
            <table border="1" cellpadding="8" style="border-collapse:collapse;">
              <tr><td style="font-weight:bold;">域名</td><td>${domain}</td></tr>
              <tr><td style="font-weight:bold;">状态</td><td style="color:red;">⚠️ 被标记 (flag)</td></tr>
              <tr><td style="font-weight:bold;">时间</td><td>${now}</td></tr>
            </table>
          `
        })
      } catch (mailErr) {
        console.error('[变现预警] 邮件发送失败:', mailErr.message)
      }

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
