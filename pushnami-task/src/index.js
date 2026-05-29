/**
 * Pushnami 自动化任务主入口
 *
 * 功能：
 * 1. Bid 调整任务 - 每3小时执行
 * 2. Block 任务 - 每24小时执行
 * 3. Budget 放量任务 - 每24小时执行
 */
const { CONFIG, validateConfig, DRY_RUN } = require('./utils/config.js')
const { logger, initLogFile, closeLogFile } = require('./utils/logger.js')
const BrowserManager = require('./core/browser.js')
const Navigator = require('./core/navigator.js')
const BidAdjustTask = require('./tasks/bid-adjust.task.js')
const BlockTask = require('./tasks/block.task.js')
const BudgetBoostTask = require('./tasks/budget-boost.task.js')
const cooldownManager = require('./utils/cooldown.js')
const db = require('./utils/db.js')


const timers = {
  bidAdjust: null,
  block: null,
  budgetBoost: null,
  cleanup: null
}

/**
 * 启动浏览器并初始化
 */
async function initializeBrowser() {
  logger.info('正在启动浏览器...')

  const browserManager = new BrowserManager()
  await browserManager.launch()
  await browserManager.login()


  const navigated = await browserManager.navigateToCampaigns()
  if (!navigated) {
    throw new Error('导航到 Advertiser Campaigns 失败，请检查登录状态和页面结构')
  }


  const navigator = new Navigator(browserManager.page)


  const tasks = {
    bidAdjust: new BidAdjustTask(browserManager.page),
    block: new BlockTask(browserManager.page),
    budgetBoost: new BudgetBoostTask(browserManager.page)
  }

  return { browserManager, navigator, tasks }
}

/**
 * 关闭浏览器
 */
async function closeBrowser(browserManager) {
  if (browserManager) {
    await browserManager.close()
  }
}

/**
 * 启动所有任务
 */
async function startAll() {
  try {

    validateConfig()


    startTimers()


    timers.cleanup = setInterval(() => {
      cooldownManager.cleanup(1440) // 清理24小时前的记录
    }, 60 * 60 * 1000)

    logger.success('所有任务已启动')




  } catch (error) {
    logger.error(`启动失败: ${error.message}`)
    process.exit(1)
  }
}

/**
 * 启动定时器
 */
function startTimers() {

  if (CONFIG.tasks.bidAdjust) {
    const bidInterval = CONFIG.bidAdjust.intervalMinutes * 60 * 1000
    timers.bidAdjust = setInterval(async () => {
      await runBidAdjustTask()
    }, bidInterval)

    logger.info(`Bid 调整任务定时器已启动: 每 ${CONFIG.bidAdjust.intervalMinutes} 分钟执行一次`)
  }


  if (CONFIG.tasks.block) {
    const blockInterval = CONFIG.block.intervalMinutes * 60 * 1000
    timers.block = setInterval(async () => {
      await runBlockTask()
    }, blockInterval)

    logger.info(`Block 任务定时器已启动: 每 ${CONFIG.block.intervalMinutes} 分钟执行一次`)
  }


  if (CONFIG.tasks.budgetBoost) {
    const budgetInterval = CONFIG.budgetBoost.intervalMinutes * 60 * 1000
    timers.budgetBoost = setInterval(async () => {
      await runBudgetBoostTask()
    }, budgetInterval)

    logger.info(`Budget 放量任务定时器已启动: 每 ${CONFIG.budgetBoost.intervalMinutes} 分钟执行一次`)
  }
}

/**
 * 立即执行一次所有任务
 */
async function runAllTasksOnce() {
  logger.info('\n' + '='.repeat(60))
  logger.info('开始执行所有任务...')
  logger.info('='.repeat(60))

  if (CONFIG.tasks.bidAdjust) {
    await runBidAdjustTask()
  }

  if (CONFIG.tasks.block) {
    await runBlockTask()
  }

  if (CONFIG.tasks.budgetBoost) {
    await runBudgetBoostTask()
  }

  logger.info('所有任务执行完成')
  logger.info('='.repeat(60))
}

/**
 * 执行 Bid 调整任务
 */
async function runBidAdjustTask() {
  let browserManager = null
  let navigator = null
  let tasks = null


  let currentTask = null
  let currentExecutionId = null
  let shouldStop = false

  try {

    const logFile = initLogFile()
    logger.info(`日志文件: ${logFile}`)

    const startTime = Date.now()
    const startTimeIso = new Date(startTime).toISOString()

    logger.info('\n' + '='.repeat(60))
    logger.task('【Bid 调整任务】开始执行')
    logger.info('='.repeat(60))


    const initialized = await initializeBrowser()
    browserManager = initialized.browserManager
    navigator = initialized.navigator
    tasks = initialized.tasks


    shouldStop = false


    currentTask = {
      taskType: 'bid_adjust',
      startedAt: startTimeIso,
      campaignsProcessed: 0,
      sourcesProcessed: 0,
      actionsTaken: 0
    }


    currentExecutionId = await db.logTaskExecution({
      taskType: 'bid_adjust',
      status: 'started',
      startedAt: startTimeIso
    })

    if (!currentExecutionId) {
      logger.error('无法创建执行记录，任务终止')
      return
    }

    logger.info(`执行记录 ID: ${currentExecutionId}`)


    tasks.bidAdjust.setExecutionId(currentExecutionId)


    const hasRules = await tasks.bidAdjust.loadRules()
    if (!hasRules) {
      logger.error('无法加载 Bid 调整规则，任务终止')
      await db.updateExecution(currentExecutionId, {
        status: 'failed',
        campaignsProcessed: 0,
        sourcesProcessed: 0,
        actionsTaken: 0,
        errors: 1,
        message: '无法加载 Bid 调整规则',
        completedAt: new Date().toISOString()
      })
      return
    }


    const stats = await navigator.traverseCampaigns(async (campaign) => {

      if (await db.checkStopSignal(currentExecutionId)) {
        shouldStop = true
        logger.warning('检测到停止信号，正在停止任务...')
        throw new Error('TASK_STOPPED')
      }


      currentTask.campaignsProcessed = (currentTask.campaignsProcessed || 0) + 1


      return await navigator.traverseSources(async (source) => {

        if (currentTask.sourcesProcessed % 5 === 0 && await db.checkStopSignal(currentExecutionId)) {
          shouldStop = true
          logger.warning('检测到停止信号，正在停止任务...')
          throw new Error('TASK_STOPPED')
        }

        currentTask.sourcesProcessed = (currentTask.sourcesProcessed || 0) + 1
        return await tasks.bidAdjust.processSource(source, campaign.name, campaign.spent)
      })
    })


    tasks.bidAdjust.stats = { ...tasks.bidAdjust.stats, ...stats }
    tasks.bidAdjust.printStats()


    await db.updateExecution(currentExecutionId, {
      status: 'completed',
      campaignsProcessed: stats.totalCampaigns,
      sourcesProcessed: tasks.bidAdjust.stats.totalSources,
      actionsTaken: tasks.bidAdjust.stats.adjustedSources,
      errors: tasks.bidAdjust.stats.errors,
      message: `查看了 ${stats.totalCampaigns} 个 Campaign，点击了 ${stats.processedCampaigns} 个 Campaign，修改了 ${tasks.bidAdjust.stats.adjustedSources} 个 Source 的 bid`,
      completedAt: new Date().toISOString()
    })

  } catch (error) {

    if (error.message === 'TASK_STOPPED' || shouldStop) {
      logger.warning('任务已被用户停止')
      await db.markAsStopped(currentExecutionId)
    } else {
      logger.error(`Bid 调整任务执行失败: ${error.message}`)
      if (currentExecutionId) {
        await db.updateExecution(currentExecutionId, {
          status: 'failed',
          campaignsProcessed: currentTask?.campaignsProcessed || 0,
          sourcesProcessed: currentTask?.sourcesProcessed || 0,
          actionsTaken: currentTask?.actionsTaken || 0,
          errors: 1,
          message: error.message,
          completedAt: new Date().toISOString()
        })
      }
    }
  } finally {

    await closeBrowser(browserManager)


    closeLogFile()
  }
}

/**
 * 执行 Block 任务
 */
async function runBlockTask() {
  let browserManager = null
  let navigator = null
  let tasks = null


  let currentTask = null
  let currentExecutionId = null
  let shouldStop = false

  try {

    const logFile = initLogFile()
    logger.info(`日志文件: ${logFile}`)

    const startTime = Date.now()
    const startTimeIso = new Date(startTime).toISOString()

    logger.info('\n' + '='.repeat(60))
    logger.task('【Block 任务】开始执行')
    logger.info('='.repeat(60))


    const initialized = await initializeBrowser()
    browserManager = initialized.browserManager
    navigator = initialized.navigator
    tasks = initialized.tasks


    shouldStop = false


    currentTask = {
      taskType: 'block',
      startedAt: startTimeIso,
      campaignsProcessed: 0,
      sourcesProcessed: 0,
      actionsTaken: 0
    }


    currentExecutionId = await db.logTaskExecution({
      taskType: 'block',
      status: 'started',
      startedAt: startTimeIso
    })

    if (!currentExecutionId) {
      logger.error('无法创建执行记录，任务终止')
      return
    }

    logger.info(`执行记录 ID: ${currentExecutionId}`)


    tasks.block.setExecutionId(currentExecutionId)

    const stats = await navigator.traverseCampaigns(async (campaign) => {

      if (await db.checkStopSignal(currentExecutionId)) {
        shouldStop = true
        logger.warning('检测到停止信号，正在停止任务...')
        throw new Error('TASK_STOPPED')
      }

      currentTask.campaignsProcessed = (currentTask.campaignsProcessed || 0) + 1
      return await navigator.traverseSources(async (source) => {

        if (currentTask.sourcesProcessed % 5 === 0 && await db.checkStopSignal(currentExecutionId)) {
          shouldStop = true
          logger.warning('检测到停止信号，正在停止任务...')
          throw new Error('TASK_STOPPED')
        }

        currentTask.sourcesProcessed = (currentTask.sourcesProcessed || 0) + 1
        return await tasks.block.processSource(source, campaign.name, campaign.spent)
      })
    })

    tasks.block.stats = { ...tasks.block.stats, ...stats }
    tasks.block.printStats()

    await db.updateExecution(currentExecutionId, {
      status: 'completed',
      campaignsProcessed: stats.totalCampaigns,
      sourcesProcessed: tasks.block.totalSources,
      actionsTaken: tasks.block.stats.blockedSources,
      errors: tasks.block.stats.errors,
      message: `查看了 ${stats.totalCampaigns} 个 Campaign，点击了 ${stats.processedCampaigns} 个 Campaign，屏蔽了 ${tasks.block.stats.blockedSources} 个 Source`,
      completedAt: new Date().toISOString()
    })

  } catch (error) {

    if (error.message === 'TASK_STOPPED' || shouldStop) {
      logger.warning('任务已被用户停止')
      await db.markAsStopped(currentExecutionId)
    } else {
      logger.error(`Block 任务执行失败: ${error.message}`)
      if (currentExecutionId) {
        await db.updateExecution(currentExecutionId, {
          status: 'failed',
          campaignsProcessed: currentTask?.campaignsProcessed || 0,
          sourcesProcessed: currentTask?.sourcesProcessed || 0,
          actionsTaken: currentTask?.actionsTaken || 0,
          errors: 1,
          message: error.message,
          completedAt: new Date().toISOString()
        })
      }
    }
  } finally {

    await closeBrowser(browserManager)


    closeLogFile()
  }
}

/**
 * 执行 Budget 放量任务
 */
async function runBudgetBoostTask() {
  let browserManager = null
  let navigator = null
  let tasks = null


  let currentTask = null
  let currentExecutionId = null
  let shouldStop = false

  try {

    const logFile = initLogFile()
    logger.info(`日志文件: ${logFile}`)

    const startTime = Date.now()
    const startTimeIso = new Date(startTime).toISOString()

    logger.info('\n' + '='.repeat(60))
    logger.task('【Budget 放量任务】开始执行')
    logger.info('='.repeat(60))


    const initialized = await initializeBrowser()
    browserManager = initialized.browserManager
    navigator = initialized.navigator
    tasks = initialized.tasks


    shouldStop = false


    currentTask = {
      taskType: 'budget_boost',
      startedAt: startTimeIso,
      campaignsProcessed: 0,
      sourcesProcessed: 0,
      actionsTaken: 0
    }


    currentExecutionId = await db.logTaskExecution({
      taskType: 'budget_boost',
      status: 'started',
      startedAt: startTimeIso
    })

    if (!currentExecutionId) {
      logger.error('无法创建执行记录，任务终止')
      return
    }

    logger.info(`执行记录 ID: ${currentExecutionId}`)


    tasks.budgetBoost.setExecutionId(currentExecutionId)


    const stats = await navigator.traverseCampaigns(async (campaign) => {

      if (await db.checkStopSignal(currentExecutionId)) {
        shouldStop = true
        logger.warning('检测到停止信号，正在停止任务...')
        throw new Error('TASK_STOPPED')
      }

      currentTask.campaignsProcessed = (currentTask.campaignsProcessed || 0) + 1
      return await tasks.budgetBoost.processCampaign(campaign)
    })

    tasks.budgetBoost.stats = { ...tasks.budgetBoost.stats, ...stats }
    tasks.budgetBoost.printStats()

    await db.updateExecution(currentExecutionId, {
      status: 'completed',
      campaignsProcessed: stats.totalCampaigns,
      actionsTaken: tasks.budgetBoost.stats.boostedCampaigns,
      errors: tasks.budgetBoost.stats.errors,
      message: `查看了 ${stats.totalCampaigns} 个 Campaign，点击了 ${stats.processedCampaigns} 个 Campaign，放量了 ${tasks.budgetBoost.stats.boostedCampaigns} 个 Campaign`,
      completedAt: new Date().toISOString()
    })

  } catch (error) {

    if (error.message === 'TASK_STOPPED' || shouldStop) {
      logger.warning('任务已被用户停止')
      await db.markAsStopped(currentExecutionId)
    } else {
      logger.error(`Budget 放量任务执行失败: ${error.message}`)
      if (currentExecutionId) {
        await db.updateExecution(currentExecutionId, {
          status: 'failed',
          campaignsProcessed: currentTask?.campaignsProcessed || 0,
          sourcesProcessed: currentTask?.sourcesProcessed || 0,
          actionsTaken: currentTask?.actionsTaken || 0,
          errors: 1,
          message: error.message,
          completedAt: new Date().toISOString()
        })
      }
    }
  } finally {

    await closeBrowser(browserManager)


    closeLogFile()
  }
}

/**
 * 手动触发指定任务
 */
async function triggerTask(taskName) {
  switch (taskName) {
    case 'bid_adjust':
    case 'bid':
      await runBidAdjustTask()
      break
    case 'block':
      await runBlockTask()
      break
    case 'budget_boost':
    case 'budget':
      await runBudgetBoostTask()
      break
    default:
      logger.error(`未知的任务名称: ${taskName}`)
  }
}

/**
 * 获取任务统计
 */
function getStats() {
  return {
    cooldown: cooldownManager.getStats()
  }
}

/**
 * 关闭系统
 */
async function shutdown() {
  logger.info('正在关闭系统...')


  Object.values(timers).forEach(timer => {
    if (timer) clearInterval(timer)
  })

  logger.info('系统已关闭')
}


async function handleInterrupt(signal) {
  logger.info(`\n收到 ${signal} 信号，正在关闭...`)


  Object.values(timers).forEach(timer => {
    if (timer) clearInterval(timer)
  })

  process.exit(0)
}

process.on('SIGINT', () => handleInterrupt('SIGINT'))
process.on('SIGTERM', () => handleInterrupt('SIGTERM'))


module.exports = {
  startAll,
  runAllTasksOnce,
  runBidAdjustTask,
  runBlockTask,
  runBudgetBoostTask,
  triggerTask,
  getStats,
  shutdown
}


if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === 'dry-run') {

    logger.info('=== Dry Run 模式 ===')


    cooldownManager.clear()

    startAll().then(async () => {
      await runAllTasksOnce()
      process.exit(0)
    }).catch(async (error) => {
      logger.error(`执行失败: ${error.message}`)
      process.exit(1)
    })
  } else if (command === 'trigger') {

    const taskName = args[1]


    cooldownManager.clear()

    triggerTask(taskName).then(async () => {
      process.exit(0)
    }).catch(async (error) => {
      logger.error(`执行失败: ${error.message}`)
      logger.info('浏览器将保持打开 30 秒，方便查看问题...')
      await new Promise(resolve => setTimeout(resolve, 30000))
      process.exit(1)
    })
  } else {

    startAll().catch(error => {
      logger.error(`启动失败: ${error.message}`)
      process.exit(1)
    })
  }
}
