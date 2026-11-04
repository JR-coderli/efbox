/**
 * 存量导入:解析礼品清单 LP 页(C:\Users\aha\Desktop\1102\43490\index.html)的 47 个产品板块,
 * 写入 lp_gift_products + lp_gift_page_config
 * 用法: node scripts/lp-gift-import-products.js [源HTML路径]
 * 默认优先读 index.static.bak.html(页面动态化改造前的原始版本, 含全部硬编码板块);
 * 若不存在则读 index.html(此时要求是未改造的原始版本)
 * 可重复执行:先清空 lp_gift_products 再导入, 页面配置每次覆盖写入
 */
const fs = require('fs')
const path = require('path')
const connection = require('../src/app/database')
const lpGiftService = require('../src/service/lp-gift.service')

const DIR = 'C:/Users/aha/Desktop/1102/43490'
const BAK = path.join(DIR, 'index.static.bak.html')
const ORIG = path.join(DIR, 'index.html')
const SRC = process.argv[2] || (fs.existsSync(BAK) ? BAK : ORIG)

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ')
}


/** 解析单个 <section> 板块 */
function parseSection(seg, groupType, index) {
  const where = `第 ${index + 1} 个板块`
  // 板块标题(.smb-section-title 锚文本)
  const tm = seg.match(/class="smb-section-title[^"]*"[^>]*>([\s\S]*?)<\/a>/)
  if (!tm) throw new Error(`${where}: 未解析到板块标题`)
  const title = decodeEntities(tm[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

  // 跳转链接(第一个 Goto(...) 地址, 标题/媒体/CTA 按钮均用同一链接)
  const lm = seg.match(/onclick="Goto\('([^']+)'\)"/)
  if (!lm) throw new Error(`${where}: 未解析到跳转链接(${title})`)
  const link = lm[1]

  // 媒体(.smb-product-source 内: video 优先, 否则 img; 相对路径原样保留)
  const srcMatch = seg.match(/class="smb-product-source"([\s\S]*?)<\/div>/)
  if (!srcMatch) throw new Error(`${where}: 未解析到媒体区(${title})`)
  const vm = srcMatch[1].match(/<video[^>]*\ssrc="([^"]+)"/)
  const im = srcMatch[1].match(/<img[^>]*\ssrc="([^"]+)"/)
  let mediaType = 1
  let mediaUrl = null
  if (vm) { mediaType = 2; mediaUrl = vm[1] }
  else if (im) { mediaType = 1; mediaUrl = im[1] }
  else throw new Error(`${where}: 媒体区内无 img/video(${title})`)

  // 正文(.smb-section-main 的 innerHTML, 到 smb-button 为止, 保留原始内联样式)
  const cm = seg.match(/class="smb-section-main"[^>]*>([\s\S]*?)<div class="smb-button/)
  if (!cm) throw new Error(`${where}: 未解析到正文(${title})`)
  // 捕获区间会带出 section-main 自己的闭合 </div>(它在正文与 smb-button 之间), 去掉
  const content = cm[1].trim().replace(/\s*<\/div>\s*$/, '').trim()
  if (!content.includes('<p')) throw new Error(`${where}: 正文内容异常(${title})`)

  // CTA 按钮完整文案(锚文本, 压缩空白)
  const bm = seg.match(/class="smb-button[^"]*"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/)
  if (!bm) throw new Error(`${where}: 未解析到CTA按钮(${title})`)
  const productName = decodeEntities(bm[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

  // 售罄样式(CTA 锚带 sold-out-button 类)
  const soldOut = /class="product_link sold-out-button"/.test(seg) ? 1 : 0

  return { group_type: groupType, title, product_name: productName, media_type: mediaType, media_url: mediaUrl, content, link, sold_out: soldOut, enabled: 1 }
}


/** 解析 header: 页面大标题 / 头图 / 导语HTML */
function parseHeader(html) {
  const hm = html.match(/<header>([\s\S]*?)<\/header>/)
  if (!hm) throw new Error('未找到 <header>')
  const header = hm[1]

  // 大标题: h1.smb-header-title 中最后一个非空 span 文本(第一个 h1 是空的)
  const titles = [...header.matchAll(/<h1 class="smb-header-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/g)]
    .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const title = titles[titles.length - 1] || null

  // 头图: header 内第一个不带 width 属性的 img(带 width 的是作者行小头像)
  let heroUrl = null
  for (const m of header.matchAll(/<img[^>]*\ssrc="([^"]+)"[^>]*>/g)) {
    if (!/\swidth=/.test(m[0])) { heroUrl = m[1]; break }
  }

  // 导语: 头图所在 <p> 之后到 </header> 的全部段落(保留原始内联样式)
  let introHtml = null
  if (heroUrl) {
    const heroPos = header.indexOf(heroUrl)
    const afterHero = header.slice(heroPos)
    const pEnd = afterHero.indexOf('</p>') // 头图所在 <p> 的结束
    if (pEnd > -1) {
      const intro = afterHero.slice(pEnd + 4).trim()
      if (intro.includes('<p')) introHtml = intro
    }
  }

  return { title, hero_url: heroUrl, intro_html: introHtml }
}


async function main() {
  console.log('源文件:', SRC)
  const html = fs.readFileSync(SRC, 'utf-8')

  // 切出全部 <section>, 用 New Arrivals 分隔栏划分主列表/新品区
  const sections = html.match(/<section[^>]*>[\s\S]*?<\/section>/g) || []
  const dividerIdx = sections.findIndex((s) => /<h2[^>]*>[^<]*New Arrivals/.test(s))
  if (dividerIdx === -1) throw new Error('未找到 New Arrivals 分隔栏, 无法划分分组')

  const mainSections = sections.slice(0, dividerIdx)
  const arrivalSections = sections.slice(dividerIdx + 1)
  console.log(`板块数: 主列表 ${mainSections.length} + New Arrivals ${arrivalSections.length}(另有分隔栏 1 个)`)

  const products = []
  mainSections.forEach((seg, i) => products.push(parseSection(seg, 1, i)))
  arrivalSections.forEach((seg, i) => products.push(parseSection(seg, 2, mainSections.length + i)))

  const config = parseHeader(html)
  console.log('页面配置:', { title: config.title, hero_url: config.hero_url, intro_html: (config.intro_html || '').slice(0, 80) + '...' })

  // 清空后重导(可重复执行)
  await connection.execute('DELETE FROM lp_gift_products;')
  let sort = 0
  for (const p of products) {
    sort += 1
    await lpGiftService.create({ ...p, sort })
  }
  await lpGiftService.updatePageConfig(config)

  // 校验
  const [cnt] = await connection.execute('SELECT COUNT(*) AS c FROM lp_gift_products;')
  const [byGroup] = await connection.execute('SELECT group_type, COUNT(*) AS c FROM lp_gift_products GROUP BY group_type;')
  console.log(`\n导入完成: 共 ${cnt[0].c} 条(期望 ${products.length})`)
  console.log('分组统计:', byGroup.map((r) => `group_type=${r.group_type}: ${r.c}`).join(', '))
  if (cnt[0].c !== products.length) throw new Error('导入条数不符')
  process.exit(0)
}


main().catch((err) => {
  console.error('导入失败:', err.message)
  process.exit(1)
})
