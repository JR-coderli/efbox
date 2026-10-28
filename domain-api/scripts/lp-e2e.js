/**
 * LP 渲染 E2E:本地起 18999 接口(41个产品),静态服务 1019 目录,
 * 无头浏览器打开 _e2e_index.html 验证动态渲染与 clickflare 链接改写
 */
const path = require('path')
const http = require('http')
const fs = require('fs')
const Koa = require('koa')
const serve = require('koa-static')
const mount = require('koa-mount')
const lpRouter = require('../src/router/lp.router')
const publicLpRouter = require('../src/router/public.lp.router')
const lpHostGuard = require('../src/middleware/lp-host-guard.middleware')
const connection = require('../src/app/database')
const lpService = require('../src/service/lp.service')

const LP_DIR = 'C:/Users/aha/Desktop/1019'

async function main() {
  // 1. 接口服务(18999)
  const api = new Koa()
  api.use(lpHostGuard)
  api.use(mount('/lp/uploads', serve(path.join(__dirname, '..', 'uploads', 'lp'))))
  api.use(lpRouter.routes())
  api.use(publicLpRouter.routes())
  await new Promise((r) => api.listen(18999, r))
  console.log('[1] 接口服务: 127.0.0.1:18999')

  // 2. 静态服务(18998, 服务 1019 目录)
  const st = new Koa()
  st.use(serve(LP_DIR))
  await new Promise((r) => st.listen(18998, r))
  console.log('[2] 静态服务: 127.0.0.1:18998')

  // 3. 修改第 5 个产品的名字,验证 LP 端动态生效
  const [rows] = await connection.execute('SELECT id, name FROM lp_products ORDER BY `sort` LIMIT 1 OFFSET 4')
  const target = rows[0]
  await connection.execute('UPDATE lp_products SET name = ? WHERE id = ?', ['E2E-Modified-Name', target.id])
  console.log(`[3] 已把第5个产品(${target.name})改名为 E2E-Modified-Name`)

  // 4. 无头浏览器验证
  const puppeteer = require('puppeteer-core')
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  })
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:18998/_e2e_index.html', { waitUntil: 'networkidle0', timeout: 30000 })
  const result = await page.evaluate(() => {
    const blocks = document.querySelectorAll('#lp-products > div.pt-8')
    const fifth = blocks[4]
    const fifthTitle = fifth ? fifth.querySelector('.text-2xl div:last-child').textContent : ''
    const firstLink = fifth ? fifth.querySelector('a').getAttribute('href') : ''
    const onclickOk = fifth ? fifth.querySelector('a').getAttribute('onclick') === "window.clickflare.push('jump')" : false
    const videoCount = document.querySelectorAll('#lp-products video').length
    const imgCount = document.querySelectorAll('#lp-products img').length
    const jsLinkCount = document.querySelectorAll('#lp-products a[href^="javascript:window.clickflare.l="]').length
    const cfType = typeof window.clickflare
    return { blockCount: blocks.length, fifthTitle, firstLink, onclickOk, videoCount, imgCount, jsLinkCount, cfType }
  })
  console.log('[4] 页面验证:', JSON.stringify(result, null, 2))

  // 截图存档
  await page.screenshot({ path: path.join(LP_DIR, '_e2e_screenshot.png'), fullPage: false })
  console.log('[5] 截图: _e2e_screenshot.png')

  // 还原产品名
  await connection.execute('UPDATE lp_products SET name = ? WHERE id = ?', [target.name, target.id])
  console.log('[6] 已还原产品名:', target.name)

  await browser.close()
  process.exit(Object.keys(check(result)).length === 0 ? 0 : 1)

  function check(r) {
    const errs = {}
    if (r.blockCount !== 41) errs.blockCount = r.blockCount
    if (!r.fifthTitle.includes('E2E-Modified-Name')) errs.fifthTitle = r.fifthTitle
    if (!r.onclickOk) errs.onclick = 'missing'
    if (r.videoCount < 1) errs.videoCount = r.videoCount
    if (!r.jsLinkCount) errs.jsLinkCount = 0
    return errs
  }
}

main().catch((e) => { console.error('E2E 失败:', e.message); process.exit(1) })
