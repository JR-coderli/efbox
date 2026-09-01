const connection = require('../app/database')

/**
 * 域名 purpose 继承服务（独立模块，与检测预警 + 自动替换主流程解耦）。
 *
 * 用途：危险域名替换成功后，把备用域名的 purpose 改为危险域名的 purpose 原文，
 *       例如 s1-备用 被启用后 → 改为 s1-LP。
 *       危险域名自身标签保持不变（连续 3 轮异常后会被检测脚本自动降级移出监控，
 *       届时场面上自然只剩一个正常的 s1-LP）。
 *
 * 设计原则：
 * - 本服务所有方法内部 try/catch，任何失败只返回 { success:false } 并打日志，
 *   绝不向上抛错，保证接入后主流程（检测/告警/替换）不受任何影响。
 * - 只在替换任务确认成功（successCount > 0）后才被调用。
 */
class DomainPurposeInheritService {
  /**
   * 按替换记录 ID 执行 purpose 继承（自动流程入口）
   * 从 cf_lander_url_replacements 读取危险域名与替换域名，再执行继承。
   * @param {number} recordId cf_lander_url_replacements 记录 ID
   * @returns {Promise<{success:boolean, message:string}>}
   */
  async inheritByRecordId(recordId) {
    try {
      const [records] = await connection.execute(
        `SELECT id, dangerous_domain, replacement_domain, target_system, status, success_count
         FROM cf_lander_url_replacements WHERE id = ?`,
        [recordId]
      )

      if (records.length === 0) {
        return { success: false, message: `替换记录 ${recordId} 不存在，跳过 purpose 继承` }
      }

      const record = records[0]

      if (!record.dangerous_domain || !record.replacement_domain) {
        return { success: false, message: `替换记录 ${recordId} 缺少域名信息，跳过 purpose 继承` }
      }

      return await this.inheritPurpose(record.dangerous_domain, record.replacement_domain)
    } catch (error) {
      console.error(`[purpose继承] 按记录 ${recordId} 继承失败:`, error.message)
      return { success: false, message: `purpose 继承失败: ${error.message}` }
    }
  }

  /**
   * 执行 purpose 继承：把替换域名（原备用）的 purpose 改为危险域名的 purpose 原文
   * @param {string} dangerousDomain 危险域名（hostname）
   * @param {string} replacementDomain 替换域名（hostname，即被启用的备用）
   * @returns {Promise<{success:boolean, message:string}>}
   */
  async inheritPurpose(dangerousDomain, replacementDomain) {
    try {
      // 1. 查危险域名的 purpose 原文
      //    existing_domain 精确匹配优先，landing_page_url 模糊匹配兜底
      //    （与 getReplacementDomain 的查找口径保持一致）
      const [dangerousRecords] = await connection.execute(
        `SELECT id, existing_domain, purpose FROM domains
         WHERE existing_domain = ? OR landing_page_url LIKE ? LIMIT 1`,
        [dangerousDomain, `%${dangerousDomain}%`]
      )

      if (dangerousRecords.length === 0) {
        return { success: false, message: `危险域名 ${dangerousDomain} 在 domains 表中不存在，跳过 purpose 继承` }
      }

      const dangerousPurpose = dangerousRecords[0].purpose
      if (!dangerousPurpose) {
        return { success: false, message: `危险域名 ${dangerousDomain} 的 purpose 为空，跳过 purpose 继承` }
      }

      // 2. 幂等检查：替换域名当前 purpose 已是目标值则不重复更新
      const [replacementRecords] = await connection.execute(
        `SELECT id, purpose FROM domains WHERE existing_domain = ? LIMIT 1`,
        [replacementDomain]
      )

      if (replacementRecords.length === 0) {
        return { success: false, message: `替换域名 ${replacementDomain} 在 domains 表中不存在，跳过 purpose 继承` }
      }

      if (replacementRecords[0].purpose === dangerousPurpose) {
        return { success: true, message: `替换域名 ${replacementDomain} 的 purpose 已是 "${dangerousPurpose}"，无需更新` }
      }

      // 3. 更新替换域名 purpose 为危险域名 purpose 原文（危险域名自身标签保持不变）
      const oldPurpose = replacementRecords[0].purpose
      await connection.execute(
        `UPDATE domains SET purpose = ? WHERE existing_domain = ?`,
        [dangerousPurpose, replacementDomain]
      )

      console.log(`[purpose继承] ${replacementDomain}: "${oldPurpose}" -> "${dangerousPurpose}"（继承自危险域名 ${dangerousDomain}）`)
      return {
        success: true,
        message: `已将 ${replacementDomain} 的 purpose 从 "${oldPurpose}" 改为 "${dangerousPurpose}"`
      }
    } catch (error) {
      console.error(`[purpose继承] ${dangerousDomain} -> ${replacementDomain} 失败:`, error.message)
      return { success: false, message: `purpose 继承失败: ${error.message}` }
    }
  }
}

module.exports = new DomainPurposeInheritService()
