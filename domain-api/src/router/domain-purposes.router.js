const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { getActive, getAll, create, update, remove, toggleActive } = require('../controller/domain-purposes.controller')

const domainPurposesRouter = new KoaRouter({ prefix: '/domain-purposes' })


domainPurposesRouter.get('/active', getActive)



domainPurposesRouter.post('/list', verifyAuth, getAll)

domainPurposesRouter.post('/', verifyAuth, create)

domainPurposesRouter.patch('/:id', verifyAuth, update)

domainPurposesRouter.delete('/:id', verifyAuth, remove)

domainPurposesRouter.patch('/:id/toggle', verifyAuth, toggleActive)

module.exports = domainPurposesRouter
