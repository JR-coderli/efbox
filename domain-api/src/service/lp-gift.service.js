const connection = require('../app/database')

// LP 公开域名(拼接媒体绝对地址用,可在 .env 覆盖)
const LP_PUBLIC_BASE_URL = process.env.LP_PUBLIC_BASE_URL || 'https://zorfell.com'


// 统一正文段落字号。
// 内容来源三类, 分别处理:
// 1) px 字号: <p> 段落内替换(跳过含 <img 的评分行段落, 保留其小字号)
// 2) rem 字号(飞书等粘贴): 常出现在非 <p> 结构(div.rich-text-paragraph/h1 等),
//    这类结构没有评分行, p 外的字号直接替换
// 3) 完全没有字号的产品(靠页面默认字号渲染, 显示偏小): 给段落标签注入字号
function unifyBodyFontSize(content, px) {
  const re = /<p\b[^>]*>[\s\S]*?<\/p>/g
  let out = ''
  let last = 0
  let m
  while ((m = re.exec(content))) {
    // <p> 之前的部分(非 p 结构)——没有星级图评分行, 字号直接替换
    out += m.index > last ? unifySeg(content.slice(last, m.index), px) : ''
    // <p> 本身: 评分行(含 img)跳过, 其余统一
    out += m[0].includes('<img')
      ? m[0]
      : m[0].replace(/font-size:\s*[\d.]+(?:px|rem|em)/g, 'font-size: ' + px)
    last = m.index + m[0].length
  }
  out += unifySeg(content.slice(last), px)
  return out
}

// 非段落区间的字号替换(px/rem/em → 目标 px, !important 等后缀保留)
function unifySeg(seg, px) {
  return seg.replace(/font-size:\s*[\d.]+(?:px|rem|em)/g, 'font-size: ' + px)
}

// 给完全没有字号的产品注入字号: 给 p / 飞书 rich-text-paragraph div 开标签
// 加 font-size(已有 style 则前插, 文本靠继承生效)
function injectFontSize(content, px) {
  const inject = (tag, name, attrs) => {
    if (/font-size:/.test(attrs)) return tag
    if (/style="[^"]*"/.test(attrs)) {
      return '<' + name + attrs.replace(/style="([^"]*)"/, (s, v) => 'style="font-size: ' + px + '; ' + v + '"') + '>'
    }
    return '<' + name + attrs + ' style="font-size: ' + px + '">'
  }
  return content
    .replace(/<p\b([^>]*)>/g, (t, a) => inject(t, 'p', a))
    .replace(/<div\b([^>]*rich-text-paragraph[^>]*)>/g, (t, a) => inject(t, 'div', a))
}


class LpGiftService {

  // ============ 管理端 ============

  async list() {
    const statement = `
      SELECT id, \`sort\`, group_type, title, product_name, media_type, media_url, media_style,
             content, link, sold_out, enabled, createAt, updateAt
      FROM lp_gift_products
      ORDER BY \`sort\` ASC, id ASC;
    `
    const [result] = await connection.execute(statement)
    return result
  }


  async create(data) {
    const { sort, group_type, title, product_name, media_type, media_url, media_style, content, link, sold_out, enabled } = data
    let nextSort = sort
    if (nextSort === undefined || nextSort === null) {
      const [maxRow] = await connection.execute('SELECT MAX(`sort`) AS maxSort FROM lp_gift_products;')
      nextSort = (maxRow[0].maxSort || 0) + 1
    }
    const statement = `
      INSERT INTO lp_gift_products (\`sort\`, group_type, title, product_name, media_type, media_url, media_style, content, link, sold_out, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `
    const [result] = await connection.execute(statement, [
      nextSort, group_type ?? 1, title || null, product_name || null, media_type || 1,
      media_url || null, media_style || null, content || null, link || null, sold_out ?? 0, enabled ?? 1
    ])
    return { id: result.insertId, sort: nextSort }
  }


  async update(id, data) {
    const fields = ['sort', 'group_type', 'title', 'product_name', 'media_type', 'media_url', 'media_style', 'content', 'link', 'sold_out', 'enabled']
    const sets = []
    const params = []
    for (const f of fields) {
      if (data[f] !== undefined) {
        sets.push(`\`${f}\` = ?`)
        params.push(data[f])
      }
    }
    if (sets.length === 0) return true
    params.push(id)
    const statement = `UPDATE lp_gift_products SET ${sets.join(', ')} WHERE id = ?;`
    await connection.execute(statement, params)
    return true
  }


  async remove(id) {
    const statement = 'DELETE FROM lp_gift_products WHERE id = ?;'
    await connection.execute(statement, [id])
    return true
  }


  // 拖拽排序: products = [{id, sort}]
  async updateSort(products) {
    const promises = products.map((item) => {
      const statement = 'UPDATE lp_gift_products SET `sort` = ? WHERE id = ?;'
      return connection.execute(statement, [item.sort, item.id])
    })
    await Promise.all(promises)
    return true
  }


  // 批量统一正文字号: 只统一正文段落, 评分行(Rating: ★★★★ 带星级图的那种段落)保留原小字号。
  // 三类内容都处理: px 字号替换 / rem·em 字号(飞书粘贴)替换 / 完全无字号的产品注入字号
  // size: 如 '24px'; groupType: 1=仅主列表 2=仅New Arrivals 不传=全部
  async unifyFontSize(size, groupType) {
    const px = String(size || '').trim()
    if (!/^\d+(\.\d+)?px$/.test(px)) throw new Error('字号格式错误, 应如 24px')
    let sql = 'SELECT id, content FROM lp_gift_products'
    const params = []
    if (groupType === 1 || groupType === 2) {
      sql += ' WHERE group_type = ?'
      params.push(groupType)
    }
    const [rows] = await connection.execute(sql, params)
    let updated = 0
    for (const r of rows) {
      if (!r.content) continue
      const hasFontSize = /font-size:\s*[\d.]+(?:px|rem|em)/.test(r.content)
      const next = hasFontSize ? unifyBodyFontSize(r.content, px) : injectFontSize(r.content, px)
      if (next !== r.content) {
        await connection.execute('UPDATE lp_gift_products SET content = ? WHERE id = ?', [next, r.id])
        updated++
      }
    }
    return { total: rows.length, updated }
  }


  async getPageConfig() {
    const [result] = await connection.execute('SELECT id, title, hero_url, intro_html FROM lp_gift_page_config WHERE id = 1;')
    return result[0] || null
  }


  async updatePageConfig(data) {
    const { title, hero_url, intro_html } = data
    const statement = 'UPDATE lp_gift_page_config SET title = ?, hero_url = ?, intro_html = ? WHERE id = 1;'
    await connection.execute(statement, [title || null, hero_url || null, intro_html || null])
    return true
  }


  // ============ LP 公开端 ============

  // 把 /lp/uploads/... 的相对路径拼成公开域名的绝对地址;其余(LP 自带资源)原样返回
  composeMediaUrl(mediaUrl) {
    if (!mediaUrl) return ''
    if (mediaUrl.startsWith('/lp/uploads/')) {
      return LP_PUBLIC_BASE_URL + mediaUrl
    }
    return mediaUrl
  }


  async getPublicData() {
    const statement = `
      SELECT \`sort\`, group_type, title, product_name, media_type, media_url, media_style, content, link, sold_out, updateAt
      FROM lp_gift_products
      WHERE enabled = 1
      ORDER BY \`sort\` ASC, id ASC;
    `
    const [rows] = await connection.execute(statement)
    const [maxRow] = await connection.execute('SELECT MAX(updateAt) AS latest FROM lp_gift_products WHERE enabled = 1;')
    const config = await this.getPageConfig()

    const products = rows.map((r) => ({
      sort: r.sort,
      group_type: r.group_type,
      title: r.title,
      product_name: r.product_name,
      media_type: r.media_type,
      media_url: this.composeMediaUrl(r.media_url),
      media_style: r.media_style,
      content: r.content,
      link: r.link,
      sold_out: r.sold_out
    }))

    return {
      // 版本号:任意产品更新时间,LP 端用于判断是否需要重渲染
      version: String(maxRow[0].latest || ''),
      config: config || {},
      products
    }
  }
}


module.exports = new LpGiftService()
