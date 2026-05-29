/**
 * Pushnami 自动化任务服务
 */
const connection = require('../app/database')

class PushnamiService {
  /**
   * 记录操作日志
   */
  async recordOperation(data) {
    const {
      taskType,      // bid_adjust / block / budget_boost
      entityType,    // source / campaign
      entityId,      // Source ID / Campaign ID
      campaignName,
      oldValue,
      newValue,
      ruleCondition,
      conversions,   // 转化数
      clicks,        // 点击数
      spent,         // 花费金额
      cpa,
      totalSpend,
      dailySpendLimit,
      targetCpa,
      isDryRun,
      executionId    // 关联的执行日志 ID
    } = data

    const statement = `
      INSERT INTO pushnami_operation_log
        (task_type, entity_type, entity_id, campaign_name, old_value, new_value,
         rule_condition, conversions, clicks, spent, cpa, total_spend, daily_spend_limit, target_cpa, is_dry_run, execution_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await connection.execute(statement, [
      taskType,
      entityType,
      String(entityId),
      campaignName || null,
      oldValue != null ? String(oldValue) : null,
      newValue != null ? String(newValue) : null,
      ruleCondition || null,
      conversions != null ? parseInt(conversions) : null,
      clicks != null ? parseInt(clicks) : null,
      spent != null ? String(spent) : null,
      cpa != null ? String(cpa) : null,
      totalSpend != null ? String(totalSpend) : null,
      dailySpendLimit != null ? String(dailySpendLimit) : null,
      targetCpa != null ? String(targetCpa) : null,
      isDryRun ? 1 : 0,
      executionId || null
    ])
  }

  /**
   * 获取操作记录（用于检查冷却时间）
   * @param {string} taskType - 任务类型
   * @param {string} entityType - 实体类型
   * @param {string} entityId - 实体 ID
   * @param {string} campaignName - Campaign 名称（用于区分不同 campaign 下相同 ID 的 source）
   */
  async getLastOperation(taskType, entityType, entityId, campaignName = null) {
    let statement = `
      SELECT * FROM pushnami_operation_log
      WHERE task_type = ? AND entity_type = ? AND entity_id = ?
    `
    const params = [taskType, entityType, String(entityId)]


    if (campaignName) {
      statement += ` AND campaign_name = ?`
      params.push(campaignName)
    }

    statement += `
      ORDER BY created_at DESC
      LIMIT 1
    `

    const [result] = await connection.execute(statement, params)
    return result.length > 0 ? result[0] : null
  }

  /**
   * 获取操作日志列表
   */
  async getOperationLogs(params = {}) {
    const {
      page = 1,
      pageSize = 20,
      taskType = null,
      entityType = null,
      startTime = null,
      endTime = null
    } = params

    const offset = (page - 1) * pageSize
    const conditions = []
    const values = []

    if (taskType) {
      conditions.push('task_type = ?')
      values.push(taskType)
    }

    if (entityType) {
      conditions.push('entity_type = ?')
      values.push(entityType)
    }

    if (startTime) {
      conditions.push('created_at >= ?')
      values.push(startTime)
    }

    if (endTime) {
      conditions.push('created_at <= ?')
      values.push(endTime)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''


    const countStatement = `SELECT COUNT(*) as total FROM pushnami_operation_log ${whereClause}`
    const [countResult] = await connection.execute(countStatement, values)
    const total = countResult[0].total


    const listStatement = `
      SELECT
        id, task_type, entity_type, entity_id, campaign_name,
        old_value, new_value, rule_condition, conversions, clicks, spent, cpa, total_spend,
        daily_spend_limit, target_cpa, is_dry_run, execution_id, created_at
      FROM pushnami_operation_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    const [listResult] = await connection.execute(listStatement, [...values, String(pageSize), String(offset)])

    return {
      list: listResult,
      total: total,
      page: page,
      pageSize: pageSize
    }
  }

  /**
   * 记录任务执行日志
   */
  async recordExecution(data) {
    const {
      taskType,     // bid_adjust / block / budget_boost / all
      status,       // started / completed / failed
      campaignsProcessed = 0,
      sourcesProcessed = 0,
      actionsTaken = 0,
      errors = 0,
      message = null,
      startedAt,
      completedAt = null,
      logFileName = null
    } = data

    console.log('[Pushnami Service] recordExecution - logFileName:', logFileName)



    if (status === 'started') {
      const updateOldStatement = `
        UPDATE pushnami_execution_log
        SET status = 'interrupted',
            completed_at = NOW(),
            message = '任务被新任务中断'
        WHERE status = 'started'
      `
      await connection.execute(updateOldStatement)
      console.log('[Pushnami] 已将旧的 started 状态记录标记为 interrupted')
    }


    const formatDateTime = (isoString) => {
      if (!isoString) return null
      const date = new Date(isoString)

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    const statement = `
      INSERT INTO pushnami_execution_log
        (task_type, status, campaigns_processed, sources_processed,
         actions_taken, errors, message, started_at, completed_at, stop_requested, log_file_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `

    const [result] = await connection.execute(statement, [
      taskType,
      status,
      String(campaignsProcessed),
      String(sourcesProcessed),
      String(actionsTaken),
      String(errors),
      message,
      formatDateTime(startedAt),
      formatDateTime(completedAt),
      logFileName
    ])


    return result.insertId
  }

  /**
   * 获取任务执行日志列表
   */
  async getExecutionLogs(params = {}) {
    const {
      page = 1,
      pageSize = 20,
      taskType = null,
      status = null,
      startTime = null,
      endTime = null
    } = params

    const offset = (page - 1) * pageSize
    const conditions = []
    const values = []

    if (taskType) {
      conditions.push('task_type = ?')
      values.push(taskType)
    }

    if (status) {
      conditions.push('status = ?')
      values.push(status)
    }

    if (startTime) {
      conditions.push('started_at >= ?')
      values.push(startTime)
    }

    if (endTime) {
      conditions.push('started_at <= ?')
      values.push(endTime)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''


    const countStatement = `SELECT COUNT(*) as total FROM pushnami_execution_log ${whereClause}`
    const [countResult] = await connection.execute(countStatement, values)
    const total = countResult[0].total


    const listStatement = `
      SELECT
        id, task_type, status, campaigns_processed, sources_processed,
        actions_taken, errors, message, started_at, completed_at, log_file_name
      FROM pushnami_execution_log
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `
    const [listResult] = await connection.execute(listStatement, [...values, String(pageSize), String(offset)])


    const TIMEOUT_THRESHOLD = 30 * 60 * 1000
    const now = Date.now()


    const processedList = listResult.map(row => {

      if (row.status === 'started' && row.started_at) {
        const startTime = new Date(row.started_at).getTime()
        if (now - startTime > TIMEOUT_THRESHOLD) {
          return {
            ...row,
            status: 'interrupted',
            message: row.message || '任务执行超时，可能已中断'
          }
        }
      }
      return row
    })

    return {
      list: processedList,
      total: total,
      page: page,
      pageSize: pageSize
    }
  }

  /**
   * 获取配置
   */
  async getConfig(configKey) {
    const statement = `
      SELECT config_key, config_value, description FROM pushnami_config
      WHERE config_key = ?
    `
    const [result] = await connection.execute(statement, [configKey])
    return result.length > 0 ? result[0] : null
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs() {
    const statement = `SELECT config_key, config_value, description FROM pushnami_config`
    const [result] = await connection.execute(statement)

    const configs = {}
    result.forEach(row => {
      try {
        configs[row.config_key] = JSON.parse(row.config_value)
      } catch {
        configs[row.config_key] = row.config_value
      }
    })

    return configs
  }

  /**
   * 更新配置
   */
  async updateConfig(configKey, configValue) {
    const statement = `
      INSERT INTO pushnami_config (config_key, config_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
    `

    await connection.execute(statement, [
      configKey,
      typeof configValue === 'string' ? configValue : JSON.stringify(configValue)
    ])
  }

  /**
   * 设置停止信号
   * @param {number} executionId - 执行记录 ID
   */
  async setStopSignal(executionId) {
    const statement = `
      UPDATE pushnami_execution_log
      SET stop_requested = 1
      WHERE id = ?
    `
    await connection.execute(statement, [executionId])
  }

  /**
   * 检查停止信号
   * @param {number} executionId - 执行记录 ID
   * @returns {Promise<boolean>} 是否请求停止
   */
  async checkStopSignal(executionId) {
    const statement = `
      SELECT stop_requested FROM pushnami_execution_log
      WHERE id = ?
    `
    const [result] = await connection.execute(statement, [executionId])
    if (result.length === 0) return false
    return result[0].stop_requested === 1
  }

  /**
   * 更新执行记录为已停止状态
   * @param {number} executionId - 执行记录 ID
   */
  async markAsStopped(executionId) {
    const statement = `
      UPDATE pushnami_execution_log
      SET status = 'stopped',
          completed_at = NOW(),
          stop_requested = 0,
          message = '手动停止'
      WHERE id = ?
    `
    await connection.execute(statement, [executionId])
  }

  /**
   * 更新执行记录
   * @param {number} executionId - 执行记录 ID
   * @param {Object} data - 更新数据
   */
  async updateExecution(executionId, data) {
    const { status, campaignsProcessed, sourcesProcessed, actionsTaken, errors, message, completedAt } = data

    const formatDateTime = (isoString) => {
      if (!isoString) return null
      const date = new Date(isoString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    const statement = `
      UPDATE pushnami_execution_log
      SET status = ?,
          campaigns_processed = ?,
          sources_processed = ?,
          actions_taken = ?,
          errors = ?,
          message = ?,
          completed_at = ?
      WHERE id = ?
    `

    await connection.execute(statement, [
      status,
      String(campaignsProcessed),
      String(sourcesProcessed),
      String(actionsTaken),
      String(errors),
      message,
      formatDateTime(completedAt),
      executionId
    ])
  }

  /**
   * 更新执行记录的日志文件名
   * @param {number} executionId - 执行记录 ID
   * @param {string} logFileName - 日志文件名
   */
  async updateExecutionLogFileName(executionId, logFileName) {
    const statement = `
      UPDATE pushnami_execution_log
      SET log_file_name = ?
      WHERE id = ?
    `
    await connection.execute(statement, [logFileName, executionId])
  }

  /**
   * 获取任务统计
   */
  async getStats(startTime = null, endTime = null) {
    const conditions = []
    const values = []

    if (startTime) {
      conditions.push('created_at >= ?')
      values.push(startTime)
    }

    if (endTime) {
      conditions.push('created_at <= ?')
      values.push(endTime)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''


    const statsStatement = `
      SELECT
        task_type,
        COUNT(*) as total_operations,
        SUM(CASE WHEN is_dry_run = 0 THEN 1 ELSE 0 END) as real_operations,
        SUM(CASE WHEN is_dry_run = 1 THEN 1 ELSE 0 END) as dry_run_operations
      FROM pushnami_operation_log
      ${whereClause}
      GROUP BY task_type
    `
    const [statsResult] = await connection.execute(statsStatement, values)

    const stats = {
      bidAdjust: { total: 0, real: 0, dryRun: 0 },
      block: { total: 0, real: 0, dryRun: 0 },
      budgetBoost: { total: 0, real: 0, dryRun: 0 }
    }

    statsResult.forEach(row => {
      const key = row.task_type === 'bid_adjust' ? 'bidAdjust' :
                  row.task_type === 'block' ? 'block' : 'budgetBoost'
      if (stats[key]) {
        stats[key].total = row.total_operations
        stats[key].real = row.real_operations
        stats[key].dryRun = row.dry_run_operations
      }
    })

    return stats
  }

  /**
   * 清理服务启动时遗留的"执行中"状态的脚本记录
   * 将状态为 "started" 的记录更新为 "interrupted"
   */
  async resetStuckRunningRecords() {
    const statement = `
      UPDATE pushnami_execution_log
      SET status = 'interrupted',
          message = '服务异常关闭，任务中断',
          completed_at = NOW()
      WHERE status = 'started'
    `
    const [result] = await connection.execute(statement)
    return result.affectedRows
  }
}

module.exports = new PushnamiService()
