const connection = require('../app/database')

// LP 公开域名(拼接媒体绝对地址用,可在 .env 覆盖)
const LP_PUBLIC_BASE_URL = process.env.LP_PUBLIC_BASE_URL || 'https://zorfell.com'


class LpService {

  // ============ 管理端 ============

  async list() {
    const statement = `
      SELECT id, \`sort\`, name, hook, p1, p2, p3_pre, p3_post,
             discount, rating, media_type, media_url, enabled, createAt, updateAt
      FROM lp_products
      ORDER BY \`sort\` ASC, id ASC;
    `
    const [result] = await connection.execute(statement)
    return result
  }


  async create(data) {
    const { sort, name, hook, p1, p2, p3_pre, p3_post, discount, rating, media_type, media_url, enabled } = data
    let nextSort = sort
    if (nextSort === undefined || nextSort === null) {
      const [maxRow] = await connection.execute('SELECT MAX(`sort`) AS maxSort FROM lp_products;')
      nextSort = (maxRow[0].maxSort || 0) + 1
    }
    const statement = `
      INSERT INTO lp_products (\`sort\`, name, hook, p1, p2, p3_pre, p3_post, discount, rating, media_type, media_url, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `
    const [result] = await connection.execute(statement, [
      nextSort, name, hook || null, p1 || null, p2 || null, p3_pre || null, p3_post || null,
      discount ?? 50, rating ?? 5.0, media_type || 1, media_url || null, enabled ?? 1
    ])
    return { id: result.insertId, sort: nextSort }
  }


  async update(id, data) {
    const fields = ['sort', 'name', 'hook', 'p1', 'p2', 'p3_pre', 'p3_post', 'discount', 'rating', 'media_type', 'media_url', 'enabled']
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
    const statement = `UPDATE lp_products SET ${sets.join(', ')} WHERE id = ?;`
    await connection.execute(statement, params)
    return true
  }


  async remove(id) {
    const statement = 'DELETE FROM lp_products WHERE id = ?;'
    await connection.execute(statement, [id])
    return true
  }


  // 拖拽排序: products = [{id, sort}]
  async updateSort(products) {
    const promises = products.map((item) => {
      const statement = 'UPDATE lp_products SET `sort` = ? WHERE id = ?;'
      return connection.execute(statement, [item.sort, item.id])
    })
    await Promise.all(promises)
    return true
  }


  async getPageConfig() {
    const [result] = await connection.execute('SELECT id, title, subtitle, banner_url FROM lp_page_config WHERE id = 1;')
    return result[0] || null
  }


  async updatePageConfig(data) {
    const { title, subtitle, banner_url } = data
    const statement = 'UPDATE lp_page_config SET title = ?, subtitle = ?, banner_url = ? WHERE id = 1;'
    await connection.execute(statement, [title || null, subtitle || null, banner_url || null])
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
      SELECT \`sort\`, name, hook, p1, p2, p3_pre, p3_post, discount, rating, media_type, media_url, updateAt
      FROM lp_products
      WHERE enabled = 1
      ORDER BY \`sort\` ASC, id ASC;
    `
    const [rows] = await connection.execute(statement)
    const [maxRow] = await connection.execute('SELECT MAX(updateAt) AS latest FROM lp_products WHERE enabled = 1;')
    const config = await this.getPageConfig()

    const products = rows.map((r) => ({
      sort: r.sort,
      name: r.name,
      hook: r.hook,
      p1: r.p1,
      p2: r.p2,
      p3_pre: r.p3_pre,
      p3_post: r.p3_post,
      discount: r.discount,
      rating: Number(r.rating),
      media_type: r.media_type,
      media_url: this.composeMediaUrl(r.media_url)
    }))

    return {
      // 版本号:任意产品更新时间,LP 端用于判断是否需要重渲染
      version: String(maxRow[0].latest || ''),
      config: config || {},
      products
    }
  }
}


module.exports = new LpService()
