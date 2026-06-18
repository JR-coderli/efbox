/**
 * Pushnami 任务运行服务
 * 将 pushnami-task 作为常驻服务集成到 domain-api 中
 * 启动时初始化浏览器，收到请求后执行任务
 */
const path = require('path')
const fs = require('fs')


const pushnamiTaskPath = path.resolve(__dirname, '../../../pushnami-task/src')
const pushnamiTaskDir = path.resolve(__dirname, '../../../pushnami-task')

/**
 * 加载 pushnami-task 的环境变量
 * 从 pushnami-task/.env 文件中读取并设置到 process.env
 */
function loadPushnamiEnv() {
  const envPath = path.join(pushnamiTaskDir, '.env')

  if (!fs.existsSync(envPath)) {
    console.warn(`[PushnamiRunner] .env 文件不存在: ${envPath}`)
    return
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }


    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()


      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }


      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }

  console.log('[PushnamiRunner] 已加载 pushnami-task 环境变量')
}


loadPushnamiEnv()

/**
 * 默认任务执行间隔（分钟）
 * 当数据库不可用或配置缺失时作为兜底，确保调度链不会因取不到间隔而断裂
 */
const DEFAULT_TASK_INTERVALS = {
  bid_adjust: 180,
  block: 1440,
  budget_boost: 1440
}

class PushnamiRunnerService {
  constructor() {
    this.isInitialized = false
    this.isRunning = false
    this.currentTask = null
    this.browserManager = null
    this.navigator = null
    this.tasks = {}
    this.initPromise = null
    this.currentExecutionPromise = null // 当前执行任务的 Promise（用于防止并发）
    this.executionQueue = [] // 任务队列
    this.isProcessingQueue = false // 是否正在处理队列
    this.scheduledTimeouts = new Map() // 存储每个任务类型的调度超时ID { taskType: timeoutId }
  }

  /**
   * 初始化 Pushnami 任务服务
   * 启动浏览器、登录、导航到页面
   */
  async initialize() {
    if (this.isInitialized) {
      return this.initPromise
    }

    this.initPromise = this._doInitialize()
    return this.initPromise
  }

  async _doInitialize() {
    try {
      console.log('[PushnamiRunner] 正在初始化...')


      const { CONFIG, validateConfig } = require(`${pushnamiTaskPath}/utils/config.js`)
      const { logger, initLogFile, closeLogFile } = require(`${pushnamiTaskPath}/utils/logger.js`)
      const BrowserManager = require(`${pushnamiTaskPath}/core/browser.js`)
      const Navigator = require(`${pushnamiTaskPath}/core/navigator.js`)
      const BidAdjustTask = require(`${pushnamiTaskPath}/tasks/bid-adjust.task.js`)
      const BlockTask = require(`${pushnamiTaskPath}/tasks/block.task.js`)
      const BudgetBoostTask = require(`${pushnamiTaskPath}/tasks/budget-boost.task.js`)


      validateConfig()
      console.log('[PushnamiRunner] [步骤1/5] 配置校验通过')


      console.log('[PushnamiRunner] [步骤2/5] 正在启动浏览器...')
      this.browserManager = new BrowserManager()
      await this.browserManager.launch()
      console.log('[PushnamiRunner] [步骤2/5] 浏览器启动成功')


      console.log('[PushnamiRunner] [步骤3/5] 正在登录 Pushnami...')
      await this.browserManager.login()
      console.log('[PushnamiRunner] [步骤3/5] 登录成功')


      console.log('[PushnamiRunner] [步骤4/5] 正在导航到 Campaigns 页面...')
      const navigated = await this.browserManager.navigateToCampaigns()
      if (!navigated) {
        throw new Error('导航到 Advertiser Campaigns 失败，请检查登录状态和页面结构')
      }
      console.log('[PushnamiRunner] [步骤4/5] 导航成功')


      this.navigator = new Navigator(this.browserManager.page)


      this.tasks = {
        bidAdjust: new BidAdjustTask(this.browserManager.page),
        block: new BlockTask(this.browserManager.page),
        budgetBoost: new BudgetBoostTask(this.browserManager.page)
      }


      this._modules = {
        CONFIG,
        logger,
        initLogFile,
        closeLogFile,
        BidAdjustTask,
        BlockTask,
        BudgetBoostTask,
        db: require(`${pushnamiTaskPath}/utils/db.js`),
        cooldownManager: require(`${pushnamiTaskPath}/utils/cooldown.js`),
        pushnamiService: require('./pushnami.service.js')
      }

      console.log('[PushnamiRunner] [步骤5/5] 任务模块加载完成')
      this.isInitialized = true
      console.log('[PushnamiRunner] 初始化完成，浏览器已就绪')

      return {
        success: true,
        message: 'Pushnami 服务初始化成功'
      }
    } catch (error) {
      console.error('[PushnamiRunner] 初始化失败:', error.message)
      console.error('[PushnamiRunner] 错误堆栈:', error.stack)
      // 初始化失败时尝试关闭已启动的浏览器，避免进程残留
      if (this.browserManager) {
        console.log('[PushnamiRunner] 初始化失败，正在清理浏览器...')
        try {
          await this.browserManager.close()
        } catch (closeErr) {
          console.error('[PushnamiRunner] 初始化失败后关闭浏览器也失败:', closeErr.message)
        }
        this.browserManager = null
      }
      this.isInitialized = false
      throw error
    }
  }

  /**
   * 执行指定的任务（带互斥锁，确保同一时间只有一个任务执行）
   * @param {string} taskType - 任务类型: bid_adjust / block / budget_boost / all
   * @returns {Promise<Object>} 执行结果
   */
  async runTask(taskType) {

    this.isRunning = true
    this.currentTask = taskType


    if (this.currentExecutionPromise) {
      this.isRunning = false
      this.currentTask = null
      return {
        success: false,
        message: `已有任务正在运行中，请等待当前任务完成后再试`
      }
    }


    if (!this.isInitialized) {
      console.log('[PushnamiRunner] 服务未初始化，正在初始化...')
      try {
        await this.initialize()
      } catch (error) {
        this.isRunning = false
        this.currentTask = null
        // 初始化失败也要补调度下一次执行，否则调度链会永久断裂
        await this._scheduleNextExecution(taskType).catch(() => {})
        return {
          success: false,
          message: `初始化失败: ${error.message}`
        }
      }
    }


    if (this.isInitialized) {
      let needRestart = false
      let reason = ''

      if (!this.browserManager) {
        needRestart = true
        reason = '浏览器已关闭'
      } else {
        const health = await this.checkBrowserHealth()
        if (!health.healthy) {
          needRestart = true
          reason = health.reason
        }
      }

      if (needRestart) {
        console.warn(`[PushnamiRunner] 浏览器异常: ${reason}，正在重启服务...`)
        try {
          const restartResult = await this.restart()
          if (!restartResult.success) {
            this.isRunning = false
            this.currentTask = null
            // 重启失败也要补调度下一次执行，否则调度链会永久断裂
            await this._scheduleNextExecution(taskType).catch(() => {})
            return {
              success: false,
              message: `浏览器异常，重启失败: ${restartResult.message}`
            }
          }
          console.log('[PushnamiRunner] 浏览器已恢复')
        } catch (error) {
          this.isRunning = false
          this.currentTask = null
          // 重启异常也要补调度下一次执行，否则调度链会永久断裂
          await this._scheduleNextExecution(taskType).catch(() => {})
          return {
            success: false,
            message: `浏览器异常，重启失败: ${error.message}`
          }
        }
      }
    }

    const { logger, db, cooldownManager } = this._modules
    const validTasks = ['bid_adjust', 'block', 'budget_boost', 'all']

    if (!validTasks.includes(taskType)) {
      this.isRunning = false
      this.currentTask = null
      return {
        success: false,
        message: `无效的任务类型: ${taskType}`
      }
    }


    this.currentExecutionPromise = this._executeTask(taskType)

    // 全局执行超时保护：50 分钟（小于 1 小时调度间隔），
    // 防止任何环节卡死（如浏览器挂起）导致整条定时调度链永久阻塞
    const TASK_MAX_EXECUTION_MS = 50 * 60 * 1000
    let timeoutTimer = null
    try {
      const result = await Promise.race([
        this.currentExecutionPromise,
        new Promise((_, reject) => {
          timeoutTimer = setTimeout(
            () => reject(new Error(`任务执行超时 (${TASK_MAX_EXECUTION_MS / 60000} 分钟)`)),
            TASK_MAX_EXECUTION_MS
          )
        })
      ])
      return result
    } catch (error) {
      const logger = this._modules?.logger
      const logMsg = `[PushnamiRunner] 任务异常或超时: ${error.message}`
      if (logger) {
        logger.error(logMsg)
      } else {
        console.error(logMsg)
      }
      // 超时/异常后强制关闭浏览器（close 内部有 15s 超时 + 强制 kill 兜底）
      if (this.browserManager) {
        if (logger) {
          logger.error('[PushnamiRunner] 因任务超时/异常，正在强制关闭浏览器...')
        } else {
          console.error('[PushnamiRunner] 因任务超时/异常，正在强制关闭浏览器...')
        }
        try {
          await this.browserManager.close()
        } catch (closeErr) {
          const errMsg = `[PushnamiRunner] 超时后关闭浏览器失败: ${closeErr.message}`
          if (logger) {
            logger.error(errMsg)
          } else {
            console.error(errMsg)
          }
        }
      }
      // 超时/异常后补调度下一次执行，保证调度链不会因本次卡死而永久断裂
      // 注意：后台仍在运行的 _executeTask 若最终完成也会自行调用 _scheduleNextExecution，
      //       _scheduleNextExecution 内部会先 clearTimeout 旧定时器再设新的，不会重复调度
      await this._scheduleNextExecution(taskType).catch(() => {})
      return {
        success: false,
        taskType,
        error: error.message
      }
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer)
      }
      // 吞掉 _executeTask 可能的延迟 rejection，防止 unhandledRejection
      if (this.currentExecutionPromise) {
        this.currentExecutionPromise.catch(() => {})
      }
      this.currentExecutionPromise = null
    }
  }

  /**
   * 内部执行任务的方法（实际执行逻辑）
   * @param {string} taskType - 任务类型
   * @returns {Promise<Object>} 执行结果
   */
  async _executeTask(taskType) {
    const { logger, db, cooldownManager, pushnamiService } = this._modules


    const timeRangeCheck = await this._isInTimeRange(taskType)

    if (!timeRangeCheck.inRange) {
      logger.warning(`\n${'='.repeat(60)}`)
      logger.warning(`【时间范围检查】当前时间不在执行范围内`)
      logger.warning(`当前时间: ${timeRangeCheck.currentTime}`)
      logger.warning(`允许时间范围: ${timeRangeCheck.timeRange.startTime} - ${timeRangeCheck.timeRange.endTime}`)
      logger.warning(`【时间范围检查】任务已跳过，等待下次执行`)
      logger.warning(`${'='.repeat(60)}`)


      this.isRunning = false
      this.currentTask = null


      await this._scheduleNextExecution(taskType)

      return {
        success: false,
        taskType,
        error: '当前时间不在执行范围内',
        skippedDueToTimeRange: true
      }
    }




    cooldownManager.clear()


    const executionId = await pushnamiService.recordExecution({
      taskType,
      status: 'started',
      startedAt: new Date().toISOString()
    })
    this.currentExecutionId = executionId

    logger.info(`\n${'='.repeat(60)}`)
    logger.info(`【开关触发】开始执行任务: ${taskType} (执行ID: ${executionId})`)
    if (timeRangeCheck.timeRange && timeRangeCheck.timeRange.enabled) {
      logger.info(`【时间范围】当前时间: ${timeRangeCheck.currentTime}，允许范围: ${timeRangeCheck.timeRange.startTime} - ${timeRangeCheck.timeRange.endTime}`)
    }
    logger.info(`${'='.repeat(60)}`)

    try {
      let result

      if (taskType === 'all') {

        result = await this._runAllTasks()
      } else if (taskType === 'bid_adjust') {
        result = await this._runBidAdjustTask()
      } else if (taskType === 'block') {
        result = await this._runBlockTask()
      } else if (taskType === 'budget_boost') {
        result = await this._runBudgetBoostTask()
      }


      await pushnamiService.updateExecution(executionId, {
        status: result.success !== false ? 'completed' : 'failed',
        campaignsProcessed: result.campaignsProcessed || 0,
        sourcesProcessed: result.sourcesProcessed || 0,
        actionsTaken: result.actionsTaken || 0,
        errors: result.errors || 0,
        message: result.message || (result.success !== false ? '执行成功' : '执行失败'),
        completedAt: new Date().toISOString()
      })

      logger.info(`${'='.repeat(60)}`)
      logger.info(`【开关触发】任务执行完成`)
      logger.info(`${'='.repeat(60)}`)


      await this._scheduleNextExecution(taskType)

      return {
        success: true,
        taskType,
        result
      }
    } catch (error) {


      if (error.message !== 'TASK_STOPPED') {
        logger.error(`【开关触发】任务执行失败: ${error.message}`)


        try {
          await pushnamiService.updateExecution(executionId, {
            status: 'failed',
            campaignsProcessed: 0,
            sourcesProcessed: 0,
            actionsTaken: 0,
            errors: 1,
            message: error.message,
            completedAt: new Date().toISOString()
          })
        } catch (updateError) {
          logger.error(`【执行日志】更新执行日志失败: ${updateError.message}`)
        }
      } else {
        logger.warning(`【开关触发】任务已被用户手动停止`)
      }


      await this._scheduleNextExecution(taskType)

      return {
        success: false,
        taskType,
        error: error.message
      }
    } finally {
      this.isRunning = false
      this.currentTask = null
    }
  }

  /**
   * 调度下一次执行
   * @param {string} taskType - 任务类型
   */
  async _scheduleNextExecution(taskType) {
    const logger = this._modules?.logger || console

    try {

      const config = await this._getTaskSwitchConfig()


      const keyMap = {
        bid_adjust: 'bid_adjust',
        block: 'block',
        budget_boost: 'budget_boost'
      }

      const isEnabled = config[keyMap[taskType]]
      if (!isEnabled) {
        logger.info(`[PushnamiRunner] 任务 ${taskType} 的开关已关闭，不调度下一次执行`)
        return
      }


      let intervalMinutes = await this._getTaskInterval(taskType)
      if (!intervalMinutes) {
        // 数据库不可用或配置缺失时，使用默认间隔兜底，避免调度链断裂
        intervalMinutes = DEFAULT_TASK_INTERVALS[taskType]
        if (!intervalMinutes) {
          logger.warning(`[PushnamiRunner] 无法获取任务 ${taskType} 的执行间隔且无默认值，不调度下一次执行`)
          return
        }
        logger.warning(`[PushnamiRunner] 无法获取任务 ${taskType} 的执行间隔，使用默认间隔: ${intervalMinutes} 分钟`)
      }

      const intervalMs = intervalMinutes * 60 * 1000

      logger.info(`[PushnamiRunner] 任务 ${taskType} 将在 ${intervalMinutes} 分钟后再次执行`)


      if (this.scheduledTimeouts.has(taskType)) {
        clearTimeout(this.scheduledTimeouts.get(taskType))
      }


      const timeRangeCheck = await this._isInTimeRange(taskType)


      if (!timeRangeCheck.inRange) {
        const delayInfo = await this._calculateDelayToTimeRangeStart(taskType)

        const delayHours = Math.floor(delayInfo.delay / (1000 * 60 * 60))
        const delayMinutes = Math.floor((delayInfo.delay % (1000 * 60 * 60)) / (1000 * 60))

        logger.warning(`[PushnamiRunner] 当前时间 ${timeRangeCheck.currentTime} 不在执行范围内 (${timeRangeCheck.timeRange.startTime} - ${timeRangeCheck.timeRange.endTime})`)
        logger.info(`[PushnamiRunner] 智能对齐: ${delayInfo.reason}，将在 ${delayHours} 小时 ${delayMinutes} 分钟后执行（${delayInfo.targetTime.toLocaleString('zh-CN', { hour12: false })}）`)


        if (this.scheduledTimeouts.has(taskType)) {
          clearTimeout(this.scheduledTimeouts.get(taskType))
        }


        if (!this._scheduledTimes) {
          this._scheduledTimes = new Map()
        }
        this._scheduledTimes.set(taskType, delayInfo.targetTime.getTime())


        const alignTimeoutId = setTimeout(async () => {
          logger.info(`[PushnamiRunner] 时间范围开始，执行任务: ${taskType}`)
          this.scheduledTimeouts.delete(taskType)
          if (this._scheduledTimes) {
            this._scheduledTimes.delete(taskType)
          }


          this.runTask(taskType).catch(err => {
            logger.error(`[PushnamiRunner] 定时任务执行失败: ${err.message}`)
          })
        }, delayInfo.delay)

        this.scheduledTimeouts.set(taskType, alignTimeoutId)
        return
      }



      this._recordScheduledTime(taskType, Date.now() + intervalMs)

      const timeoutId = setTimeout(async () => {
        logger.info(`[PushnamiRunner] 定时调度触发执行任务: ${taskType}`)
        this.scheduledTimeouts.delete(taskType)
        if (this._scheduledTimes) {
          this._scheduledTimes.delete(taskType)
        }


        const latestConfig = await this._getTaskSwitchConfig()
        if (!latestConfig[keyMap[taskType]]) {
          logger.info(`[PushnamiRunner] 任务 ${taskType} 的开关已关闭，取消定时执行`)
          return
        }


        const nextTimeRangeCheck = await this._isInTimeRange(taskType)
        if (!nextTimeRangeCheck.inRange) {

          const delayInfo = await this._calculateDelayToTimeRangeStart(taskType)

          const delayHours = Math.floor(delayInfo.delay / (1000 * 60 * 60))
          const delayMinutes = Math.floor((delayInfo.delay % (1000 * 60 * 60)) / (1000 * 60))

          logger.warning(`[PushnamiRunner] 定时调度: 当前时间 ${nextTimeRangeCheck.currentTime} 不在执行范围内 (${nextTimeRangeCheck.timeRange.startTime} - ${nextTimeRangeCheck.timeRange.endTime})`)
          logger.info(`[PushnamiRunner] 智能对齐: ${delayInfo.reason}，将在 ${delayHours} 小时 ${delayMinutes} 分钟后执行（${delayInfo.targetTime.toLocaleString('zh-CN', { hour12: false })}）`)


          if (!this._scheduledTimes) {
            this._scheduledTimes = new Map()
          }
          this._scheduledTimes.set(taskType, delayInfo.targetTime.getTime())


          const alignTimeoutId = setTimeout(async () => {
            logger.info(`[PushnamiRunner] 时间范围开始，执行任务: ${taskType}`)
            this.runTask(taskType).catch(err => {
              logger.error(`[PushnamiRunner] 定时任务执行失败: ${err.message}`)
            })
          }, delayInfo.delay)

          this.scheduledTimeouts.set(taskType, alignTimeoutId)
          return
        }

        logger.info(`[PushnamiRunner] 定时调度: 当前时间在允许范围内，开始执行任务`)
        this.runTask(taskType).catch(err => {
          logger.error(`[PushnamiRunner] 定时任务执行失败: ${err.message}`)
        })
      }, intervalMs)

      this.scheduledTimeouts.set(taskType, timeoutId)

    } catch (error) {
      logger.error(`[PushnamiRunner] 调度下一次执行失败: ${error.message}`)
    }
  }

  /**
   * 获取任务开关配置
   */
  async _getTaskSwitchConfig() {
    try {
      const connection = require('../app/database')
      const statement = `
        SELECT config_value FROM pushnami_config
        WHERE config_key = 'task_switch'
      `
      const [result] = await connection.execute(statement)

      if (result.length > 0) {
        return JSON.parse(result[0].config_value)
      }


      return {
        bid_adjust: true,
        block: true,
        budget_boost: true
      }
    } catch (error) {
      console.error('[PushnamiRunner] 获取任务开关配置失败:', error)
      return {
        bid_adjust: true,
        block: true,
        budget_boost: true
      }
    }
  }

  /**
   * 获取时间范围配置
   */
  async _getTimeRangeConfig() {
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
      console.error('[PushnamiRunner] 获取时间范围配置失败:', error)
      return {
        bid_adjust: { enabled: false, startTime: '00:00', endTime: '23:59' },
        block: { enabled: false, startTime: '00:00', endTime: '23:59' },
        budget_boost: { enabled: false, startTime: '00:00', endTime: '23:59' }
      }
    }
  }

  /**
   * 检查当前时间是否在指定任务的时间范围内
   * @param {string} taskType - 任务类型: bid_adjust / block / budget_boost
   * @returns {Promise<{inRange: boolean, timeRange: object, currentTime: string}>}
   */
  async _isInTimeRange(taskType) {
    const timeRangeConfig = await this._getTimeRangeConfig()
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
   * 计算下次执行时间（考虑时间范围）
   * @param {string} taskType - 任务类型
   * @param {number} intervalMinutes - 执行间隔（分钟）
   * @returns {Promise<{delay: number, willExecuteInTimeRange: boolean, nextExecutionTime: Date}>}
   */
  async _calculateNextExecutionDelay(taskType, intervalMinutes) {
    const intervalMs = intervalMinutes * 60 * 1000
    const timeRangeCheck = await this._isInTimeRange(taskType)


    if (!timeRangeCheck.timeRange || !timeRangeCheck.timeRange.enabled) {
      const nextExecutionTime = new Date(Date.now() + intervalMs)
      return {
        delay: intervalMs,
        willExecuteInTimeRange: true,
        nextExecutionTime
      }
    }


    const now = new Date()
    const nextExecutionTime = new Date(now.getTime() + intervalMs)

    const [startHours, startMinutes] = timeRangeCheck.timeRange.startTime.split(':').map(Number)
    const [endHours, endMinutes] = timeRangeCheck.timeRange.endTime.split(':').map(Number)

    const nextExecutionHours = nextExecutionTime.getHours()
    const nextExecutionMinutes = nextExecutionTime.getMinutes()
    const nextExecutionValue = nextExecutionHours * 60 + nextExecutionMinutes

    const startTimeValue = startHours * 60 + startMinutes
    const endTimeValue = endHours * 60 + endMinutes


    let willExecuteInTimeRange = false
    if (startTimeValue <= endTimeValue) {

      willExecuteInTimeRange = nextExecutionValue >= startTimeValue && nextExecutionValue <= endTimeValue
    } else {

      willExecuteInTimeRange = nextExecutionValue >= startTimeValue || nextExecutionValue <= endTimeValue
    }

    return {
      delay: intervalMs,
      willExecuteInTimeRange,
      nextExecutionTime
    }
  }

  /**
   * 计算到下一个时间范围开始的延迟（智能对齐）
   * 当当前时间不在时间范围内时，计算到下一个时间范围开始的毫秒数
   * @param {string} taskType - 任务类型
   * @returns {Promise<{delay: number, targetTime: Date, reason: string}>}
   */
  async _calculateDelayToTimeRangeStart(taskType) {
    const timeRangeConfig = await this._getTimeRangeConfig()
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

        return { delay: 0, targetTime: now, reason: '在时间范围内，立即执行' }
      }
    } else {

      if (currentValue >= startValue || currentValue <= endValue) {

        return { delay: 0, targetTime: now, reason: '在时间范围内，立即执行' }
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
   * 获取任务的执行间隔时间（分钟）
   */
  async _getTaskInterval(taskType) {
    try {
      const connection = require('../app/database')
      const configKeyMap = {
        bid_adjust: 'bid_adjust_rules',
        block: 'block_rules',
        budget_boost: 'budget_boost_rules'
      }

      const statement = `
        SELECT config_value FROM pushnami_config
        WHERE config_key = ?
      `
      const [result] = await connection.execute(statement, [configKeyMap[taskType]])

      if (result.length > 0) {
        const config = JSON.parse(result[0].config_value)
        return config.intervalMinutes || null
      }

      return null
    } catch (error) {
      console.error('[PushnamiRunner] 获取任务间隔时间失败:', error)
      return null
    }
  }

  /**
   * 取消待执行的任务
   * @param {string} taskType - 任务类型
   * @returns {boolean} 是否成功取消
   */
  cancelScheduledTask(taskType) {
    if (this.scheduledTimeouts.has(taskType)) {
      clearTimeout(this.scheduledTimeouts.get(taskType))
      this.scheduledTimeouts.delete(taskType)
      console.log(`[PushnamiRunner] 已取消任务 ${taskType} 的待执行调度`)
      return true
    }
    return false
  }

  /**
   * 执行所有任务
   */
  async _runAllTasks() {
    const results = {}

    if (this._modules.CONFIG?.tasks?.bidAdjust !== false) {

      await this.initialize()
      results.bid_adjust = await this._runBidAdjustTask()
    }
    if (this._modules.CONFIG?.tasks?.block !== false) {
      await this.initialize()
      results.block = await this._runBlockTask()
    }
    if (this._modules.CONFIG?.tasks?.budgetBoost !== false) {
      await this.initialize()
      results.budget_boost = await this._runBudgetBoostTask()
    }

    return results
  }

  /**
   * 执行 Bid 调整任务
   */
  async _runBidAdjustTask() {
    const { logger, db, initLogFile, closeLogFile, pushnamiService } = this._modules


    const logFile = initLogFile()
    logger.info(`日志文件: ${logFile}`)


    const { getLogFileName } = require(`${pushnamiTaskPath}/utils/logger.js`)
    const logFileName = getLogFileName()
    if (logFileName && this.currentExecutionId) {
      await pushnamiService.updateExecutionLogFileName(this.currentExecutionId, logFileName)
      console.log('[PushnamiRunner] 已更新执行记录的日志文件名:', logFileName)
    }

    const startTime = Date.now()
    const startTimeIso = new Date(startTime).toISOString()

    logger.info('\n' + '='.repeat(60))
    logger.task('【Bid 调整任务】开始执行')
    logger.info('='.repeat(60))

    const currentTask = {
      taskType: 'bid_adjust',
      startedAt: startTimeIso,
      campaignsProcessed: 0,
      sourcesProcessed: 0,
      actionsTaken: 0
    }

    let currentExecutionId = null

    try {

      currentExecutionId = this.currentExecutionId

      if (!currentExecutionId) {
        throw new Error('执行记录 ID 不存在，任务终止')
      }

      logger.info(`执行记录 ID: ${currentExecutionId}`)


      this.tasks.bidAdjust.setExecutionId(currentExecutionId)


      const hasRules = await this.tasks.bidAdjust.loadRules()
      if (!hasRules) {
        throw new Error('无法加载 Bid 调整规则，任务终止')
      }


      const stats = await this.navigator.traverseCampaigns(async (campaign) => {

        if (await db.checkStopSignal(currentExecutionId)) {
          logger.warning('检测到停止信号，正在停止任务...')
          throw new Error('TASK_STOPPED')
        }

        currentTask.campaignsProcessed++

        return await this.navigator.traverseSources(async (source) => {
          if (currentTask.sourcesProcessed % 5 === 0 && await db.checkStopSignal(currentExecutionId)) {
            logger.warning('检测到停止信号，正在停止任务...')
            throw new Error('TASK_STOPPED')
          }

          currentTask.sourcesProcessed++
          return await this.tasks.bidAdjust.processSource(source, campaign.name, campaign.spent)
        })
      })

      this.tasks.bidAdjust.stats = { ...this.tasks.bidAdjust.stats, ...stats }
      this.tasks.bidAdjust.printStats()

      const message = `查看了 ${stats.totalCampaigns} 个 Campaign，点击了 ${stats.processedCampaigns} 个 Campaign，修改了 ${this.tasks.bidAdjust.stats.adjustedSources} 个 Source 的 bid`

      await db.updateExecution(currentExecutionId, {
        status: 'completed',
        campaignsProcessed: stats.totalCampaigns,
        sourcesProcessed: this.tasks.bidAdjust.stats.totalSources,
        actionsTaken: this.tasks.bidAdjust.stats.adjustedSources,
        errors: this.tasks.bidAdjust.stats.errors,
        message,
        completedAt: new Date().toISOString()
      })

      return {
        status: 'completed',
        stats: this.tasks.bidAdjust.stats,
        campaignsProcessed: stats.totalCampaigns,
        sourcesProcessed: this.tasks.bidAdjust.stats.totalSources,
        actionsTaken: this.tasks.bidAdjust.stats.adjustedSources,
        errors: this.tasks.bidAdjust.stats.errors,
        message
      }

    } catch (error) {
      if (error.message === 'TASK_STOPPED') {
        logger.warning('任务已被用户停止')
        await db.markAsStopped(currentExecutionId)
      } else {
        logger.error(`Bid 调整任务执行失败: ${error.message}`)
        await db.updateExecution(currentExecutionId, {
          status: 'failed',
          campaignsProcessed: currentTask.campaignsProcessed,
          sourcesProcessed: currentTask.sourcesProcessed,
          actionsTaken: currentTask.actionsTaken,
          errors: 1,
          message: error.message,
          completedAt: new Date().toISOString()
        })
      }
      throw error
    } finally {

      closeLogFile()

      if (this.browserManager) {
        logger.info('[PushnamiRunner] 任务结束，正在关闭浏览器...')
        try {
          await this.browserManager.close()
          logger.success('[PushnamiRunner] 浏览器已关闭')
        } catch (e) {
          logger.error(`[PushnamiRunner] 关闭浏览器失败: ${e.message}`)
        }
        this.browserManager = null
        this.navigator = null
        this.tasks = {}
        this.isInitialized = false
      }
    }
  }

  /**
   * 执行 Block 任务
   */
  async _runBlockTask() {
    const { logger, db, initLogFile, closeLogFile, pushnamiService } = this._modules


    const logFile = initLogFile()
    logger.info(`日志文件: ${logFile}`)


    const { getLogFileName } = require(`${pushnamiTaskPath}/utils/logger.js`)
    const logFileName = getLogFileName()
    if (logFileName && this.currentExecutionId) {
      await pushnamiService.updateExecutionLogFileName(this.currentExecutionId, logFileName)
      console.log('[PushnamiRunner] 已更新执行记录的日志文件名:', logFileName)
    }

    const startTime = Date.now()
    const startTimeIso = new Date(startTime).toISOString()

    logger.info('\n' + '='.repeat(60))
    logger.task('【Block 任务】开始执行')
    logger.info('='.repeat(60))

    const currentTask = {
      taskType: 'block',
      startedAt: startTimeIso,
      campaignsProcessed: 0,
      sourcesProcessed: 0,
      actionsTaken: 0
    }

    let currentExecutionId = null

    try {

      currentExecutionId = this.currentExecutionId

      if (!currentExecutionId) {
        throw new Error('执行记录 ID 不存在，任务终止')
      }

      logger.info(`执行记录 ID: ${currentExecutionId}`)


      this.tasks.block.setExecutionId(currentExecutionId)

      const stats = await this.navigator.traverseCampaigns(async (campaign) => {
        if (await db.checkStopSignal(currentExecutionId)) {
          logger.warning('检测到停止信号，正在停止任务...')
          throw new Error('TASK_STOPPED')
        }

        currentTask.campaignsProcessed++

        return await this.navigator.traverseSources(async (source) => {
          if (currentTask.sourcesProcessed % 5 === 0 && await db.checkStopSignal(currentExecutionId)) {
            logger.warning('检测到停止信号，正在停止任务...')
            throw new Error('TASK_STOPPED')
          }

          currentTask.sourcesProcessed++
          return await this.tasks.block.processSource(source, campaign.name, campaign.spent)
        })
      })

      this.tasks.block.stats = { ...this.tasks.block.stats, ...stats }
      this.tasks.block.printStats()

      const message = `查看了 ${stats.totalCampaigns} 个 Campaign，点击了 ${stats.processedCampaigns} 个 Campaign，屏蔽了 ${this.tasks.block.stats.blockedSources} 个 Source`

      await db.updateExecution(currentExecutionId, {
        status: 'completed',
        campaignsProcessed: stats.totalCampaigns,
        sourcesProcessed: this.tasks.block.totalSources,
        actionsTaken: this.tasks.block.stats.blockedSources,
        errors: this.tasks.block.stats.errors,
        message,
        completedAt: new Date().toISOString()
      })

      return {
        status: 'completed',
        stats: this.tasks.block.stats,
        campaignsProcessed: stats.totalCampaigns,
        sourcesProcessed: this.tasks.block.totalSources,
        actionsTaken: this.tasks.block.stats.blockedSources,
        errors: this.tasks.block.stats.errors,
        message
      }

    } catch (error) {
      if (error.message === 'TASK_STOPPED') {
        logger.warning('任务已被用户停止')
        await db.markAsStopped(currentExecutionId)
      } else {
        logger.error(`Block 任务执行失败: ${error.message}`)
        await db.updateExecution(currentExecutionId, {
          status: 'failed',
          campaignsProcessed: currentTask.campaignsProcessed,
          sourcesProcessed: currentTask.sourcesProcessed,
          actionsTaken: currentTask.actionsTaken,
          errors: 1,
          message: error.message,
          completedAt: new Date().toISOString()
        })
      }
      throw error
    } finally {

      closeLogFile()

      if (this.browserManager) {
        logger.info('[PushnamiRunner] 任务结束，正在关闭浏览器...')
        try {
          await this.browserManager.close()
          logger.success('[PushnamiRunner] 浏览器已关闭')
        } catch (e) {
          logger.error(`[PushnamiRunner] 关闭浏览器失败: ${e.message}`)
        }
        this.browserManager = null
        this.navigator = null
        this.tasks = {}
        this.isInitialized = false
      }
    }
  }

  /**
   * 执行 Budget 放量任务
   */
  async _runBudgetBoostTask() {
    const { logger, db, initLogFile, closeLogFile, pushnamiService } = this._modules


    const logFile = initLogFile()
    logger.info(`日志文件: ${logFile}`)


    const { getLogFileName } = require(`${pushnamiTaskPath}/utils/logger.js`)
    const logFileName = getLogFileName()
    if (logFileName && this.currentExecutionId) {
      await pushnamiService.updateExecutionLogFileName(this.currentExecutionId, logFileName)
      console.log('[PushnamiRunner] 已更新执行记录的日志文件名:', logFileName)
    }

    const startTime = Date.now()
    const startTimeIso = new Date(startTime).toISOString()

    logger.info('\n' + '='.repeat(60))
    logger.task('【Budget 放量任务】开始执行')
    logger.info('='.repeat(60))

    const currentTask = {
      taskType: 'budget_boost',
      startedAt: startTimeIso,
      campaignsProcessed: 0,
      actionsTaken: 0
    }

    let currentExecutionId = null

    try {

      currentExecutionId = this.currentExecutionId

      if (!currentExecutionId) {
        throw new Error('执行记录 ID 不存在，任务终止')
      }

      logger.info(`执行记录 ID: ${currentExecutionId}`)


      this.tasks.budgetBoost.setExecutionId(currentExecutionId)

      const stats = await this.navigator.traverseCampaigns(async (campaign) => {
        if (await db.checkStopSignal(currentExecutionId)) {
          logger.warning('检测到停止信号，正在停止任务...')
          throw new Error('TASK_STOPPED')
        }

        currentTask.campaignsProcessed++
        return await this.tasks.budgetBoost.processCampaign(campaign)
      })

      this.tasks.budgetBoost.stats = { ...this.tasks.budgetBoost.stats, ...stats }
      this.tasks.budgetBoost.printStats()

      const message = `查看了 ${stats.totalCampaigns} 个 Campaign，点击了 ${stats.processedCampaigns} 个 Campaign，放量了 ${this.tasks.budgetBoost.stats.boostedCampaigns} 个 Campaign`

      await db.updateExecution(currentExecutionId, {
        status: 'completed',
        campaignsProcessed: stats.totalCampaigns,
        actionsTaken: this.tasks.budgetBoost.stats.boostedCampaigns,
        errors: this.tasks.budgetBoost.stats.errors,
        message,
        completedAt: new Date().toISOString()
      })

      return {
        status: 'completed',
        stats: this.tasks.budgetBoost.stats,
        campaignsProcessed: stats.totalCampaigns,
        sourcesProcessed: 0,
        actionsTaken: this.tasks.budgetBoost.stats.boostedCampaigns,
        errors: this.tasks.budgetBoost.stats.errors,
        message
      }

    } catch (error) {
      if (error.message === 'TASK_STOPPED') {
        logger.warning('任务已被用户停止')
        await db.markAsStopped(currentExecutionId)
      } else {
        logger.error(`Budget 放量任务执行失败: ${error.message}`)
        await db.updateExecution(currentExecutionId, {
          status: 'failed',
          campaignsProcessed: currentTask.campaignsProcessed,
          sourcesProcessed: 0,
          actionsTaken: currentTask.actionsTaken,
          errors: 1,
          message: error.message,
          completedAt: new Date().toISOString()
        })
      }
      throw error
    } finally {

      closeLogFile()

      if (this.browserManager) {
        logger.info('[PushnamiRunner] 任务结束，正在关闭浏览器...')
        try {
          await this.browserManager.close()
          logger.success('[PushnamiRunner] 浏览器已关闭')
        } catch (e) {
          logger.error(`[PushnamiRunner] 关闭浏览器失败: ${e.message}`)
        }
        this.browserManager = null
        this.navigator = null
        this.tasks = {}
        this.isInitialized = false
      }
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      currentTask: this.currentTask
    }
  }

  /**
   * 获取任务详细状态（包含每个任务的运行状态和下次运行时间）
   */
  async getTasksStatus() {
    try {

      const config = await this._getTaskSwitchConfig()


      const currentTaskType = this.currentTask


      const taskTypeMap = {
        bid_adjust: 'bidAdjust',
        block: 'block',
        budget_boost: 'budgetBoost'
      }

      const tasks = {}

      for (const [dbKey, displayKey] of Object.entries(taskTypeMap)) {
        const isRunning = this.isRunning && currentTaskType === dbKey
        const isEnabled = config[dbKey]

        let status = 'paused' // 已暂停
        let nextRunTime = null
        let timeUntilNextRun = null


        if (isRunning) {
          status = 'running' // 运行中
        } else if (isEnabled) {

          if (this.scheduledTimeouts.has(dbKey)) {

            if (!this._scheduledTimes) {
              this._scheduledTimes = new Map()
            }
            const targetTime = this._scheduledTimes.get(dbKey)
            if (targetTime) {
              const now = Date.now()
              const remainingMs = targetTime - now



              if (remainingMs <= 5000) {
                status = 'running'
              } else {
                status = 'scheduled'
                timeUntilNextRun = Math.floor(remainingMs / 1000) // 秒
                nextRunTime = new Date(targetTime).toISOString()
              }
            } else {
              status = 'scheduled'
            }
          } else {


            status = 'scheduled'
            const intervalMinutes = await this._getTaskInterval(dbKey)
            if (intervalMinutes) {
              timeUntilNextRun = intervalMinutes * 60
              const nextRunDate = new Date(Date.now() + timeUntilNextRun * 1000)
              nextRunTime = nextRunDate.toISOString()
            }
          }
        }


        tasks[displayKey] = {
          enabled: isEnabled,
          status: status, // running | scheduled | paused
          nextRunTime: nextRunTime,
          timeUntilNextRun: timeUntilNextRun // 秒
        }
      }

      return {
        isRunning: this.isRunning,
        currentTask: currentTaskType,
        tasks: tasks
      }
    } catch (error) {
      console.error('[PushnamiRunner] 获取任务状态失败:', error)
      return {
        isRunning: false,
        currentTask: null,
        tasks: {
          bidAdjust: { enabled: false, status: 'paused', nextRunTime: null, timeUntilNextRun: null },
          block: { enabled: false, status: 'paused', nextRunTime: null, timeUntilNextRun: null },
          budgetBoost: { enabled: false, status: 'paused', nextRunTime: null, timeUntilNextRun: null }
        }
      }
    }
  }

  /**
   * 记录任务调度时间（用于计算下次运行时间）
   * @param {string} taskType - 任务类型
   * @param {number} targetTime - 目标执行时间（毫秒时间戳），如果不传则使用当前时间
   */
  _recordScheduledTime(taskType, targetTime) {
    if (!this._scheduledTimes) {
      this._scheduledTimes = new Map()
    }
    this._scheduledTimes.set(taskType, targetTime || Date.now())
  }

  /**
   * 关闭服务
   */
  async shutdown() {
    console.log('[PushnamiRunner] 正在关闭服务...')


    for (const [taskType, timeoutId] of this.scheduledTimeouts.entries()) {
      clearTimeout(timeoutId)
      console.log(`[PushnamiRunner] 已取消任务 ${taskType} 的待执行调度`)
    }
    this.scheduledTimeouts.clear()
    if (this._scheduledTimes) {
      this._scheduledTimes.clear()
    }

    if (this.browserManager) {
      console.log('[PushnamiRunner] 正在关闭浏览器...')
      try {
        await this.browserManager.close()
        console.log('[PushnamiRunner] 浏览器已关闭')
      } catch (error) {
        console.error(`[PushnamiRunner] 关闭浏览器失败: ${error.message}`)
      }
    }

    this.isInitialized = false
    this.isRunning = false
    this.currentTask = null

    console.log('[PushnamiRunner] 服务已关闭')
  }

  /**
   * 关闭浏览器（不重启，下次任务执行时会自动检测并重启）
   */
  async closeBrowser() {

    if (this.isRunning) {
      return {
        success: false,
        message: `有任务正在执行中: ${this.currentTask}，请等待任务完成后再关闭浏览器`
      }
    }

    console.log('[PushnamiRunner] 正在关闭浏览器...')


    for (const [taskType, timeoutId] of this.scheduledTimeouts.entries()) {
      clearTimeout(timeoutId)
      console.log(`[PushnamiRunner] 已取消任务 ${taskType} 的待执行调度`)
    }
    this.scheduledTimeouts.clear()
    if (this._scheduledTimes) {
      this._scheduledTimes.clear()
    }

    if (this.browserManager) {
      console.log('[PushnamiRunner] 正在关闭浏览器...')
      try {
        await this.browserManager.close()
        this.browserManager = null
        this.navigator = null
        this.tasks = {}


        console.log('[PushnamiRunner] 浏览器已关闭，下次任务执行时会自动重新打开')
        return {
          success: true,
          message: '浏览器已关闭，下次任务执行时会自动重新打开'
        }
      } catch (error) {
        console.error(`[PushnamiRunner] 关闭浏览器失败: ${error.message}`)
        // 即使关闭失败也要清理引用，避免悬挂对象影响后续任务
        this.browserManager = null
        this.navigator = null
        this.tasks = {}
        return {
          success: false,
          message: `关闭浏览器失败: ${error.message}`
        }
      }
    }

    return {
      success: true,
      message: 'chrome未运行'
    }
  }

  /**
   * 检查浏览器连接状态
   */
  async checkBrowserHealth() {
    if (!this.browserManager || !this.browserManager.browser) {
      return { healthy: false, reason: '浏览器未初始化' }
    }

    try {

      const version = await this.browserManager.browser.version()
      return { healthy: true, version }
    } catch (error) {
      return { healthy: false, reason: error.message }
    }
  }

  /**
   * 获取运行日志缓存
   * 直接从 logger 模块获取，不依赖 this._modules
   * 因为 Node.js 模块缓存机制，require 始终返回同一个模块实例
   */
  getRunningLogs() {
    try {
      const { getRunningLogs } = require(`${pushnamiTaskPath}/utils/logger.js`)
      return getRunningLogs() || []
    } catch (error) {
      console.error('[PushnamiRunner] 获取运行日志失败:', error.message)
      return []
    }
  }

  /**
   * 重启服务
   */
  async restart() {
    console.log('[PushnamiRunner] 正在重启服务...')


    if (this.browserManager) {
      console.log('[PushnamiRunner] 重启：正在关闭浏览器...')
      try {
        await this.browserManager.close()
      } catch (error) {
        console.error(`[PushnamiRunner] 重启时关闭浏览器失败: ${error.message}`)
      }
    }


    this.isInitialized = false
    this.isRunning = false
    this.currentTask = null
    this.browserManager = null
    this.navigator = null
    this.tasks = {}
    this._modules = null
    this.initPromise = null


    try {
      await this.initialize()
      return {
        success: true,
        message: '服务重启成功'
      }
    } catch (error) {
      return {
        success: false,
        message: `重启失败: ${error.message}`
      }
    }
  }
}

module.exports = new PushnamiRunnerService()
