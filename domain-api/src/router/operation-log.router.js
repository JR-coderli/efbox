const KoaRouter = require('@koa/router')
const { create, list, remove, removeByRange } = require('../controller/operation-log.controller')
const { verifyAuth } = require('../middleware/login.middleware')

const logRouter = new KoaRouter({ prefix: '/operation-log' })


logRouter.post('/create', verifyAuth, create)


logRouter.post('/list', verifyAuth, list)


logRouter.post('/delete', verifyAuth, remove)


logRouter.post('/delete-by-range', verifyAuth, removeByRange)

module.exports = logRouter
