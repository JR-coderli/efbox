const customerService = require('../service/cus_attachments.service')
const path = require('path')
const fs = require('fs')
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const util = require('util');
const exec = util.promisify(require('child_process').exec)
const { getMailConfig } = require('../utils/email-transporter')
const operationLogService = require('../service/operation-log.service')
const { OUTPUT_BASE_URL } = require('../config/server')

class CusAttachmentsController {

  async create(ctx, next) {

    const cusAttachmentsInfo = ctx.request.body


    await customerService.create(cusAttachmentsInfo)


    const attachment = cusAttachmentsInfo.attachments?.[0] || {}
    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'invoice',
      'create',
      `新增发票: ${attachment.filename || ''}`,
      null,
      { filename: attachment.filename, amount: attachment.amount || attachment.totalAmount }
    )


    ctx.body = {
      code: 0,
      message: '已新增附件信息'
    }
  }


  async remove(ctx, next) {

    const { cusAttachmentId } = ctx.params


    await customerService.remove(cusAttachmentId)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'invoice',
      'delete',
      `删除发票 attachmentId: ${cusAttachmentId}`,
      null,
      null
    )


    ctx.body = {
      code: 0,
      message: '附件已删除'
    }
  }


  async update(ctx, next) {

    const { cusAttachmentId } = ctx.params

    const cusAttachmentsInfo = ctx.request.body


    const changes = []
    if (cusAttachmentsInfo.amount_received !== undefined) {
      changes.push(`amount_received: ${cusAttachmentsInfo.amount_received}`)
    }
    if (cusAttachmentsInfo.payment_status !== undefined) {
      changes.push(`payment_status: ${cusAttachmentsInfo.payment_status}`)
    }
    if (cusAttachmentsInfo.confirmed_date !== undefined) {
      changes.push(`confirmed_date: ${cusAttachmentsInfo.confirmed_date}`)
    }


    await customerService.update(cusAttachmentId, cusAttachmentsInfo)

    if (changes.length > 0) {
      operationLogService.log(
        ctx.user.id,
        ctx.user.name,
        'invoice',
        'update',
        `修改发票 attachmentId: ${cusAttachmentId}`,
        null,
        { changes: changes.join(', ') }
      )
    }


    ctx.body = {
      code: 0,
      message: '数据已更新'
    }
  }


  async list(ctx, next) {

    const cusAttachmentsInfo = ctx.request.body


    const result = await customerService.list(cusAttachmentsInfo)
    ctx.body = {
      code: 0,
      message: '附件列表-客户信息为主',
      data: {
        list: result.data,
        conditionCount: result.conditionCount,
        totalCount: result.totalCount
      }
    }
  }

  async attalist(ctx, next) {

    const cusAttachmentsInfo = ctx.request.body
    const page = cusAttachmentsInfo.page
    const pageSize = cusAttachmentsInfo.pageSize


    const result = await customerService.attalist(cusAttachmentsInfo)

    ctx.body = {
      code: 0,
      message: '附件列表-附件信息为主',
      data: {
        list: result.rows,
        allCount: result.total,
        page: page ? Number(page) : null,
        pageSize: pageSize ? Number(pageSize) : null
      }
    }
  }


  async generateInvoice(ctx, next) {
    try {

      const invoiceData = ctx.request.body
      const attachment = invoiceData.attachments[0] || {}


      let nextId = 1
      try {
        const attalistResult = await customerService.attalist({page: "1", pageSize: "1", "role_name": "管理员"})
        const rows = (attalistResult && attalistResult.rows) ? attalistResult.rows : []
        const lastId = rows.length ? (Number(rows[0].id) || 0) : 0
        nextId = lastId + 1
      } catch (err) {

        console.log(err)
      }


      const invoiceEntity = attachment.invoice_entity || {}
      const templateFileName = invoiceEntity.template_path || 'invoice_template.docx'
      const templatePath = path.resolve(__dirname, '..', '..', 'template', templateFileName)
      if (!fs.existsSync(templatePath)) {
        return ctx.body = {
          code: -1,
          message: `模板文件不存在: ${templateFileName}`
        }
      }


      const content = fs.readFileSync(templatePath, 'binary')
      const zip = new PizZip(content)
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

      doc.render({
        full_name: attachment.full_name || '',
        id: nextId || '',
        date: attachment.date || '',
        company_address: attachment.company_address || '',
        items: attachment.items || [],
        total_amount: attachment.totalAmount || '',

        account_name: invoiceEntity.account_name || '',
        account_number: invoiceEntity.account_number || '',
        bank_name: invoiceEntity.bank_name || '',
        swift_code: invoiceEntity.swift_code || '',
        bank_address: invoiceEntity.bank_address || '',
        entity_company_address: invoiceEntity.company_address || '',
        bank_code: invoiceEntity.bank_code || '',
        branch_code: invoiceEntity.branch_code || ''
      })


      const outputDir = path.resolve(__dirname, '..', '..', 'output')
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)


      if (!attachment.full_name || !attachment.short_name) {
        return ctx.body = {
          code: -1,
          message: '客户信息不完整，请重新选择客户'
        }
      }

      const safeAmount = String(attachment.totalAmount || '').replace(/\$/g, '')
      const fullName = (attachment.full_name || '').replace(/\s+/g, "") // 删除名字中的所有空格
      const shortName = attachment.short_name || fullName

      const entityName = (invoiceEntity.name || '').replace(/\s+/g, '') || 'Eflow'
      const filename = `INVOICE-${entityName}-${shortName}-${nextId}-${safeAmount}.docx` // 文件名
      const docxPath = path.join(outputDir, filename)



      fs.writeFileSync(docxPath, doc.getZip().generate({ type: 'nodebuffer' }))

      const sofficePath = process.env.NODE_ENV === 'development'? process.env.DEV_SOFFICE_PATH: process.env.PROD_SOFFICE_PATH
      if (!sofficePath) {
        return ctx.body = {
          code: -1,
          message: 'SOFFICE_PATH 未配置，请联系管理员'
        }
      }


      const pdfCmd = `"${sofficePath}" --headless --convert-to pdf "${docxPath}" --outdir "${outputDir}"`;



      const pdfFilename = filename.replace('.docx', '.pdf')
      const pdfPath = path.join(outputDir, pdfFilename)

      try {
        const { stdout, stderr } = await exec(pdfCmd, { timeout: 10000 })

        if (stderr) console.warn("soffice stderr:", stderr)
      } catch (error) {

        const isSigTerm = error.signal === 'SIGTERM' || error.killed === true
        const pdfExists = fs.existsSync(pdfPath)

        if (isSigTerm && pdfExists) {
          console.log('PDF 已生成（Windows LibreOffice 超时但转换成功）')
        } else {

          throw error
        }
      }


      const destination = `${OUTPUT_BASE_URL}/output/${filename.replace('.docx', '.pdf')}`
      attachment.filename = filename.replace('.docx', '.pdf')
      attachment.destination = destination
      attachment.amount = attachment.totalAmount
      attachment.mimetype = 'application/pdf'
      attachment.period = attachment.items[0].dateRange
      attachment.amount_received = 0.00
      attachment.payment_status = '未收款'
      await customerService.create(invoiceData)


      operationLogService.log(
        ctx.user.id,
        ctx.user.name,
        'invoice',
        'create',
        `生成发票: ${attachment.short_name || attachment.full_name} - ${attachment.totalAmount}`,
        null,
        { filename: filename.replace('.docx', '.pdf'), amount: attachment.totalAmount }
      )

      ctx.body = {
        success: true,
        url: destination
      }
    } catch (error) {
      console.log('生成发票失败:', error)
      ctx.body = {
        code: -1,
        message: error.message || '生成发票失败，请稍后重试'
      }
    }
  }


  async sendEmail(ctx, next) {
    const { filename, id, emails, invoice_entity_name } = ctx.request.body
    const { transporter, senderTitle, user, to, bcc } = getMailConfig(invoice_entity_name)
    const companyName = senderTitle.replace(' Invoice', '')


    const recipientEmails = emails.map(e => e.email)


    const toEmails = emails.map(item => `${item.email}`)


    const mailOptions = {
      from: `"${senderTitle}" <${user}>`,
      to: toEmails,
      subject: filename,
      html: `
        <div>
          Hi team,<br>
          &emsp;&emsp;Please check and receive the invoices from ${companyName.toUpperCase()}. Thank you.
        </div>
      `,
      attachments: [ // 发送附件
        {
          filename: `${filename}.pdf`, // 邮件中显示的文件名
          path: path.resolve(__dirname, `../../output/${filename}`), // 本地路径
          contentType: 'application/pdf' // MIME 类型
        }
      ]
    }


    const ccEmails = []
    const bccEmails = []

    if (to) {
      ccEmails.push(to)
      console.log('添加 MAIL_TO 到抄送(CC):', to)
    }
    if (bcc) {
      bccEmails.push(bcc)
      console.log('添加 MAIL_BCC 到密送(BCC):', bcc)
    }

    if (ccEmails.length > 0) {
      mailOptions.cc = ccEmails
      console.log('最终 CC 列表:', ccEmails)
    }
    if (bccEmails.length > 0) {
      mailOptions.bcc = bccEmails
      console.log('最终 BCC 列表:', bccEmails)
    }

    try {
      await transporter.sendMail(mailOptions)

      await customerService.update(id, { mail_status: 'sent' })


      operationLogService.log(
        ctx.user.id,
        ctx.user.name,
        'invoice',
        'send',
        `发送发票邮件: ${filename}`,
        null,
        { filename, recipients: recipientEmails }
      )
    } catch (err) {
      console.error('邮件发送失败:', err)
    }



    ctx.body = {
      message: "邮件已发送",
      type: 'success'
    }
  }



  async customerList(ctx, next) {

    const queryInfo = ctx.request.body


    const result = await customerService.customerList(queryInfo)

    ctx.body = {
      code: 0,
      message: '所有客户信息',
      data: {
        list: result
      }
    }
  }


}

module.exports = new CusAttachmentsController()