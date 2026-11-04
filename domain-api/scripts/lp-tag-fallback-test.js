/** 验证 tag 失败场景:链接保持短链 + 点击兜底跳转 */
const path = require('path')
const Koa = require('koa')
const serve = require('koa-static')
const mount = require('koa-mount')
const lpRouter = require('../src/router/lp.router')
const publicLpRouter = require('../src/router/public.lp.router')
const lpHostGuard = require('../src/middleware/lp-host-guard.middleware')

async function main() {
  const api = new Koa()
  api.use(lpHostGuard)
  api.use(mount('/lp/uploads', serve(path.join(__dirname, '..', 'uploads', 'lp'))))
  api.use(lpRouter.routes())
  api.use(publicLpRouter.routes())
  await new Promise((r) => api.listen(18999, r))
  const st = new Koa()
  st.use(serve('C:/Users/aha/Desktop/1019'))
  await new Promise((r) => st.listen(18998, r))

  // 生成测试副本指向本地接口
  const fs = require('fs')
  const html = fs.readFileSync('C:/Users/aha/Desktop/1019/index.html', 'utf-8')
    .replace("var API = 'https://zorfell.com/lp/products'", "var API = 'http://127.0.0.1:18999/lp/products'")
  fs.writeFileSync('C:/Users/aha/Desktop/1019/_tag_test.html', html)

  const puppeteer = require('puppeteer-core')
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--host-resolver-rules=MAP eco.tsavros.com 127.0.0.2'] // 让 tag 加载必然失败
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 150)))
  await page.goto('http://127.0.0.1:18998/_tag_test.html', { waitUntil: 'networkidle0', timeout: 40000 })

  const state = await page.evaluate(() => ({
    blockCount: document.querySelectorAll('#lp-products > div.pt-8').length,
    httpsLinks: document.querySelectorAll('#lp-products a[href^="https://eco.tsavros.com/cf/click/"]').length,
    jsLinks: document.querySelectorAll('#lp-products a[href^="javascript:"]').length
  }))
  console.log('tag失败场景 页面状态:', JSON.stringify(state))

  // 模拟点击第一个产品标题,验证兜底跳转
  await page.evaluate(() => {
    const a = document.querySelector('#lp-products a[href^="https://eco.tsavros.com"], #lp-products a')
    a.click()
  })
  await new Promise((r) => setTimeout(r, 1500))
  console.log('点击后页面URL:', page.url())

  fs.unlinkSync('C:/Users/aha/Desktop/1019/_tag_test.html')
  await browser.close()
  process.exit(0)
}

main().catch((e) => { console.error('失败:', e.message); process.exit(1) })
