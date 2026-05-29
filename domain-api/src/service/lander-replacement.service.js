const connection = require('../app/database')
const clickflareConfig = require('../config/clickflare')
const axios = require('axios')


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
        step: 'queued',
        current: 0,
        total: landers.length,
        message: '任务已在队列中，等待前序任务完成...',
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

  /**
   * 异步处理 Lander 替换（后台执行）
   */
  async processLanderReplacement(recordId, dangerousDomain, replacementDomain, landers, workspaceType = 'all') {
    const batchSize = 5
    const delayBetweenRequests = 400
    const totalBatches = Math.ceil(landers.length / batchSize)
    const replacements = []
    const failedLanders = []

    try {

      await this.updateProgress(recordId, 'processing', 0, landers.length, '开始批量更新 Lander...')


      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize
        const end = Math.min(start + batchSize, landers.length)
        const batch = landers.slice(start, end)

        for (let i = 0; i < batch.length; i++) {
          const lander = batch[i]
          try {
            const newUrl = this.replaceUrlDomain(lander.url, dangerousDomain, replacementDomain)

            await axios.patch(
              `${clickflareConfig.baseURL}${clickflareConfig.endpoints.landers}/${lander.lander_key}`,
              {
                url: newUrl,
                workspace_id: lander.workspace_id
              },
              {
                headers: {
                  'api-key': clickflareConfig.apiKey,
                  'Content-Type': 'application/json'
                },
                timeout: 10000
              }
            )

            replacements.push({
              lander_key: lander.lander_key,
              name: lander.name,
              oldUrl: lander.url,
              newUrl: newUrl,
              status: 'success'
            })

            console.log(`[Replace Domain] ✅ Lander [${lander.name}] 更新成功`)
          } catch (error) {
            const errorMsg = error.response?.data?.message || error.message
            failedLanders.push({
              ...lander,
              error: errorMsg
            })
            replacements.push({
              lander_key: lander.lander_key,
              name: lander.name,
              oldUrl: lander.url,
              newUrl: null,
              status: 'failed',
              error: errorMsg
            })
            console.log(`[Replace Domain] ❌ Lander [${lander.name}] 更新失败: ${errorMsg}`)
          }


          if (i < batch.length - 1) {
            await delay(delayBetweenRequests)
          }
        }


        const processed = end
        await this.updateProgress(recordId, 'processing', processed, landers.length, `正在处理... (${processed}/${landers.length})`)


        if (batchIndex < totalBatches - 1) {
          await delay(500)
        }
      }


      if (failedLanders.length > 0) {
        await this.updateProgress(recordId, 'retrying', landers.length, landers.length, `部分失败，${failedLanders.length} 条将在 10 秒后重试...`)
        await delay(10000)

        await this.updateProgress(recordId, 'retrying', landers.length, landers.length, `正在重试 ${failedLanders.length} 条失败的记录...`)
        const retryFailed = []

        for (let i = 0; i < failedLanders.length; i++) {
          const lander = failedLanders[i]
          try {
            const newUrl = this.replaceUrlDomain(lander.url, dangerousDomain, replacementDomain)

            await axios.patch(
              `${clickflareConfig.baseURL}${clickflareConfig.endpoints.landers}/${lander.lander_key}`,
              {
                url: newUrl,
                workspace_id: lander.workspace_id
              },
              {
                headers: {
                  'api-key': clickflareConfig.apiKey,
                  'Content-Type': 'application/json'
                },
                timeout: 10000
              }
            )

            const replacementIndex = replacements.findIndex(r => r.lander_key === lander.lander_key)
            if (replacementIndex !== -1) {
              replacements[replacementIndex] = {
                ...replacements[replacementIndex],
                status: 'success',
                newUrl: newUrl,
                retried: true
              }
            }
            console.log(`[Replace Domain] ✅ 重试成功: Lander [${lander.name}]`)
          } catch (error) {
            const errorMsg = error.response?.data?.message || error.message
            retryFailed.push(lander)
            console.log(`[Replace Domain] ❌ 重试失败: Lander [${lander.name}] - ${errorMsg}`)
          }

          if (i < failedLanders.length - 1) {
            await delay(500)
          }
        }
      }


      let successCount = replacements.filter(r => r.status === 'success').length
      let failedCount = replacements.filter(r => r.status === 'failed').length


      let status = 'success'
      if (failedCount > 0 && successCount > 0) {
        status = 'partial'
      } else if (failedCount > 0 && successCount === 0) {
        status = 'failed'
      }

      const errors = replacements
        .filter(r => r.status === 'failed')
        .map(r => `${r.lander_key}: ${r.error}`)

      await connection.execute(
        `UPDATE cf_lander_url_replacements
         SET success_count = ?, failed_count = ?, status = ?, replacement_details = ?, error_message = ?, synced_at = NOW()
         WHERE id = ?`,
        [
          successCount,
          failedCount,
          status,
          JSON.stringify(replacements),
          errors.length > 0 ? errors.join('; ') : null,
          recordId
        ]
      )

      console.log(`[Replace Domain] 任务 ${recordId} 完成: 成功 ${successCount} 条，失败 ${failedCount} 条`)


      if (successCount > 0) {
        try {
          await this.updateProgress(recordId, 'syncing', landers.length, landers.length, '正在同步 Lander 数据...')
          const { syncLanderService } = require('../tasks/lander-sync.task')
          await syncLanderService()
          console.log(`[Replace Domain] 同步完成`)


          await this.updateProgress(recordId, 'checking', landers.length, landers.length, '正在二次检查是否还有遗漏的域名...')

          const conditions = ['url LIKE ?']
          const params = [`%${dangerousDomain}%`]


          if (workspaceType === 'public') {
            conditions.push('workspace_id IS NULL')
          } else if (workspaceType === 'private') {
            conditions.push('workspace_id IS NOT NULL')
          }

          const whereClause = conditions.join(' AND ')
          const [remainingLanders] = await connection.execute(
            `SELECT lander_key, name, url, workspace_id FROM cf_landers WHERE ${whereClause}`,
            params
          )

          if (remainingLanders.length > 0) {
            console.log(`[Replace Domain] 二次检查发现还有 ${remainingLanders.length} 个 Lander 包含该域名，开始二次替换...`)


            await this.updateProgress(recordId, 'processing', landers.length, landers.length, `发现遗漏，正在二次替换 ${remainingLanders.length} 个 Lander...`)

            const secondBatchSize = 5
            const secondTotalBatches = Math.ceil(remainingLanders.length / secondBatchSize)
            const secondReplacements = []
            const secondFailedLanders = []

            for (let batchIndex = 0; batchIndex < secondTotalBatches; batchIndex++) {
              const start = batchIndex * secondBatchSize
              const end = Math.min(start + secondBatchSize, remainingLanders.length)
              const batch = remainingLanders.slice(start, end)

              for (let i = 0; i < batch.length; i++) {
                const lander = batch[i]
                try {
                  const newUrl = this.replaceUrlDomain(lander.url, dangerousDomain, replacementDomain)

                  await axios.patch(
                    `${clickflareConfig.baseURL}${clickflareConfig.endpoints.landers}/${lander.lander_key}`,
                    {
                      url: newUrl,
                      workspace_id: lander.workspace_id
                    },
                    {
                      headers: {
                        'api-key': clickflareConfig.apiKey,
                        'Content-Type': 'application/json'
                      },
                      timeout: 10000
                    }
                  )

                  secondReplacements.push({
                    lander_key: lander.lander_key,
                    name: lander.name,
                    oldUrl: lander.url,
                    newUrl: newUrl,
                    status: 'success',
                    isSecondRound: true
                  })

                  console.log(`[Replace Domain] ✅ 二次替换 - Lander [${lander.name}] 更新成功`)
                } catch (error) {
                  const errorMsg = error.response?.data?.message || error.message
                  secondFailedLanders.push({
                    ...lander,
                    error: errorMsg
                  })
                  secondReplacements.push({
                    lander_key: lander.lander_key,
                    name: lander.name,
                    oldUrl: lander.url,
                    newUrl: null,
                    status: 'failed',
                    error: errorMsg,
                    isSecondRound: true
                  })
                  console.log(`[Replace Domain] ❌ 二次替换 - Lander [${lander.name}] 更新失败: ${errorMsg}`)
                }

                if (i < batch.length - 1) {
                  await delay(delayBetweenRequests)
                }
              }


              await this.updateProgress(recordId, 'processing', landers.length, landers.length, `正在二次替换... (${end}/${remainingLanders.length})`)

              if (batchIndex < secondTotalBatches - 1) {
                await delay(500)
              }
            }


            const allReplacements = [...replacements, ...secondReplacements]
            const allSuccessCount = allReplacements.filter(r => r.status === 'success').length
            const allFailedCount = allReplacements.filter(r => r.status === 'failed').length


            let finalStatus = 'success'
            if (allFailedCount > 0 && allSuccessCount > 0) {
              finalStatus = 'partial'
            } else if (allFailedCount > 0 && allSuccessCount === 0) {
              finalStatus = 'failed'
            }

            const allErrors = allReplacements
              .filter(r => r.status === 'failed')
              .map(r => `${r.lander_key}: ${r.error}`)


            if (secondReplacements.filter(r => r.status === 'success').length > 0) {
              try {
                await this.updateProgress(recordId, 'syncing', landers.length, landers.length, '二次替换完成，正在最终同步...')
                const { syncLanderService } = require('../tasks/lander-sync.task')
                await syncLanderService()
                console.log(`[Replace Domain] 二次替换后的同步完成`)
              } catch (secondSyncErr) {
                console.error('[Replace Domain] 二次替换后的同步失败:', secondSyncErr)
              }
            }

            await connection.execute(
              `UPDATE cf_lander_url_replacements
               SET success_count = ?, failed_count = ?, status = ?, replacement_details = ?, error_message = ?, synced_at = NOW()
               WHERE id = ?`,
              [
                allSuccessCount,
                allFailedCount,
                finalStatus,
                JSON.stringify(allReplacements),
                allErrors.length > 0 ? allErrors.join('; ') : null,
                recordId
              ]
            )

            console.log(`[Replace Domain] 任务 ${recordId} 最终完成: 成功 ${allSuccessCount} 条（含二次替换 ${secondReplacements.filter(r => r.status === 'success').length} 条），失败 ${allFailedCount} 条`)
          } else {
            console.log(`[Replace Domain] 二次检查完成，未发现遗漏的域名`)


            try {
              await this.updateProgress(recordId, 'syncing', landers.length, landers.length, '正在最终确认同步...')
              const { syncLanderService } = require('../tasks/lander-sync.task')
              await syncLanderService()
              console.log(`[Replace Domain] 最终同步完成`)
            } catch (finalSyncErr) {
              console.error('[Replace Domain] 最终同步失败:', finalSyncErr)
            }
          }
        } catch (syncErr) {
          console.error('[Replace Domain] 同步或二次检查失败:', syncErr)
        }
      }
    } catch (error) {

      await connection.execute(
        `UPDATE cf_lander_url_replacements SET status = 'failed', error_message = ? WHERE id = ?`,
        [error.message, recordId]
      )
      console.error(`[Replace Domain] 任务 ${recordId} 异常:`, error)
    }
  }

  /**
   * 更新处理进度
   */
  async updateProgress(recordId, step, current, total, message) {
    const progressInfo = JSON.stringify({
      step,           // processing, retrying, syncing, checking, completed
      current,
      total,
      message,
      percent: Math.round((current / total) * 100)
    })



    await connection.execute(
      `UPDATE cf_lander_url_replacements SET status = ?, error_message = ? WHERE id = ?`,
      [step, progressInfo, recordId]
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


    let progressInfo = null
    if (record.status === 'queued' || record.status === 'processing' || record.status === 'retrying' || record.status === 'syncing' || record.status === 'checking') {
      try {
        if (record.error_message) {
          progressInfo = JSON.parse(record.error_message)
        }
      } catch (e) {

      }
    }


    if (record.status === 'queued' && !progressInfo) {
      progressInfo = {
        step: 'queued',
        current: 0,
        total: record.affected_count,
        message: '任务已在队列中，等待前序任务完成...',
        percent: 0
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
  async previewReplace(dangerousDomain, replacementDomain, workspaceType = 'all', offset = 0, size = 100) {

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
