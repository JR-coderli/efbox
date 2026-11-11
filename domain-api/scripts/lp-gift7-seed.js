/**
 * 清单页LP v7 初始数据: 从线上 v6 公开接口复制全部产品+页面配置到 lp_gift7_* 表
 * (之后两套数据完全独立, 后台各改各的互不影响)
 *
 * 用法: node scripts/lp-gift7-seed.js [数据源接口地址]
 *   默认源: https://zorfell.com/lp/gift/products (线上 v6 实时数据)
 *   本地联调可传 http://localhost:8001/lp/gift/products
 * 可重复执行(先清空 v7 表再导入); 注意公开接口只返回启用中的产品
 */
const https = require('https')
const http = require('http')
const connection = require('../src/app/database')
const lpGift7Service = require('../src/service/lp-gift7.service')

const SOURCE = process.argv[2] || 'https://zorfell.com/lp/gift/products'

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { reject(new Error('源返回非JSON: ' + d.slice(0, 100))) }
      })
    }).on('error', reject)
  })
}

async function main() {
  console.log('数据源:', SOURCE)
  const res = await fetchJson(SOURCE)
  if (res.code !== 0 || !res.data) throw new Error('源接口返回异常: ' + JSON.stringify(res).slice(0, 120))
  const { products, config } = res.data
  console.log(`拉取到 ${products.length} 个产品`)

  // 清空 v7 再导入(可重复执行)
  await connection.execute('DELETE FROM lp_gift7_products;')
  let sort = 0
  for (const p of products) {
    sort += 1
    await lpGift7Service.create({
      sort,
      group_type: p.group_type,
      title: p.title,
      product_name: p.product_name,
      media_type: p.media_type,
      media_url: p.media_url, // 公开接口已把 /lp/uploads/ 拼成绝对地址, 直接存绝对地址同样可用
      media_style: p.media_style || null,
      content: p.content,
      link: p.link,
      sold_out: p.sold_out ? 1 : 0,
      enabled: 1
    })
  }
  if (config) {
    await lpGift7Service.updatePageConfig({ title: config.title, hero_url: config.hero_url, intro_html: config.intro_html })
  }

  // 校验
  const [cnt] = await connection.execute('SELECT COUNT(*) AS c, SUM(group_type = 1) AS mainCnt, SUM(group_type = 2) AS newArrivals FROM lp_gift7_products;')
  console.log(`\n导入完成: 共 ${cnt[0].c} 条(期望 ${products.length}) | 主列表 ${cnt[0].mainCnt} / New Arrivals ${cnt[0].newArrivals}`)
  if (cnt[0].c !== products.length) throw new Error('导入条数不符')
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('导入失败:', err.message)
  process.exit(1)
})
