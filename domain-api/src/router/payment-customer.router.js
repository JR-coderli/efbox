const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { create, remove, update, list, updateRemark, updatePayCycleDays } = require('../controller/payment-customer.controller')


const paymentCustomerRouter = new KoaRouter({ prefix: '/payment_customers' })



paymentCustomerRouter.post('/', verifyAuth, create)

paymentCustomerRouter.delete('/:customerId', verifyAuth, remove)

paymentCustomerRouter.patch('/:customerId', verifyAuth, update)

paymentCustomerRouter.post('/list', verifyAuth, list)

paymentCustomerRouter.patch('/remark/:customerId', verifyAuth, updateRemark)

paymentCustomerRouter.patch('/pay_cycle_days/:customerId', verifyAuth, updatePayCycleDays)


module.exports = paymentCustomerRouter
