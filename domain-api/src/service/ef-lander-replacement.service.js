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

    // 1.5 过滤：对方接口是 REPLACE(url, old, new) 子串替换（WHERE url LIKE '%old%'），
    //     xpro2.kervalix.com 这类前缀兄弟域名的 URL 也包含危险域名子串，全量替换会把它们
    //     改成 "https://x<新域名>" 的损坏 URL。只保留 URL hostname 恰好等于危险域名的行，
    //     正式执行时用 ids 限定只改这些行（对方接口支持 ids 白名单，见 QUERY_API.md）。
    const allMatched = preview?.data?.list || []
    if ((preview?.data?.count ?? allMatched.length) > allMatched.length) {
      console.log(`[ef-替换] ⚠️ 预演返回行数(${allMatched.length})少于命中总数(${preview?.data?.count})，列表可能被截断，注意核查替换记录`)
    }
    const matched = allMatched.filter(item => {
      try {
        return new URL(item.before).hostname === dangerousDomain
      } catch {
        return false
      }
    })
    const count = matched.length
    const skipped = allMatched.length - count
    if (skipped > 0) {
      console.log(`[ef-替换] ⚠️ 预演命中 ${allMatched.length} 行，其中 ${skipped} 行 hostname ≠ ${dangerousDomain}（兄弟域名/路径包含），已排除不替换`)
    }

    if (count === 0) {
      console.log(`[ef-替换] ef-tracker 未使用域名 ${dangerousDomain}（hostname 精确匹配 0 行），跳过替换`)
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
        // ids 限定只替换 hostname 精确匹配的行（见 1.5 步过滤说明）
        { old: dangerousDomain, new: replacementDomain, ids: matched.map(item => item.id) },
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

      // 替换终态(成功)：触发两侧裁决——只有 Clickflare 侧也全部成功/未使用时才继承 purpose
      await domainPurposeInheritService.resolveAfterSideFinished(dangerousDomain)

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

      // 替换终态(失败)：同样触发裁决——裁决会发现本侧 failed，放弃继承(purpose 保持原状)
      await domainPurposeInheritService.resolveAfterSideFinished(dangerousDomain)

      return { success: false, message: `ef-tracker 替换失败: ${errorMsg}`, data: { recordId } }
    }
  }
}

module.exports = new EfLanderReplacementService()
