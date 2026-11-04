/** 线上 LP 实测:打开 pro2 v2 页面,检查渲染结果、fetch 状态与控制台错误 */
async function main() {
  const puppeteer = require('puppeteer-core')
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()
  const logs = []
  page.on('console', (m) => logs.push('[console] ' + m.text().slice(0, 150)))
  page.on('pageerror', (e) => logs.push('[pageerror] ' + String(e).slice(0, 200)))
  page.on('requestfailed', (r) => logs.push('[reqfail] ' + r.url().slice(0, 100) + ' ' + (r.failure() || {}).errorText))
  let apiResp = null
  page.on('response', async (r) => {
    if (r.url().includes('/lp/products')) {
      try { apiResp = { status: r.status(), body: (await r.text()).slice(0, 150) } }
      catch (e) { apiResp = { status: r.status(), err: String(e).slice(0, 80) } }
    }
  })

  // 两次刷新:排除浏览器缓存因素
  await page.goto('https://pro2.winrab.com/s2/1/ecomlistical/v2/', { waitUntil: 'networkidle0', timeout: 40000 })
  const r1 = await page.evaluate(() => {
    const blocks = document.querySelectorAll('#lp-products > div.pt-8')
    return {
      blockCount: blocks.length,
      firstTitle: blocks[0] ? blocks[0].querySelector('.text-2xl div:last-child').textContent.slice(0, 50) : 'none'
    }
  })
  await page.reload({ waitUntil: 'networkidle0' })
  const r2 = await page.evaluate(() => {
    const blocks = document.querySelectorAll('#lp-products > div.pt-8')
    return {
      blockCount: blocks.length,
      firstTitle: blocks[0] ? blocks[0].querySelector('.text-2xl div:last-child').textContent.slice(0, 50) : 'none'
    }
  })

  console.log('第一次:', JSON.stringify(r1))
  console.log('第二次:', JSON.stringify(r2))
  console.log('API响应:', JSON.stringify(apiResp))
  console.log('页面日志:')
  logs.slice(0, 10).forEach((l) => console.log(' ', l))
  await browser.close()
  process.exit(0)
}

main().catch((e) => { console.error('失败:', e.message); process.exit(1) })
