/**
 * 数据库操作模块
 * 用于记录 Pushnami 操作历史，管理冷却时间
 */
const axios = require('axios')
const { CONFIG } = require('./config.js')
const { logger, getLogFileName } = require('./logger.js')

class PushnamiDB {
  constructor() {
    this.apiBaseUrl = CONFIG.api.baseUrl
    this.apiTimeout = CONFIG.api.timeout
  }

  /**
   * 获取操作记录
   * @param {string} taskType - 任务类型 (bid_adjust / block / budget_boost)
   * @param {string} entityType - 实体类型 (source / campaign)
   * @param {string} entityId - 实体 ID
   * @param {number} cooldownMinutes - 冷却时间（分钟）
   * @param {string} campaignName - Campaign 名称（用于区分不同 campaign 下相同 ID 的 source）
   * @returns {Promise<boolean>} 是否在冷却期内
   */
  async isInCooldown(taskType, entityType, entityId, cooldownMinutes, campaignName = null) {
    try {
      const params = {
        task_type: taskType,
        entity_type: entityType,
        entity_id: entityId,
        cooldown_minutes: cooldownMinutes  // 传递冷却时间参数给后端
      }


      if (campaignName) {
        params.campaign_name = campaignName
      }

      const response = await axios.get(`${this.apiBaseUrl}/pushnami/check-cooldown`, {
        params,
        timeout: this.apiTimeout
      })

      const result = response.data?.data
      if (!result || !result.isInCooldown) return false


      if (result.lastOperation) {
        const lastTime = new Date(result.lastOperation.createdAt).getTime()
        const now = Date.now()
        const elapsedMinutes = (now - lastTime) / (1000 * 60)
        return elapsedMinutes < cooldownMinutes
      }

      return false
    } catch (error) {


      logger.info(`API 检查冷却时间失败(${error.message})，使用内存冷却管理`)
      return false
    }
  }

  /**
   * 记录操作
   * @param {Object} data - 操作数据
   * @returns {Promise<boolean>}
   */
  async recordOperation(data) {
    try {
      await axios.post(`${this.apiBaseUrl}/pushnami/operation-log`, {
        task_type: data.taskType,      // bid_adjust / block / budget_boost
        entity_type: data.entityType,  // source / campaign
        entity_id: data.entityId,      // Source ID / Campaign ID
        campaign_name: data.campaignName,
        old_value: data.oldValue,      // 修改前的值
        new_value: data.newValue,      // 修改后的值
        rule_condition: data.ruleCondition,  // 匹配的规则条件
        conversions: data.conversions, // 转化数
        clicks: data.clicks,           // 点击数
        spent: data.spent,             // 花费金额
        cpa: data.cpa,
        total_spend: data.totalSpend,
        daily_spend_limit: data.dailySpendLimit,
        target_cpa: data.targetCpa,
        is_dry_run: data.isDryRun,
        execution_id: data.executionId   // 关联的执行日志 ID
      }, { timeout: this.apiTimeout })

      logger.success('操作记录已保存')
      return true
    } catch (error) {
      logger.error(`保存操作记录失败: ${error.message}`)
      return false
    }
  }

  /**
   * 获取任务配置（从数据库读取开关状态）
   * @returns {Promise<Object>}
   */
  async getTaskConfig() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/pushnami/config`, {
        timeout: this.apiTimeout
      })
      return response.data?.data || {}
    } catch (error) {
      logger.warning(`获取任务配置失败，使用本地配置: ${error.message}`)
      return {}
    }
  }

  /**
   * 更新任务配置
   * @param {Object} config - 配置数据
   * @returns {Promise<boolean>}
   */
  async updateTaskConfig(config) {
    try {
      await axios.put(`${this.apiBaseUrl}/pushnami/config`, config, {
        timeout: this.apiTimeout
      })
      logger.success('任务配置已更新')
      return true
    } catch (error) {
      logger.error(`更新任务配置失败: ${error.message}`)
      return false
    }
  }

  /**
   * 记录任务执行日志
   * @param {Object} data - 日志数据
   * @returns {Promise<number>} 执行记录 ID
   */
  async logTaskExecution(data) {
    try {
      const logFileName = getLogFileName()
      console.log('[Pushnami DB] 发送执行日志，log_file_name:', logFileName)

      const response = await axios.post(`${this.apiBaseUrl}/pushnami/execution-log`, {
        task_type: data.taskType,
        status: data.status,      // started / completed / failed
        campaigns_processed: data.campaignsProcessed || 0,
        sources_processed: data.sourcesProcessed || 0,
        actions_taken: data.actionsTaken || 0,
        errors: data.errors || 0,
        message: data.message,
        started_at: data.startedAt,
        completed_at: data.completedAt,
        log_file_name: logFileName
      }, { timeout: this.apiTimeout })


      return response.data?.data?.id || null
    } catch (error) {
      logger.error(`记录任务执行日志失败: ${error.message}`)
      return null
    }
  }

  /**
   * 检查停止信号
   * @param {number} executionId - 执行记录 ID
   * @returns {Promise<boolean>} 是否请求停止
   */
  async checkStopSignal(executionId) {
    if (!executionId) return false

    try {
      const response = await axios.get(`${this.apiBaseUrl}/pushnami/check-stop`, {
        params: { id: executionId },
        timeout: 5000  // 5秒超时
      })
      return response.data?.data?.shouldStop || false
    } catch (error) {
      logger.warning(`检查停止信号失败: ${error.message}`)
      return false
    }
  }

  /**
   * 标记为已停止
   * @param {number} executionId - 执行记录 ID
   * @returns {Promise<boolean>}
   */
  async markAsStopped(executionId) {
    if (!executionId) return false

    try {
      await axios.post(`${this.apiBaseUrl}/pushnami/mark-stopped`, {
        id: executionId
      }, { timeout: 5000 })
      logger.warning('任务已被停止')
      return true
    } catch (error) {
      logger.error(`标记停止失败: ${error.message}`)
      return false
    }
  }

  /**
   * 更新执行记录
   * @param {number} executionId - 执行记录 ID
   * @param {Object} data - 更新数据
   * @returns {Promise<boolean>}
   */
  async updateExecution(executionId, data) {
    if (!executionId) return false

    try {
      await axios.put(`${this.apiBaseUrl}/pushnami/execution-log/${executionId}`, {
        status: data.status,
        campaigns_processed: data.campaignsProcessed || 0,
        sources_processed: data.sourcesProcessed || 0,
        actions_taken: data.actionsTaken || 0,
        errors: data.errors || 0,
        message: data.message,
        completed_at: data.completedAt
      }, { timeout: this.apiTimeout })
      return true
    } catch (error) {
      logger.error(`更新执行记录失败: ${error.message}`)
      return false
    }
  }
}

module.exports = new PushnamiDB()
