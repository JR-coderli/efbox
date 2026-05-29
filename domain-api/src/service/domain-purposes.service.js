const connection = require('../app/database')

class DomainPurposesService {

  async getAllActive() {
    const statement = `
      SELECT id, name, sort_order, is_system
      FROM domain_purposes
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
    `
    const [result] = await connection.execute(statement)
    return result
  }


  async getAll(offset = 0, size = 100) {
    const listStatement = `
      SELECT *
      FROM domain_purposes
      ORDER BY sort_order ASC, id ASC
      LIMIT ? OFFSET ?
    `
    const countStatement = 'SELECT COUNT(*) as total FROM domain_purposes'

    const [list] = await connection.execute(listStatement, [String(size), String(offset)])
    const [countResult] = await connection.execute(countStatement)

    return {
      list,
      total: countResult[0].total
    }
  }


  async create(name, sortOrder = 999) {
    const statement = 'INSERT INTO `domain_purposes` (name, sort_order, is_system) VALUES (?, ?, 0)'
    try {
      const [result] = await connection.execute(statement, [name, sortOrder])
      return result
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return { error: '用途名称已存在' }
      }
      throw error
    }
  }


  async update(id, name, sortOrder) {
    const updates = []
    const values = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?')
      values.push(sortOrder)
    }

    if (updates.length === 0) return null

    const sql = `UPDATE domain_purposes SET ${updates.join(', ')} WHERE id = ?`
    values.push(id)

    try {
      const [result] = await connection.execute(sql, values)
      return result
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return { error: '用途名称已存在' }
      }
      throw error
    }
  }


  async remove(id) {

    const checkStatement = 'SELECT is_system FROM domain_purposes WHERE id = ?'
    const [checkResult] = await connection.execute(checkStatement, [id])

    if (checkResult.length === 0) {
      return { error: '用途不存在' }
    }

    if (checkResult[0].is_system === 1) {
      return { error: '系统内置用途不能删除' }
    }

    const statement = 'DELETE FROM `domain_purposes` WHERE id = ?'
    await connection.execute(statement, [id])

    return { success: true }
  }


  async toggleActive(id, isActive) {
    const statement = 'UPDATE domain_purposes SET is_active = ? WHERE id = ?'
    await connection.execute(statement, [isActive, id])
  }
}

module.exports = new DomainPurposesService()
