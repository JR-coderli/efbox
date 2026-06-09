const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { sync, list } = require('../controller/workspace.controller')

const workspaceRouter = new KoaRouter({ prefix: '/workspace' })


workspaceRouter.post('/sync', verifyAuth, sync)


workspaceRouter.get('/list', verifyAuth, list)

module.exports = workspaceRouter
