async function insertData(connection, mainTable, mainData, options = {}) {
  const { relations = [], mode = 'auto' } = options

  let mainId = mainData.id || null




  const needInsertMain = !mainId

  if (needInsertMain) {

    const mainFields = { ...mainData }
    for (const rel of relations) {
      delete mainFields[rel.sourceKey]
    }


    const mainKeys = Object.keys(mainFields)
    const mainValues = Object.values(mainFields)
    const placeholders = mainKeys.map(() => '?').join(', ')
    const sqlInsertMain = `
      INSERT INTO ${mainTable} (${mainKeys.join(', ')})
      VALUES (${placeholders})
    `
    const [mainResult] = await connection.execute(sqlInsertMain, mainValues)
    mainId = mainResult.insertId
  }


  for (let rel of relations) {
    const {
      table: childTable,
      foreignKey,
      fields,
      sourceKey // 从 mainData 中取对应数组
    } = rel

    const childRecords = mainData[sourceKey]
    if (!childRecords || !childRecords.length) continue


    let finalFields = fields
    if (fields === '*') {
      const [cols] = await connection.query(`SHOW COLUMNS FROM ${childTable}`)
      finalFields = cols
        .map(c => c.Field)
        .filter(f => !['id', foreignKey, 'created_at', 'updated_at', 'createAt', 'updateAt'].includes(f))
    }


    const childValues = childRecords.map(item => [
      mainId,
      ...finalFields.map(f => item[f] ?? null)
    ])

    const sqlInsertChild = `
      INSERT INTO ${childTable} (${[foreignKey, ...finalFields].join(', ')})
      VALUES ?
    `
    await connection.query(sqlInsertChild, [childValues])
  }

  return {
    insertId: mainId,
    message: needInsertMain ? 'Insert main + child successful' : 'Insert child only successful'
  }
}
