const connection = require('../app/database')

class LanderService {
  /**
   * 判断两条 lander 数据是否有变化
   * 只比较关键字段：name、url、workspace_id
   * cf_created_at 使用容错比较（允许 ±2 秒差异，避免时区转换导致的 1 秒偏差）
   */
  _hasLanderChanged(existing, newData) {

    const existingWorkspaceId = existing.workspace_id == null ? null : existing.workspace_id
    const newWorkspaceId = newData.workspace_id == null ? null : newData.workspace_id


    const isDateSimilar = (date1, date2) => {
      if (!date1 && !date2) return true  // 都为空，视为相同
      if (!date1 || !date2) return false // 一个为空，不同
      const ts1 = Math.floor(new Date(date1).getTime() / 1000)
      const ts2 = Math.floor(new Date(date2).getTime() / 1000)
      return Math.abs(ts1 - ts2) <= 2  // 允许 2 秒差异
    }

    const createdChanged = !isDateSimilar(existing.cf_created_at, newData.cf_created_at)


    const nameChanged = existing.name !== newData.name
    const urlChanged = existing.url !== newData.url
    const workspaceChanged = existingWorkspaceId !== newWorkspaceId


    if (nameChanged || urlChanged || workspaceChanged || createdChanged) {
      if (!this._debugLogged) {
        const ts1 = existing.cf_created_at ? Math.floor(new Date(existing.cf_created_at).getTime() / 1000) : null
        const ts2 = newData.cf_created_at ? Math.floor(new Date(newData.cf_created_at).getTime() / 1000) : null
        console.log('[对比调试] 首条变化数据:', {
          lander_key: existing.lander_key,
          nameChanged,
          urlChanged,
          workspaceChanged,
          createdChanged: createdChanged ? `\n  DB: ${ts1}\n  API: ${ts2}\n  差值: ${ts1 - ts2}秒` : false
        })
        this._debugLogged = true
      }
    }

    return nameChanged || urlChanged || workspaceChanged || createdChanged
  }

  /**
   * 智能同步 Lander 数据
   * 对比后决定：新增、更新、删除、跳过
   */
  async syncLanders(landers) {
    if (!landers || landers.length === 0) {
      return { inserted: 0, updated: 0, deleted: 0, skipped: 0, total: 0 }
    }


    const [existing] = await connection.execute(
      'SELECT `lander_key`, `name`, `url`, `workspace_id`, `cf_created_at`, `cf_updated_at` FROM `cf_landers`'
    )
    const existingMap = new Map(existing.map(e => [e.lander_key, e]))


    const toInsert = []
    const toUpdate = []
    let skipped = 0

    landers.forEach(l => {
      const landerKey = l.lander_key
      const existingData = existingMap.get(landerKey)

      if (!existingData) {

        toInsert.push(l)
      } else if (this._hasLanderChanged(existingData, l)) {

        toUpdate.push(l)
      } else {

        skipped++
      }
    })


    const newKeys = new Set(landers.map(l => l.lander_key))
    const toDelete = [...existingMap.keys()].filter(key => !newKeys.has(key))

    console.log(`[Lander 同步] 新增: ${toInsert.length}, 更新: ${toUpdate.length}, 跳过: ${skipped}, 删除: ${toDelete.length}`)


    if (toInsert.length > 0) {
      const insertStatement = `
        INSERT INTO \`cf_landers\`
          (\`lander_key\`, \`name\`, \`url\`, \`workspace_id\`, \`cf_created_at\`, \`cf_updated_at\`, \`synced_at\`)
        VALUES ?
      `

      const insertValues = toInsert.map(l => [
        l.lander_key,
        l.name,
        l.url,
        l.workspace_id || null,
        l.cf_created_at || null,
        l.cf_updated_at || null,
        new Date()
      ])

      await connection.query(insertStatement, [insertValues])
    }


    if (toUpdate.length > 0) {


      const landerKeysToUpdate = toUpdate.map(l => l.lander_key)


      await connection.query(
        'DELETE FROM `cf_landers` WHERE `lander_key` IN (?)',
        [landerKeysToUpdate]
      )


      const insertStatement = `
        INSERT INTO \`cf_landers\`
          (\`lander_key\`, \`name\`, \`url\`, \`workspace_id\`, \`cf_created_at\`, \`cf_updated_at\`, \`synced_at\`)
        VALUES ?
      `

      const insertValues = toUpdate.map(l => [
        l.lander_key,
        l.name,
        l.url,
        l.workspace_id || null,
        l.cf_created_at || null,
        l.cf_updated_at || null,
        new Date()
      ])

      await connection.query(insertStatement, [insertValues])
    }


    if (toDelete.length > 0) {
      await connection.query(
        'DELETE FROM `cf_landers` WHERE `lander_key` IN (?)',
        [toDelete]
      )
    }

    return {
      inserted: toInsert.length,
      updated: toUpdate.length,
      skipped,
      deleted: toDelete.length,
      total: landers.length
    }
  }

  /**
   * 获取 Lander 列表（带截图信息和汇总统计数据）
   * @param {string} name - Lander 名称模糊搜索
   * @param {string} url - URL 模糊搜索
   * @param {number} offset - 偏移量
   * @param {number} size - 每页数量
   * @param {string} sort_by - 排序字段
   * @param {string} sort_order - 排序方向
   * @param {string} workspace_type - 工作区类型过滤: 'all'(全部), 'public'(无workspace_id), 'private'(有workspace_id)
   */
  async list(name, url, offset, size, sort_by = 'cf_created_at', sort_order = 'desc', workspace_type = 'all') {
    const limit = parseInt(size)
    const offsetVal = parseInt(offset)


    const conditions = []
    const params = []

    if (name && name.trim()) {
      conditions.push('l.name LIKE ?')
      params.push(`%${name}%`)
    }

    if (url && url.trim()) {
      conditions.push('l.url LIKE ?')
      params.push(`%${url}%`)
    }


    if (workspace_type === 'public') {
      conditions.push('l.workspace_id IS NULL')
    } else if (workspace_type === 'private') {
      conditions.push('l.workspace_id IS NOT NULL')
    }


    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1'


    const allowedSortFields = ['cf_created_at', 'cf_updated_at', 'synced_at', 'name', 'created_at']
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'cf_created_at'
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC'

    const statement = `
      SELECT
        l.id,
        l.lander_key,
        l.name,
        l.url,
        l.workspace_id,
        l.cf_created_at,
        l.cf_updated_at,
        l.synced_at,
        l.created_at,
        l.updated_at,
        lp.screenshot_url,
        lp.screenshot_status,
        lp.screenshot_created_at,
        w.name as workspace_name,
        COALESCE(stats.total_clicks, 0) as total_clicks,
        COALESCE(stats.total_conversions, 0) as total_conversions,
        COALESCE(stats.total_revenue, 0) as total_revenue,
        COALESCE(stats.total_cost, 0) as total_cost,
        COALESCE(stats.avg_cpa, 0) as avg_cpa,
        CASE
          WHEN COALESCE(stats.total_cost, 0) > 0
          THEN ROUND((COALESCE(stats.total_revenue, 0) - COALESCE(stats.total_cost, 0)) / stats.total_cost * 100, 2)
          ELSE 0
        END as total_roi
      FROM cf_landers l
      LEFT JOIN cf_lander_previews lp ON lp.lander_key = l.lander_key
      LEFT JOIN cf_workspaces w ON w.workspace_id = l.workspace_id
      LEFT JOIN (
        SELECT
          landing_id,
          SUM(clicks) as total_clicks,
          SUM(conversions) as total_conversions,
          SUM(revenue) as total_revenue,
          SUM(cost) as total_cost,
          AVG(cpa) as avg_cpa
        FROM cf_report_daily
        GROUP BY landing_id
      ) stats ON stats.landing_id = l.lander_key
      WHERE ${whereClause}
      ORDER BY l.${safeSortBy} ${safeSortOrder}
      LIMIT ${limit} OFFSET ${offsetVal}
    `

    const [list] = await connection.query(statement, params)

    const countStatement = `SELECT COUNT(*) AS total FROM \`cf_landers\` l WHERE ${whereClause}`
    const [countResult] = await connection.execute(countStatement, params)

    return [list, countResult[0].total]
  }

  /**
   * 根据 lander_key 获取单个 Lander
   */
  async getByKey(landerKey) {
    const statement = `
      SELECT
        l.lander_key,
        l.name,
        l.url,
        l.workspace_id,
        l.cf_created_at,
        l.cf_updated_at,
        l.synced_at,
        l.created_at,
        l.updated_at,
        lp.screenshot_url,
        lp.screenshot_status,
        w.name as workspace_name
      FROM cf_landers l
      LEFT JOIN cf_lander_previews lp ON lp.lander_key = l.lander_key
      LEFT JOIN cf_workspaces w ON w.workspace_id = l.workspace_id
      WHERE l.lander_key = ?
    `
    const [result] = await connection.execute(statement, [landerKey])
    return result[0]
  }

  /**
   * 删除 Lander
   */
  async remove(landerKey) {
    const statement = 'DELETE FROM `cf_landers` WHERE `lander_key` = ?'
    const [result] = await connection.execute(statement, [landerKey])
    return result
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus() {
    const statement = `
      SELECT
        COUNT(*) as total,
        MAX(\`synced_at\`) as last_sync_at
      FROM \`cf_landers\`
    `
    const [result] = await connection.execute(statement)
    return result[0]
  }

  /**
   * 获取待截图的 Lander
   * 包括：从未截图的、截图失败的、卡在 processing 状态的
   * 注意：不查询 pending 状态，避免与 addTask 插入的 pending 记录冲突造成死循环
   */
  async getPendingLanders(limit = 100) {

    const statement = `
      SELECT
        l.lander_key,
        l.name,
        l.url
      FROM cf_landers l
      LEFT JOIN cf_lander_previews lp ON lp.lander_key = l.lander_key
      WHERE lp.lander_key IS NULL
         OR lp.screenshot_status IN ('failed', 'processing')
      ORDER BY l.created_at DESC
      LIMIT ${parseInt(limit)}
    `
    const [result] = await connection.query(statement)
    return result
  }

  /**
   * 保存或更新截图预览记录
   */
  async upsertPreview(landerKey, landerName, landerUrl, screenshotPath, screenshotUrl, status = 'success', error = null) {
    const statement = `
      INSERT INTO \`cf_lander_previews\`
        (\`lander_key\`, \`lander_name\`, \`lander_url\`, \`screenshot_path\`, \`screenshot_url\`, \`screenshot_status\`, \`screenshot_error\`, \`screenshot_created_at\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        \`lander_name\` = VALUES(\`lander_name\`),
        \`lander_url\` = VALUES(\`lander_url\`),
        \`screenshot_path\` = VALUES(\`screenshot_path\`),
        \`screenshot_url\` = VALUES(\`screenshot_url\`),
        \`screenshot_status\` = VALUES(\`screenshot_status\`),
        \`screenshot_error\` = VALUES(\`screenshot_error\`),
        \`screenshot_created_at\` = VALUES(\`screenshot_created_at\`),
        \`updated_at\` = NOW()
    `

    const values = [
      landerKey,
      landerName,
      landerUrl,
      screenshotPath,
      screenshotUrl,
      status,
      error
    ]

    await connection.execute(statement, values)
  }

  /**
   * 更新截图状态
   */
  async updateScreenshotStatus(landerKey, status, error = null) {
    const updates = ['screenshot_status = ?', 'updated_at = NOW()']
    const values = [status]

    if (error) {
      updates.push('screenshot_error = ?')
      values.push(error)
    } else if (status === 'success') {
      updates.push('screenshot_error = NULL')
    }

    values.push(landerKey)

    await connection.execute(
      `UPDATE cf_lander_previews SET ${updates.join(', ')} WHERE lander_key = ?`,
      values
    )
  }

  /**
   * 获取截图统计
   */
  async getScreenshotStats() {
    const statement = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN screenshot_status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN screenshot_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN screenshot_status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN screenshot_status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM \`cf_lander_previews\`
    `
    const [result] = await connection.execute(statement)
    return result[0]
  }

  /**
   * 清理长时间处于 processing 状态的记录（服务重启时调用）
   * 将超过指定分钟数的 processing 状态重置为 pending
   */
  async resetStuckProcessingRecords(maxMinutes = 30) {
    const statement = `
      UPDATE cf_lander_previews
      SET screenshot_status = 'pending',
          screenshot_error = '服务重启，任务重置',
          updated_at = NOW()
      WHERE screenshot_status = 'processing'
        AND TIMESTAMPDIFF(MINUTE, updated_at, NOW()) > ?
    `
    const [result] = await connection.execute(statement, [maxMinutes])
    const count = result.affectedRows
    if (count > 0) {
      console.log(`[截图清理] 重置了 ${count} 个长时间处于 processing 状态的记录`)
    }
    return count
  }

  /**
   * 获取卡住的 processing 记录数量（用于监控）
   */
  async getStuckProcessingCount(maxMinutes = 30) {
    const statement = `
      SELECT COUNT(*) as count
      FROM cf_lander_previews
      WHERE screenshot_status = 'processing'
        AND TIMESTAMPDIFF(MINUTE, updated_at, NOW()) > ?
    `
    const [result] = await connection.execute(statement, [maxMinutes])
    return result[0].count
  }

  /**
   * 手动上传截图（覆盖自动截图）
   */
  async saveScreenshot(landerKey, screenshotUrl) {

    const [landers] = await connection.execute(
      'SELECT \`name\`, \`url\` FROM \`cf_landers\` WHERE \`lander_key\` = ?',
      [landerKey]
    )

    if (!landers || landers.length === 0) {
      throw new Error('Lander 不存在')
    }

    const { name: landerName, url: landerUrl } = landers[0]


    await this.upsertPreview(
      landerKey,
      landerName,
      landerUrl,
      screenshotUrl,
      screenshotUrl,
      'success',  // 手动上传直接标记为成功
      null
    )
  }

}

module.exports = new LanderService()
