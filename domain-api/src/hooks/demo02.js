
await insertData(connection, 'customers', {
  full_name: 'Kobe Bryant',
  short_name: 'KOBE',
  remark: 'NBA Legend',
  emails: [
    { email: 'kobe@test.com', remark: '主邮箱' },
    { email: 'mamba@nba.com', remark: '备用邮箱' }
  ]
}, {
  relations: [
    {
      table: 'customer_emails',
      foreignKey: 'customer_id',
      fields: ['email', 'remark'],
      sourceKey: 'emails'
    }
  ]
})


await insertData(connection, 'customers', {
  id: 3,
  attachments: [
    { filename: '合同1.pdf', mimetype: 'application/pdf', size: 10240 },
    { filename: '发票.jpg', mimetype: 'image/jpeg', size: 2048 }
  ]
}, {
  relations: [
    {
      table: 'customer_attachments',
      foreignKey: 'customer_id',
      fields: '*',
      sourceKey: 'attachments'
    }
  ]
})


async function insertData(connection, mainTable, mainData, options = {}) {
  const { relations = [] } = options
  let mainId = mainData.id || null


  if (mainId) {
    const [exist] = await connection.execute(
      `SELECT id FROM ${mainTable} WHERE id = ? LIMIT 1`,
      [mainId]
    )
    if (exist.length === 0) {
      console.log(`主表 ${mainTable} 中不存在 id=${mainId} 的记录，无法插入子表数据。`)

      return
    }
  }


  if (!mainId) {

    const mainFields = { ...mainData }
    for (const rel of relations) delete mainFields[rel.sourceKey]

    const mainKeys = Object.keys(mainFields)
    const mainValues = Object.values(mainFields)

    if (mainKeys.length === 0) {
      console.log(`插入 ${mainTable}主表时, 字段为空`)
      return
    }

    const placeholders = mainKeys.map(() => '?').join(', ')
    const sqlInsertMain = `
      INSERT INTO ${mainTable} (${mainKeys.join(', ')})
      VALUES (${placeholders})
    `
    const [mainResult] = await connection.execute(sqlInsertMain, mainValues)
    mainId = mainResult.insertId
  }


  for (const rel of relations) {
    let { table: childTable, foreignKey, fields, sourceKey } = rel
    const childRecords = mainData[sourceKey]
    if (!childRecords || !childRecords.length) continue


    if (fields === '*') {
      const [cols] = await connection.query(`SHOW COLUMNS FROM ${childTable}`)
      fields = cols
        .map(c => c.Field)
        .filter(f => !['id', foreignKey, 'created_at', 'updated_at', 'createAt', 'updateAt'].includes(f))
    }

    const childValues = childRecords.map(item => [
      mainId,
      ...fields.map(f => item[f] ?? null)
    ])

    const sqlInsertChild = `
      INSERT INTO ${childTable} (${[foreignKey, ...fields].join(', ')})
      VALUES ?
    `
    await connection.query(sqlInsertChild, [childValues])
  }

  return {
    insertId: mainId,
    message: mainData.id
      ? '已存在主表记录, 仅插入子表成功'
      : '新增主表及子表成功'
  }
}

module.exports = insertData
