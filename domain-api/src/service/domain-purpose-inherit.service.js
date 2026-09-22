const connection = require('../app/database')

// 替换记录的终态集合：只有这三种状态算"替换已结束"，
// 其余（queued / initial_sync / round1_replacing / mid_sync / round2_replacing / final_sync）
// 一律视为进行中——完整过程状态名单见 lander-replacement.service.js 的 resetStuckReplacements。
// ⚠️ 必须用"终态白名单"而不是枚举过程状态：以后新增过程状态不改这里也自动算"在跑"；
//    此前只认 queued/pending，任务一进入 initial_sync / round1_replacing 等干活状态就被误判
//    "没有在跑的任务"，导致替换进行中就继承 purpose 并提前发"替换完成"飞书通知。
const TERMINAL_REPLACEMENT_STATUSES = ['success', 'failed', 'partial']

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
 * - **只裁决"本轮"记录**（默认以最新一条记录的 replacement_domain 界定轮次）——
 *   历史轮次的 failed/partial 记录不再永久封杀后续轮次的继承（此前按 dangerous_domain
 *   全量查，一条陈年 partial 会让该域名今后每次替换都被判失败）；
 * - 某侧**本轮没有记录** = 该系统本轮未使用/未开始 → 等待（脚本兜底轮询会再裁决）；
 * - 某侧有记录但还没到终态（排队/同步/替换中等进行中状态）→ **等**，本次不改 purpose；
 * - 某侧**最新一条**记录 status=success → 通过（同侧重试成功可覆盖旧失败）；
 * - 某侧**最新一条**记录 failed/partial → 放弃**本次**继承（purpose 保持原状，
 *   避免备用域名在一侧仍挂着危险域名时被误标为 s1-LP；下一轮重试不受影响）；
 * - 脚本兜底调用可传 unusedSides：本轮已实时核实"未使用该域名"的一侧直接通过；
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
   * @param {object} [opts]
   * @param {string} [opts.replacementDomain] 本轮替换域名（不传则以最新一条记录的界定本轮）
   * @param {string[]} [opts.unusedSides] 已实时核实"未使用该域名"的一侧名单（'clickflare'/'eftracker'），
   *   该侧直接通过、忽略其全部记录（历史 failed/partial 与本轮无关）
   * @returns {Promise<{success:boolean, message:string}>}
   */
  async resolveAfterSideFinished(dangerousDomain, opts = {}) {
    try {
      const [records] = await connection.execute(
        `SELECT id, replacement_domain, target_system, status
         FROM cf_lander_url_replacements
         WHERE dangerous_domain = ?
         ORDER BY id ASC`,
        [dangerousDomain]
      )

      // 本轮替换域名：优先用调用方指定的，否则取最新一条记录的（= 最近发起的那轮替换）
      const replacementDomain = opts.replacementDomain || records[records.length - 1]?.replacement_domain
      if (!replacementDomain) {
        // 两侧都没有记录 = 两侧都没用这个域名（理论上不会走到替换流程）
        console.log(`[purpose继承] ⚠️ ${dangerousDomain} 两侧均无替换记录（两侧都未使用），无需继承`)
        return { success: false, message: '两侧均未使用该域名，无需继承' }
      }

      const unusedSides = Array.isArray(opts.unusedSides) ? opts.unusedSides : []

      // 只收集"本轮"（replacement_domain 相同）的记录，按侧分组
      const bySide = { clickflare: [], eftracker: [] }
      for (const r of records) {
        if (r.replacement_domain === replacementDomain && bySide[r.target_system]) {
          bySide[r.target_system].push(r)
        }
      }

      for (const side of ['clickflare', 'eftracker']) {
        // 检测脚本本轮已实时核实"未使用该域名"（查询成功且确认无记录）→ 直接通过
        if (unusedSides.includes(side)) {
          console.log(`[purpose继承] ✅ ${dangerousDomain} 的 ${side} 侧已由检测脚本核实未使用该域名，视为通过`)
          continue
        }

        const sideRecords = bySide[side]

        // 该侧本轮没有任何记录：可能对侧先完成时它还没跑 → 等待（脚本兜底轮询会再裁决）
        if (sideRecords.length === 0) {
          console.log(`[purpose继承] ⏳ ${dangerousDomain} 的 ${side} 侧本轮(${replacementDomain})暂无替换记录，等待`)
          return { success: false, message: `${side} 侧替换仍在进行中，等待中` }
        }

        // 该侧只看最新一条：重试成功可覆盖旧失败；还在跑则等待
        const latest = sideRecords[sideRecords.length - 1]
        if (!TERMINAL_REPLACEMENT_STATUSES.includes(latest.status)) {
          console.log(`[purpose继承] ⏳ ${dangerousDomain} 的 ${side} 侧任务在跑（记录#${latest.id} 状态=${latest.status}），等待两侧全部完成后再裁决`)
          return { success: false, message: `${side} 侧替换仍在进行中，等待中` }
        }

        if (latest.status === 'failed' || latest.status === 'partial') {
          console.log(`[purpose继承] ⛔ ${dangerousDomain} 的 ${side} 侧本轮替换${latest.status === 'partial' ? '部分成功' : '失败'}(记录#${latest.id})，放弃本次 purpose 继承，保持原状（不影响下一轮重试）`)
          return { success: false, message: `${side} 侧替换失败，保持备用域名 purpose 原状` }
        }
      }

      console.log(`[purpose继承] ✅ ${dangerousDomain} 两侧替换均已通过(clickflare:${bySide.clickflare.length}条 / eftracker:${bySide.eftracker.length}条, 本轮=${replacementDomain})，执行继承`)
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
      //    与第 2 步同口径：existing_domain 精确匹配 + landing_page_url 提取 hostname 等值比较，
      //    精确匹配优先排序。不能用 landing_page_url LIKE '%域名%' 兜底——会误匹配
      //    xpro2.kervalix.com 这类前缀兄弟域名，且无 ORDER BY 时兄弟记录可能先返回，继承错 purpose。
      const [dangerousRecords] = await connection.execute(
        `SELECT id, existing_domain, purpose FROM domains
         WHERE existing_domain = ?
            OR SUBSTRING_INDEX(SUBSTRING_INDEX(landing_page_url, '//', -1), '/', 1) = ?
         ORDER BY existing_domain = ? DESC, id ASC
         LIMIT 1`,
        [dangerousDomain, dangerousDomain, dangerousDomain]
      )

      if (dangerousRecords.length === 0) {
        console.log(`[purpose继承] ❌ 危险域名 ${dangerousDomain} 在 domains 表中不存在（按 existing_domain 精确 + landing_page_url 提取 hostname 都没查到），跳过`)
        return { success: false, message: `危险域名 ${dangerousDomain} 在 domains 表中不存在，跳过 purpose 继承` }
      }

      const dangerousPurpose = dangerousRecords[0].purpose
      console.log(`[purpose继承] 危险域名记录: id=${dangerousRecords[0].id} existing_domain=${dangerousRecords[0].existing_domain} purpose="${dangerousPurpose || ''}"`)
      if (!dangerousPurpose) {
        console.log(`[purpose继承] ❌ 危险域名 ${dangerousDomain} 的 purpose 为空，跳过`)
        return { success: false, message: `危险域名 ${dangerousDomain} 的 purpose 为空，跳过 purpose 继承` }
      }

      // 2. 幂等检查：替换域名当前 purpose 已是目标值则不重复更新
      //    查找口径与选备用时互逆：getReplacementDomain 是从 landing_page_url 提取 hostname，
      //    这里就从 landing_page_url 提取 hostname 反查（existing_domain 存的是主域如 funmatch.bid，
      //    替换操作的是子域如 s2.funmatch.bid，只按 existing_domain 精确匹配会 miss——线上已踩过）。
      //    hostname 提取用 SUBSTRING_INDEX 两段截取（兼容 https://x.com、https://x.com/a、x.com/a 三种格式），
      //    比 LIKE '%域名%' 精确（不会误匹配 xpro2.kervalix.com 这类前缀兄弟域名）。
      const [replacementRecords] = await connection.execute(
        `SELECT id, purpose FROM domains
         WHERE existing_domain = ?
            OR SUBSTRING_INDEX(SUBSTRING_INDEX(landing_page_url, '//', -1), '/', 1) = ?
         ORDER BY existing_domain = ? DESC, id ASC
         LIMIT 1`,
        [replacementDomain, replacementDomain, replacementDomain]
      )

      if (replacementRecords.length === 0) {
        console.log(`[purpose继承] ❌ 替换域名 ${replacementDomain} 按 existing_domain 精确 + landing_page_url 提取 hostname 都查不到，跳过`)
        return { success: false, message: `替换域名 ${replacementDomain} 在 domains 表中不存在，跳过 purpose 继承` }
      }

      console.log(`[purpose继承] 替换域名记录: id=${replacementRecords[0].id} 当前purpose="${replacementRecords[0].purpose}"`)

      if (replacementRecords[0].purpose === dangerousPurpose) {
        console.log(`[purpose继承] ✅ 幂等跳过: ${replacementDomain} 已是 "${dangerousPurpose}"`)
        return { success: true, message: `替换域名 ${replacementDomain} 的 purpose 已是 "${dangerousPurpose}"，无需更新` }
      }

      // 3. 更新替换域名 purpose 为危险域名 purpose 原文（危险域名自身标签保持不变）
      //    按第 2 步定位到的记录 id 更新（该记录可能不是按 existing_domain 精确匹配到的）
      const oldPurpose = replacementRecords[0].purpose
      const [updateResult] = await connection.execute(
        `UPDATE domains SET purpose = ? WHERE id = ?`,
        [dangerousPurpose, replacementRecords[0].id]
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
