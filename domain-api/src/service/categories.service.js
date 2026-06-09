const connection = require('../app/database')

class CategoriesService {

  async getAll(userId) {
    const statement = `
      SELECT
        c.id,
        c.category_name,
        c.\`level\`,
        c.\`sort\`,
        c.user_id,
        c.visibility,
        u.nickname as creator_nickname,
        u.name as creator_name
      FROM categories c
      LEFT JOIN cms_user u ON u.id = c.user_id
      WHERE c.user_id = ? OR c.visibility = 'public'
      ORDER BY c.\`sort\` ASC, c.id ASC;
    `
    const [result] = await connection.execute(statement, [userId])
    return result
  }


  async create(category_name, level, userId, visibility = 'private') {

    const [maxSortResult] = await connection.execute('SELECT MAX(`sort`) AS maxSort FROM categories;')
    const nextSort = (maxSortResult[0].maxSort || 0) + 1

    const statement = 'INSERT INTO categories (category_name, `level`, `sort`, user_id, visibility) VALUES (?, ?, ?, ?, ?);'
    const [result] = await connection.execute(statement, [category_name, level, nextSort, userId, visibility])
    return result
  }


  async checkHasLandingPages(categoryId) {
    const statement = 'SELECT COUNT(*) AS count FROM landingpage WHERE category_id = ?;'
    const [result] = await connection.execute(statement, [categoryId])
    return result[0].count > 0
  }


  async isOwner(categoryId, userId) {
    const statement = 'SELECT user_id FROM categories WHERE id = ?;'
    const [result] = await connection.execute(statement, [categoryId])
    if (result.length === 0) return false
    return result[0].user_id === userId
  }


  async remove(id, userId) {
    const statement = 'DELETE FROM categories WHERE id = ? AND user_id = ?;'
    const [result] = await connection.execute(statement, [id, userId])
    return result
  }


  async updateSort(categoryUpdates, userId) {


    const promises = categoryUpdates.map(item => {
      const statement = 'UPDATE categories SET `sort` = ? WHERE id = ? AND user_id = ?;'
      return connection.execute(statement, [item.sort, item.id, userId])
    })
    await Promise.all(promises)
    return true
  }
}

module.exports = new CategoriesService()
