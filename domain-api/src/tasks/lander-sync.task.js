const landerService = require('../service/lander.service')
const systemConfigService = require('../service/system-config.service')
const { startScreenshotQueue } = require('../services/lander-screenshot.service')
const clickflareConfig = require('../config/clickflare')


let isSyncing = false
let syncTimer = null

let waitingSyncPromises = []

/**
 * 调用 Clickflare API 获取 Lander 列表
 */
async function fetchLandersFromAPI() {
  const response = await fetch(`${clickflareConfig.baseURL}${clickflareConfig.endpoints.landers}`, {
    method: 'GET',
    headers: {
      'api-key': clickflareConfig.apiKey,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} - ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

/**
 * 同步 Lander 数据到数据库
 */
async function syncLanderService() {

  if (isSyncing) {
    console.log('[Lander 同步] 正在进行中，等待当前同步完成...')

    return new Promise((resolve) => {
      waitingSyncPromises.push(resolve)
    })
  }

  isSyncing = true
  const startTime = Date.now()
  console.log('[Lander 同步] 开始同步...')

  try {

    const landers = await fetchLandersFromAPI()
    console.log(`[Lander 同步] 从 API 获取到 ${landers.length} 条数据`)


    const transformedLanders = landers.map(item => ({
      lander_key: item._id,
      name: item.name,
      url: item.url,
      workspace_id: item.workspace_id || null,  // private lander 有 workspace_id，public lander 为 null
      cf_created_at: item.created_at ? new Date(item.created_at) : null,
      cf_updated_at: item.updated_at ? new Date(item.updated_at) : null
    }))


    const syncResult = await landerService.syncLanders(transformedLanders)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`[Lander 同步] 完成，耗时 ${duration} 秒`, syncResult)



    setImmediate(async () => {
      try {
        const screenshotResult = await startScreenshotQueue()
        console.log('[Lander 同步] 截图队列已启动:', screenshotResult)
      } catch (error) {
        console.error('[Lander 同步] 启动截图队列失败:', error)
      }
    })

    const result = {
      success: true,
      ...syncResult,
      duration
    }


    const waitingPromises = waitingSyncPromises.splice(0)
    if (waitingPromises.length > 0) {
      console.log(`[Lander 同步] 通知 ${waitingPromises.length} 个等待的请求`)

      setImmediate(() => {
        waitingPromises.forEach(resolve => resolve(result))
      })
    }

    return result
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error('[Lander 同步] 失败:', error)


    const waitingPromises = waitingSyncPromises.splice(0)
    if (waitingPromises.length > 0) {
      console.log(`[Lander 同步] 通知 ${waitingPromises.length} 个等待的请求同步失败`)
      setImmediate(() => {
        waitingPromises.forEach(resolve => {

          resolve({ success: false, message: '同步失败', error: error.message })
        })
      })
    }

    throw error
  } finally {
    isSyncing = false
  }
}

/**
 * 启动定时同步任务
 * @param {number} intervalMinutes 同步间隔（分钟），可选，不传则使用数据库配置或默认值
 * @param {boolean} immediate 是否立即执行一次同步，默认为 true
 */
async function startLanderSync(intervalMinutes, immediate = true) {

  const autoSyncEnabled = await systemConfigService.get('lander.auto_sync.enabled', false)
  if (!autoSyncEnabled) {
    console.log('[Lander 同步] 自动同步已关闭，不启动定时任务')
    return null
  }


  const configInterval = await systemConfigService.get('lander.auto_sync.interval')
  const finalInterval = configInterval ?? intervalMinutes ?? clickflareConfig.sync.intervalMinutes


  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }

  const interval = finalInterval * 60 * 1000


  if (immediate) {
    syncLanderService().catch(error => {
      console.error('[Lander 同步] 首次同步失败:', error)
    })
  }


  syncTimer = setInterval(async () => {
    try {
      const result = await syncLanderService()
      console.log(`[Lander 同步] 定时同步完成:`, result)
    } catch (error) {
      console.error(`[Lander 同步] 定时同步失败:`, error.message)
    }
  }, interval)

  console.log(`[Lander 同步] 定时任务已启动，间隔: ${finalInterval} 分钟${immediate ? '' : '（本次不执行，等待下一个周期）'}`)

  return syncTimer
}

/**
 * 停止定时同步任务
 */
function stopLanderSync() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
    console.log('[Lander 同步] 定时任务已停止')
    return true
  }
  return false
}

/**
 * 获取自动同步状态
 */
async function getAutoSyncStatus() {
  const enabled = await systemConfigService.get('lander.auto_sync.enabled', false)
  const interval = await systemConfigService.get('lander.auto_sync.interval', 30)
  return {
    enabled,
    interval,
    isRunning: syncTimer !== null
  }
}

module.exports = {
  syncLanderService,
  startLanderSync,
  stopLanderSync,
  getAutoSyncStatus,
  isSyncing: () => isSyncing  // 导出同步状态检查函数
}
