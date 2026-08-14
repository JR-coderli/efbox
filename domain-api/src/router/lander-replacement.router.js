const KoaRouter = require('@koa/router')
const { replaceDangerousDomain, replaceEfTrackerDomain, previewReplace, getList, getDetail, getProgress, getQueueStatus } = require('../controller/lander-replacement.controller')

const landerReplacementRouter = new KoaRouter({ prefix: '/lander-replacement' })


landerReplacementRouter.post('/replace', replaceDangerousDomain)

// ef-tracker 侧替换（检测脚本调用：先判断对方是否在用，在用才替换并记录）
landerReplacementRouter.post('/ef-replace', replaceEfTrackerDomain)


landerReplacementRouter.get('/progress/:id', getProgress)


landerReplacementRouter.post('/preview', previewReplace)


landerReplacementRouter.post('/list', getList)


landerReplacementRouter.get('/detail/:id', getDetail)


landerReplacementRouter.get('/queue-status', getQueueStatus)

module.exports = landerReplacementRouter
