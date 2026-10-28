/**
 * 存量导入:解析 LP 页(C:\Users\aha\Desktop\1019\index.html)的 41 个产品块,写入 lp_products
 * 用法: node scripts/lp-import-products.js
 * 可重复执行:先清空 lp_products 再导入
 */
const fs = require('fs')
const connection = require('../src/app/database')
const lpService = require('../src/service/lp.service')

const LP_HTML = 'C:/Users/aha/Desktop/1019/index.html'

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

function parseBlocks(html) {
  const starts = []
  const re = /<div class="pt-8">/g
  let m
  while ((m = re.exec(html))) starts.push(m.index)
  if (starts.length === 0) throw new Error('未找到产品块')

  const blocks = []
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : html.indexOf('</footer>', starts[i])
    blocks.push(html.slice(starts[i], end))
  }
  return blocks
}

function parseOne(seg) {
  // 标题: <strong>N.</strong></span><div>HEADLINE</div>
  const hm = seg.match(/<strong>\d+<!-- -->\.<\/strong><\/span><div>([^<]+)<\/div>/)
  if (!hm) throw new Error('未解析到标题: ' + seg.slice(0, 100))
  const headline = decodeEntities(hm[1]).trim()
  // name = ' - ' 前的部分(处理 RyoZen 双空格), hook = 之后
  const sep = headline.indexOf(' - ')
  const name = sep > 0 ? headline.slice(0, sep).trim() : headline
  const hook = sep > 0 ? headline.slice(sep + 3).trim() : null

  // 折扣角标
  const dm = seg.match(/Discount: <!-- -->(\d+)<!-- -->% OFF/)
  const discount = dm ? parseInt(dm[1], 10) : 50

  // 评分
  const rm = seg.match(/drop-shadow-lg">([\d.]+)<\/span>/)
  const rating = rm ? parseFloat(rm[1]) : 5.0

  // 媒体
  const vm = seg.match(/<video[^>]+src="([^"]+)"/)
  const im = seg.match(/<img[^>]+src="(images\/[^"?]+)"/)
  let mediaType = 1
  let mediaUrl = null
  if (vm) { mediaType = 2; mediaUrl = vm[1] }
  else if (im) { mediaType = 1; mediaUrl = im[1] }

  // 段落
  const paras = []
  const bodyMatch = seg.match(/<div class="mb-4 text-lg leading-relaxed space-y-4">([\s\S]*?)<\/div>(?=<a )/)
  if (bodyMatch) {
    const bodyHtml = bodyMatch[1]
    const pRe = /<p class="mb-4">([\s\S]*?)<\/p>/g
    let pm
    while ((pm = pRe.exec(bodyHtml))) paras.push(pm[1])
  }
  const p1 = paras[0] ? stripTags(paras[0]) : null
  const p2 = paras[1] ? stripTags(paras[1]) : null
  let p3Pre = null
  let p3Post = null
  const p3html = paras[2]
  if (p3html) {
    // 结构: 🔥 前文 <a...><strong>name</strong></a> 后文 🔥
    const am = p3html.match(/([\s\S]*?)<a [^>]*><strong[^>]*>[^<]+<\/strong><\/a>([\s\S]*)/)
    if (am) {
      p3Pre = stripTags(am[1]).replace(/🔥/g, '').trim() || null
      p3Post = stripTags(am[2]).replace(/🔥/g, '').trim() || null
    } else {
      const t = stripTags(p3html).replace(/🔥/g, '').trim()
      if (t) p3Pre = t
    }
  }

  return { name, hook, p1, p2, p3_pre: p3Pre, p3_post: p3Post, discount, rating, media_type: mediaType, media_url: mediaUrl }
}

async function main() {
  const html = fs.readFileSync(LP_HTML, 'utf-8')
  const blocks = parseBlocks(html)
  console.log('解析到产品块:', blocks.length)

  const products = blocks.map(parseOne)
  // 抽查两条
  console.log('第1条:', JSON.stringify({ ...products[0], p1: (products[0].p1 || '').slice(0, 40) }))
  console.log('第14条:', JSON.stringify({ ...products[13], p1: (products[13].p1 || '').slice(0, 40) }))

  // 清空重导
  await connection.execute('DELETE FROM lp_products;')
  let sort = 0
  for (const p of products) {
    sort += 1
    await lpService.create({ ...p, sort, enabled: 1 })
  }
  const [count] = await connection.execute('SELECT COUNT(*) AS c FROM lp_products')
  console.log('导入完成, lp_products 行数:', count[0].c)
  process.exit(0)
}

main().catch((e) => { console.error('导入失败:', e.message); process.exit(1) })
