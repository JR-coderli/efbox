const connection = require('../app/database')
const axios = require('axios')
const efTrackerConfig = require('../config/ef-tracker')
const domainPurposeInheritService = require('./domain-purpose-inherit.service')

/**
 * ef-归因系统（ab_landers）的危险域名替换服务。
 * 与 Clickflare 侧的 lander-replacement.service.js 相互独立：
 * - Clickflare 侧逐个 PATCH + 两轮替换 + 队列；ef 侧对方接口本身就是批量替换（一条 SQL），无需队列。
 * - 替换记录同样写入 cf_lander_url_replacements，target_system = 'eftracker'，
 *   前端「域名替换」页按 target_system 区分显示。
 */
class EfLanderReplacementService {
  /**
   * 调对方 /query/landers 判断该域名是否被 ef-tracker 的落地页使用
   * @param {string} domain 危险域名
   * @returns {Promise<{exists:boolean, total:number}>}
   */
  async checkDomainUsed(domain) {
    const res = await axios.get(
      `${efTrackerConfig.baseURL}/query/landers`,
      { params: { keyword: domain, size: 1 }, timeout: 15000 }
    )
    const total = res?.data?.total ?? 0
    return { exists: total > 0, total }
  }

  /**
   * 替换危险域名（对侧批量接口一条 SQL 完成，同步执行）
   * 流程：dry_run 预演确认对方在用 → 没在用直接返回（不产生记录）
   *      → 正式替换 → 写入 cf_lander_url_replacements（target_system='eftracker'）
   * @param {string} dangerousDomain 危险域名
   * @param {string} replacementDomain 替换域名
   * @returns {Promise<{success:boolean, message:string, data?:object}>}
   */
  async replaceDangerousDomain(dangerousDomain, replacementDomain) {
    // 1. 预演：确认对方系统确实在用这个域名，没用就不动、不产生记录（与 Clickflare 侧 checkLanderExists 逻辑对齐）
    let preview
    try {
      preview = await axios.post(
        `${efTrackerConfig.baseURL}${efTrackerConfig.endpoints.replaceUrl}`,
        { old: dangerousDomain, new: replacementDomain, dry_run: true },
        { timeout: 30000 }
      )
    } catch (error) {
      console.error(`[ef-替换] 预演失败(${dangerousDomain}):`, error.message)
      return { success: false, message: `ef-tracker 预演失败: ${error.message}` }
    }

    const matched = preview?.data?.list || []
    const count = preview?.data?.count ?? matched.length

    if (count === 0) {
      console.log(`[ef-替换] ef-tracker 未使用域名 ${dangerousDomain}，跳过替换`)
      return { success: false, message: `ef-tracker 未使用域名 ${dangerousDomain}，跳过替换` }
    }

    // 2. 建记录（先占位 queued，替换完成后回填结果）
    const [recordResult] = await connection.execute(
      `INSERT INTO cf_lander_url_replacements
         (dangerous_domain, replacement_domain, target_system, affected_count, status, error_message)
       VALUES (?, ?, 'eftracker', ?, 'queued', ?)`,
      [dangerousDomain, replacementDomain, count, JSON.stringify({
        phase: 'queued', round: 0, current: 0, total: count,
        message: '正在调用 ef-tracker 批量替换...', percent: 0
      })]
    )
    const recordId = recordResult.insertId

    // 3. 正式替换（对方一条 UPDATE 完成）
    try {
      const run = await axios.post(
        `${efTrackerConfig.baseURL}${efTrackerConfig.endpoints.replaceUrl}`,
        { old: dangerousDomain, new: replacementDomain },
        { timeout: 60000 }
      )
      const affected = run?.data?.affected ?? count

      // replacement_details 与 Clickflare 侧同构，复用前端详情弹窗渲染
      const details = matched.map(item => ({
        lander_key: String(item.id),
        name: '',
        oldUrl: item.before,
        newUrl: item.after,
        status: 'success',
        round: 1
      }))

      const progressInfo = JSON.stringify({
        phase: 'done', round: 1, current: affected, total: count,
        message: `ef-tracker 替换完成（成功 ${affected} 条）`,
        percent: 100, successCount: affected, failedCount: 0
      })

      await connection.execute(
        `UPDATE cf_lander_url_replacements
         SET success_count = ?, failed_count = 0, status = 'success',
             replacement_details = ?, error_message = ?, synced_at = NOW()
         WHERE id = ?`,
        [affected, JSON.stringify(details), progressInfo, recordId]
      )

      console.log(`[ef-替换] 任务 ${recordId} 完成: ${dangerousDomain} -> ${replacementDomain}, 替换 ${affected} 条`)

      // 替换成功后：备用域名 purpose 继承危险域名 purpose 原文（如 s1-备用 -> s1-LP）。
      // 独立服务，内部不抛错，继承失败只打日志，不影响替换主流程。
      await domainPurposeInheritService.inheritByRecordId(recordId)

      return { success: true, message: 'ef-tracker 批量替换任务已完成', data: { recordId, affectedCount: affected } }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      console.error(`[ef-替换] 任务 ${recordId} 失败(${dangerousDomain}):`, errorMsg)

      const progressInfo = JSON.stringify({
        phase: 'done', round: 0, current: 0, total: count,
        message: `任务异常结束: ${errorMsg}`, percent: 100
      })
      await connection.execute(
        `UPDATE cf_lander_url_replacements
         SET status = 'failed', error_message = ?
         WHERE id = ?`,
        [progressInfo, recordId]
      )
      return { success: false, message: `ef-tracker 替换失败: ${errorMsg}`, data: { recordId } }
    }
  }
}

module.exports = new EfLanderReplacementService()
