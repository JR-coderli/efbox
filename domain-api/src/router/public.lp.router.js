/**
 * LP 公开接口(无鉴权)
 * 供投放 LP 页面(pro2.winrab.com 上的静态页)跨域 fetch,
 * 经由 zorfell.com -> nginx(只放行 /lp/) -> Koa 守卫(只放行 /lp/) 到达这里
 */
const KoaRouter = require('@koa/router')
const lpController = require('../controller/lp.controller')
const lpGiftController = require('../controller/lp-gift.controller')
const lpGift7Controller = require('../controller/lp-gift7.controller')


const publicLpRouter = new KoaRouter({ prefix: '/lp' })


// 产品 + 页面配置(LP 页加载后拉取)
publicLpRouter.get('/products', (ctx) => lpController.publicData(ctx))

// Gift LP(礼品清单页)产品 + 页面配置
publicLpRouter.get('/gift/products', (ctx) => lpGiftController.publicData(ctx))

// 清单页LP v7(独立数据)
publicLpRouter.get('/gift7/products', (ctx) => lpGift7Controller.publicData(ctx))


module.exports = publicLpRouter
