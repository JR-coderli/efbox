const KoaRouter = require('@koa/router')
const { verifyAuth, attachRole } = require('../middleware/login.middleware')
const { create, remove, update, list, attalist, customerList, generateInvoice, sendEmail, updateRemark } = require('../controller/cus_attachments.controller')


const cusAttachmentsRouter = new KoaRouter({ prefix: '/cus_attachments' })



cusAttachmentsRouter.post('/', verifyAuth, create)

cusAttachmentsRouter.delete('/:cusAttachmentId', verifyAuth, remove)

cusAttachmentsRouter.patch('/:cusAttachmentId', verifyAuth, update)

cusAttachmentsRouter.post('/list', verifyAuth, list) // 客户信息为主
cusAttachmentsRouter.post('/attalist', verifyAuth, attachRole, attalist) // 附件信息为主（attachRole：按真实角色过滤数据）
cusAttachmentsRouter.post('/customers', verifyAuth, customerList) // 所有客户信息

cusAttachmentsRouter.post('/generate', verifyAuth, generateInvoice)

cusAttachmentsRouter.post('/send-email', verifyAuth, sendEmail)

// 独立接口：更新备注（双击单元格编辑）
cusAttachmentsRouter.patch('/remark/:cusAttachmentId', verifyAuth, updateRemark)


module.exports = cusAttachmentsRouter