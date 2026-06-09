const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { create, list } = require('../controller/menu.controller')

const menuRouter = new KoaRouter({ prefix: '/menu' })


menuRouter.post('/', verifyAuth, create)

menuRouter.post('/list', verifyAuth, list)

module.exports = menuRouter