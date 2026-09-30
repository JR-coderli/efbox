const connection = require('../app/database')
const axios = require('axios')
const efTrackerConfig = require('../config/ef-tracker')

/**
 * ef-tracker 手动批量替换（前端弹窗入口专用：域名替换页 + ef 落地页列表）。
 * 与 ef-lander-replacement.service.js（自动检测流程）相互独立，互不影响：
 * - 自动流程：hostname 精确匹配 + 未指定替换域名时按 domains 表备用域名规则自动选
 * - 本服务（手动）：保持弹窗原有语义 —— 子串替换、替换域名可留空（= 删除该子串）
 * 两者都会把记录写入 cf_lander_url_replacements（target_system = 'eftracker'），
 * 前端「域名替换」页按 target_system 区分显示。
 */
class EfManualReplacementService {
  /**
   * 预演（dry_run，不写库不产生记录）
   * @returns {Promise<{list: Array<{id, before, after}>, count: number}>}
   */
  async previewReplace(oldValue, newValue) {
    const res = await axios.post(
      `${efTrackerConfig.baseURL}${efTrackerConfig.endpoints.replaceUrl}`,
      { old: oldValue, new: newValue, dry_run: true },
      { timeout: 30000 }
    )
    const list = res?.data?.list || []
    return { list, count: res?.data?.count ?? list.length }
  }

  /**
   * 正式替换并写入替换记录
   * 流程：重新预演拿当前命中的 ids（保证记录明细与实际替换范围一致，两次调用间数据有变化也不会错记）
   *      → 建记录占位（queued）→ 正式替换（ids 限定）→ 回填结果（success / failed）
   * @returns {Promise<{success: boolean, message: string, data?: {recordId: number, affectedCount: number}}>}
   */
  async replace(oldValue, newValue) {
    // 1. 预演拿 ids 与明细
    let matched = []
    try {
      const preview = await axios.post(
        `${efTrackerConfig.baseURL}${efTrackerConfig.endpoints.replaceUrl}`,
        { old: oldValue, new: newValue, dry_run: true },
        { timeout: 30000 }
      )
      matched = preview?.data?.list || []
    } catch (error) {
      console.error(`[ef-手动替换] 预演失败(${oldValue}):`, error.message)
      return { success: false, message: `ef-tracker 预演失败: ${error.message}` }
    }

    const count = matched.length
    if (count === 0) {
      return { success: false, message: 'ef-tracker 未匹配到任何落地页 url，跳过替换' }
    }

    // 2. 建记录（先占位 queued，替换完成后回填结果）
    const [recordResult] = await connection.execute(
      `INSERT INTO cf_lander_url_replacements
         (dangerous_domain, replacement_domain, target_system, affected_count, status, error_message)
       VALUES (?, ?, 'eftracker', ?, 'queued', ?)`,
      [oldValue, newValue, count, JSON.stringify({
        phase: 'queued', round: 0, current: 0, total: count,
        message: '正在调用 ef-tracker 批量替换...', percent: 0
      })]
    )
    const recordId = recordResult.insertId

    // 3. 正式替换（ids 限定只改预演命中的行）
    try {
      const run = await axios.post(
        `${efTrackerConfig.baseURL}${efTrackerConfig.endpoints.replaceUrl}`,
        { old: oldValue, new: newValue, ids: matched.map(item => item.id) },
        { timeout: 60000 }
      )
      const affected = run?.data?.affected ?? count

      // replacement_details 与自动流程同构，复用前端详情弹窗渲染
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

      return { success: true, message: `ef-tracker 替换完成（成功 ${affected} 条）`, data: { recordId, affectedCount: affected } }
    } catch (error) {
      // 失败也落记录，方便在记录页排查
      console.error(`[ef-手动替换] 替换失败(${oldValue}):`, error.message)
      const progressInfo = JSON.stringify({
        phase: 'failed', round: 1, current: 0, total: count,
        message: `ef-tracker 替换失败: ${error.message}`,
        percent: 0, successCount: 0, failedCount: count
      })
      await connection.execute(
        `UPDATE cf_lander_url_replacements SET status = 'failed', error_message = ? WHERE id = ?`,
        [progressInfo, recordId]
      ).catch(err => console.error('[ef-手动替换] 回填失败记录出错:', err.message))

      return { success: false, message: `ef-tracker 替换失败: ${error.message}` }
    }
  }
}

module.exports = new EfManualReplacementService()
