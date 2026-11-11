/**
 * LP 产品管理(后台,需登录)
 * 前缀 /lp/manage,挂在 zorfell.com 上也会因需要 token 而无法被匿名调用
 */
const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { handleLpMediaUpload } = require('../middleware/file.middleware')
const lpController = require('../controller/lp.controller')
const lpGiftController = require('../controller/lp-gift.controller')
const lpGift7Controller = require('../controller/lp-gift7.controller')


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


// ============ Gift LP(礼品清单页, pro2.winrab.com/s2/1/ecomlistical) ============

// 产品 CRUD
lpRouter.get('/gift/products', verifyAuth, (ctx) => lpGiftController.list(ctx))
lpRouter.post('/gift/products', verifyAuth, (ctx) => lpGiftController.create(ctx))
lpRouter.patch('/gift/products/:id', verifyAuth, (ctx) => lpGiftController.update(ctx))
lpRouter.delete('/gift/products/:id', verifyAuth, (ctx) => lpGiftController.remove(ctx))
lpRouter.patch('/gift/products-sort', verifyAuth, (ctx) => lpGiftController.updateSort(ctx))

// 页面配置
lpRouter.get('/gift/config', verifyAuth, (ctx) => lpGiftController.getPageConfig(ctx))
lpRouter.patch('/gift/config', verifyAuth, (ctx) => lpGiftController.updatePageConfig(ctx))

// 批量统一正文字号
lpRouter.post('/gift/unify-fontsize', verifyAuth, (ctx) => lpGiftController.unifyFontSize(ctx))


// ============ 清单页LP v7(独立数据, 与 v6/gift 互不影响) ============

// 产品 CRUD
lpRouter.get('/gift7/products', verifyAuth, (ctx) => lpGift7Controller.list(ctx))
lpRouter.post('/gift7/products', verifyAuth, (ctx) => lpGift7Controller.create(ctx))
lpRouter.patch('/gift7/products/:id', verifyAuth, (ctx) => lpGift7Controller.update(ctx))
lpRouter.delete('/gift7/products/:id', verifyAuth, (ctx) => lpGift7Controller.remove(ctx))
lpRouter.patch('/gift7/products-sort', verifyAuth, (ctx) => lpGift7Controller.updateSort(ctx))

// 页面配置
lpRouter.get('/gift7/config', verifyAuth, (ctx) => lpGift7Controller.getPageConfig(ctx))
lpRouter.patch('/gift7/config', verifyAuth, (ctx) => lpGift7Controller.updatePageConfig(ctx))

// 批量统一正文字号
lpRouter.post('/gift7/unify-fontsize', verifyAuth, (ctx) => lpGift7Controller.unifyFontSize(ctx))


module.exports = lpRouter
