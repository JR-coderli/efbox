const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const {
  create, remove, update, list, updateRemark, updatePayCycleDays,
  grantAttachment, revokeAttachment, getGrants, grantUserList
} = require('../controller/customer.controller')


const customerRouter = new KoaRouter({ prefix: '/customers' })



customerRouter.post('/', verifyAuth, create)

customerRouter.delete('/:customerId', verifyAuth, remove)

customerRouter.patch('/:customerId', verifyAuth, update)

customerRouter.post('/list', verifyAuth, list)

customerRouter.patch('/remark/:customerId', verifyAuth, updateRemark)

customerRouter.patch('/pay_cycle_days/:customerId', verifyAuth, updatePayCycleDays)

// 客户附件查看授权（接口内部校验 system:customers:grant 权限）
customerRouter.get('/grant/users', verifyAuth, grantUserList) // 可授权用户简表（注意要在 /:customerId 之前注册）
customerRouter.post('/:customerId/grant', verifyAuth, grantAttachment) // 授权
customerRouter.delete('/:customerId/grant/:userId', verifyAuth, revokeAttachment) // 收回
customerRouter.get('/:customerId/grants', verifyAuth, getGrants) // 查询已授权用户


module.exports = customerRouter