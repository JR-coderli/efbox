const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const monetstatusController = require('../controller/domain-monetstatus-notice.controller')

const router = new KoaRouter({ prefix: '/domain-monetstatus-notice' })

// 外部 webhook — 无需认证
router.post('/', monetstatusController.receive)

// 前端查询 — 需要认证
router.post('/list', verifyAuth, monetstatusController.list)

// 前端删除 — 需要认证
router.delete('/:id', verifyAuth, monetstatusController.remove)

module.exports = router
