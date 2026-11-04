const connection = require('../app/database')

// LP 公开域名(拼接媒体绝对地址用,可在 .env 覆盖)
const LP_PUBLIC_BASE_URL = process.env.LP_PUBLIC_BASE_URL || 'https://zorfell.com'


class LpGiftService {

  // ============ 管理端 ============

  async list() {
    const statement = `
      SELECT id, \`sort\`, group_type, title, product_name, media_type, media_url,
             content, link, sold_out, enabled, createAt, updateAt
      FROM lp_gift_products
      ORDER BY \`sort\` ASC, id ASC;
    `
    const [result] = await connection.execute(statement)
    return result
  }


  async create(data) {
    const { sort, group_type, title, product_name, media_type, media_url, content, link, sold_out, enabled } = data
    let nextSort = sort
    if (nextSort === undefined || nextSort === null) {
      const [maxRow] = await connection.execute('SELECT MAX(`sort`) AS maxSort FROM lp_gift_products;')
      nextSort = (maxRow[0].maxSort || 0) + 1
    }
    const statement = `
      INSERT INTO lp_gift_products (\`sort\`, group_type, title, product_name, media_type, media_url, content, link, sold_out, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `
    const [result] = await connection.execute(statement, [
      nextSort, group_type ?? 1, title || null, product_name || null, media_type || 1,
      media_url || null, content || null, link || null, sold_out ?? 0, enabled ?? 1
    ])
    return { id: result.insertId, sort: nextSort }
  }


  async update(id, data) {
    const fields = ['sort', 'group_type', 'title', 'product_name', 'media_type', 'media_url', 'content', 'link', 'sold_out', 'enabled']
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
      SELECT \`sort\`, group_type, title, product_name, media_type, media_url, content, link, sold_out, updateAt
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
