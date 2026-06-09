
























async function updateData(connection, mainTable, idValue, bodyData, options) {
  const results = {}


  if (options.mainWhitelist === '*') {
    try {
      const [cols] = await connection.query(`SHOW COLUMNS FROM ${mainTable}`)

      options.mainWhitelist = cols
        .map(c => c.Field)
        .filter(f => !['id', 'created_at', 'updated_at', 'createAt', 'updateAt'].includes(f))
    } catch (error) {
      console.log(error)
      return 
    }
  }



  const mainWhitelist = options.mainWhitelist || []
  const mainData = {}
  for (const key of mainWhitelist) {
    if (bodyData[key] !== undefined) mainData[key] = bodyData[key] // { "full_name": "科比布", "short_name": "KBB" }
  }

  if (Object.keys(mainData).length > 0) {
    const updates = [] // 更新的条件 (带问号?的)
    const values = [] // 更新的值
  
    for (const key in mainData) {
      updates.push(`${key} = ?`)
      values.push(mainData[key])
    }
    const sql = `UPDATE ${mainTable} SET ${updates.join(', ')} WHERE id = ?;`
    values.push(idValue)
    try {
      const [res] = await connection.execute(sql, values)


      if (res.affectedRows === 0) {
        results[mainTable] = '没匹配到任何记录'
      } else if (res.changedRows === 0) {
        results[mainTable] = '匹配到记录但数据没变化'
      } else {
        results[mainTable] = '修改成功'
      }
    } catch (e) {
      console.log(e)
      results[mainTable] = { error: e.message };
    }
  }


  const relations = options.relations || []
  for (const rel of relations) {
    const { table: childTable, foreignKey, whitelist, dataKey } = rel
    const childDataArray = bodyData[dataKey] || []
    results[childTable] = []


    const [existingRows] = await connection.execute(
      `SELECT id FROM ${childTable} WHERE ${foreignKey} = ?`,
      [idValue]
    )
    const existingIds = existingRows.map(r => r.id)


    const submittedIds = childDataArray.map(item => item.id).filter(Boolean)


    const idsToDelete = existingIds.filter(id => !submittedIds.includes(id))
    if (idsToDelete.length > 0) {
      await connection.execute(
        `DELETE FROM ${childTable} WHERE id IN (${idsToDelete.map(() => '?').join(',')})`,
        idsToDelete
      )
    }


    for (const item of childDataArray) {
      const updates = [] // 更新的字段
      const values = [] // 更新的值
      for (const key of whitelist) {
        if (item[key] !== undefined) {
          updates.push(`${key} = ?`)
          values.push(item[key])
        }
      }
      if (updates.length === 0) continue

      let sql
      if (item.id && existingIds.includes(item.id)) {

        sql = `UPDATE ${childTable} SET ${updates.join(', ')} WHERE id = ?`
        values.push(item.id)

      } else {

        const validFields = whitelist.filter(key => item[key] !== undefined)
        sql = `INSERT INTO ${childTable} (${foreignKey}, ${validFields.join(',')}) VALUES (?, ${validFields.map(()=>'?').join(',')})`
        values.unshift(idValue)
      }

      try {
        const [res] = await connection.execute(sql, values)

        let status
        if (res.insertId) status = '新增成功'
        else if (res.affectedRows === 0) status = '没匹配到任何记录'
        else if (res.changedRows === 0) status = '匹配到记录但数据没变化'
        else status = '修改成功'

        results[childTable].push({
          id: item.id || res.insertId || null,
          status
        })
      } catch (e) {
        console.log('更新子表时发生错误: ', e)
        results[childTable].push({ id: item.id || null, error: e.message });
      }
    }
  }

  return results
}

module.exports = updateData
