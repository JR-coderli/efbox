const connection = require('../app/database')
const clickflareConfig = require('../config/clickflare')
const axios = require('axios')

// === 限流相关配置 ===
const REQUEST_DELAY_MS = 800      // 单次 PATCH 请求之间的基础间隔（毫秒）
const MAX_429_RETRIES = 5         // 单个 Lander 遇到 429 时最大重试次数
const BASE_429_WAIT_MS = 5000     // 无 Retry-After 头时的指数退避基数（5s, 10s, 20s, 40s, 60s）
const MAX_429_WAIT_MS = 60000     // 单次 429 等待上限（60 秒）

// === 同步重试配置 ===
const MAX_SYNC_RETRIES = 3             // 同步 Clickflare 数据失败时的最大重试次数
const SYNC_RETRY_BASE_DELAY_MS = 5000  // 同步重试基础延迟（5s, 10s, 20s）


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


/**
 * 替换任务队列
 * 确保同一时间只有一个替换任务在执行，避免并发冲突
 */
class ReplacementQueue {
  constructor() {
    this.queue = []      // 待执行的任务队列
    this.processing = false  // 是否正在处理任务
  }

  /**
   * 添加任务到队列
   * @param {Function} task - 要执行的任务函数
   * @returns {Promise} 返回任务执行结果的 Promise
   */
  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      console.log(`[ReplacementQueue] 任务已加入队列，当前队列长度: ${this.queue.length}`)
      this.process()
    })
  }

  /**
   * 处理队列中的任务
   */
  async process() {

    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true


    while (this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift()
      const queueLength = this.queue.length

      try {
        console.log(`[ReplacementQueue] 开始执行任务，剩余队列长度: ${queueLength}`)
        const result = await task()
        resolve(result)
        console.log(`[ReplacementQueue] 任务执行成功，剩余队列长度: ${queueLength}`)
      } catch (error) {
        console.error(`[ReplacementQueue] 任务执行失败:`, error.message)
        reject(error)
      }
    }

    this.processing = false
    console.log(`[ReplacementQueue] 队列处理完成`)
  }

  /**
   * 获取当前队列长度
   */
  getQueueLength() {
    return this.queue.length
  }

  /**
   * 是否正在处理任务
   */
  isProcessing() {
    return this.processing
  }
}


const replacementQueue = new ReplacementQueue()

class LanderReplacementService {
  /**
   * 启动异步替换任务（立即返回 recordId）
   * 任务会加入队列，按顺序执行，但接口立即返回
   * @param {string} dangerousDomain 危险域名
   * @param {string} replacementDomain 替换域名
   * @param {string} workspaceType 工作区类型: 'all'(全部), 'public'(无workspace_id), 'private'(有workspace_id)
   */
  async replaceDangerousDomainAsync(dangerousDomain, replacementDomain, workspaceType = 'all') {

    const conditions = ['url LIKE ?']
    const params = [`%${dangerousDomain}%`]


    if (workspaceType === 'public') {
      conditions.push('workspace_id IS NULL')
    } else if (workspaceType === 'private') {
      conditions.push('workspace_id IS NOT NULL')
    }

    const whereClause = conditions.join(' AND ')


    const [landers] = await connection.execute(
      `SELECT lander_key, name, url, workspace_id FROM cf_landers WHERE ${whereClause}`,
      params
    )

    if (landers.length === 0) {
      return {
        success: false,
        message: '未找到包含该域名的 Lander',
        data: null
      }
    }


    const [recordResult] = await connection.execute(
      `INSERT INTO cf_lander_url_replacements (dangerous_domain, replacement_domain, affected_count, status, error_message) VALUES (?, ?, ?, 'queued', ?)`,
      [dangerousDomain, replacementDomain, landers.length, JSON.stringify({
        phase: 'queued',
        round: 0,
        current: 0,
        total: landers.length,
        message: '任务已在队列中，等待前序任务完成...',
        percent: 0,
        queueLength: replacementQueue.getQueueLength()
      })]
    )
    const recordId = recordResult.insertId


    console.log(`[Replace Domain] 任务 ${recordId} 已加入队列: ${dangerousDomain} -> ${replacementDomain}, 影响 ${landers.length} 个 Lander`)


    replacementQueue.add(async () => {
      return this._executeReplacement(recordId, dangerousDomain, replacementDomain, landers, workspaceType)
    }).catch(error => {

      console.error(`[Replace Domain] 任务 ${recordId} 队列执行失败:`, error)
      connection.execute(
        `UPDATE cf_lander_url_replacements SET status = 'failed', error_message = ? WHERE id = ?`,
        [error.message, recordId]
      )
    })


    return {
      success: true,
      message: '批量替换任务已启动',
      data: {
        recordId,
        affectedCount: landers.length
      }
    }
  }


  /**
   * 执行替换任务的实际逻辑（内部方法，由队列调用）
   */
  async _executeReplacement(recordId, dangerousDomain, replacementDomain, landers, workspaceType = 'all') {
    console.log(`[Replace Domain] 任务 ${recordId} 开始执行`)


    await this.processLanderReplacement(recordId, dangerousDomain, replacementDomain, landers, workspaceType)

    return {
      success: true,
      recordId,
      affectedCount: landers.length
    }
  }

  // ================================================================
  // 核心替换流程：同步 → 第一轮替换 → 同步 → 第二轮替换 → 最终同步
  // ================================================================

  /**
   * 异步处理 Lander 替换（后台执行）
   *
   * 完整流程：
   * 1. 初始同步：从 Clickflare 拉取最新数据到本地 DB
   * 2. 第一轮替换：批量 PATCH 调用 Clickflare API
   * 3. 中间同步：同步 Clickflare 数据到本地 DB
   * 4. 第二轮替换：对仍包含危险域名的 Lander 再次替换
   * 5. 最终同步：同步最终结果到本地 DB
   */
  async processLanderReplacement(recordId, dangerousDomain, replacementDomain, landers, workspaceType = 'all') {
    const allReplacements = []

    try {
      // ====== 阶段 1：初始同步 ======
      await this._syncFromClickflare(recordId, 'initial_sync', landers.length, 0,
        '正在从 Clickflare 同步最新数据...')

      // 同步后重新查询受影响的 Lander（同步可能更新了 URL）
      const round1Landers = await this._queryAffectedLanders(dangerousDomain, workspaceType)

      if (round1Landers.length === 0) {
        console.log(`[Replace Domain] 任务 ${recordId} 同步后未发现需要替换的 Lander`)
        await this._finishTask(recordId, allReplacements, '同步后未发现需要替换的 Lander')
        return
      }

      console.log(`[Replace Domain] 任务 ${recordId} 同步后仍有 ${round1Landers.length} 个 Lander 需要替换`)

      // ====== 阶段 2：第一轮替换 ======
      const round1 = await this._batchReplace(
        round1Landers, dangerousDomain, replacementDomain,
        recordId, 'round1_replacing', 1, '第一轮'
      )
      allReplacements.push(...round1.replacements)

      // ====== 阶段 3：中间同步 ======
      await this._syncFromClickflare(recordId, 'mid_sync', round1Landers.length, 1,
        `第一轮替换完成（成功 ${round1.replacements.filter(r => r.status === 'success').length} 条），正在同步 Clickflare 数据...`)

      // 同步后查询是否还有遗漏
      const round2Landers = await this._queryAffectedLanders(dangerousDomain, workspaceType)

      if (round2Landers.length > 0) {
        console.log(`[Replace Domain] 任务 ${recordId} 中间同步后仍有 ${round2Landers.length} 个 Lander 需要第二轮替换`)

        // ====== 阶段 4：第二轮替换 ======
        const round2 = await this._batchReplace(
          round2Landers, dangerousDomain, replacementDomain,
          recordId, 'round2_replacing', 2, '第二轮'
        )
        allReplacements.push(...round2.replacements)
      } else {
        console.log(`[Replace Domain] 任务 ${recordId} 中间同步后未发现遗漏的域名，跳过第二轮`)
      }

      // ====== 阶段 5：最终同步 ======
      await this._syncFromClickflare(recordId, 'final_sync', allReplacements.length, 2,
        '替换完成，正在最终同步 Clickflare 数据到本地...')

      // ====== 阶段 6：完成 ======
      await this._finishTask(recordId, allReplacements)

    } catch (error) {
      console.error(`[Replace Domain] 任务 ${recordId} 异常:`, error)

      // 异常时尽量保存已有结果，并尝试最终同步
      try {
        await this._syncFromClickflare(recordId, 'final_sync', allReplacements.length, 2,
          '任务异常，正在同步已完成的修改...')
      } catch (syncErr) {
        console.error(`[Replace Domain] 任务 ${recordId} 异常后同步失败:`, syncErr.message)
      }

      await this._finishTask(recordId, allReplacements, null, error.message)
    }
  }

  // ================================================================
  // 辅助方法
  // ================================================================

  /**
   * 查询本地数据库中仍包含指定危险域名的 Lander
   */
  async _queryAffectedLanders(dangerousDomain, workspaceType) {
    const conditions = ['url LIKE ?']
    const params = [`%${dangerousDomain}%`]

    if (workspaceType === 'public') {
      conditions.push('workspace_id IS NULL')
    } else if (workspaceType === 'private') {
      conditions.push('workspace_id IS NOT NULL')
    }

    const [landers] = await connection.execute(
      `SELECT lander_key, name, url, workspace_id FROM cf_landers WHERE ${conditions.join(' AND ')}`,
      params
    )
    return landers
  }

  /**
   * 从 Clickflare 同步数据到本地数据库（带重试）
   * 同步失败时自动重试，指数退避：5s → 10s → 20s
   */
  async _syncFromClickflare(recordId, phase, total, round, message) {
    let lastError = null

    for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
      const isRetry = attempt > 0
      const displayMessage = isRetry
        ? `${message}（第 ${attempt + 1}/${MAX_SYNC_RETRIES} 次重试）`
        : message

      await this.updateProgress(recordId, phase, total, total, displayMessage, { round })
      console.log(`[Replace Domain] 任务 ${recordId} 同步阶段 [${phase}]: ${displayMessage}`)

      try {
        const { syncLanderService } = require('../tasks/lander-sync.task')
        await syncLanderService()
        return  // 同步成功，直接返回
      } catch (error) {
        lastError = error
        console.warn(`[Replace Domain] 任务 ${recordId} 同步失败 (第 ${attempt + 1}/${MAX_SYNC_RETRIES} 次): ${error.message}`)

        if (attempt < MAX_SYNC_RETRIES - 1) {
          const waitMs = SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
          const waitSec = waitMs / 1000
          console.warn(`[Replace Domain] 任务 ${recordId} ${waitSec}s 后重试同步...`)
          await this.updateProgress(recordId, phase, total, total,
            `同步失败，${waitSec}s 后重试（第 ${attempt + 1}/${MAX_SYNC_RETRIES} 次）...`, { round })
          await delay(waitMs)
        }
      }
    }

    // 所有重试均失败，抛出最后一个错误
    throw lastError
  }

  /**
   * 批量替换：对一组 Lander 逐个调用 Clickflare PATCH API
   * @returns {{ replacements: Array, failed: Array }}
   */
  async _batchReplace(landers, dangerousDomain, replacementDomain, recordId, phase, round, roundLabel) {
    const replacements = []
    const failed = []
    const total = landers.length

    console.log(`[Replace Domain] 任务 ${recordId} 开始${roundLabel}替换，共 ${total} 个 Lander`)

    for (let i = 0; i < landers.length; i++) {
      const lander = landers[i]
      const newUrl = this.replaceUrlDomain(lander.url, dangerousDomain, replacementDomain)

      try {
        const result = await this._patchLanderUrl(
          lander.lander_key, newUrl, lander.workspace_id,
          // onThrottle 回调：遇到 429 时更新前端进度
          async (waitMs, attempt) => {
            await this.updateProgress(recordId, phase, i, total,
              `${roundLabel}替换中... (${i}/${total}) - 遇到限流，第 ${attempt} 次等待 ${Math.round(waitMs / 1000)}s 后重试`,
              { round })
          }
        )

        if (result.success) {
          replacements.push({
            lander_key: lander.lander_key,
            name: lander.name,
            oldUrl: lander.url,
            newUrl: newUrl,
            status: 'success',
            round: round
          })
          console.log(`[Replace Domain] ✅ ${roundLabel} Lander [${lander.name}] 更新成功`)
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message
        failed.push({ ...lander, error: errorMsg })
        replacements.push({
          lander_key: lander.lander_key,
          name: lander.name,
          oldUrl: lander.url,
          newUrl: newUrl,
          status: 'failed',
          error: errorMsg,
          round: round
        })
        console.log(`[Replace Domain] ❌ ${roundLabel} Lander [${lander.name}] 更新失败: ${errorMsg}`)
      }

      // 更新进度
      await this.updateProgress(recordId, phase, i + 1, total,
        `${roundLabel}替换中... (${i + 1}/${total})`, { round })

      // 请求间隔
      if (i < landers.length - 1) {
        await delay(REQUEST_DELAY_MS)
      }
    }

    console.log(`[Replace Domain] 任务 ${recordId} ${roundLabel}替换完成: 成功 ${replacements.filter(r => r.status === 'success').length}，失败 ${failed.length}`)
    return { replacements, failed }
  }

  /**
   * 调用 Clickflare PATCH API 更新单个 Lander 的 URL
   * 内置 429 限流处理：优先读取 Retry-After 头，否则指数退避
   *
   * @param {string} landerKey - Lander ID
   * @param {string} newUrl - 新 URL
   * @param {string|null} workspaceId - 工作区 ID
   * @param {Function|null} onThrottle - 遇到 429 时的回调 (waitMs, attempt) => Promise
   * @returns {Promise<{success: boolean}>}
   */
  async _patchLanderUrl(landerKey, newUrl, workspaceId, onThrottle = null) {
    let attempt = 0

    while (true) {
      try {
        await axios.patch(
          `${clickflareConfig.baseURL}${clickflareConfig.endpoints.landers}/${landerKey}`,
          { url: newUrl, workspace_id: workspaceId },
          {
            headers: {
              'api-key': clickflareConfig.apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        )
        return { success: true }

      } catch (error) {
        const is429 = error.response?.status === 429

        if (!is429 || attempt >= MAX_429_RETRIES) {
          throw error
        }

        // 计算 429 等待时间
        const waitMs = this._calculate429Wait(error.response, attempt)

        console.warn(`[Replace Domain] 429 限流 (Lander: ${landerKey})，第 ${attempt + 1}/${MAX_429_RETRIES} 次重试，等待 ${Math.round(waitMs / 1000)}s`)

        // 通知前端正在等待
        if (onThrottle) {
          await onThrottle(waitMs, attempt + 1)
        }

        await delay(waitMs)
        attempt++
      }
    }
  }

  /**
   * 计算 429 限流的等待时间
   * 优先使用响应头中的 Retry-After，否则使用指数退避
   */
  _calculate429Wait(response, attempt) {
    const retryAfter = response?.headers?.['retry-after']

    if (retryAfter) {
      // Retry-After 可能是秒数（"120"）或 HTTP 日期（"Wed, 21 Oct 2025 07:28:00 GMT"）
      const asNum = parseFloat(retryAfter)
      if (!isNaN(asNum)) {
        return Math.min(MAX_429_WAIT_MS, Math.max(1000, Math.ceil(asNum * 1000)))
      }
      const date = new Date(retryAfter)
      if (!isNaN(date.getTime())) {
        return Math.min(MAX_429_WAIT_MS, Math.max(1000, date.getTime() - Date.now()))
      }
    }

    // 无 Retry-After 头，指数退避: 5s, 10s, 20s, 40s, 60s
    return Math.min(MAX_429_WAIT_MS, BASE_429_WAIT_MS * Math.pow(2, attempt))
  }

  /**
   * 完成任务：计算最终状态，保存结果
   */
  async _finishTask(recordId, replacements, customMessage = null, errorMessage = null) {
    const successCount = replacements.filter(r => r.status === 'success').length
    const failedCount = replacements.filter(r => r.status === 'failed').length

    let status = 'success'
    if (failedCount > 0 && successCount > 0) {
      status = 'partial'
    } else if (failedCount > 0 && successCount === 0) {
      status = 'failed'
    }

    const errors = replacements
      .filter(r => r.status === 'failed')
      .map(r => `${r.lander_key}: ${r.error}`)

    const doneMessage = customMessage ||
      `所有任务完成（成功 ${successCount} 条，失败 ${failedCount} 条）`

    const progressInfo = JSON.stringify({
      phase: 'done',
      round: 0,
      current: replacements.length,
      total: replacements.length,
      message: errorMessage ? `任务异常结束: ${errorMessage}` : doneMessage,
      percent: 100,
      successCount,
      failedCount
    })

    await connection.execute(
      `UPDATE cf_lander_url_replacements
       SET success_count = ?, failed_count = ?, status = ?, replacement_details = ?, error_message = ?, synced_at = NOW()
       WHERE id = ?`,
      [
        successCount,
        failedCount,
        status,
        JSON.stringify(replacements),
        errors.length > 0 ? errors.join('; ') : progressInfo,
        recordId
      ]
    )

    console.log(`[Replace Domain] 任务 ${recordId} 完成: 状态=${status}, 成功 ${successCount} 条，失败 ${failedCount} 条`)
  }

  // ================================================================
  // 进度管理
  // ================================================================

  /**
   * 更新处理进度
   * @param {string} recordId - 记录 ID
   * @param {string} phase - 阶段标识
   * @param {number} current - 当前进度
   * @param {number} total - 总数
   * @param {string} message - 进度消息
   * @param {object} extra - 额外字段（如 round）
   */
  async updateProgress(recordId, phase, current, total, message, extra = {}) {
    const progressInfo = JSON.stringify({
      phase,
      current,
      total,
      message,
      percent: total > 0 ? Math.round((current / total) * 100) : 100,
      ...extra
    })

    await connection.execute(
      `UPDATE cf_lander_url_replacements SET status = ?, error_message = ? WHERE id = ?`,
      [phase, progressInfo, recordId]
    )
  }

  /**
   * 获取任务进度
   */
  async getProgress(recordId) {
    const [records] = await connection.execute(
      `SELECT id, dangerous_domain, replacement_domain, affected_count, success_count, failed_count, status,
              error_message, synced_at, created_at
       FROM cf_lander_url_replacements WHERE id = ?`,
      [recordId]
    )

    if (records.length === 0) {
      return null
    }

    const record = records[0]

    const finalStatuses = ['success', 'partial', 'failed']
    const isFinal = finalStatuses.includes(record.status)

    // 尝试解析进度 JSON（无论什么状态都尝试）
    let progressInfo = null
    if (record.error_message) {
      try {
        progressInfo = JSON.parse(record.error_message)
      } catch (e) {
        // 不是 JSON 格式，是纯文本错误信息
      }
    }

    // 为没有进度信息的场景提供默认值
    if (record.status === 'queued' && !progressInfo) {
      progressInfo = {
        phase: 'queued',
        round: 0,
        current: 0,
        total: record.affected_count,
        message: '任务已在队列中，等待前序任务完成...',
        percent: 0
      }
    }

    if (isFinal && !progressInfo) {
      const successCount = record.success_count || 0
      const failedCount = record.failed_count || 0
      progressInfo = {
        phase: 'done',
        round: 0,
        current: record.affected_count,
        total: record.affected_count,
        message: `任务完成（成功 ${successCount} 条，失败 ${failedCount} 条）`,
        percent: 100,
        successCount,
        failedCount
      }
    }

    return {
      id: record.id,
      dangerous_domain: record.dangerous_domain,
      replacement_domain: record.replacement_domain,
      affected_count: record.affected_count,
      success_count: record.success_count || 0,
      failed_count: record.failed_count || 0,
      status: record.status,
      synced_at: record.synced_at,
      created_at: record.created_at,
      progress: progressInfo
    }
  }

  /**
   * 替换危险域名（同步版本，保留兼容性）
   * @deprecated 使用 replaceDangerousDomainAsync 代替
   * 注意：此方法现在也使用队列模式，立即返回 recordId，不再等待执行完成
   */
  async replaceDangerousDomain(dangerousDomain, replacementDomain, workspaceType = 'all') {

    return this.replaceDangerousDomainAsync(dangerousDomain, replacementDomain, workspaceType)
  }

  /**
   * 替换 URL 中的域名
   * 保持原URL的www格式一致（如果原URL没有www，新域名也不带www）
   */
  replaceUrlDomain(url, oldDomain, newDomain) {
    try {
      const urlObj = new URL(url)
      const originalHostname = urlObj.hostname


      const hasWww = originalHostname.startsWith('www.')


      let finalNewDomain = newDomain
      if (!hasWww && newDomain.startsWith('www.')) {

        finalNewDomain = newDomain.substring(4)
      } else if (hasWww && !newDomain.startsWith('www.')) {

        finalNewDomain = 'www.' + newDomain
      }

      urlObj.hostname = finalNewDomain
      return urlObj.toString()
    } catch (error) {

      return url.replace(oldDomain, newDomain)
    }
  }

  /**
   * 预览域名替换（不执行实际替换，只返回匹配的 lander 列表和替换后的 URL）
   * @param {string} dangerousDomain 要替换的域名
   * @param {string} replacementDomain 替换域名
   * @param {string} workspaceType 工作区类型: 'all', 'public', 'private'
   * @param {number} offset 分页偏移
   * @param {number} size 分页大小
   */
  async previewReplace(dangerousDomain, replacementDomain, workspaceType = 'all', offset = 0, size = 100, forceSync = false) {

    // 首次打开预览窗口时先同步 Clickflare 数据，确保预览的是最新数据
    // 前端通过 force_sync=true 标识一次新的预览会话（窗口重新打开）
    // 同一预览会话内的翻页、重新搜索不同域名都不会再触发同步
    // 同步失败直接抛错，前端提示用户重试，不用旧数据展示
    if (forceSync) {
      const { syncLanderService } = require('../tasks/lander-sync.task')
      try {
        await syncLanderService()
      } catch (error) {
        throw new Error(`同步 Clickflare 数据失败: ${error.message}`)
      }
    }

    const conditions = ['url LIKE ?']
    const params = [`%${dangerousDomain}%`]

    if (workspaceType === 'public') {
      conditions.push('workspace_id IS NULL')
    } else if (workspaceType === 'private') {
      conditions.push('workspace_id IS NOT NULL')
    }

    const whereClause = conditions.join(' AND ')


    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM cf_landers WHERE ${whereClause}`,
      params
    )
    const total = countResult[0].total

    if (total === 0) {
      return { list: [], total: 0 }
    }


    const limit = parseInt(size)
    const offsetVal = parseInt(offset)
    const [landers] = await connection.execute(
      `SELECT lander_key, name, url FROM cf_landers WHERE ${whereClause} ORDER BY cf_created_at DESC LIMIT ${limit} OFFSET ${offsetVal}`,
      params
    )


    const list = landers.map(lander => ({
      lander_key: lander.lander_key,
      name: lander.name,
      oldUrl: lander.url,
      newUrl: this.replaceUrlDomain(lander.url, dangerousDomain, replacementDomain)
    }))

    return { list, total }
  }

  /**
   * 获取替换记录列表（带分页）
   */
  async getList(offset = 0, size = 20) {
    const limit = parseInt(size)
    const offsetVal = parseInt(offset)


    const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM cf_lander_url_replacements`)
    const total = countResult[0].total


    const [list] = await connection.execute(
      `SELECT id, dangerous_domain, replacement_domain, affected_count, success_count, failed_count, status,
              error_message, synced_at, created_at, updated_at
       FROM cf_lander_url_replacements
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offsetVal}`
    )

    return [list, total]
  }

  /**
   * 获取单条替换记录详情
   */
  async getDetail(id) {
    const [records] = await connection.execute(
      `SELECT * FROM cf_lander_url_replacements WHERE id = ?`,
      [id]
    )

    if (records.length === 0) {
      return null
    }

    return records[0]
  }

  /**
   * 标记同步完成
   */
  async markSynced(id) {
    await connection.execute(
      `UPDATE cf_lander_url_replacements SET synced_at = NOW() WHERE id = ?`,
      [id]
    )
  }

  /**
   * 重置"卡住"的替换任务
   * 服务重启时调用，将所有处于中间状态的任务标记为失败（中断）
   * 防止后端崩溃后前端永远显示"处理中"
   * @returns {Promise<number>} 重置的记录数
   */
  async resetStuckReplacements() {
    const activeStatuses = [
      'queued', 'initial_sync', 'round1_replacing',
      'mid_sync', 'round2_replacing', 'final_sync'
    ]
    const placeholders = activeStatuses.map(() => '?').join(',')

    const progressJson = JSON.stringify({
      phase: 'done',
      round: 0,
      current: 0,
      total: 0,
      message: '服务重启，任务被中断（后端可能崩溃或手动重启）',
      percent: 100
    })

    const [result] = await connection.execute(
      `UPDATE cf_lander_url_replacements
       SET status = 'failed', error_message = ?
       WHERE status IN (${placeholders})`,
      [progressJson, ...activeStatuses]
    )
    return result.affectedRows
  }

  /**
   * 获取队列状态
   * @returns {Object} 队列状态信息
   */
  getQueueStatus() {
    return {
      queueLength: replacementQueue.getQueueLength(),
      isProcessing: replacementQueue.isProcessing(),
      status: replacementQueue.isProcessing()
        ? '正在处理任务'
        : (replacementQueue.getQueueLength() > 0 ? '等待处理' : '空闲')
    }
  }
}

module.exports = new LanderReplacementService()
