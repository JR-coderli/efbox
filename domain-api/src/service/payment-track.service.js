const connection = require('../app/database')
const { addDayToDay } = require('../utils/format-date')

class PaymentTrackService {

  async create(trackInfo) {
    const { customer_id, payment_entity, amount, period, remark, created_by, attachments, vouchers, currency } = trackInfo


    const [customers] = await connection.execute(
      'SELECT payment_cycle_days FROM payment_customers WHERE id = ?',
      [customer_id]
    )
    const payment_cycle_days = customers[0]?.payment_cycle_days || 0
    const payable_date = addDayToDay(new Date(), Number(payment_cycle_days))


    const sqlInsert = `
      INSERT INTO payment_tracks (customer_id, payment_entity, amount, period, payable_date, remark, created_by, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    const values = [
      customer_id || null,
      payment_entity || null,
      amount || 0.00,
      period || null,
      payable_date,
      remark || null,
      created_by || null,
      currency || null
    ]
    const [result] = await connection.execute(sqlInsert, values)
    const trackId = result.insertId


    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const attValues = attachments.map(att => [
        trackId,
        att.filename || null,
        att.mimetype || null,
        att.size || 0,
        att.destination || null
      ])
      await connection.query(
        'INSERT INTO payment_track_attachments (payment_track_id, filename, mimetype, size, destination) VALUES ?',
        [attValues]
      )
    }


    if (vouchers && Array.isArray(vouchers) && vouchers.length > 0) {
      const vouValues = vouchers.map(vou => [
        trackId,
        vou.filename || null,
        vou.mimetype || null,
        vou.size || 0,
        vou.destination || null
      ])
      await connection.query(
        'INSERT INTO payment_track_vouchers (payment_track_id, filename, mimetype, size, destination) VALUES ?',
        [vouValues]
      )
    }

    return { insertId: trackId }
  }


  async remove(id) {
    await connection.execute('DELETE FROM payment_tracks WHERE id = ?', [id])
  }


  async update(trackId, trackInfo) {
    const {
      amount, period, amount_paid, payment_status, payable_date,
      confirmed_date, remark, payment_entity, customer_id, currency
    } = trackInfo

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
    if (amount_paid !== undefined) {
      updateFields.push('amount_paid = ?')
      values.push(amount_paid)
    }
    if (payment_status !== undefined) {
      updateFields.push('payment_status = ?')
      values.push(payment_status)
    }
    if (payable_date !== undefined) {
      updateFields.push('payable_date = ?')
      values.push(payable_date)
    }
    if (confirmed_date !== undefined) {
      updateFields.push('confirmed_date = ?')
      values.push(confirmed_date)
    }
    if (remark !== undefined) {
      updateFields.push('remark = ?')
      values.push(remark)
    }
    if (payment_entity !== undefined) {
      updateFields.push('payment_entity = ?')
      values.push(payment_entity)
    }
    if (customer_id !== undefined) {
      updateFields.push('customer_id = ?')
      values.push(customer_id)
    }
    if (currency !== undefined) {
      updateFields.push('currency = ?')
      values.push(currency)
    }

    if (updateFields.length > 0) {
      values.push(trackId)
      const sql = `
        UPDATE payment_tracks
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `
      await connection.execute(sql, values)
    }
  }


  async list(trackInfo) {
    const { page, pageSize, short_name, payment_status, year, month, currency, payment_entity, start_date, end_date, role_name, user_id, sort_prop, sort_order } = trackInfo


    let sql = `
      SELECT
        pt.id,
        pt.amount,
        pt.period,
        pt.amount_paid,
        pt.payment_status,
        pt.payable_date,
        pt.confirmed_date,
        pt.remark,
        pt.payment_entity,
        pt.currency,
        pt.customer_id,
        pt.created_by,
        pt.createAt,
        pt.updateAt,
        pc.full_name,
        pc.short_name,
        u.name AS creator_name
      FROM payment_tracks AS pt
      LEFT JOIN payment_customers AS pc ON pt.customer_id = pc.id
      LEFT JOIN cms_user AS u ON pt.created_by = u.id
    `

    let countSql = `
      SELECT COUNT(*) AS total
      FROM payment_tracks AS pt
      LEFT JOIN payment_customers AS pc ON pt.customer_id = pc.id
    `

    const params = []
    const countParams = []


    const privilegedRoles = ['管理员', '技术员', '财务']
    const whereClauses = []

    if (privilegedRoles.includes(role_name)) {

    } else if (role_name && user_id) {
      whereClauses.push('pt.created_by = ?')
      params.push(user_id)
      countParams.push(user_id)
    } else {
      whereClauses.push('1 = 0')
    }


    if (short_name && short_name.trim() !== '') {
      whereClauses.push('pc.short_name LIKE ?')
      params.push(`%${short_name}%`)
      countParams.push(`%${short_name}%`)
    }


    if (payment_status && payment_status.trim() !== '') {
      if (payment_status.trim() === '未付款') {
        // 未付款 = payment_status 不是「【已付款】」（含 NULL、空字符串及其他自定义状态）
        whereClauses.push("(pt.payment_status IS NULL OR pt.payment_status != '【已付款】')")
      } else {
        whereClauses.push('pt.payment_status = ?')
        params.push(payment_status)
        countParams.push(payment_status)
      }
    }


    // 按周期起始日期的年份筛选（period 格式：YYYY-MM-DD - YYYY-MM-DD）
    if (year !== undefined && year !== null && String(year).trim() !== '') {
      whereClauses.push('LEFT(pt.period, 4) = ?')
      const y = String(year).trim()
      params.push(y)
      countParams.push(y)
    }


    // 按周期起始日期的月份筛选
    if (month !== undefined && month !== null && String(month).trim() !== '') {
      whereClauses.push('SUBSTRING(pt.period, 6, 2) = ?')
      const m = String(month).trim().padStart(2, '0')
      params.push(m)
      countParams.push(m)
    }


    // 按币种精确筛选
    if (currency && String(currency).trim() !== '') {
      whereClauses.push('pt.currency = ?')
      const c = String(currency).trim()
      params.push(c)
      countParams.push(c)
    }


    // 按付款主体精确筛选
    if (payment_entity && String(payment_entity).trim() !== '') {
      whereClauses.push('pt.payment_entity = ?')
      const e = String(payment_entity).trim()
      params.push(e)
      countParams.push(e)
    }


    // 按创建时间范围筛选（createAt 为 DATETIME，补齐时分秒以保证整天范围包含）
    if (start_date && String(start_date).trim() !== '') {
      whereClauses.push('pt.createAt >= ?')
      const d = String(start_date).trim()
      params.push(`${d} 00:00:00`)
      countParams.push(`${d} 00:00:00`)
    }
    if (end_date && String(end_date).trim() !== '') {
      whereClauses.push('pt.createAt <= ?')
      const d = String(end_date).trim()
      params.push(`${d} 23:59:59`)
      countParams.push(`${d} 23:59:59`)
    }


    if (whereClauses.length > 0) {
      const whereSql = ' WHERE ' + whereClauses.join(' AND ')
      sql += whereSql
      countSql += whereSql
    }


    const allowedSortProps = ['id', 'amount', 'amount_paid', 'createAt', 'payment_status', 'payable_date', 'confirmed_date']
    const allowedSortOrders = ['asc', 'desc', 'ASC', 'DESC']

    if (sort_prop && sort_prop !== '' && sort_order && sort_order !== '' && allowedSortProps.includes(sort_prop)) {
      const validSortOrder = allowedSortOrders.includes(sort_order) ? sort_order.toUpperCase() : 'DESC'
      sql += ` ORDER BY pt.${sort_prop} ${validSortOrder}`
    } else {
      sql += ` ORDER BY pt.createAt DESC`
    }


    if (page && pageSize) {
      const limit = Number(pageSize)
      const offset = (Number(page) - 1) * limit
      sql += ` LIMIT ? OFFSET ?`
      params.push(String(limit), String(offset))
    }

    try {
      const [rows] = await connection.execute(sql, params)
      const [countRows] = await connection.execute(countSql, countParams)

      if (rows.length === 0) {
        return { rows: [], total: 0 }
      }


      const trackIds = rows.map(r => r.id)


      const [attachments] = await connection.execute(
        `SELECT id, payment_track_id, filename, mimetype, size, destination, thumbnail, createAt FROM payment_track_attachments WHERE payment_track_id IN (${trackIds.map(() => '?').join(',')})`,
        trackIds
      )
      const attMap = {}
      for (const att of attachments) {
        if (!attMap[att.payment_track_id]) attMap[att.payment_track_id] = []
        attMap[att.payment_track_id].push(att)
      }


      const [vouchers] = await connection.execute(
        `SELECT id, payment_track_id, filename, mimetype, size, destination, thumbnail, createAt FROM payment_track_vouchers WHERE payment_track_id IN (${trackIds.map(() => '?').join(',')})`,
        trackIds
      )
      const vouMap = {}
      for (const vou of vouchers) {
        if (!vouMap[vou.payment_track_id]) vouMap[vou.payment_track_id] = []
        vouMap[vou.payment_track_id].push(vou)
      }


      const formatted = rows.map(item => ({
        id: item.id,
        amount: item.amount,
        period: item.period,
        amount_paid: item.amount_paid,
        payment_status: item.payment_status,
        payable_date: item.payable_date,
        confirmed_date: item.confirmed_date,
        remark: item.remark,
        payment_entity: item.payment_entity,
        currency: item.currency,
        customer_id: item.customer_id,
        created_by: item.created_by,
        createAt: item.createAt,
        updateAt: item.updateAt,
        creator_name: item.creator_name || '-',
        customer: {
          id: item.customer_id,
          full_name: item.full_name,
          short_name: item.short_name
        },
        attachments: attMap[item.id] || [],
        vouchers: vouMap[item.id] || []
      }))

      return {
        rows: formatted,
        total: countRows[0].total
      }
    } catch (error) {
      console.log('[payment_track list] 查询出错:', error)
      return { rows: [], total: 0 }
    }
  }


  async createAttachment(fileInfo) {
    const { payment_track_id, filename, mimetype, size, destination, thumbnail } = fileInfo
    const sql = `
      INSERT INTO payment_track_attachments (payment_track_id, filename, mimetype, size, destination, thumbnail)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const [result] = await connection.execute(sql, [payment_track_id, filename, mimetype, size, destination, thumbnail || null])
    return { insertId: result.insertId }
  }


  async createVoucher(fileInfo) {
    const { payment_track_id, filename, mimetype, size, destination, thumbnail } = fileInfo
    const sql = `
      INSERT INTO payment_track_vouchers (payment_track_id, filename, mimetype, size, destination, thumbnail)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const [result] = await connection.execute(sql, [payment_track_id, filename, mimetype, size, destination, thumbnail || null])
    return { insertId: result.insertId }
  }


  async removeAttachment(id) {
    await connection.execute('DELETE FROM payment_track_attachments WHERE id = ?', [id])
  }


  async removeVoucher(id) {
    await connection.execute('DELETE FROM payment_track_vouchers WHERE id = ?', [id])
  }


  async entityOptions() {
    const [rows] = await connection.execute(
      "SELECT DISTINCT payment_entity FROM payment_tracks WHERE payment_entity IS NOT NULL AND payment_entity != '' ORDER BY payment_entity"
    )
    return rows.map(r => r.payment_entity)
  }


  async currencyOptions() {
    const [rows] = await connection.execute(
      "SELECT DISTINCT currency FROM payment_tracks WHERE currency IS NOT NULL AND currency != '' ORDER BY currency"
    )
    return rows.map(r => r.currency)
  }


  async statusOptions() {
    const [rows] = await connection.execute(
      "SELECT DISTINCT payment_status FROM payment_tracks WHERE payment_status IS NOT NULL AND payment_status != '' ORDER BY payment_status"
    )
    return rows.map(r => r.payment_status)
  }


  async customerList() {
    const [rows] = await connection.execute('SELECT id, full_name, short_name, payment_cycle_days FROM payment_customers')
    return rows
  }
}

module.exports = new PaymentTrackService()
