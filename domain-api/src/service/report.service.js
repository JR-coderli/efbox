/**
 * Clickflare 报表数据服务
 * 负责从 Clickflare API 拉取广告归因数据并存储到数据库
 */

const connection = require('../app/database')
const clickflareConfig = require('../config/clickflare')

/**
 * 调用 Clickflare Report API 获取指定日期的数据
 * @param {string} date - 日期字符串 YYYY-MM-DD
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 */
async function fetchReportData(date, page = 1, pageSize = 1000) {
  const url = `${clickflareConfig.baseURL}${clickflareConfig.endpoints.report}`

  const requestBody = {
    startDate: `${date} 00:00:00`,
    endDate: `${date} 23:59:59`,
    groupBy: ['date', 'landingID', 'trafficSourceID', 'offerID'],
    metrics: [
      'date',
      'landingID',
      'landingName',
      'trafficSourceID',
      'trafficSourceName',
      'offerID',
      'offerName',
      'clicks',
      'conversions',
      'revenue',
      'cost',
      'cpa'
    ],
    timezone: 'Asia/Shanghai',
    sortBy: 'date',
    orderType: 'desc',
    page,
    pageSize,
    includeAll: true
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': clickflareConfig.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} - ${response.statusText}`)
  }

  const result = await response.json()



  if (result && Array.isArray(result.items)) {
    return result.items
  }


  if (Array.isArray(result)) {
    return result
  }


  console.error('[报表同步] API 返回数据格式异常:', result)
  return []
}

/**
 * 将 API 数据转换为数据库格式
 * 注意：将 NULL 值转换为空字符串，避免唯一索引无法正确处理 NULL 的问题
 * (MySQL 中 NULL != NULL，会导致重复插入)
 */
function transformReportData(apiData) {
  return apiData.map(item => ({
    date: item.date,
    landing_id: item.landingID,
    landing_name: item.landingName || '',
    traffic_source_id: item.trafficSourceID || '',
    traffic_source_name: item.trafficSourceName || '',
    offer_id: item.offerID || '',
    offer_name: item.offerName || '',
    clicks: item.clicks || 0,
    conversions: item.conversions || 0,
    revenue: item.revenue || 0,
    cost: item.cost || 0,
    cpa: item.cpa || 0
  }))
}

/**
 * 批量插入/更新报表数据
 * 使用 INSERT ... ON DUPLICATE KEY UPDATE 实现幂等性
 */
async function upsertReportData(data) {
  if (!data || data.length === 0) {
    return { inserted: 0, updated: 0 }
  }

  const statement = `
    INSERT INTO \`cf_report_daily\`
      (\`date\`, \`landing_id\`, \`landing_name\`,
       \`traffic_source_id\`, \`traffic_source_name\`,
       \`offer_id\`, \`offer_name\`,
       \`clicks\`, \`conversions\`, \`revenue\`, \`cost\`, \`cpa\`)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      \`landing_name\` = VALUES(\`landing_name\`),
      \`traffic_source_name\` = VALUES(\`traffic_source_name\`),
      \`offer_name\` = VALUES(\`offer_name\`),
      \`clicks\` = VALUES(\`clicks\`),
      \`conversions\` = VALUES(\`conversions\`),
      \`revenue\` = VALUES(\`revenue\`),
      \`cost\` = VALUES(\`cost\`),
      \`cpa\` = VALUES(\`cpa\`),
      \`synced_at\` = NOW(),
      \`updated_at\` = NOW()
  `

  const values = data.map(item => [
    item.date,
    item.landing_id,
    item.landing_name,
    item.traffic_source_id,
    item.traffic_source_name,
    item.offer_id,
    item.offer_name,
    item.clicks,
    item.conversions,
    item.revenue,
    item.cost,
    item.cpa
  ])

  const [result] = await connection.query(statement, [values])

  return {
    affectedRows: result.affectedRows,


    inserted: result.affectedRows,
    updated: result.changedRows || 0
  }
}

/**
 * 同步指定日期的报表数据（处理分页）
 * @param {string} date - 日期字符串 YYYY-MM-DD
 * @param {Function} onProgress - 进度回调函数
 */
async function syncReportByDate(date, onProgress = null) {
  const startTime = Date.now()
  let page = 1
  const pageSize = 1000
  let hasMore = true
  let totalRecords = 0
  let totalInserted = 0
  let totalUpdated = 0

  console.log(`[报表同步] 开始同步 ${date} 的数据...`)

  while (hasMore) {
    try {
      const apiData = await fetchReportData(date, page, pageSize)

      if (!Array.isArray(apiData)) {
        throw new Error(`API 返回数据格式错误: 期望数组，实际收到 ${typeof apiData}`)
      }


      if (apiData.length === 0) {
        hasMore = false
        break
      }


      const transformedData = transformReportData(apiData)
      const result = await upsertReportData(transformedData)

      totalRecords += apiData.length
      totalInserted += result.inserted
      totalUpdated += result.updated


      if (onProgress) {
        onProgress({
          date,
          page,
          pageSize: apiData.length,
          totalRecords,
          finished: apiData.length < pageSize
        })
      }


      hasMore = apiData.length === pageSize
      page++


      if (hasMore) {
        await sleep(100)
      }
    } catch (error) {
      console.error(`[报表同步] 第 ${page} 页同步失败:`, error.message)
      throw new Error(`第 ${page} 页同步失败: ${error.message}`)
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  const result = {
    success: true,
    date,
    totalRecords,
    duration,
    pages: page - 1
  }

  console.log(`[报表同步] ${date} 同步完成，共 ${totalRecords} 条记录，耗时 ${duration} 秒`)

  return result
}

/**
 * 批量同步多个日期的报表数据
 * @param {string[]} dates - 日期数组 YYYY-MM-DD
 * @param {Function} onProgress - 进度回调函数
 * @param {boolean} stopOnError - 遇到错误是否停止，默认 false 跳过继续
 */
async function syncReportByDates(dates, onProgress = null, stopOnError = false) {
  const results = []
  const errors = []

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]

    try {
      const result = await syncReportByDate(date, (progress) => {
        if (onProgress) {
          onProgress({
            currentIndex: i,
            total: dates.length,
            currentDate: date,
            ...progress
          })
        }
      })
      results.push(result)
    } catch (error) {
      console.error(`[报表同步] ${date} 同步失败:`, error.message)
      errors.push({ date, error: error.message })

      if (stopOnError) {
        throw error
      }
    }
  }

  return {
    success: errors.length === 0,
    total: dates.length,
    successCount: results.length,
    failCount: errors.length,
    results,
    errors
  }
}

/**
 * 获取报表数据列表
 * @param {Object} params - 查询参数
 */
async function getReportList(params) {
  const {
    startDate,
    endDate,
    landingId,
    landingName,
    trafficSourceId,
    offerId,
    offset = 0,
    size = 20,
    sortBy = 'date',
    sortOrder = 'desc'
  } = params

  const conditions = []
  const query_params = []


  if (startDate) {
    conditions.push('date >= ?')
    query_params.push(startDate)
  }
  if (endDate) {
    conditions.push('date <= ?')
    query_params.push(endDate)
  }


  if (landingId) {
    conditions.push('landing_id = ?')
    query_params.push(landingId)
  }
  if (landingName) {
    conditions.push('landing_name LIKE ?')
    query_params.push(`%${landingName}%`)
  }


  if (trafficSourceId) {
    conditions.push('traffic_source_id = ?')
    query_params.push(trafficSourceId)
  }


  if (offerId) {
    conditions.push('offer_id = ?')
    query_params.push(offerId)
  }

  const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1'


  const allowedSortFields = [
    'date', 'landing_id', 'traffic_source_id', 'offer_id',
    'clicks', 'conversions', 'revenue', 'cost', 'cpa',
    'synced_at', 'created_at'
  ]
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date'
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

  const limit = parseInt(size)
  const offsetVal = parseInt(offset)


  const statement = `
    SELECT
      id,
      date,
      landing_id,
      landing_name,
      traffic_source_id,
      traffic_source_name,
      offer_id,
      offer_name,
      clicks,
      conversions,
      revenue,
      cost,
      cpa,
      synced_at,
      created_at,
      updated_at
    FROM cf_report_daily
    WHERE ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ${limit} OFFSET ${offsetVal}
  `

  const [list] = await connection.query(statement, query_params)


  const countStatement = `SELECT COUNT(*) as total FROM cf_report_daily WHERE ${whereClause}`
  const [countResult] = await connection.execute(countStatement, query_params)

  return [list, countResult[0].total]
}

/**
 * 获取报表统计摘要（按不同维度聚合）
 * @param {Object} params - 查询参数
 */
async function getReportSummary(params) {
  const {
    startDate,
    endDate,
    landingId,
    groupBy = 'date' // date, landing, source, offer, landing_source
  } = params

  const conditions = []
  const query_params = []

  if (startDate) {
    conditions.push('date >= ?')
    query_params.push(startDate)
  }
  if (endDate) {
    conditions.push('date <= ?')
    query_params.push(endDate)
  }
  if (landingId) {
    conditions.push('landing_id = ?')
    query_params.push(landingId)
  }

  const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

  let selectFields = ''
  let groupByFields = ''

  switch (groupBy) {
    case 'landing':
      selectFields = 'landing_id, landing_name'
      groupByFields = 'landing_id, landing_name'
      break
    case 'source':
      selectFields = 'traffic_source_id, traffic_source_name'
      groupByFields = 'traffic_source_id, traffic_source_name'
      break
    case 'offer':
      selectFields = 'offer_id, offer_name'
      groupByFields = 'offer_id, offer_name'
      break
    case 'landing_source':
      selectFields = 'landing_id, landing_name, traffic_source_id, traffic_source_name'
      groupByFields = 'landing_id, landing_name, traffic_source_id, traffic_source_name'
      break
    case 'date':
    default:
      selectFields = 'date'
      groupByFields = 'date'
      break
  }

  const statement = `
    SELECT
      ${selectFields},
      SUM(clicks) as total_clicks,
      SUM(conversions) as total_conversions,
      SUM(revenue) as total_revenue,
      SUM(cost) as total_cost,
      CASE
        WHEN SUM(conversions) > 0 THEN SUM(cost) / SUM(conversions)
        ELSE 0
      END as avg_cpa
    FROM cf_report_daily
    WHERE ${whereClause}
    GROUP BY ${groupByFields}
    ORDER BY date DESC
  `

  const [result] = await connection.query(statement, query_params)

  return result
}

/**
 * 获取某个日期的同步状态
 */
async function getSyncStatus(date) {
  const statement = `
    SELECT
      COUNT(*) as record_count,
      MAX(synced_at) as last_sync_at
    FROM cf_report_daily
    WHERE date = ?
  `

  const [result] = await connection.execute(statement, [date])
  return result[0]
}

/**
 * 获取已同步的日期列表
 */
async function getSyncedDates(limit = 100) {
  const statement = `
    SELECT DISTINCT
      date,
      COUNT(*) as record_count,
      MAX(synced_at) as last_sync_at,
      MIN(synced_at) as first_sync_at
    FROM cf_report_daily
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${parseInt(limit)}
  `

  const [result] = await connection.query(statement)
  return result
}

/**
 * 删除指定日期的所有报表数据
 */
async function deleteReportByDate(date) {
  const statement = `DELETE FROM cf_report_daily WHERE date = ?`
  const [result] = await connection.execute(statement, [date])
  return result
}

/**
 * 工具函数：延迟指定毫秒数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}



/**
 * 调用 Clickflare Report API 获取指定日期的小时数据
 * @param {string} date - 日期字符串 YYYY-MM-DD
 * @param {number|null} hour - 小时数（0-23），null表示获取所有小时
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 */
async function fetchHourlyReportData(date, hour = null, page = 1, pageSize = 10000) {
  const url = `${clickflareConfig.baseURL}${clickflareConfig.endpoints.report}`


  const startDate = hour ? `${date} ${String(hour).padStart(2, '0')}:00:00` : `${date} 00:00:00`
  const endDate = hour ? `${date} ${String(hour).padStart(2, '0')}:59:59` : `${date} 23:59:59`

  const requestBody = {
    startDate,
    endDate,
    groupBy: ['date', 'hourOfDay', 'landingID', 'trafficSourceID', 'offerID'],
    metrics: [
      'date',
      'hourOfDay',
      'landingID',
      'landingName',
      'trafficSourceID',
      'trafficSourceName',
      'clicks',
      'conversions',
      'revenue',
      'cost',
      'cpa',
      'offerID',
      'offerName'
    ],
    timezone: 'Asia/Shanghai',
    sortBy: 'hourOfDay',
    orderType: 'asc',
    page,
    pageSize,
    includeAll: true
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': clickflareConfig.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} - ${response.statusText}`)
  }

  const result = await response.json()

  if (result && Array.isArray(result.items)) {
    return result.items
  }

  if (Array.isArray(result)) {
    return result
  }

  console.error('[小时报表同步] API 返回数据格式异常:', result)
  return []
}

/**
 * 将小时 API 数据转换为数据库格式
 */
function transformHourlyReportData(apiData) {
  return apiData.map(item => ({
    date: item.date,
    hour: item.hourOfDay || 0,
    landing_id: item.landingID,
    landing_name: item.landingName || '',
    traffic_source_id: item.trafficSourceID || '',
    traffic_source_name: item.trafficSourceName || '',
    offer_id: item.offerID || '',
    offer_name: item.offerName || '',
    clicks: item.clicks || 0,
    conversions: item.conversions || 0,
    revenue: item.revenue || 0,
    cost: item.cost || 0,
    cpa: item.cpa || 0
  }))
}

/**
 * 批量插入/更新小时报表数据
 */
async function upsertHourlyReportData(data) {
  if (!data || data.length === 0) {
    return { affectedRows: 0, inserted: 0, updated: 0 }
  }

  const statement = `
    INSERT INTO \`cf_report_hourly\`
      (\`date\`, \`hour\`, \`landing_id\`, \`landing_name\`,
       \`traffic_source_id\`, \`traffic_source_name\`,
       \`offer_id\`, \`offer_name\`,
       \`clicks\`, \`conversions\`, \`revenue\`, \`cost\`, \`cpa\`)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      \`landing_name\` = VALUES(\`landing_name\`),
      \`traffic_source_name\` = VALUES(\`traffic_source_name\`),
      \`offer_name\` = VALUES(\`offer_name\`),
      \`clicks\` = VALUES(\`clicks\`),
      \`conversions\` = VALUES(\`conversions\`),
      \`revenue\` = VALUES(\`revenue\`),
      \`cost\` = VALUES(\`cost\`),
      \`cpa\` = VALUES(\`cpa\`),
      \`synced_at\` = NOW(),
      \`updated_at\` = NOW()
  `

  const values = data.map(item => [
    item.date,
    item.hour,
    item.landing_id,
    item.landing_name,
    item.traffic_source_id,
    item.traffic_source_name,
    item.offer_id,
    item.offer_name,
    item.clicks,
    item.conversions,
    item.revenue,
    item.cost,
    item.cpa
  ])

  const [result] = await connection.query(statement, [values])

  return {
    affectedRows: result.affectedRows,
    inserted: result.affectedRows,
    updated: result.changedRows || 0
  }
}

/**
 * 同步指定日期的小时报表数据
 * @param {string} date - 日期字符串 YYYY-MM-DD
 */
async function syncHourlyReportByDate(date) {
  const startTime = Date.now()

  console.log(`[小时报表同步] 开始同步 ${date} 的数据...`)

  const pageSize = 10000
  let apiData = []

  try {

    apiData = await fetchHourlyReportData(date, null, 1, pageSize)

    if (!Array.isArray(apiData)) {
      throw new Error(`API 返回数据格式错误: 期望数组，实际收到 ${typeof apiData}`)
    }

    if (apiData.length === 0) {
      console.log(`[小时报表同步] ${date} 无数据`)
    } else {

      const transformedData = transformHourlyReportData(apiData)
      const result = await upsertHourlyReportData(transformedData)

      console.log(`[小时报表同步] ${date} 写入数据库 ${apiData.length} 条记录`)
    }
  } catch (error) {
    console.error(`[小时报表同步] ${date} 同步失败:`, error.message)
    throw error
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)


  const uniqueHours = new Set(apiData.map(item => item.hourOfDay || 0))

  const result = {
    success: true,
    date,
    totalRecords: apiData.length || 0,
    hours: uniqueHours.size,
    duration
  }

  console.log(`[小时报表同步] ${date} 同步完成，共 ${result.totalRecords} 条记录，耗时 ${duration} 秒`)

  return result
}

/**
 * 获取小时报表数据列表
 * @param {Object} params - 查询参数
 */
async function getHourlyReportList(params) {
  const {
    startDate,
    endDate,
    landingId,
    hour,
    offset = 0,
    size = 100,
    sortBy = 'date',
    sortOrder = 'desc'
  } = params

  const conditions = []
  const query_params = []

  if (startDate) {
    conditions.push('date >= ?')
    query_params.push(startDate)
  }
  if (endDate) {
    conditions.push('date <= ?')
    query_params.push(endDate)
  }
  if (landingId) {
    conditions.push('landing_id = ?')
    query_params.push(landingId)
  }
  if (hour !== undefined && hour !== null && hour !== '') {
    conditions.push('hour = ?')
    query_params.push(parseInt(hour))
  }

  const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

  const allowedSortFields = [
    'date', 'hour', 'landing_id', 'traffic_source_id', 'offer_id',
    'clicks', 'conversions', 'revenue', 'cost', 'cpa',
    'synced_at', 'created_at'
  ]
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date'
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

  const limit = parseInt(size)
  const offsetVal = parseInt(offset)

  const statement = `
    SELECT
      id,
      date,
      hour,
      landing_id,
      landing_name,
      traffic_source_id,
      traffic_source_name,
      offer_id,
      offer_name,
      clicks,
      conversions,
      revenue,
      cost,
      cpa,
      synced_at,
      created_at,
      updated_at
    FROM cf_report_hourly
    WHERE ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ${limit} OFFSET ${offsetVal}
  `

  const [list] = await connection.query(statement, query_params)

  const countStatement = `SELECT COUNT(*) as total FROM cf_report_hourly WHERE ${whereClause}`
  const [countResult] = await connection.execute(countStatement, query_params)

  return [list, countResult[0].total]
}

/**
 * 获取小时报表统计摘要（按指定维度聚合）
 * @param {Object} params - 查询参数
 *   - startDate: 开始日期
 *   - endDate: 结束日期
 *   - landingId: 落地页ID（可选过滤）
 *   - groupBy: 分组维度，默认 'hour'，可选值: 'hour', 'landing', 'source', 'offer'
 */
async function getHourlyReportSummary(params) {
  const {
    startDate,
    endDate,
    landingId,
    groupBy = 'hour'
  } = params

  const conditions = []
  const query_params = []

  if (startDate) {
    conditions.push('date >= ?')
    query_params.push(startDate)
  }
  if (endDate) {
    conditions.push('date <= ?')
    query_params.push(endDate)
  }
  if (landingId) {
    conditions.push('landing_id = ?')
    query_params.push(landingId)
  }

  const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

  let selectFields = ''
  let groupByFields = ''

  switch (groupBy) {
    case 'landing':
      selectFields = 'landing_id as group_id, landing_name as group_name'
      groupByFields = 'landing_id, landing_name'
      break
    case 'source':
      selectFields = 'traffic_source_id as group_id, traffic_source_name as group_name'
      groupByFields = 'traffic_source_id, traffic_source_name'
      break
    case 'offer':
      selectFields = 'offer_id as group_id, offer_name as group_name'
      groupByFields = 'offer_id, offer_name'
      break
    case 'hour':
    default:
      selectFields = 'date, hour, hour as group_id, CONCAT(hour, ":00") as group_name'
      groupByFields = 'date, hour'
      break
  }

  const statement = `
    SELECT
      ${selectFields},
      SUM(clicks) as total_clicks,
      SUM(conversions) as total_conversions,
      SUM(revenue) as total_revenue,
      SUM(cost) as total_cost,
      CASE
        WHEN SUM(conversions) > 0 THEN SUM(cost) / SUM(conversions)
        ELSE 0
      END as avg_cpa
    FROM cf_report_hourly
    WHERE ${whereClause}
    GROUP BY ${groupByFields}
    ORDER BY total_clicks DESC
  `

  const [result] = await connection.query(statement, query_params)

  return result
}

/**
 * 获取维度配置
 * @param {string} dimension - 维度名称
 * @returns {Object} 维度配置
 */
function getDimensionConfig(dimension) {
  const configs = {
    landing: { id: 'landing_id', name: 'landing_name', label: '落地页' },
    source: { id: 'traffic_source_id', name: 'traffic_source_name', label: '媒体' },
    offer: { id: 'offer_id', name: 'offer_name', label: 'Offer' }
  }
  return configs[dimension]
}

/**
 * 构建维度字段的辅助函数（单维度）
 * @param {string} dimension - 维度名称
 * @returns {Object} 包含 selectFields 和 groupByFields 的对象
 */
function buildDimensionFields(dimension) {
  const config = getDimensionConfig(dimension)
  if (!config) {
    throw new Error('无效的分组维度: ' + dimension)
  }

  return {
    selectFields: `
      ${config.id} as group_id,
      ${config.name} as group_name
    `,
    groupByFields: `${config.id}, ${config.name}`
  }
}

/**
 * 构建过滤条件的辅助函数
 * @param {Object} filters - 过滤条件，如 { landing_id: '123', offer_id: '456' }
 * @returns {Object} 包含 whereConditions 和 queryParams 的对象
 */
function buildFilters(filters = {}) {
  const conditions = []
  const params = []

  const dimFields = {
    date: 'date',
    hour: 'hour',
    landing_id: 'landing_id',
    landing_name: 'landing_name',
    traffic_source_id: 'traffic_source_id',
    traffic_source_name: 'traffic_source_name',
    offer_id: 'offer_id',
    offer_name: 'offer_name'
  }

  Object.keys(filters).forEach(key => {
    if (dimFields[key] && filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      conditions.push(`${dimFields[key]} = ?`)
      params.push(filters[key])
    }
  })

  return { conditions, params }
}

/**
 * 获取某日期/小时的详细数据（按维度聚合，支持多级查询）
 * @param {Object} params - 查询参数
 *   - date: 日期
 *   - hour: 小时（当 groupBy 为 'hour' 时可选）
 *   - groupBy: 分组维度（单一维度）'hour' | 'landing' | 'source' | 'offer'
 *   - filters: 过滤条件，如 { landing_id: '123' }
 *   - level: 查询层级（用于前端判断是否还有下一级）
 */
async function getHourlyReportDetailByHour(params) {
  const {
    date,
    hour,
    groupBy = 'hour',  // 单一维度，默认 hour
    filters = {},
    level = 0
  } = params

  if (!date) {
    throw new Error('缺少必要参数: date')
  }


  const validDimensions = ['hour', 'landing', 'source', 'offer']
  if (!validDimensions.includes(groupBy)) {
    throw new Error('无效的分组维度: ' + groupBy)
  }


  let selectFields = ''
  let groupByFields = ''


  if (groupBy === 'hour') {
    selectFields = 'hour as group_id, CONCAT(hour, ":00") as group_name'
    groupByFields = 'hour'
  } else {
    const { selectFields: dimFields, groupByFields: dimGroupBy } = buildDimensionFields(groupBy)
    selectFields = dimFields
    groupByFields = dimGroupBy
  }


  const { conditions: filterConditions, params: filterParams } = buildFilters(filters)


  const allConditions = ['date = ?', ...filterConditions]
  const allParams = [date, ...filterParams]

  const whereClause = allConditions.join(' AND ')

  const statement = `
    SELECT
      ${selectFields},
      SUM(clicks) as total_clicks,
      SUM(conversions) as total_conversions,
      SUM(revenue) as total_revenue,
      SUM(cost) as total_cost,
      CASE
        WHEN SUM(conversions) > 0 THEN SUM(cost) / SUM(conversions)
        ELSE 0
      END as avg_cpa
    FROM cf_report_hourly
    WHERE ${whereClause}
    GROUP BY ${groupByFields}
    ORDER BY total_clicks DESC
  `

  const [result] = await connection.query(statement, allParams)

  return result
}

/**
 * 删除指定日期的所有小时报表数据
 */
async function deleteHourlyReportByDate(date) {
  const statement = `DELETE FROM cf_report_hourly WHERE date = ?`
  const [result] = await connection.execute(statement, [date])
  return result
}

/**
 * 获取小时数据已同步的日期列表
 */
async function getHourlySyncedDates(limit = 100) {
  const statement = `
    SELECT DISTINCT
      date,
      COUNT(*) as record_count,
      MAX(synced_at) as last_sync_at,
      MIN(synced_at) as first_sync_at
    FROM cf_report_hourly
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${parseInt(limit)}
  `

  const [result] = await connection.query(statement)
  return result
}

/**
 * 获取某日期的详细数据（按维度聚合，支持多级查询）
 * @param {Object} params - 查询参数
 *   - date: 日期
 *   - groupBy: 分组维度（单一维度）'date' | 'landing' | 'source' | 'offer'
 *   - filters: 过滤条件，如 { landing_id: '123', traffic_source_id: '456' }
 *   - level: 查询层级（用于前端判断是否还有下一级）
 */
async function getDailyReportDetailByDate(params) {
  const {
    startDate,
    endDate,
    groupBy = 'landing',  // 单一维度
    filters = {},
    level = 0
  } = params


  let selectFields = ''
  let groupByFields = ''


  if (groupBy === 'date') {
    selectFields = 'date as group_id, date as group_name'
    groupByFields = 'date'
  } else {
    const { selectFields: dimFields, groupByFields: dimGroupBy } = buildDimensionFields(groupBy)
    selectFields = dimFields
    groupByFields = dimGroupBy
  }


  const { conditions: filterConditions, params: filterParams } = buildFilters(filters)


  const allConditions = [...filterConditions]
  const allParams = [...filterParams]


  if (startDate) {
    allConditions.push('date >= ?')
    allParams.push(startDate)
  }
  if (endDate) {
    allConditions.push('date <= ?')
    allParams.push(endDate)
  }

  const whereClause = allConditions.length > 0 ? allConditions.join(' AND ') : '1=1'

  const statement = `
    SELECT
      ${selectFields},
      SUM(clicks) as total_clicks,
      SUM(conversions) as total_conversions,
      SUM(revenue) as total_revenue,
      SUM(cost) as total_cost,
      CASE
        WHEN SUM(conversions) > 0 THEN SUM(cost) / SUM(conversions)
        ELSE 0
      END as avg_cpa
    FROM cf_report_daily
    WHERE ${whereClause}
    GROUP BY ${groupByFields}
    ORDER BY total_clicks DESC
  `

  const [result] = await connection.query(statement, allParams)

  return result
}

module.exports = {

  syncReportByDate,
  syncReportByDates,


  syncHourlyReportByDate,


  getReportList,
  getReportSummary,
  getDailyReportDetailByDate,
  getSyncStatus,
  getSyncedDates,


  getHourlyReportList,
  getHourlyReportSummary,
  getHourlyReportDetailByHour,
  getHourlySyncedDates,


  deleteReportByDate,
  deleteHourlyReportByDate
}
