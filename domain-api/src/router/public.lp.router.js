/**
 * LP 公开接口(无鉴权)
 * 供投放 LP 页面(pro2.winrab.com 上的静态页)跨域 fetch,
 * 经由 zorfell.com -> nginx(只放行 /lp/) -> Koa 守卫(只放行 /lp/) 到达这里
 */
const KoaRouter = require('@koa/router')
const lpController = require('../controller/lp.controller')


const publicLpRouter = new KoaRouter({ prefix: '/lp' })


// 产品 + 页面配置(LP 页加载后拉取)
publicLpRouter.get('/products', (ctx) => lpController.publicData(ctx))


module.exports = publicLpRouter
