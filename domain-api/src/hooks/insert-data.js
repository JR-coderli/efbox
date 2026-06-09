









































async function insertData(connection, mainTable, mainData, options = {}) {
  const { relations = [] } = options
  let mainId = mainData.id || null // 主表id
  let childId = null // 副表id


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
    for (const rel of relations) {
      delete mainFields[rel.sourceKey]
    }

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
    ` // INSERT INTO customers (full_name, short_name, company_address, remark) VALUES (?, ?, ?, ?)

    const [mainResult] = await connection.execute(sqlInsertMain, mainValues)
    mainId = mainResult.insertId
  }

  


  for (const rel of relations) {
    let {
      table: childTable,
      foreignKey,
      fields,
      sourceKey // 用于从 mainData 中取对应数组
    } = rel

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
    ` // INSERT INTO customer_emails (customer_id, email, remark) VALUES ?
    try {
      const [childResult] = await connection.query(sqlInsertChild, [childValues])  // query需要一个二维数组childValues。
      childId = childResult.insertId
    } catch (error) {
      console.log(error)
      return
    }
  }

  return {
    mainInsertId: mainId,
    childInsertId: childId,
    message: mainData.id
      ? '已存在主表记录, 仅插入子表成功'
      : '新增主表及子表成功'
  }
}


module.exports = insertData

