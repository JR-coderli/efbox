/**
 * 礼品清单 LP 动态页冒烟测试(本地)
 * 前置: domain-api 跑在 8001(已导入 gift 数据), 43490 目录静态服务跑在 8090
 *   cd C:/Users/aha/Desktop/1102/43490 && python -m http.server 8090
 * 用法: node scripts/lp-gift-smoke.js
 * 校验: 板块渲染/编号/分组/侧栏/标题头图注入/CTA链接/售罄样式/接口失败兜底, 并截图
 */
const path = require('path')
const os = require('os')
const puppeteer = require('puppeteer-core')

const PAGE_URL = 'http://localhost:8090/index.html'
const API_OK = 'http://localhost:8001'
const API_DEAD = 'http://localhost:9999' // 不存在的端口, 测失败兜底

let failed = 0
function check(name, cond, detail) {
  console.log(`${cond ? '✔' : '✘'} ${name}${detail ? ' | ' + detail : ''}`)
  if (!cond) failed++
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new'
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 1200 })

  // ---------- 正常渲染 ----------
  await page.goto(`${PAGE_URL}?api=${API_OK}`, { waitUntil: 'networkidle2', timeout: 30000 })
  await page.waitForSelector('#lp-sections section', { timeout: 15000 })

  const r = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('#lp-sections section')]
    const mainSections = sections.filter(s => s.querySelector('.smb-section-number'))
    const numbers = mainSections.map(s => s.querySelector('.smb-section-number').textContent.trim())
    const divider = sections.find(s => /New Arrivals/.test(s.textContent) && !s.querySelector('.smb-section-main'))
    const arrivals = sections.filter(s => s.querySelector('.smb-section-header-container'))
    const quick = document.querySelectorAll('#lp-quick-links li').length
    const bonus = document.querySelectorAll('#lp-bonus-links li').length
    const firstBtn = mainSections[0] && mainSections[0].querySelector('.smb-button a')
    return {
      sectionCount: sections.length,
      mainCount: mainSections.length,
      arrivalCount: arrivals.length,
      firstNumber: numbers[0],
      lastNumber: numbers[numbers.length - 1],
      hasDivider: !!divider,
      quick, bonus,
      title: document.getElementById('lp-title-text').textContent.trim().slice(0, 50),
      heroSrc: document.getElementById('lp-hero').getAttribute('src'),
      introLen: document.getElementById('lp-intro').innerHTML.length,
      firstBtnText: firstBtn && firstBtn.textContent.trim(),
      firstBtnOnclick: firstBtn && firstBtn.getAttribute('onclick'),
      firstBtnSoldOut: firstBtn && firstBtn.className.includes('sold-out-button'),
      firstImg: mainSections[0] && mainSections[0].querySelector('.smb-product-source img, .smb-product-source video')?.tagName,
      arrivalBtnOnclick: arrivals[0] && arrivals[0].querySelector('.smb-button a').getAttribute('onclick'),
      linkCount: document.querySelectorAll('#lp-sections a.product_link').length
    }
  })

  check('板块总数 48(29主+1分隔+18新品)', r.sectionCount === 48, `实际 ${r.sectionCount}`)
  check('主列表 29 / 新品 18', r.mainCount === 29 && r.arrivalCount === 18, `实际 ${r.mainCount}/${r.arrivalCount}`)
  check('主列表编号逆序 29.→1.', r.firstNumber === '29.' && r.lastNumber === '1.', `${r.firstNumber}→${r.lastNumber}`)
  check('New Arrivals 分隔栏存在', r.hasDivider)
  check('Quick Links 29 条 / Bonus 18 条', r.quick === 29 && r.bonus === 18, `${r.quick}/${r.bonus}`)
  check('大标题已注入', r.title.includes('29+ Clever Gadgets'), r.title)
  check('头图地址正确', r.heroSrc.includes('1789104504'), r.heroSrc)
  check('导语已注入', r.introLen > 500, `长度 ${r.introLen}`)
  check('CTA 文案与售罄样式', /Learn More About/.test(r.firstBtnText || '') && r.firstBtnSoldOut, r.firstBtnText)
  check('CTA 跳转 Goto 链路', (r.firstBtnOnclick || '').includes("Goto('https://eco.tsavros.com/cf/click/1')"), r.firstBtnOnclick)
  check('新品区 CTA 跳转链接', (r.arrivalBtnOnclick || '').includes('cf/click/30'), r.arrivalBtnOnclick)
  check('媒体渲染(img)', r.firstImg === 'IMG', String(r.firstImg))

  const shot = path.join(os.tmpdir(), 'lp-gift-smoke.png')
  await page.screenshot({ path: shot, fullPage: false })
  console.log('截图(上半屏):', shot)

  // ---------- 接口失败兜底 ----------
  const page2 = await browser.newPage()
  await page2.setViewport({ width: 1280, height: 800 })
  await page2.goto(`${PAGE_URL}?api=${API_DEAD}`, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((res) => setTimeout(res, 6000)) // 等重试 2 次(1s+3s)后兜底
  const f = await page2.evaluate(() => ({
    sectionsHidden: document.getElementById('lp-sections').style.display === 'none',
    asideHidden: document.querySelector('aside').style.display === 'none',
    headerVisible: !!document.querySelector('.smb-header-title') && document.getElementById('lp-title-text').textContent.includes('29+ Clever'),
    footerVisible: !!document.querySelector('.smb-footer')
  }))
  check('失败兜底: 产品区/侧栏隐藏, header/footer 可见', f.sectionsHidden && f.asideHidden && f.headerVisible && f.footerVisible, JSON.stringify(f))

  await browser.close()
  console.log(failed === 0 ? '\n全部通过 ✔' : `\n${failed} 项失败 ✘`)
  process.exit(failed === 0 ? 0 : 1)
})().catch((e) => { console.error('冒烟测试运行失败:', e.message); process.exit(1) })
