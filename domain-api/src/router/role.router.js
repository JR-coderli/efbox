const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { create, remove, list, detail, assignMenu, createNew, update } = require('../controller/role.controller')

const roleRouter = new KoaRouter({ prefix: '/role' })




roleRouter.post('/:roleId/menu', verifyAuth, assignMenu)


roleRouter.post('/', verifyAuth, createNew)


roleRouter.delete('/:roleId', verifyAuth, remove)

roleRouter.patch('/:roleId', verifyAuth, update)

roleRouter.get('/:roleId/menu', verifyAuth, detail)

roleRouter.post('/list', verifyAuth, list)



module.exports = roleRouter
