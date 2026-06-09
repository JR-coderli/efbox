const connection = require('../app/database')

class DomainMonetstatusNoticeService {

  async create(domain, status) {
    const statement = 'INSERT INTO domain_monetstatus_notice (domain, status) VALUES (?, ?)'
    const [result] = await connection.execute(statement, [domain, status])
    return result
  }

  async getList(offset = 0, size = 20) {
    const listStatement = `
      SELECT id, domain, status, received_at
      FROM domain_monetstatus_notice
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `
    const countStatement = 'SELECT COUNT(*) as total FROM domain_monetstatus_notice'

    const [list] = await connection.execute(listStatement, [String(size), String(offset)])
    const [countResult] = await connection.execute(countStatement)

    return {
      list,
      total: countResult[0].total
    }
  }

  async remove(id) {
    const statement = 'DELETE FROM domain_monetstatus_notice WHERE id = ?'
    const [result] = await connection.execute(statement, [id])
    return result
  }
}

module.exports = new DomainMonetstatusNoticeService()
