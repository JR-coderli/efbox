const KoaRouter = require('@koa/router')
const crawlerController = require('../controller/crawler.controller')
const { verifyAuth } = require('../middleware/login.middleware')


const crawlerRouter = new KoaRouter({ prefix: '/crawler' })




crawlerRouter.post('/task', verifyAuth, (ctx) => crawlerController.create(ctx))

crawlerRouter.get('/task/:id', verifyAuth, (ctx) => crawlerController.getStatus(ctx))

crawlerRouter.get('/tasks', verifyAuth, (ctx) => crawlerController.list(ctx))

crawlerRouter.delete('/task/:id', verifyAuth, (ctx) => crawlerController.remove(ctx))

crawlerRouter.get('/download/:taskFolder', verifyAuth, (ctx) => crawlerController.download(ctx))

module.exports = crawlerRouter
