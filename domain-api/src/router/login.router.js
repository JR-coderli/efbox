const KoaRouter = require('@koa/router')
const loginController = require('../controller/login.controller')
const { verifyLogin, verifyAuth } = require('../middleware/login.middleware')

const loginRouter = new KoaRouter({ prefix: '/cms_login' })


loginRouter.post('/', verifyLogin, loginController.sign)

loginRouter.get('/test', verifyAuth, loginController.test)

module.exports = loginRouter
