


































async function queryList(connection, mainTable, filters = {}, options = {}) {
  const {
    from = 'main',   // 查询起点: 'main' 或者 'child'
    page = 1,
    pageSize = 20,
    orderBy = `id DESC`,
    relations = [] // 关联配置: 可以是主表的子表, 也可以是主表的父表
  } = options


  const whereClauses = [] // 查询的条件
  const params = [] // 条件的值


  for (const key in filters) {
    const value = filters[key]
    if (value === undefined || value === null) continue

    if (Array.isArray(value) && value.length === 2) { // 时间区间查询
      whereClauses.push(`${key} BETWEEN ? AND ?`)
      params.push(value[0], value[1])
    } else { // 其他条件
      whereClauses.push(`${key} LIKE ?`)
      params.push(`%${value}%`)
    }
  }

  const whereSQL = whereClauses.length ? whereClauses.join(' AND ') : '1'
  const offset = (page - 1) * pageSize
  const limit = pageSize





  if (from === 'main') {

    const sqlMain = `
      SELECT *
      FROM ${mainTable}
      WHERE ${whereSQL}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset};
    `
    const [mainRows] = await connection.execute(sqlMain, params)

    if (relations.length > 0 && mainRows.length > 0) {
      for (const rel of relations) {
        const {
          table: childTable,
          foreignKey,
          referenceKey = 'id',
          fields = ['*'],
          as
        } = rel


        const parentIds = mainRows.map(row => row[referenceKey])
        const sqlChild = `
          SELECT ${fields.join(', ')}, ${foreignKey}
          FROM ${childTable}
          WHERE ${foreignKey} IN (${parentIds.map(() => '?').join(',')});
        `
        const [childRows] = await connection.execute(sqlChild, parentIds)


        const map = {}
        for (const row of childRows) { // row: { id: 2, customer_id: 5, email: 'bryant@test.com', remark: '备用邮箱' }
          const key = row[foreignKey] // 获取到外键的值 5
          if (!map[key]) map[key] = []
          const { [foreignKey]: _, ...rest } = row // rest: { id: 2, email: 'bryant@test.com', remark: '备用邮箱' }
          map[key].push(rest) // { 5: [{ id: 1, email: 'kobe@test.com', remark: '主邮箱' }] }
        }
        /* 
        map:
        { 
          5: [
            { id: 1, email: 'kobe@test.com', remark: '主邮箱' }, 
            { id: 2, email: 'bryant@test.com', remark: '备用邮箱' }
          ], 
          8: [
            { id: 3, email: 'curry@test.com', remark: '主邮箱' }
          ]
        }
      */


        for (const parent of mainRows) {
          parent[as || childTable] = map[parent[referenceKey]] || []
        }
      }
    }


    const [conditionCountResult] = await connection.execute(
      `SELECT COUNT(*) AS conditionCount FROM ${mainTable} WHERE ${whereSQL};`,
      params
    )


    const [totalCountResult] = await connection.execute(`SELECT COUNT(*) AS totalCount FROM ${mainTable};`)

    return {
      data: mainRows,
      conditionCount: conditionCountResult[0].conditionCount,
      totalCount: totalCountResult[0].totalCount,
      page,
      pageSize
    }
  }




  if (from === 'child') {
    const {
      table: childTable,
      foreignKey,
      referenceKey = 'id',
      fields = ['*'],
      as
    } = relations.find(r => r.direction === 'child->main') || {}

    if (!childTable || !foreignKey) {
      throw new Error(`当 from属性值为'child' 时, 必须提供 direction='child->main' 的关联配置`)
    }

    

    const sqlChild = `
      SELECT ${fields.join(', ')}, ${foreignKey}
      FROM ${childTable}
      WHERE ${whereSQL}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset};
    `
    const [childRows] = await connection.execute(sqlChild, params)

    const parentIds = [...new Set(childRows.map(row => row[foreignKey]))]
    if (parentIds.length === 0) return { data: [], total: 0 }


    const sqlParent = `
      SELECT *
      FROM ${mainTable}
      WHERE ${referenceKey} IN (${parentIds.map(() => '?').join(',')});
    `
    const [mainRows] = await connection.execute(sqlParent, parentIds)

    

    const map = {}
    for (const row of childRows) {
      const key = row[foreignKey]
      if (!map[key]) map[key] = []
      const { [foreignKey]: _, ...rest } = row
      map[key].push(rest)
    }


    for (const parent of mainRows) {
      parent[as || childTable] = map[parent[referenceKey]] || []
    }


    const [conditionCountResult] = await connection.execute(
      `SELECT COUNT(*) AS conditionCount FROM ${childTable} WHERE ${whereSQL};`,
      params
    )


    const [totalCountResult] = await connection.execute(`SELECT COUNT(*) AS totalCount FROM ${childTable};`)

    return {
      data: mainRows,
      conditionCount: conditionCountResult[0].conditionCount,
      totalCount: totalCountResult[0].totalCount,
      page,
      pageSize
    }
  }
}

module.exports = queryList
