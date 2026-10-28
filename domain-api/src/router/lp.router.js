/**
 * LP 产品管理(后台,需登录)
 * 前缀 /lp/manage,挂在 zorfell.com 上也会因需要 token 而无法被匿名调用
 */
const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { handleLpMediaUpload } = require('../middleware/file.middleware')
const lpController = require('../controller/lp.controller')


const lpRouter = new KoaRouter({ prefix: '/lp/manage' })


// 产品 CRUD
lpRouter.get('/products', verifyAuth, (ctx) => lpController.list(ctx))
lpRouter.post('/products', verifyAuth, (ctx) => lpController.create(ctx))
lpRouter.patch('/products/:id', verifyAuth, (ctx) => lpController.update(ctx))
lpRouter.delete('/products/:id', verifyAuth, (ctx) => lpController.remove(ctx))
lpRouter.patch('/products-sort', verifyAuth, (ctx) => lpController.updateSort(ctx))

// 页面配置
lpRouter.get('/config', verifyAuth, (ctx) => lpController.getPageConfig(ctx))
lpRouter.patch('/config', verifyAuth, (ctx) => lpController.updatePageConfig(ctx))

// 媒体上传(图片/视频)
lpRouter.post('/upload', verifyAuth, handleLpMediaUpload, (ctx) => lpController.upload(ctx))


module.exports = lpRouter
