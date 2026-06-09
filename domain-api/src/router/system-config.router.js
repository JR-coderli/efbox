const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { getLanderConfig, setLanderConfig } = require('../controller/system-config.controller')

const systemConfigRouter = new KoaRouter({ prefix: '/system/config' })


systemConfigRouter.get('/lander', verifyAuth, getLanderConfig)


systemConfigRouter.post('/lander', verifyAuth, setLanderConfig)

module.exports = systemConfigRouter
