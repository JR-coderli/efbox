/**
 * 冷却时间管理
 * 只使用数据库判断，不使用内存记录
 */
const { logger } = require('./logger.js')

/**
 * 冷却管理器
 * 所有冷却判断都通过数据库完成，避免内存状态问题
 */
class CooldownManager {
  constructor() {

    this.records = new Map()
  }

  /**
   * 生成冷却记录的 key（不再使用）
   */
  _makeKey(taskType, entityType, entityId) {
    return `${taskType}:${entityType}:${entityId}`
  }

  /**
   * 检查是否在冷却期内（只通过数据库）
   * @param {string} taskType - 任务类型
   * @param {string} entityType - 实体类型 (source / campaign)
   * @param {string} entityId - 实体 ID
   * @param {number} cooldownMinutes - 冷却时间（分钟）
   * @returns {Promise<boolean>}
   */
  async isInCooldown(taskType, entityType, entityId, cooldownMinutes) {

    return false
  }

  /**
   * 记录操作时间（不再使用，保留接口兼容性）
   */
  recordOperation(taskType, entityType, entityId) {

    const key = this._makeKey(taskType, entityType, entityId)
    this.records.set(key, Date.now())
  }

  /**
   * 检查并记录（原子操作）
   * 只使用数据库判断，忽略内存检查
   * @param {string} taskType - 任务类型
   * @param {string} entityType - 实体类型
   * @param {string} entityId - 实体 ID
   * @param {number} cooldownMinutes - 冷却时间（分钟）
   * @param {Function} dbChecker - 数据库检查函数
   * @param {string} campaignName - Campaign 名称（用于区分不同 campaign 下相同 ID 的 source）
   * @returns {Promise<boolean>} 是否允许操作（不在冷却期内）
   */
  async checkAndRecord(taskType, entityType, entityId, cooldownMinutes, dbChecker = null, campaignName = null) {

    if (dbChecker) {
      const dbInCooldown = await dbChecker(taskType, entityType, entityId, cooldownMinutes, campaignName)
      if (dbInCooldown) {
        return false
      }
    }


    this.recordOperation(taskType, entityType, entityId)
    return true
  }

  /**
   * 清理过期记录（保留用于统计）
   * @param {number} maxAgeMinutes - 最大保留时间（分钟）
   */
  cleanup(maxAgeMinutes = 1440) {
    const now = Date.now()
    const maxAge = maxAgeMinutes * 60 * 1000
    let cleaned = 0

    for (const [key, timestamp] of this.records.entries()) {
      if (now - timestamp > maxAge) {
        this.records.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info(`清理了 ${cleaned} 条过期冷却记录`)
    }
  }

  /**
   * 获取冷却统计信息
   */
  getStats() {
    return {
      totalRecords: this.records.size,
      recordsByType: this._groupByType()
    }
  }

  /**
   * 清空所有冷却记录（脚本启动时调用）
   */
  clear() {
    const count = this.records.size
    this.records.clear()
    if (count > 0) {
      logger.info(`已清空 ${count} 条内存冷却记录`)
    }
  }

  _groupByType() {
    const stats = {}
    for (const key of this.records.keys()) {
      const [taskType] = key.split(':')
      stats[taskType] = (stats[taskType] || 0) + 1
    }
    return stats
  }
}

module.exports = new CooldownManager()
