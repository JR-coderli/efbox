const KoaRouter = require('@koa/router')
const { create, normal_list, import_list, remove, update, updateIsImportant, updateIsNormal, updateRemark, checkDomain, getReplacementDomain, dailyReportList, reportLastCheck, getLastCheck, coverage, backupPoolCount } = require('../controller/domains.controller')
const { verifyAuth } = require('../middleware/login.middleware')


const domainsRouter = new KoaRouter({ prefix: '/domains' })




domainsRouter.post('/', verifyAuth, create)

domainsRouter.post('/normal_list', normal_list)

domainsRouter.post('/import_list', import_list)

domainsRouter.delete('/:domainId', verifyAuth, remove)

domainsRouter.patch('/:domainId', verifyAuth, update)

domainsRouter.patch('/is_important/:domainId/:isImportant', verifyAuth, updateIsImportant)
domainsRouter.patch('/internal/is_important/:domainId/:isImportant', updateIsImportant) // 外部调用

domainsRouter.patch('/internal/is_normal/:id', updateIsNormal) // 外部调用
domainsRouter.patch('/is_normal/:id', verifyAuth, updateIsNormal) // 内部调用

domainsRouter.patch('/:domainId/remark', verifyAuth, updateRemark)

domainsRouter.post('/check', checkDomain)

domainsRouter.get('/replacement/:domain', getReplacementDomain)

domainsRouter.get('/internal/daily_report_list', dailyReportList) // url_detection_database 每日 8 点域名清单邮件用

domainsRouter.get('/internal/backup_pool_count', backupPoolCount) // url_detection_database 替换成功后提醒剩余备用数用

domainsRouter.post('/internal/report_last_check', reportLastCheck) // url_detection_database 每轮检测完成打点(无鉴权, 仿 internal 惯例)

domainsRouter.get('/last_check', verifyAuth, getLastCheck) // 前端域名检测页展示"最后检测时间"

domainsRouter.get('/coverage', verifyAuth, coverage) // 前端域名检测页展示"Clickflare 域名覆盖对比"




module.exports = domainsRouter