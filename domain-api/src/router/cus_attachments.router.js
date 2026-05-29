const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { create, remove, update, list, attalist, customerList, generateInvoice, sendEmail } = require('../controller/cus_attachments.controller')


const cusAttachmentsRouter = new KoaRouter({ prefix: '/cus_attachments' })



cusAttachmentsRouter.post('/', verifyAuth, create)

cusAttachmentsRouter.delete('/:cusAttachmentId', verifyAuth, remove)

cusAttachmentsRouter.patch('/:cusAttachmentId', verifyAuth, update)

cusAttachmentsRouter.post('/list', verifyAuth, list) // 客户信息为主
cusAttachmentsRouter.post('/attalist', verifyAuth, attalist) // 附件信息为主
cusAttachmentsRouter.post('/customers', verifyAuth, customerList) // 所有客户信息

cusAttachmentsRouter.post('/generate', verifyAuth, generateInvoice)

cusAttachmentsRouter.post('/send-email', verifyAuth, sendEmail)


module.exports = cusAttachmentsRouter