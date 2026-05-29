const KoaRouter = require('@koa/router')
const { replaceDangerousDomain, previewReplace, getList, getDetail, getProgress, getQueueStatus } = require('../controller/lander-replacement.controller')

const landerReplacementRouter = new KoaRouter({ prefix: '/lander-replacement' })


landerReplacementRouter.post('/replace', replaceDangerousDomain)


landerReplacementRouter.get('/progress/:id', getProgress)


landerReplacementRouter.post('/preview', previewReplace)


landerReplacementRouter.post('/list', getList)


landerReplacementRouter.get('/detail/:id', getDetail)


landerReplacementRouter.get('/queue-status', getQueueStatus)

module.exports = landerReplacementRouter
