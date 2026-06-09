const connection = require('../app/database')

class OperationLogService {

  async log(userId, userName, module, operation, description = '', oldValue = null, newValue = null) {
    try {

      const logUserId = userId || 0
      const logUserName = userName || '系统'

      const statement = `
        INSERT INTO operation_log (user_id, user_name, module, operation, description, old_value, new_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      await connection.execute(statement, [
        logUserId,
        logUserName,
        module,
        operation,
        description,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null
      ])
    } catch (error) {
      console.error('记录操作日志失败:', error)
    }
  }


  async list(page = 1, pageSize = 20, module = null, startTime = null, endTime = null, userName = null) {
    const offset = (page - 1) * pageSize


    const conditions = []
    const params = []

    if (module) {
      conditions.push('module = ?')
      params.push(module)
    }

    if (startTime) {
      conditions.push('created_at >= ?')
      params.push(startTime)
    }

    if (endTime) {
      conditions.push('created_at <= ?')
      params.push(endTime)
    }

    if (userName) {
      conditions.push('user_name LIKE ?')
      params.push(`%${userName}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''


    const countStatement = `SELECT COUNT(*) as total FROM operation_log ${whereClause}`
    const [countResult] = await connection.execute(countStatement, params)
    const total = countResult[0].total


    const listStatement = `
      SELECT
        id, user_id, user_name, module, operation, description,
        old_value, new_value, created_at
      FROM operation_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    const [listResult] = await connection.execute(listStatement, [...params, String(pageSize), String(offset)])

    return {
      list: listResult,
      total: total,
      page: page,
      pageSize: pageSize
    }
  }


  async remove(ids) {
    const idArray = Array.isArray(ids) ? ids : [ids]
    const placeholders = idArray.map(() => '?').join(',')
    const statement = `DELETE FROM operation_log WHERE id IN (${placeholders})`
    await connection.execute(statement, idArray)
  }


  async removeByTimeRange(startTime, endTime) {
    const conditions = []
    const params = []

    if (startTime) {
      conditions.push('created_at >= ?')
      params.push(startTime)
    }

    if (endTime) {
      conditions.push('created_at <= ?')
      params.push(endTime)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const statement = `DELETE FROM operation_log ${whereClause}`
    await connection.execute(statement, params)
  }
}

module.exports = new OperationLogService()
