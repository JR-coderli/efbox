const connection = require('../app/database')

// LP 公开域名(拼接媒体绝对地址用,可在 .env 覆盖)
const LP_PUBLIC_BASE_URL = process.env.LP_PUBLIC_BASE_URL || 'https://zorfell.com'


// 统一正文段落字号(与 lp-gift.service 同款逻辑, 表不同, 详见那边的注释)
function unifyBodyFontSize(content, px) {
  const re = /<p\b[^>]*>[\s\S]*?<\/p>/g
  let out = ''
  let last = 0
  let m
  while ((m = re.exec(content))) {
    out += m.index > last ? unifySeg(content.slice(last, m.index), px) : ''
    out += m[0].includes('<img')
      ? m[0]
      : m[0].replace(/font-size:\s*[\d.]+(?:px|rem|em)/g, 'font-size: ' + px)
    last = m.index + m[0].length
  }
  out += unifySeg(content.slice(last), px)
  return out
}

function unifySeg(seg, px) {
  return seg.replace(/font-size:\s*[\d.]+(?:px|rem|em)/g, 'font-size: ' + px)
}

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


class LpGift7Service {

  // ============ 管理端 ============

  async list() {
    const statement = `
      SELECT id, \`sort\`, group_type, title, subtitle, subtitle_size, product_name, media_type, media_url, media_style,
             content, link, sold_out, enabled, createAt, updateAt
      FROM lp_gift7_products
      ORDER BY \`sort\` ASC, id ASC;
    `
    const [result] = await connection.execute(statement)
    return result
  }


  async create(data) {
    const { sort, group_type, title, subtitle, subtitle_size, product_name, media_type, media_url, media_style, content, link, sold_out, enabled } = data
    let nextSort = sort
    if (nextSort === undefined || nextSort === null) {
      const [maxRow] = await connection.execute('SELECT MAX(`sort`) AS maxSort FROM lp_gift7_products;')
      nextSort = (maxRow[0].maxSort || 0) + 1
    }
    const statement = `
      INSERT INTO lp_gift7_products (\`sort\`, group_type, title, subtitle, subtitle_size, product_name, media_type, media_url, media_style, content, link, sold_out, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `
    const [result] = await connection.execute(statement, [
      nextSort, group_type ?? 1, title || null, subtitle || null, subtitle_size ?? null, product_name || null, media_type || 1,
      media_url || null, media_style || null, content || null, link || null, sold_out ?? 0, enabled ?? 1
    ])
    return { id: result.insertId, sort: nextSort }
  }


  async update(id, data) {
    const fields = ['sort', 'group_type', 'title', 'subtitle', 'subtitle_size', 'product_name', 'media_type', 'media_url', 'media_style', 'content', 'link', 'sold_out', 'enabled']
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
    const statement = `UPDATE lp_gift7_products SET ${sets.join(', ')} WHERE id = ?;`
    await connection.execute(statement, params)
    return true
  }


  async remove(id) {
    const statement = 'DELETE FROM lp_gift7_products WHERE id = ?;'
    await connection.execute(statement, [id])
    return true
  }


  // 拖拽排序: products = [{id, sort}]
  async updateSort(products) {
    const promises = products.map((item) => {
      const statement = 'UPDATE lp_gift7_products SET `sort` = ? WHERE id = ?;'
      return connection.execute(statement, [item.sort, item.id])
    })
    await Promise.all(promises)
    return true
  }


  // 批量统一正文字号(逻辑与 lp-gift.service.unifyFontSize 相同)
  async unifyFontSize(size, groupType) {
    const px = String(size || '').trim()
    if (!/^\d+(\.\d+)?px$/.test(px)) throw new Error('字号格式错误, 应如 24px')
    let sql = 'SELECT id, content FROM lp_gift7_products'
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
        await connection.execute('UPDATE lp_gift7_products SET content = ? WHERE id = ?', [next, r.id])
        updated++
      }
    }
    return { total: rows.length, updated }
  }


  async getPageConfig() {
    const [result] = await connection.execute('SELECT id, title, hero_url, intro_html FROM lp_gift7_page_config WHERE id = 1;')
    return result[0] || null
  }


  async updatePageConfig(data) {
    const { title, hero_url, intro_html } = data
    const statement = 'UPDATE lp_gift7_page_config SET title = ?, hero_url = ?, intro_html = ? WHERE id = 1;'
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
      SELECT \`sort\`, group_type, title, subtitle, subtitle_size, product_name, media_type, media_url, media_style, content, link, sold_out, updateAt
      FROM lp_gift7_products
      WHERE enabled = 1
      ORDER BY \`sort\` ASC, id ASC;
    `
    const [rows] = await connection.execute(statement)
    const [maxRow] = await connection.execute('SELECT MAX(updateAt) AS latest FROM lp_gift7_products WHERE enabled = 1;')
    const config = await this.getPageConfig()

    const products = rows.map((r) => ({
      sort: r.sort,
      group_type: r.group_type,
      title: r.title,
      subtitle: r.subtitle,
      subtitle_size: r.subtitle_size,
      product_name: r.product_name,
      media_type: r.media_type,
      media_url: this.composeMediaUrl(r.media_url),
      media_style: r.media_style,
      content: r.content,
      link: r.link,
      sold_out: r.sold_out
    }))

    return {
      version: String(maxRow[0].latest || ''),
      config: config || {},
      products
    }
  }
}


module.exports = new LpGift7Service()
