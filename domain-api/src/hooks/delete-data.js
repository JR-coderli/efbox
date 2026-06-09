








async function deleteData(connection, table, conditions) {

  if (!conditions || Object.keys(conditions).length === 0) {
    throw new Error(`deleteData(): 删除条件不能为空`)
  }

  const keys = Object.keys(conditions)
  const whereClause = keys.map(k => `${k} = ?`).join(' AND ') // 删除条件
  const values = keys.map(k => conditions[k]) // 条件的值

  const sql = `DELETE FROM ${table} WHERE ${whereClause};`

  try {
    const [result] = await connection.execute(sql, values)
    return result.affectedRows
  } catch (error) {
    console.log(error)
  }
}

module.exports = deleteData
