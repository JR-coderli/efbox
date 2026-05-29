const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { create, remove, update, list, setTop, getTop } = require('../controller/invoice_entity.controller')


const invoiceEntityRouter = new KoaRouter({ prefix: '/invoiceentity' })



invoiceEntityRouter.post('/', verifyAuth, create)

invoiceEntityRouter.delete('/:entityId', verifyAuth, remove)

invoiceEntityRouter.patch('/:entityId', verifyAuth, update)

invoiceEntityRouter.post('/list', verifyAuth, list)

invoiceEntityRouter.post('/setTop', verifyAuth, setTop)

invoiceEntityRouter.get('/getTop', verifyAuth, getTop)


module.exports = invoiceEntityRouter
