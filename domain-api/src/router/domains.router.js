const KoaRouter = require('@koa/router')
const { create, normal_list, import_list, remove, update, updateIsImportant, updateIsNormal, updateRemark, checkDomain, getReplacementDomain } = require('../controller/domains.controller')
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




module.exports = domainsRouter