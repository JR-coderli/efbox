const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { create, remove, update, list, updateRemark, updatePayCycleDays } = require('../controller/customer.controller')


const customerRouter = new KoaRouter({ prefix: '/customers' })



customerRouter.post('/', verifyAuth, create)

customerRouter.delete('/:customerId', verifyAuth, remove)

customerRouter.patch('/:customerId', verifyAuth, update)

customerRouter.post('/list', verifyAuth, list)

customerRouter.patch('/remark/:customerId', verifyAuth, updateRemark)

customerRouter.patch('/pay_cycle_days/:customerId', verifyAuth, updatePayCycleDays)


module.exports = customerRouter