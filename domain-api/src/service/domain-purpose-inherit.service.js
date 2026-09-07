const connection = require('../app/database')

/**
 * 域名 purpose 继承服务（独立模块，与检测预警 + 自动替换主流程解耦）。
 *
 * 用途：危险域名**两侧替换都完成**后，把备用域名的 purpose 改为危险域名的 purpose 原文，
 *       例如 s1-备用 被启用后 → 改为 s1-LP。
 *       危险域名自身标签保持不变（连续 3 轮异常后会被检测脚本自动降级移出监控，
 *       届时场面上自然只剩一个正常的 s1-LP）。
 *
 * 裁决规则（resolveAfterSideFinished，两侧终态判定）：
 * - 按危险域名查 cf_lander_url_replacements 里 Clickflare 与 ef-tracker 两侧的记录；
 * - 某侧**没有记录** = 该系统未使用此域名（两侧替换入口都有"未使用不建记录"的预检）→ 视为通过；
 * - 某侧有记录但还有 queued/pending 状态（任务还在跑）→ **等**，本次不改 purpose；
 * - 某侧最新记录 status=success → 通过；
 * - 某侧存在 failed/partial 记录 → **永久放弃**本次继承（purpose 保持原状，
 *   避免备用域名在一侧仍挂着危险域名时被误标为 s1-LP）；
 * - 两侧都通过 → 执行继承（幂等）。
 *
 * 设计原则：
 * - 本服务所有方法内部 try/catch，任何失败只返回 { success:false } 并打日志，
 *   绝不向上抛错，保证接入后主流程（检测/告警/替换）不受任何影响。
 */
class DomainPurposeInheritService {

  /**
   * 两侧终态裁决入口：任一侧替换到达终态（成功/失败/确认未使用）后调用。
   * 两侧全部成功（或确认未使用）才执行继承；有失败则放弃；还有在跑的则等待。
   * @param {string} dangerousDomain 危险域名（hostname）
   * @returns {Promise<{success:boolean, message:string}>}
   */
  async resolveAfterSideFinished(dangerousDomain) {
    try {
      const [records] = await connection.execute(
        `SELECT id, replacement_domain, target_system, status
         FROM cf_lander_url_replacements
         WHERE dangerous_domain = ?
         ORDER BY id ASC`,
        [dangerousDomain]
      )

      // 按侧分组：clickflare / eftracker
      const bySide = { clickflare: [], eftracker: [] }
      for (const r of records) {
        if (bySide[r.target_system]) bySide[r.target_system].push(r)
      }

      // 任一侧存在失败记录 → 永久放弃继承（只打日志，不改 purpose）
      for (const side of ['clickflare', 'eftracker']) {
        const failed = bySide[side].filter(r => r.status === 'failed' || r.status === 'partial')
        if (failed.length > 0) {
          console.log(`[purpose继承] ⛔ ${dangerousDomain} 的 ${side} 侧存在失败记录(共${failed.length}条, 最新状态=${failed[failed.length - 1].status})，放弃 purpose 继承，保持原状`)
          return { success: false, message: `${side} 侧替换失败，保持备用域名 purpose 原状` }
        }
      }

      // 任一侧还有在跑的任务（queued/pending）→ 等待，本次不动
      for (const side of ['clickflare', 'eftracker']) {
        const running = bySide[side].filter(r => r.status === 'queued' || r.status === 'pending')
        if (running.length > 0) {
          console.log(`[purpose继承] ⏳ ${dangerousDomain} 的 ${side} 侧还有 ${running.length} 条任务在跑，等待两侧全部完成后再裁决`)
          return { success: false, message: `${side} 侧替换仍在进行中，等待中` }
        }
      }

      // 到这里：两侧要么没记录（未使用该域名），要么全是 success
      const replacementDomain = records[0]?.replacement_domain
      if (!replacementDomain) {
        // 两侧都没有记录 = 两侧都没用这个域名（理论上不会走到替换流程）
        console.log(`[purpose继承] ⚠️ ${dangerousDomain} 两侧均无替换记录（两侧都未使用），无需继承`)
        return { success: false, message: '两侧均未使用该域名，无需继承' }
      }

      console.log(`[purpose继承] ✅ ${dangerousDomain} 两侧替换均已完成(clickflare:${bySide.clickflare.length}条记录 / eftracker:${bySide.eftracker.length}条记录)，执行继承 -> ${replacementDomain}`)
      return await this.inheritPurpose(dangerousDomain, replacementDomain)
    } catch (error) {
      console.error(`[purpose继承] 两侧裁决失败(${dangerousDomain}):`, error.message)
      return { success: false, message: `两侧裁决失败: ${error.message}` }
    }
  }
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

      console.log(`[purpose继承] 触发: 记录 ${recordId} (${records[0]?.target_system || '?'} 状态=${records[0]?.status || '?'} 成功数=${records[0]?.success_count ?? '?'} 危险域名=${records[0]?.dangerous_domain || '无'} 替换域名=${records[0]?.replacement_domain || '无'})`)

      if (records.length === 0) {
        console.log(`[purpose继承] ❌ 记录 ${recordId} 不存在，跳过`)
        return { success: false, message: `替换记录 ${recordId} 不存在，跳过 purpose 继承` }
      }

      const record = records[0]

      if (!record.dangerous_domain || !record.replacement_domain) {
        console.log(`[purpose继承] ❌ 记录 ${recordId} 缺少域名信息，跳过`)
        return { success: false, message: `替换记录 ${recordId} 缺少域名信息，跳过 purpose 继承` }
      }

      const result = await this.inheritPurpose(record.dangerous_domain, record.replacement_domain)
      console.log(`[purpose继承] 记录 ${recordId} 结果: success=${result.success} — ${result.message}`)
      return result
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
      console.log(`[purpose继承] 开始: 危险域名=${dangerousDomain} 替换域名=${replacementDomain}`)
      // 1. 查危险域名的 purpose 原文
      //    existing_domain 精确匹配优先，landing_page_url 模糊匹配兜底
      //    （与 getReplacementDomain 的查找口径保持一致）
      const [dangerousRecords] = await connection.execute(
        `SELECT id, existing_domain, purpose FROM domains
         WHERE existing_domain = ? OR landing_page_url LIKE ? LIMIT 1`,
        [dangerousDomain, `%${dangerousDomain}%`]
      )

      if (dangerousRecords.length === 0) {
        console.log(`[purpose继承] ❌ 危险域名 ${dangerousDomain} 在 domains 表中不存在（按 existing_domain 精确 + landing_page_url 模糊都没查到），跳过`)
        return { success: false, message: `危险域名 ${dangerousDomain} 在 domains 表中不存在，跳过 purpose 继承` }
      }

      const dangerousPurpose = dangerousRecords[0].purpose
      console.log(`[purpose继承] 危险域名记录: id=${dangerousRecords[0].id} existing_domain=${dangerousRecords[0].existing_domain} purpose="${dangerousPurpose || ''}"`)
      if (!dangerousPurpose) {
        console.log(`[purpose继承] ❌ 危险域名 ${dangerousDomain} 的 purpose 为空，跳过`)
        return { success: false, message: `危险域名 ${dangerousDomain} 的 purpose 为空，跳过 purpose 继承` }
      }

      // 2. 幂等检查：替换域名当前 purpose 已是目标值则不重复更新
      //    ⚠️ 只按 existing_domain 精确匹配——备用记录若只在 landing_page_url 里会查不到
      const [replacementRecords] = await connection.execute(
        `SELECT id, purpose FROM domains WHERE existing_domain = ? LIMIT 1`,
        [replacementDomain]
      )

      if (replacementRecords.length === 0) {
        console.log(`[purpose继承] ❌ 替换域名 ${replacementDomain} 按 existing_domain 精确匹配查不到（existing_domain 存的是主域而替换的是子域时会miss），跳过`)
        return { success: false, message: `替换域名 ${replacementDomain} 在 domains 表中不存在，跳过 purpose 继承` }
      }

      console.log(`[purpose继承] 替换域名记录: id=${replacementRecords[0].id} 当前purpose="${replacementRecords[0].purpose}"`)

      if (replacementRecords[0].purpose === dangerousPurpose) {
        console.log(`[purpose继承] ✅ 幂等跳过: ${replacementDomain} 已是 "${dangerousPurpose}"`)
        return { success: true, message: `替换域名 ${replacementDomain} 的 purpose 已是 "${dangerousPurpose}"，无需更新` }
      }

      // 3. 更新替换域名 purpose 为危险域名 purpose 原文（危险域名自身标签保持不变）
      const oldPurpose = replacementRecords[0].purpose
      const [updateResult] = await connection.execute(
        `UPDATE domains SET purpose = ? WHERE existing_domain = ?`,
        [dangerousPurpose, replacementDomain]
      )
      console.log(`[purpose继承] UPDATE 影响行数: ${updateResult.affectedRows}`)

      console.log(`[purpose继承] ✅ ${replacementDomain}: "${oldPurpose}" -> "${dangerousPurpose}"（继承自危险域名 ${dangerousDomain}）`)
      return {
        success: true,
        message: `已将 ${replacementDomain} 的 purpose 从 "${oldPurpose}" 改为 "${dangerousPurpose}"`
      }
    } catch (error) {
      console.error(`[purpose继承] ❌ ${dangerousDomain} -> ${replacementDomain} 失败:`, error.message)
      return { success: false, message: `purpose 继承失败: ${error.message}` }
    }
  }
}

module.exports = new DomainPurposeInheritService()
