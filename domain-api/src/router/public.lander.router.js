/**
 * 公开 Lander 接口路由
 * 供外部系统调用，需要 api-key 验证
 */
const KoaRouter = require('@koa/router')
const { verifyApiKey } = require('../middleware/api-key.middleware')
const { publicList } = require('../controller/lander.controller')

const publicLanderRouter = new KoaRouter({ prefix: '/public/lander' })


publicLanderRouter.get('/list', verifyApiKey, publicList)

module.exports = publicLanderRouter
