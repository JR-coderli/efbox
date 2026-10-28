/**
 * LP 模块轻量测试壳:只挂 host守卫 + lp 路由 + 静态,不启动完整服务(避免触发后台任务)
 */
const Koa = require('koa')
const http = require('http')
const lpRouter = require('../src/router/lp.router')
const publicLpRouter = require('../src/router/public.lp.router')
const lpHostGuard = require('../src/middleware/lp-host-guard.middleware')
const serve = require('koa-static')
const mount = require('koa-mount')
const path = require('path')

const app = new Koa()
app.use(lpHostGuard)
app.use(mount('/lp/uploads', serve(path.join(__dirname, '..', 'uploads', 'lp'))))
app.use(lpRouter.routes())
app.use(publicLpRouter.routes())

const server = app.listen(18999, async () => {
  const base = 'http://127.0.0.1:18999'
  const results = []
  const req = (method, p, opts = {}) => {
    return fetch(base + p, { method, ...opts }).then(async (r) => ({
      status: r.status,
      body: await r.text().then((t) => t.slice(0, 120))
    }))
  }

  // 1. 公开接口(空库)
  results.push(['GET /lp/products(空库)', await req('GET', '/lp/products')])

  // 2. 造一条测试数据(含 /lp/uploads 媒体路径)
  const lpService = require('../src/service/lp.service')
  const created = await lpService.create({
    name: 'TestProduct', hook: 'Test Hook', p1: 'p1', p2: 'p2',
    p3_pre: 'pre', p3_post: 'post', discount: 66, media_type: 2,
    media_url: '/lp/uploads/demo.mp4'
  })
  results.push(['写入测试产品', { status: 'id=' + created.id + ' sort=' + created.sort }])

  // 3. 公开接口(有数据) —— 注意 Host 是 127.0.0.1,守卫不拦
  const pub = await fetch(base + '/lp/products').then((r) => r.json())
  results.push(['GET /lp/products(1条)', {
    status: pub.code,
    body: JSON.stringify(pub.data.products[0]) + ' version=' + pub.data.version
  }])

  // 4. 管理接口未带 token(应被 verifyAuth 拒绝)
  results.push(['GET /lp/manage/products 无token', await req('GET', '/lp/manage/products')])

  // 5. 守卫:伪造 zorfell.com Host 访问管理接口
  results.push(['zorfell Host + /lp/manage/products', await req('GET', '/lp/manage/products', {
    headers: { Host: 'zorfell.com' }
  })])
  results.push(['zorfell Host + /lp/products', await req('GET', '/lp/products', {
    headers: { Host: 'zorfell.com' }
  })])
  results.push(['zorfell Host + /uploads/x', await req('GET', '/uploads/x', {
    headers: { Host: 'zorfell.com' }
  })])

  // 6. 静态目录(不存在的文件→404,目录不被列举)
  results.push(['GET /lp/uploads/none.mp4', await req('GET', '/lp/uploads/none.mp4')])

  // 清理测试数据
  await lpService.remove(created.id)
  const after = await fetch(base + '/lp/products').then((r) => r.json())
  results.push(['清理后产品数', { status: after.data.products.length }])

  for (const [name, r] of results) {
    console.log('·', name, '=>', JSON.stringify(r))
  }
  server.close()
  process.exit(0)
})
