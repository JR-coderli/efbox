const connection = require('../app/database')
const { addDaysToDateStr } = require('../utils/format-date')

class PaymentCustomerService {

  async create(customerInfo) {
    const { send_emails, normal_emails, ...mainData } = customerInfo


    const mainKeys = Object.keys(mainData)
    const mainValues = Object.values(mainData)
    const placeholders = mainKeys.map(() => '?').join(', ')

    const sqlInsertMain = `
      INSERT INTO payment_customers (${mainKeys.join(', ')})
      VALUES (${placeholders})
    `
    const [mainResult] = await connection.execute(sqlInsertMain, mainValues)
    const customerId = mainResult.insertId


    if (send_emails && Array.isArray(send_emails) && send_emails.length > 0) {
      const sendEmailValues = send_emails.map(email => [
        customerId,
        email.email,
        email.remark || null,
        'send'
      ])
      await connection.query(
        'INSERT INTO payment_customer_emails (customer_id, email, remark, type) VALUES ?',
        [sendEmailValues]
      )
    }


    if (normal_emails && Array.isArray(normal_emails) && normal_emails.length > 0) {
      const normalEmailValues = normal_emails.map(email => [
        customerId,
        email.email,
        email.remark || null,
        'normal'
      ])
      await connection.query(
        'INSERT INTO payment_customer_emails (customer_id, email, remark, type) VALUES ?',
        [normalEmailValues]
      )
    }

    return { insertId: customerId }
  }


  async remove(id) {

    await connection.execute('DELETE FROM payment_customer_emails WHERE customer_id = ?', [id])

    await connection.execute('DELETE FROM payment_customers WHERE id = ?', [id])
  }


  async update(customerId, customerInfo) {
    const { emails, full_name, short_name, company_address, remark } = customerInfo


    const updateFields = []
    const updateValues = []

    if (full_name !== undefined) {
      updateFields.push('full_name = ?')
      updateValues.push(full_name)
    }
    if (short_name !== undefined) {
      updateFields.push('short_name = ?')
      updateValues.push(short_name)
    }
    if (company_address !== undefined) {
      updateFields.push('company_address = ?')
      updateValues.push(company_address)
    }
    if (remark !== undefined) {
      updateFields.push('remark = ?')
      updateValues.push(remark)
    }

    if (updateFields.length > 0) {
      updateValues.push(customerId)
      const sqlUpdate = `
        UPDATE payment_customers
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `
      await connection.execute(sqlUpdate, updateValues)
    }


    if (emails && Array.isArray(emails)) {

      await connection.execute('DELETE FROM payment_customer_emails WHERE customer_id = ?', [customerId])


      if (emails.length > 0) {
        const emailValues = emails.map(email => [
          customerId,
          email.email,
          email.remark || null,
          email.type || 'send'
        ])
        await connection.query(
          'INSERT INTO payment_customer_emails (customer_id, email, remark, type) VALUES ?',
          [emailValues]
        )
      }
    }
  }


  async list(customerInfo) {
    const { filters = {}, options = {} } = customerInfo
    const { page = 1, pageSize = 20, orderBy = 'id DESC' } = options


    const whereClauses = []
    const params = []

    for (const key in filters) {
      const value = filters[key]
      if (value === undefined || value === null) continue

      if (Array.isArray(value) && value.length === 2) {
        whereClauses.push(`${key} BETWEEN ? AND ?`)
        params.push(value[0], value[1])
      } else {
        whereClauses.push(`${key} LIKE ?`)
        params.push(`%${value}%`)
      }
    }

    const whereSQL = whereClauses.length ? whereClauses.join(' AND ') : '1'
    const offset = (page - 1) * pageSize


    const sqlMain = `
      SELECT *
      FROM payment_customers
      WHERE ${whereSQL}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset};
    `
    const [mainRows] = await connection.execute(sqlMain, params)


    if (mainRows.length > 0) {
      const customerIds = mainRows.map(row => row.id)
      const [emailRows] = await connection.execute(
        `SELECT id, customer_id, email, remark, type FROM payment_customer_emails WHERE customer_id IN (${customerIds.map(() => '?').join(',')})`,
        customerIds
      )


      const emailMap = {}
      for (const email of emailRows) {
        if (!emailMap[email.customer_id]) {
          emailMap[email.customer_id] = []
        }
        emailMap[email.customer_id].push({
          id: email.id,
          email: email.email,
          remark: email.remark,
          type: email.type
        })
      }


      for (const customer of mainRows) {
        customer.emails = emailMap[customer.id] || []
      }
    }


    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as totalCount FROM payment_customers WHERE ${whereSQL};`,
      params
    )

    return {
      data: mainRows,
      totalCount: countResult[0].totalCount,
      page,
      pageSize
    }
  }


  async updateRemark(customerId, customerInfo) {
    const statement = `
      UPDATE payment_customers
      SET remark = ?
      WHERE id = ?;
    `
    await connection.execute(statement, [customerInfo.remark, customerId])
  }


  async updatePayCycleDays(customerId, customerInfo) {

    const statement = `
      UPDATE payment_customers
      SET payment_cycle_days = ?
      WHERE id = ?;
    `
    await connection.execute(statement, [customerInfo.payment_cycle_days, customerId])


    const [tracks] = await connection.execute(
      `SELECT id, createAt FROM payment_tracks WHERE customer_id = ?`,
      [customerId]
    )


    for (const item of tracks) {
      const payable_date = addDaysToDateStr(item.createAt, Number(customerInfo.payment_cycle_days))


      await connection.execute(
        `UPDATE payment_tracks SET payable_date = ? WHERE id = ?`,
        [payable_date, item.id]
      )
    }
  }
}

module.exports = new PaymentCustomerService()
