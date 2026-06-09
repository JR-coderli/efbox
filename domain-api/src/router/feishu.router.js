const KoaRouter = require('@koa/router')
const feishuController = require('../controller/feishu.controller')


const feishuRouter = new KoaRouter({ prefix: '/feishu' })




feishuRouter.post('/webhook', feishuController.handleWebhook)


feishuRouter.post('/send/text', feishuController.sendText)
feishuRouter.post('/send/post', feishuController.sendPost)
feishuRouter.post('/send/card', feishuController.sendCard)
feishuRouter.post('/send/alert', feishuController.sendAlert)
feishuRouter.post('/send/notification', feishuController.sendNotification)
feishuRouter.post('/send/urgent-phone', feishuController.sendUrgentPhone)
feishuRouter.post('/send/urgent-sms', feishuController.sendUrgentSms)


feishuRouter.post('/send/batch', feishuController.batchSend)
feishuRouter.post('/send/batch-alert', feishuController.batchSendAlert)


feishuRouter.get('/users', feishuController.getUserList)
feishuRouter.get('/users/all', feishuController.getAllCompanyUsers)
feishuRouter.get('/users/search', feishuController.searchUser)

module.exports = feishuRouter
