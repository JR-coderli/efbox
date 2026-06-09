const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')
const landerService = require('../service/lander.service')
const clickflareConfig = require('../config/clickflare')
const { DEV_CHROME_PATH, PROD_CHROME_PATH } = require('../config/server')
const crypto = require('crypto')

const isProd = process.env.NODE_ENV === 'production'

/**
 * 获取 Chrome 可执行文件路径
 */
function getChromePath() {
  return isProd ? PROD_CHROME_PATH : DEV_CHROME_PATH
}


const SCREENSHOT_DIR = clickflareConfig.screenshot.dir

class LanderScreenshotService {

  queue = []
  isProcessing = false
  maxConcurrent = clickflareConfig.screenshot.maxConcurrent

  constructor() {

    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
      console.log(`[截图服务] 创建目录: ${SCREENSHOT_DIR}`)
    }
  }

  /**
   * 添加截图任务到队列
   */
  async addTask(landerKey, url) {

    if (this.queue.some(task => task.landerKey === landerKey)) {
      console.log(`[截图队列] 任务已存在，跳过: ${landerKey}`)
      return
    }

    this.queue.push({ landerKey, url })
    console.log(`[截图队列] 添加任务: ${landerKey}, 队列长度: ${this.queue.length}`)


    await landerService.upsertPreview(
      landerKey,
      '',
      url,
      null,
      null,
      'pending'
    )


    this.processQueue()
  }

  /**
   * 批量添加截图任务
   */
  async addTasks(landers) {
    for (const lander of landers) {
      await this.addTask(lander.lander_key, lander.url)
    }
  }

  /**
   * 处理队列中的截图任务
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true


    const tasks = this.queue.splice(0, this.maxConcurrent)

    await Promise.allSettled(tasks.map(task => this.screenshot(task)))

    this.isProcessing = false


    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 1000)
    } else {
      console.log('[截图队列] 所有任务已完成')
    }
  }

  /**
   * 执行截图
   */
  async screenshot({ landerKey, url }) {
    console.log(`[截图] 开始: ${landerKey} - ${url}`)


    await landerService.updateScreenshotStatus(landerKey, 'processing')

    let browser = null
    try {

      const clickflareConfig = require('../config/clickflare')

      const chromePath = getChromePath()
      console.log(`[截图] 使用 Chrome 路径: ${chromePath}`)

      browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      })

      const page = await browser.newPage()


      await page.setViewport({
        width: clickflareConfig.screenshot.viewportWidth,
        height: clickflareConfig.screenshot.viewportHeight
      })


      await page.setDefaultTimeout(clickflareConfig.screenshot.timeout)


      const t = Math.floor(Date.now() / 10000)
      const n = crypto.randomBytes(4).toString('hex')
      const raw = `eflp${t}${n}`
      const s = crypto
        .createHash('md5')
        .update(raw)
        .digest('hex')
        .substring(0, 10)

      const sep = url.includes('?') ? '&' : '?'
      
      const fullUrl = `${url}${sep}go=1&t=${t}&n=${n}&s=${s}&w=1`
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: clickflareConfig.screenshot.timeout })


      const filename = `lander_${landerKey}_${Date.now()}.jpg`
      const filepath = path.join(SCREENSHOT_DIR, filename)


      await page.screenshot({
        path: filepath,
        type: 'jpeg',
        quality: 80
      })


      const screenshotUrl = `/uploads/lander_screenshots/${filename}`


      const lander = await landerService.getByKey(landerKey)


      await landerService.upsertPreview(
        landerKey,
        lander?.name || '',
        url,
        filepath,
        screenshotUrl,
        'success'
      )

      console.log(`[截图] 成功: ${landerKey}`)

    } catch (error) {
      console.error(`[截图] 失败: ${landerKey}`, error.message)
      await landerService.upsertPreview(
        landerKey,
        '',
        url,
        null,
        null,
        'failed',
        error.message
      )
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  /**
   * 重试失败的截图
   */
  async retryFailed() {
    const statement = `
      SELECT lander_key, lander_url
      FROM cf_lander_previews
      WHERE screenshot_status = 'failed'
      ORDER BY updated_at DESC
      LIMIT 10
    `
    const connection = require('../app/database')
    const [failedLanders] = await connection.execute(statement)

    for (const lander of failedLanders) {
      await this.addTask(lander.lander_key, lander.lander_url)
    }

    return failedLanders.length
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing
    }
  }
}


const screenshotService = new LanderScreenshotService()


let isQueueRunning = false

/**
 * 启动截图队列处理（用于同步后调用）
 */
async function startScreenshotQueue() {

  if (isQueueRunning) {
    console.log('[截图队列] 正在运行中，跳过本次请求')
    return {
      added: 0,
      queueStatus: screenshotService.getQueueStatus(),
      message: '队列正在运行中'
    }
  }

  isQueueRunning = true

  try {
    let totalAdded = 0
    let batch = 0


    while (true) {

      const pendingLanders = await landerService.getPendingLanders(100)

      if (pendingLanders.length === 0) {
        break
      }

      batch++
      console.log(`[截图队列] 第 ${batch} 批: 发现 ${pendingLanders.length} 个待截图任务`)


      await screenshotService.addTasks(pendingLanders)

      totalAdded += pendingLanders.length


      if (pendingLanders.length < 100) {
        break
      }


      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`[截图队列] 共添加 ${totalAdded} 个任务到队列`)

    return {
      added: totalAdded,
      queueStatus: screenshotService.getQueueStatus()
    }
  } catch (error) {
    console.error('[截图队列] 启动失败:', error)
    throw error
  } finally {
    isQueueRunning = false
  }
}

/**
 * 定时重试失败的截图
 */
function startRetryFailed(intervalMinutes = 60) {
  const interval = intervalMinutes * 60 * 1000

  setInterval(async () => {
    try {
      const count = await screenshotService.retryFailed()
      if (count > 0) {
        console.log(`[截图重试] 添加了 ${count} 个失败任务到队列`)
      }
    } catch (error) {
      console.error('[截图重试] 失败:', error)
    }
  }, interval)

  console.log(`[截图重试] 定时任务已启动，间隔: ${intervalMinutes} 分钟`)
}

module.exports = {
  screenshotService,
  startScreenshotQueue,
  startRetryFailed
}
