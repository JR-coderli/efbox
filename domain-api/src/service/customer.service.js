const connection = require('../app/database')
const { addDayToDay, addDaysToDateStr } = require('../utils/format-date')

class CustomerService {

  async create(customerInfo) {
    const { send_emails, normal_emails, ...mainData } = customerInfo


    const mainKeys = Object.keys(mainData)
    const mainValues = Object.values(mainData)
    const placeholders = mainKeys.map(() => '?').join(', ')

    const sqlInsertMain = `
      INSERT INTO customers (${mainKeys.join(', ')})
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
        'INSERT INTO customer_emails (customer_id, email, remark, type) VALUES ?',
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
        'INSERT INTO customer_emails (customer_id, email, remark, type) VALUES ?',
        [normalEmailValues]
      )
    }

    return { insertId: customerId }
  }


  async remove(id) {

    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM customer_attachments WHERE customer_id = ?',
      [id]
    )
    if (countResult[0].count > 0) {
      const error = new Error('该客户下存在附件, 请先删除附件后再删除客户')
      error.code = 'HAS_ATTACHMENTS'
      throw error
    }


    await connection.execute('DELETE FROM customer_emails WHERE customer_id = ?', [id])

    // 同步清理该客户的附件查看授权（若建表时已加外键 ON DELETE CASCADE，这里冗余无害）
    try {
      await connection.execute('DELETE FROM customer_attachment_grants WHERE customer_id = ?', [id])
    } catch (err) {
      console.log('[customers remove] 清理授权记录失败（表可能未建）:', err && err.message)
    }

    await connection.execute('DELETE FROM customers WHERE id = ?', [id])
  }


  async update(customerId, customerInfo) {
    const { emails, full_name, short_name, company_address, remark, invoice_entity_id } = customerInfo


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
    if (invoice_entity_id !== undefined) {
      updateFields.push('invoice_entity_id = ?')
      updateValues.push(invoice_entity_id)
    }

    if (updateFields.length > 0) {
      updateValues.push(customerId)
      const sqlUpdate = `
        UPDATE customers
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `
      await connection.execute(sqlUpdate, updateValues)
    }


    if (emails && Array.isArray(emails)) {

      await connection.execute('DELETE FROM customer_emails WHERE customer_id = ?', [customerId])


      if (emails.length > 0) {
        const emailValues = emails.map(email => [
          customerId,
          email.email,
          email.remark || null,
          email.type || 'send'
        ])
        await connection.query(
          'INSERT INTO customer_emails (customer_id, email, remark, type) VALUES ?',
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
      FROM customers
      WHERE ${whereSQL}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset};
    `
    const [mainRows] = await connection.execute(sqlMain, params)


    if (mainRows.length > 0) {
      const customerIds = mainRows.map(row => row.id)
      const [emailRows] = await connection.execute(
        `SELECT id, customer_id, email, remark, type FROM customer_emails WHERE customer_id IN (${customerIds.map(() => '?').join(',')})`,
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


      const customersWithEntity = mainRows.filter(c => c.invoice_entity_id)
      if (customersWithEntity.length > 0) {
        const entityIds = customersWithEntity.map(c => c.invoice_entity_id)
        const [invoiceEntities] = await connection.execute(
          `SELECT id, name FROM invoice_entity WHERE id IN (${entityIds.map(() => '?').join(',')})`,
          entityIds
        )


        const entityMap = {}
        for (const entity of invoiceEntities) {
          entityMap[entity.id] = { id: entity.id, name: entity.name }
        }


        for (const customer of mainRows) {
          if (customer.invoice_entity_id) {
            customer.invoice_entity = entityMap[customer.invoice_entity_id] || null
          } else {
            customer.invoice_entity = null
          }
        }
      } else {

        for (const customer of mainRows) {
          customer.invoice_entity = null
        }
      }


      for (const customer of mainRows) {
        try {
          const [countResult] = await connection.execute(
            'SELECT COUNT(*) as count FROM customer_attachments WHERE customer_id = ?',
            [customer.id]
          )
          customer.attachment_count = countResult[0]?.count || 0
        } catch (err) {
          customer.attachment_count = 0
        }
      }


      // 附带每个客户的已授权用户（"用户授权"列展示用；表未建/查询失败不影响列表）
      try {
        const grantedMap = await this.getGrantedUsersMap(customerIds)
        for (const customer of mainRows) {
          customer.granted_users = grantedMap[customer.id] || []
        }
      } catch (err) {
        console.log('[customers list] 查询授权用户失败:', err && err.message)
        for (const customer of mainRows) {
          customer.granted_users = []
        }
      }
    }


    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as totalCount FROM customers WHERE ${whereSQL};`,
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
      UPDATE customers
      SET remark = ?
      WHERE id = ?;
    `
    await connection.execute(statement, [customerInfo.remark, customerId])
  }


  async updatePayCycleDays(customerId, customerInfo) {

    const customersSql = `
      UPDATE customers
      SET payment_cycle_days = ?
      WHERE id = ?;
    `
    await connection.execute(customersSql, [customerInfo.payment_cycle_days, customerId])


    const [attachments] = await connection.execute(
      `SELECT id, createAt FROM customer_attachments WHERE customer_id = ?`,
      [customerId]
    )


    for (const item of attachments) {
      const receivable_date = addDaysToDateStr(item.createAt, Number(customerInfo.payment_cycle_days))


      await connection.execute(
        `UPDATE customer_attachments SET receivable_date = ? WHERE id = ?`,
        [receivable_date, item.id]
      )
    }
  }


  // ===== 客户附件查看授权 =====

  // 校验用户是否拥有 system:customers:grant 权限（后端防伪造，与前端列可见性同一权限点）
  async hasGrantPermission(userId) {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count
       FROM role_menu rm
       JOIN menu m ON rm.menuId = m.id
       JOIN cms_user u ON u.role_id = rm.roleId
       WHERE u.id = ? AND m.permission = 'system:customers:grant'`,
      [userId]
    )
    return (rows[0]?.count || 0) > 0
  }


  // 可被授权的用户简表（授权气泡选人用）
  // 排除：技术员角色（本身可看全部附件，无需授权）、与操作者同角色的账号（含操作者自己）
  async getGrantableUsers(operatorId) {
    const [rows] = await connection.execute(
      `SELECT u.id, u.name, u.nickname, r.name AS role_name
       FROM cms_user u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE (r.name IS NULL OR r.name <> '技术员')
         AND u.role_id <> (SELECT role_id FROM cms_user WHERE id = ?)
       ORDER BY u.id`,
      [operatorId]
    )
    return rows
  }

  // 给用户授权某客户全部附件（重复授权幂等：已存在则忽略）
  async grantAttachment(userId, customerId, grantedBy) {
    await connection.execute(
      `INSERT IGNORE INTO customer_attachment_grants (user_id, customer_id, granted_by) VALUES (?, ?, ?)`,
      [userId, customerId, grantedBy || null]
    )
  }


  // 撤销授权
  async revokeAttachment(userId, customerId) {
    const [result] = await connection.execute(
      'DELETE FROM customer_attachment_grants WHERE user_id = ? AND customer_id = ?',
      [userId, customerId]
    )
    return { affectedRows: result.affectedRows }
  }


  // 某客户当前已授权的用户列表（含用户名，供前端展示/撤销）
  async getGrantedUsers(customerId) {
    const [rows] = await connection.execute(
      `SELECT g.user_id AS id, u.name, u.nickname, g.createAt AS granted_at` +
      ` FROM customer_attachment_grants g` +
      ` LEFT JOIN cms_user u ON g.user_id = u.id` +
      ` WHERE g.customer_id = ?` +
      ` ORDER BY g.createAt DESC`,
      [customerId]
    )
    return rows
  }


  // 批量查多个客户的授权用户（客户列表列展示用），返回 { customerId: [{id, name, nickname}] }
  async getGrantedUsersMap(customerIds) {
    const map = {}
    if (!customerIds || customerIds.length === 0) return map
    const [rows] = await connection.execute(
      `SELECT g.customer_id, g.user_id AS id, u.name, u.nickname` +
      ` FROM customer_attachment_grants g` +
      ` LEFT JOIN cms_user u ON g.user_id = u.id` +
      ` WHERE g.customer_id IN (${customerIds.map(() => '?').join(',')})` +
      ` ORDER BY g.createAt DESC`,
      customerIds
    )
    for (const row of rows) {
      if (!map[row.customer_id]) map[row.customer_id] = []
      map[row.customer_id].push({ id: row.id, name: row.name, nickname: row.nickname })
    }
    return map
  }
}

module.exports = new CustomerService()
