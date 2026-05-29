const connection = require('../app/database')
const deleteData = require('../hooks/delete-data')
const insertData = require('../hooks/insert-data')
const queryList = require('../hooks/query-list')
const updateData = require('../hooks/update-date')

class InvoiceEntityService {

  async create(entityInfo) {
    await insertData(connection, 'invoice_entity', entityInfo)
  }


  async remove(id) {
    await deleteData(connection, 'invoice_entity', { id })
  }


  async update(entityId, entityInfo) {
    await updateData(
      connection,
      'invoice_entity',
      entityId,
      entityInfo,
      {
        mainWhitelist: [
          'name',
          'account_name',
          'account_number',
          'bank_name',
          'swift_code',
          'bank_code',
          'branch_code',
          'company_address',
          'bank_address',
          'status',
          'is_top',
          'template_path'
        ]
      }
    )
  }


  async list(entityInfo) {
    const { filters = {}, options = {} } = entityInfo

    const result = await queryList(
      connection,
      'invoice_entity',
      filters,
      options
    )


    if (result.data && Array.isArray(result.data)) {
      for (const item of result.data) {
        try {
          const [countResult] = await connection.execute(
            'SELECT COUNT(*) as count FROM customer_attachments WHERE invoice_entity_id = ?',
            [item.id]
          )
          item.attachment_count = countResult[0]?.count || 0
        } catch (err) {
          item.attachment_count = 0
        }
      }
    }

    return result
  }


  async getById(id) {
    const statement = `SELECT * FROM invoice_entity WHERE id = ?`
    const [result] = await connection.execute(statement, [id])
    return result[0] || null
  }


  async setTop(id) {

    await connection.execute(`UPDATE invoice_entity SET is_top = 0 WHERE is_top = 1`)

    await connection.execute(`UPDATE invoice_entity SET is_top = 1 WHERE id = ?`, [id])
  }


  async getTop() {
    const statement = `SELECT * FROM invoice_entity WHERE is_top = 1 AND status = 1 LIMIT 1`
    const [rows] = await connection.execute(statement)
    return rows[0] || null
  }
}

module.exports = new InvoiceEntityService()
