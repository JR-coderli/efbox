/**
 * Pushnami 自动化任务控制器
 */
const pushnamiService = require('../service/pushnami.service.js')


function getPushnamiRunner() {
  return require('../service/pushnami-runner.service.js')
}


const scheduledTimeouts = new Map()

/**
 * 从数据库获取时间范围配置
 */
async function getTimeRangeConfig() {
  try {
    const connection = require('../app/database')
    const statement = `
      SELECT config_value FROM pushnami_config
      WHERE config_key = 'time_range'
    `
    const [result] = await connection.execute(statement)

    if (result.length > 0) {
      return JSON.parse(result[0].config_value)
    }


    return {
      bid_adjust: { enabled: false, startTime: '00:00', endTime: '23:59' },
      block: { enabled: false, startTime: '00:00', endTime: '23:59' },
      budget_boost: { enabled: false, startTime: '00:00', endTime: '23:59' }
    }
  } catch (error) {
    console.error('获取时间范围配置失败:', error)
    return {
      bid_adjust: { enabled: false, startTime: '00:00', endTime: '23:59' },
      block: { enabled: false, startTime: '00:00', endTime: '23:59' },
      budget_boost: { enabled: false, startTime: '00:00', endTime: '23:59' }
    }
  }
}

/**
 * 检查当前时间是否在指定任务的时间范围内
 */
async function isInTimeRange(taskType) {
  const timeRangeConfig = await getTimeRangeConfig()
  const config = timeRangeConfig[taskType]


  if (!config || !config.enabled) {
    return { inRange: true, timeRange: null, currentTime: null }
  }

  const now = new Date()
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  const currentTimeValue = currentHours * 60 + currentMinutes

  const [startHours, startMinutes] = config.startTime.split(':').map(Number)
  const [endHours, endMinutes] = config.endTime.split(':').map(Number)
  const startTimeValue = startHours * 60 + startMinutes
  const endTimeValue = endHours * 60 + endMinutes

  let inRange = false
  if (startTimeValue <= endTimeValue) {

    inRange = currentTimeValue >= startTimeValue && currentTimeValue <= endTimeValue
  } else {

    inRange = currentTimeValue >= startTimeValue || currentTimeValue <= endTimeValue
  }

  const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`

  return {
    inRange,
    timeRange: config,
    currentTime: currentTimeStr
  }
}

/**
 * 计算到下一个时间范围开始的延迟
 */
async function calculateDelayToTimeRangeStart(taskType) {
  const timeRangeConfig = await getTimeRangeConfig()
  const config = timeRangeConfig[taskType]


  if (!config || !config.enabled) {
    return { delay: 0, targetTime: new Date(), reason: '未启用时间限制' }
  }

  const now = new Date()
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  const currentValue = currentHours * 60 + currentMinutes

  const [startHours, startMinutes] = config.startTime.split(':').map(Number)
  const [endHours, endMinutes] = config.endTime.split(':').map(Number)
  const startValue = startHours * 60 + startMinutes
  const endValue = endHours * 60 + endMinutes

  let targetTime = null
  let reason = ''

  if (startValue <= endValue) {

    if (currentValue < startValue) {
      targetTime = new Date(now)
      targetTime.setHours(startHours, startMinutes, 0, 0)
      reason = '未到开始时间，等到今天开始时间'
    } else if (currentValue > endValue) {
      targetTime = new Date(now)
      targetTime.setDate(targetTime.getDate() + 1)
      targetTime.setHours(startHours, startMinutes, 0, 0)
      reason = '已过结束时间，等到明天开始时间'
    } else {
      return { delay: 0, targetTime: now, reason: '在时间范围内' }
    }
  } else {

    if (currentValue >= startValue || currentValue <= endValue) {
      return { delay: 0, targetTime: now, reason: '在时间范围内' }
    } else {
      targetTime = new Date(now)
      targetTime.setHours(startHours, startMinutes, 0, 0)
      reason = '不在跨天范围内，等到今天开始时间'
    }
  }

  const delay = targetTime.getTime() - now.getTime()

  return {
    delay: Math.max(0, delay),
    targetTime,
    reason
  }
}

/**
 * 调度任务到指定延迟后执行
 */
function scheduleTaskWithDelay(taskType, delayMs) {

  if (scheduledTimeouts.has(taskType)) {
    clearTimeout(scheduledTimeouts.get(taskType))
  }


  const targetTime = new Date(Date.now() + delayMs)

  const timeoutId = setTimeout(async () => {
    console.log(`[Pushnami] 定时调度触发执行任务: ${taskType}`)
    scheduledTimeouts.delete(taskType)


    const runner = getPushnamiRunner()
    if (runner.scheduledTimeouts && runner.scheduledTimeouts.has(taskType)) {
      clearTimeout(runner.scheduledTimeouts.get(taskType))
      runner.scheduledTimeouts.delete(taskType)
    }
    if (runner._scheduledTimes) {
      runner._scheduledTimes.delete(taskType)
    }

    runner.runTask(taskType).catch(err => {
      console.error(`[Pushnami] 定时任务执行失败:`, err)
    })
  }, delayMs)

  scheduledTimeouts.set(taskType, timeoutId)


  const runner = getPushnamiRunner()
  if (!runner._scheduledTimes) {
    runner._scheduledTimes = new Map()
  }
  runner._scheduledTimes.set(taskType, targetTime.getTime())


  if (!runner.scheduledTimeouts) {
    runner.scheduledTimeouts = new Map()
  }
  runner.scheduledTimeouts.set(taskType, timeoutId)
}

class PushnamiController {
  /**
   * 获取操作日志
   */
  async getOperationLogs(ctx, next) {
    try {
      const { page, pageSize, task_type, entity_type, start_time, end_time } = ctx.query

      const result = await pushnamiService.getOperationLogs({
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 20,
        taskType: task_type || null,
        entityType: entity_type || null,
        startTime: start_time || null,
        endTime: end_time || null
      })

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      console.error('获取操作日志失败:', error)
      ctx.body = {
        code: 500,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 记录操作（供 pushnami-task 调用）
   */
  async recordOperation(ctx, next) {
    try {
      const data = ctx.request.body

      await pushnamiService.recordOperation({
        taskType: data.task_type,
        entityType: data.entity_type,
        entityId: data.entity_id,
        campaignName: data.campaign_name,
        oldValue: data.old_value,
        newValue: data.new_value,
        ruleCondition: data.rule_condition,
        conversions: data.conversions,
        clicks: data.clicks,
        spent: data.spent,
        cpa: data.cpa,
        totalSpend: data.total_spend,
        dailySpendLimit: data.daily_spend_limit,
        targetCpa: data.target_cpa,
        isDryRun: data.is_dry_run,
        executionId: data.execution_id
      })

      ctx.body = {
        code: 200,
        message: '记录成功'
      }
    } catch (error) {
      console.error('记录操作失败:', error)
      ctx.body = {
        code: 500,
        message: '记录失败',
        error: error.message
      }
    }
  }

  /**
   * 检查冷却时间（供 pushnami-task 调用）
   */
  async checkCooldown(ctx, next) {
    try {
      const { task_type, entity_type, entity_id, cooldown_minutes, campaign_name } = ctx.query

      if (!task_type || !entity_type || !entity_id) {
        ctx.body = {
          code: 400,
          message: '缺少必需参数'
        }
        return
      }

      const lastOperation = await pushnamiService.getLastOperation(
        task_type,
        entity_type,
        entity_id,
        campaign_name || null  // 传入 campaign_name
      )

      let isInCooldown = false
      let remainingMinutes = 0

      if (lastOperation) {

        const lastTime = new Date(lastOperation.created_at).getTime()
        const now = Date.now()
        const elapsedMinutes = (now - lastTime) / (1000 * 60)
        const cooldownMinutes = parseInt(cooldown_minutes) || 60

        isInCooldown = elapsedMinutes < cooldownMinutes

        if (isInCooldown) {
          remainingMinutes = Math.ceil(cooldownMinutes - elapsedMinutes)
        }
      }

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: {
          isInCooldown,
          remainingMinutes,
          lastOperation: lastOperation ? {
            id: lastOperation.id,
            createdAt: lastOperation.created_at,
            campaignName: lastOperation.campaign_name
          } : null
        }
      }
    } catch (error) {
      console.error('检查冷却时间失败:', error)
      ctx.body = {
        code: 500,
        message: '检查失败',
        error: error.message
      }
    }
  }

  /**
   * 获取任务执行日志
   */
  async getExecutionLogs(ctx, next) {
    try {
      const { page, pageSize, task_type, status, start_time, end_time } = ctx.query

      const result = await pushnamiService.getExecutionLogs({
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 20,
        taskType: task_type || null,
        status: status || null,
        startTime: start_time || null,
        endTime: end_time || null
      })

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      console.error('获取执行日志失败:', error)
      ctx.body = {
        code: 500,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 记录任务执行（供 pushnami-task 调用）
   */
  async recordExecution(ctx, next) {
    try {
      const data = ctx.request.body
      console.log('[Pushnami] 接收到的执行日志数据:', JSON.stringify({ ...data, log_file_name: data.log_file_name }))

      const insertId = await pushnamiService.recordExecution({
        taskType: data.task_type,
        status: data.status,
        campaignsProcessed: data.campaigns_processed,
        sourcesProcessed: data.sources_processed,
        actionsTaken: data.actions_taken,
        errors: data.errors,
        message: data.message,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        logFileName: data.log_file_name
      })

      ctx.body = {
        code: 200,
        message: '记录成功',
        data: { id: insertId }
      }
    } catch (error) {
      console.error('记录执行日志失败:', error)
      ctx.body = {
        code: 500,
        message: '记录失败',
        error: error.message
      }
    }
  }

  /**
   * 获取配置
   */
  async getConfig(ctx, next) {
    try {
      const configs = await pushnamiService.getAllConfigs()

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: configs
      }
    } catch (error) {
      console.error('获取配置失败:', error)
      ctx.body = {
        code: 500,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(ctx, next) {
    try {
      const { config_key, config_value } = ctx.request.body

      if (!config_key || config_value === undefined) {
        ctx.body = {
          code: 400,
          message: '缺少必需参数'
        }
        return
      }

      await pushnamiService.updateConfig(config_key, config_value)

      ctx.body = {
        code: 200,
        message: '更新成功'
      }
    } catch (error) {
      console.error('更新配置失败:', error)
      ctx.body = {
        code: 500,
        message: '更新失败',
        error: error.message
      }
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(ctx, next) {
    try {
      const { start_time, end_time } = ctx.query

      const stats = await pushnamiService.getStats(start_time, end_time)

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: stats
      }
    } catch (error) {
      console.error('获取统计信息失败:', error)
      ctx.body = {
        code: 500,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 手动触发任务
   * 通过常驻服务执行任务（首次调用时自动初始化）
   */
  async triggerTask(ctx, next) {
    try {
      const { task } = ctx.params


      const taskMap = {
        'bid': 'bid_adjust',
        'bid_adjust': 'bid_adjust',
        'block': 'block',
        'budget': 'budget_boost',
        'budget_boost': 'budget_boost',
        'all': 'all'
      }

      const taskType = taskMap[task]
      if (!taskType) {
        ctx.body = {
          code: 400,
          message: `无效的任务类型: ${task}`
        }
        return
      }


      const status = getPushnamiRunner().getStatus()
      if (status.isRunning) {
        ctx.body = {
          code: 409,
          message: `已有任务正在运行中: ${status.currentTask}，请等待完成`,
          currentTask: status.currentTask
        }
        return
      }

      console.log(`[Pushnami] 收到任务执行请求: ${taskType}`)


      const timeRangeCheck = await isInTimeRange(taskType)
      if (!timeRangeCheck.inRange) {

        const delayInfo = await calculateDelayToTimeRangeStart(taskType)


        scheduleTaskWithDelay(taskType, delayInfo.delay)

        const delayMinutes = Math.ceil(delayInfo.delay / (1000 * 60))

        ctx.body = {
          code: 202,  // 202 Accepted - 已接受，将在稍后执行
          message: `当前时间不在执行范围内，任务已调度到 ${timeRangeCheck.timeRange.startTime} 开始自动执行`,
          currentTime: timeRangeCheck.currentTime,
          timeRange: timeRangeCheck.timeRange,
          scheduled: true,
          delayMinutes: delayMinutes,
          scheduledTime: delayInfo.targetTime.toISOString()
        }
        console.log(`[Pushnami] 时间范围检查失败，已调度到 ${delayInfo.targetTime.toLocaleString('zh-CN', { hour12: false })} 执行`)
        return
      }



      getPushnamiRunner().runTask(taskType).then(result => {
        console.log(`[Pushnami] 任务执行完成:`, result)
      }).catch(error => {
        console.error(`[Pushnami] 任务执行失败:`, error)
      })

      ctx.body = {
        code: 200,
        message: `任务 ${taskType} 已开始执行`,
        taskType
      }

    } catch (error) {
      console.error('触发任务失败:', error)
      ctx.body = {
        code: 500,
        message: '触发失败',
        error: error.message
      }
    }
  }

  /**
   * 获取 Pushnami 服务状态
   */
  async getServiceStatus(ctx, next) {
    try {
      const status = getPushnamiRunner().getStatus()

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: status
      }
    } catch (error) {
      console.error('获取服务状态失败:', error)
      ctx.body = {
        code: 500,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取任务详细状态（包含每个任务的运行状态和下次运行时间）
   */
  async getTasksStatus(ctx, next) {
    try {
      const status = await getPushnamiRunner().getTasksStatus()

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: status
      }
    } catch (error) {
      console.error('获取任务状态失败:', error)
      ctx.body = {
        code: 500,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 停止脚本执行
   */
  async stopExecution(ctx, next) {
    try {
      const { id } = ctx.request.body

      if (!id) {
        ctx.body = {
          code: 400,
          message: '缺少执行记录 ID'
        }
        return
      }


      const checkStatement = `
        SELECT id, status FROM pushnami_execution_log
        WHERE id = ? AND status = 'started'
      `
      const connection = require('../app/database')
      const [result] = await connection.execute(checkStatement, [id])

      if (result.length === 0) {
        ctx.body = {
          code: 400,
          message: '执行记录不存在或已完成'
        }
        return
      }


      await pushnamiService.setStopSignal(id)

      ctx.body = {
        code: 200,
        message: '停止请求已发送'
      }
    } catch (error) {
      console.error('停止执行失败:', error)
      ctx.body = {
        code: 500,
        message: '停止失败',
        error: error.message
      }
    }
  }

  /**
   * 检查停止信号（供 pushnami-task 调用）
   */
  async checkStopSignal(ctx, next) {
    try {
      const { id } = ctx.query

      if (!id) {
        ctx.body = {
          code: 400,
          message: '缺少执行记录 ID'
        }
        return
      }

      const shouldStop = await pushnamiService.checkStopSignal(id)

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: { shouldStop }
      }
    } catch (error) {
      console.error('检查停止信号失败:', error)
      ctx.body = {
        code: 500,
        message: '检查失败',
        error: error.message
      }
    }
  }

  /**
   * 标记为已停止（供 pushnami-task 调用）
   */
  async markAsStopped(ctx, next) {
    try {
      const { id } = ctx.request.body

      if (!id) {
        ctx.body = {
          code: 400,
          message: '缺少执行记录 ID'
        }
        return
      }

      await pushnamiService.markAsStopped(id)

      ctx.body = {
        code: 200,
        message: '已标记为停止'
      }
    } catch (error) {
      console.error('标记停止失败:', error)
      ctx.body = {
        code: 500,
        message: '标记失败',
        error: error.message
      }
    }
  }

  /**
   * 更新执行记录
   */
  async updateExecution(ctx, next) {
    try {
      const id = ctx.params.id
      const data = ctx.request.body

      await pushnamiService.updateExecution(id, {
        status: data.status,
        campaignsProcessed: data.campaigns_processed,
        sourcesProcessed: data.sources_processed,
        actionsTaken: data.actions_taken,
        errors: data.errors,
        message: data.message,
        completedAt: data.completed_at
      })

      ctx.body = {
        code: 200,
        message: '更新成功'
      }
    } catch (error) {
      console.error('更新执行记录失败:', error)
      ctx.body = {
        code: 500,
        message: '更新失败',
        error: error.message
      }
    }
  }

  /**
   * 取消待执行的任务
   */
  async cancelScheduledTask(ctx, next) {
    try {
      const { taskType } = ctx.request.body

      if (!taskType) {
        ctx.body = {
          code: 400,
          message: '缺少任务类型'
        }
        return
      }

      const cancelled = getPushnamiRunner().cancelScheduledTask(taskType)

      if (cancelled) {
        ctx.body = {
          code: 200,
          message: '已取消待执行的任务'
        }
      } else {
        ctx.body = {
          code: 200,
          message: '没有待执行的任务需要取消'
        }
      }
    } catch (error) {
      console.error('取消待执行任务失败:', error)
      ctx.body = {
        code: 500,
        message: '取消失败',
        error: error.message
      }
    }
  }

  /**
   * 关闭浏览器（下次任务执行时会自动重新打开）
   */
  async closeBrowser(ctx, next) {
    try {
      const result = await getPushnamiRunner().closeBrowser()

      ctx.body = {
        code: result.success ? 200 : 400,
        message: result.message
      }
    } catch (error) {
      console.error('关闭浏览器失败:', error)
      ctx.body = {
        code: 500,
        message: '关闭失败',
        error: error.message
      }
    }
  }

  /**
   * 检查浏览器健康状态
   */
  async checkHealth(ctx, next) {
    try {
      const health = await getPushnamiRunner().checkBrowserHealth()
      const status = getPushnamiRunner().getStatus()

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: {
          browser: health,
          service: status
        }
      }
    } catch (error) {
      console.error('检查健康状态失败:', error)
      ctx.body = {
        code: 500,
        message: '检查失败',
        error: error.message
      }
    }
  }

  /**
   * 获取运行日志（实时缓存）
   */
  async getRunningLogs(ctx, next) {
    try {
      const logs = getPushnamiRunner().getRunningLogs()

      ctx.body = {
        code: 200,
        message: '获取成功',
        data: logs
      }
    } catch (error) {
      console.error('获取运行日志失败:', error)
      ctx.body = {
        code: 500,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 下载日志文件
   */
  async downloadLog(ctx, next) {
    try {
      const { id } = ctx.params
      const connection = require('../app/database')
      const path = require('path')
      const fs = require('fs')


      const [rows] = await connection.execute(
        'SELECT log_file_name, task_type, started_at FROM pushnami_execution_log WHERE id = ?',
        [id]
      )

      if (rows.length === 0) {
        ctx.body = {
          code: 404,
          message: '执行记录不存在'
        }
        return
      }

      let logFileName = rows[0].log_file_name
      const startedAt = rows[0].started_at


      if (!logFileName && startedAt) {
        console.log('[Pushnami] 数据库中无日志文件名，尝试根据时间匹配')


        const startTime = new Date(startedAt)
        const year = startTime.getFullYear()
        const month = String(startTime.getMonth() + 1).padStart(2, '0')
        const day = String(startTime.getDate()).padStart(2, '0')
        const hour = String(startTime.getHours()).padStart(2, '0')
        const minute = String(startTime.getMinutes()).padStart(2, '0')
        const second = String(startTime.getSeconds()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}T${hour}-${minute}-${second}`
        logFileName = `pushnami-${dateStr}.log`

        console.log('[Pushnami] 根据开始时间生成日志文件名:', logFileName)
      }

      if (!logFileName) {
        ctx.body = {
          code: 404,
          message: '日志文件不存在'
        }
        return
      }


      const logsDir = path.join(__dirname, '../../../pushnami-task/logs')
      const logFilePath = path.join(logsDir, logFileName)

      console.log('[Pushnami] 日志文件路径:', logFilePath)


      if (!fs.existsSync(logFilePath)) {
        console.error('[Pushnami] 日志文件不存在:', logFilePath)

        if (startedAt) {
          const startTime = new Date(startedAt)
          const year = startTime.getFullYear()
          const month = String(startTime.getMonth() + 1).padStart(2, '0')
          const day = String(startTime.getDate()).padStart(2, '0')
          const datePrefix = `pushnami-${year}-${month}-${day}`

          try {
            const files = fs.readdirSync(logsDir)
            const matchingFiles = files.filter(f => f.startsWith(datePrefix) && f.endsWith('.log'))
            console.log('[Pushnami] 找到同日期的日志文件:', matchingFiles)

            if (matchingFiles.length > 0) {

              logFileName = matchingFiles[0]
              const newLogFilePath = path.join(logsDir, logFileName)
              console.log('[Pushnami] 使用匹配的日志文件:', logFileName)

              if (fs.existsSync(newLogFilePath)) {
                const logContent = fs.readFileSync(newLogFilePath, 'utf-8')
                ctx.set('Content-Type', 'text/plain; charset=utf-8')
                ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(logFileName)}"`)
                ctx.body = logContent
                return
              }
            }
          } catch (err) {
            console.error('[Pushnami] 读取日志目录失败:', err)
          }
        }

        ctx.body = {
          code: 404,
          message: '日志文件不存在'
        }
        return
      }


      const logContent = fs.readFileSync(logFilePath, 'utf-8')


      ctx.set('Content-Type', 'text/plain; charset=utf-8')
      ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(logFileName)}"`)

      ctx.body = logContent
    } catch (error) {
      console.error('下载日志文件失败:', error)
      ctx.body = {
        code: 500,
        message: '下载失败',
        error: error.message
      }
    }
  }
}

module.exports = new PushnamiController()
