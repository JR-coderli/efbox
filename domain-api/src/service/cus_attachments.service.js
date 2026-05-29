const connection = require('../app/database')
const { addDayToDay } = require('../utils/format-date')

class CusAttachmentsService {

  async create(cusAttachmentsInfo) {
    const { attachments, invoice_entity_id, userinfo, ...customerData } = cusAttachmentsInfo


    const [customers] = await connection.execute(
      'SELECT payment_cycle_days FROM customers WHERE id = ?',
      [cusAttachmentsInfo.id]
    )
    const payment_cycle_days = customers[0]?.payment_cycle_days || 0


    const attachment = attachments[0]
    const receivable_date = addDayToDay(new Date(), Number(payment_cycle_days))

    const sqlInsert = `
      INSERT INTO customer_attachments (
        customer_id, amount, period, filename, destination,
        mail_status, receivable_date, invoice_entity_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const values = [
      cusAttachmentsInfo.id,
      attachment.amount || null,
      attachment.period || null,
      attachment.filename || null,
      attachment.destination || null,
      attachment.mail_status || 'unsent',
      receivable_date,
      invoice_entity_id || null,
      userinfo?.user_id || null
    ]

    const [result] = await connection.execute(sqlInsert, values)
    return { childInsertId: result.insertId }
  }


  async remove(id) {
    await connection.execute('DELETE FROM customer_attachments WHERE id = ?', [id])
  }


  async update(cusAttachmentId, cusAttachmentsInfo) {
    const { amount, period, filename, destination, mail_status, payment_status, amount_received, confirmed_date, receivable_date, invoice_entity_id } = cusAttachmentsInfo

    const updateFields = []
    const values = []

    if (amount !== undefined) {
      updateFields.push('amount = ?')
      values.push(amount)
    }
    if (period !== undefined) {
      updateFields.push('period = ?')
      values.push(period)
    }
    if (filename !== undefined) {
      updateFields.push('filename = ?')
      values.push(filename)
    }
    if (destination !== undefined) {
      updateFields.push('destination = ?')
      values.push(destination)
    }
    if (mail_status !== undefined) {
      updateFields.push('mail_status = ?')
      values.push(mail_status)
    }
    if (payment_status !== undefined) {
      updateFields.push('payment_status = ?')
      values.push(payment_status)
    }
    if (amount_received !== undefined) {
      updateFields.push('amount_received = ?')
      values.push(amount_received)
    }
    if (confirmed_date !== undefined) {
      updateFields.push('confirmed_date = ?')
      values.push(confirmed_date)
    }
    if (receivable_date !== undefined) {
      updateFields.push('receivable_date = ?')
      values.push(receivable_date)
    }
    if (invoice_entity_id !== undefined) {
      updateFields.push('invoice_entity_id = ?')
      values.push(invoice_entity_id)
    }

    if (updateFields.length > 0) {
      values.push(cusAttachmentId)
      const sql = `
        UPDATE customer_attachments
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `
      await connection.execute(sql, values)
    }
  }


  async list(cusAttachmentsInfo) {
    const { filters = {}, options = {} } = cusAttachmentsInfo
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


    const sqlCustomers = `
      SELECT *
      FROM customers
      WHERE ${whereSQL}
      ORDER BY ${orderBy}
      LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)};
    `
    const [customers] = await connection.execute(sqlCustomers, params)

    if (customers.length === 0) {
      return {
        data: [],
        totalCount: 0,
        page,
        pageSize
      }
    }

    const customerIds = customers.map(c => c.id)


    const sqlAttachments = `
      SELECT * FROM customer_attachments
      WHERE customer_id IN (${customerIds.map(() => '?').join(',')})
      ORDER BY id DESC
    `
    const [attachments] = await connection.execute(sqlAttachments, customerIds)


    const attachmentMap = {}
    for (const att of attachments) {
      if (!attachmentMap[att.customer_id]) {
        attachmentMap[att.customer_id] = []
      }
      attachmentMap[att.customer_id].push(att)
    }


    const sqlEmails = `
      SELECT id, customer_id, email, remark, type FROM customer_emails
      WHERE customer_id IN (${customerIds.map(() => '?').join(',')})
    `
    const [emails] = await connection.execute(sqlEmails, customerIds)


    const emailMap = {}
    for (const email of emails) {
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


    const data = customers.map(customer => ({
      ...customer,
      attachments: attachmentMap[customer.id] || [],
      emails: emailMap[customer.id] || []
    }))


    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as totalCount FROM customers WHERE ${whereSQL};`,
      params
    )

    return {
      data,
      totalCount: countResult[0].totalCount,
      page,
      pageSize
    }
  }


  async attalist(cusAttachmentsInfo) {
    const { page, pageSize, short_name, payment_status, role_name, user_id, sort_prop, sort_order } = cusAttachmentsInfo;



    let sql = `
      SELECT
        ca.id AS attachment_id,
        ca.amount,
        ca.period,
        ca.filename,
        ca.destination,
        ca.mail_status,
        ca.createAt,
        ca.amount_received,
        ca.payment_status,
        ca.confirmed_date,
        ca.receivable_date,
        ca.created_by,
        u.name AS creator_name,
        c.id AS customer_id,
        c.full_name,
        c.short_name,
        c.company_address,
        ie.name AS invoice_entity_name
      FROM customer_attachments AS ca
      LEFT JOIN customers AS c ON ca.customer_id = c.id
      LEFT JOIN cms_user AS u ON ca.created_by = u.id
      LEFT JOIN invoice_entity AS ie ON ca.invoice_entity_id = ie.id
    `;

    let countSql = `
      SELECT COUNT(*) AS total
      FROM customer_attachments AS ca
      LEFT JOIN customers AS c ON ca.customer_id = c.id
    `;

    const params = [];
    const countParams = [];


    const privilegedRoles = ['管理员', '技术员', '财务']; // 特权角色，可查看全部附件
    let whereClauses = []; // 保存 WHERE 条件

    if (privilegedRoles.includes(role_name)) {

    } else if (role_name && user_id) {

      whereClauses.push('ca.created_by = ?');
      params.push(user_id);
      countParams.push(user_id);
    } else {

      whereClauses.push('1 = 0'); // 永远不成立
    }


    if (short_name && short_name.trim() !== '') {
      whereClauses.push('c.short_name LIKE ?');
      params.push(`%${short_name}%`);
      countParams.push(`%${short_name}%`);
    }


    if (payment_status && payment_status.trim() !== '') {
      whereClauses.push('ca.payment_status = ?');
      params.push(payment_status);
      countParams.push(payment_status);
    }


    if (whereClauses.length > 0) {
      const whereSql = ' WHERE ' + whereClauses.join(' AND ');
      sql += whereSql;
      countSql += whereSql;
    }



    const allowedSortProps = ['id', 'amount', 'createAt', 'period', 'confirmed_date', 'receivable_date', 'amount_received', 'amount_diff', 'mail_status'];
    const allowedSortOrders = ['asc', 'desc', 'ASC', 'DESC'];


    if (sort_prop && sort_prop !== '' && sort_order && sort_order !== '' && allowedSortProps.includes(sort_prop)) {
      const validSortOrder = allowedSortOrders.includes(sort_order) ? sort_order.toUpperCase() : 'DESC';

      if (sort_prop === 'amount') {
        sql += ` ORDER BY ca.amount ${validSortOrder}`;
      } else if (sort_prop === 'amount_received') {
        sql += ` ORDER BY ca.amount_received ${validSortOrder}`;
      } else if (sort_prop === 'amount_diff') {

        sql += ` ORDER BY (ca.amount_received - ca.amount) ${validSortOrder}`;
      } else if (sort_prop === 'mail_status') {



        sql += ` ORDER BY CASE WHEN ca.mail_status = 'sent' THEN 1 ELSE 0 END ${validSortOrder}, ca.id DESC`;
      } else {
        sql += ` ORDER BY ca.${sort_prop} ${validSortOrder}`;
      }
    } else {

      sql += ` ORDER BY ca.createAt DESC`;
    }


    if (page && pageSize) {
      const limit = Number(pageSize);
      const offset = (Number(page) - 1) * limit;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(String(limit), String(offset));
    }

    try {

      const [rows] = await connection.execute(sql, params);
      const [countRows] = await connection.execute(countSql, countParams);

      if (rows.length === 0) {
        return { rows: [], total: 0 };
      }


      const customerIds = [...new Set(rows.map(r => r.customer_id))];


      const emailSql = `
        SELECT id, customer_id, email, type
        FROM customer_emails
        WHERE customer_id IN (${customerIds.map(() => "?").join(",")})
      `;
      const [emailRows] = await connection.execute(emailSql, customerIds);


      const emailMap = {}
      emailRows.forEach(e => {
        if (!emailMap[e.customer_id]) emailMap[e.customer_id] = [];
        emailMap[e.customer_id].push({
          id: e.id,
          email: e.email,
          type: e.type
        })
      })


      const formatted = rows.map(item => {
        return {
          id: item.attachment_id,
          amount: item.amount,
          period: item.period,
          filename: item.filename,
          destination: item.destination,
          mail_status: item.mail_status,
          createAt: item.createAt,
          amount_received: item.amount_received,
          payment_status: item.payment_status,
          confirmed_date: item.confirmed_date,
          receivable_date: item.receivable_date,
          creator_name: item.creator_name || '-',
          invoice_entity_name: item.invoice_entity_name || '-',

          customer: {
            id: item.customer_id,
            full_name: item.full_name,
            short_name: item.short_name,
            company_address: item.company_address,
            emails: emailMap[item.customer_id] || []  // 邮件在这里
          }
        }
      });

      return {
        rows: formatted,
        total: countRows[0].total
      }

    } catch (error) {
      console.log('[attalist] 查询出错:', error)
      return {
        rows: [],
        total: 0
      }
    }
  }


  async customerList({ short_name } = {}) {
    let sql = 'SELECT * FROM customers'
    const params = []

    if (short_name) {
      sql += ' WHERE short_name LIKE ?'
      params.push(`%${short_name}%`)
    }

    const [rows] = await connection.execute(sql, params)
    return rows
  }
}

module.exports = new CusAttachmentsService()
