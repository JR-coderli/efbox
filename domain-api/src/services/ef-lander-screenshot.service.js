/**
 * ef-归因系统 落地页截图服务（独立实现，不依赖/不影响现有 cf_landers 截图代码）。
 *
 * - 截图保存目录：uploads/ef_lander_screenshots/（与 cf_landers 的 uploads/lander_screenshots 完全分开）
 * - 访问签名：ab_landers 的 url 不能裸开，需拼接 ?go=1&t=..&n=..&s=..&w=1（与 clickflare 同一套 eflp 门禁）。
 *   下面 buildSignedUrl 的签名逻辑复制自 lander-screenshot.service.js，未做任何改动。
 * - 触发方式：前端手动点击「截图/重新截图」按钮，同步等待结果（无队列、无定时器、无变更检测）。
 * - 重新截图不会删除旧图：旧文件留在 uploads/ef_lander_screenshots/，DB 行只指向最新一张；需要清理时直接去服务器删目录。
 */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const efLanderService = require('../service/ef-lander.service')
const { DEV_CHROME_PATH, PROD_CHROME_PATH } = require('../config/server')

const isProd = process.env.NODE_ENV === 'production'

function getChromePath() {
  return isProd ? PROD_CHROME_PATH : DEV_CHROME_PATH
}

// 截图保存目录（启动时确保存在）
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'uploads', 'ef_lander_screenshots')
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  console.log(`[ef-lander 截图] 创建目录: ${SCREENSHOT_DIR}`)
}

// 截图参数（独立配置，不复用 clickflare 配置文件）
// 视口与 clickflare 截图保持一致：375x667 移动端（clickflare 也是只设视口、不设 UA）
const VIEWPORT_WIDTH = 375
const VIEWPORT_HEIGHT = 667
const TIMEOUT = 30000

/**
 * 给 lander url 拼接访问签名（eflp 门禁，与 clickflare 同一套）。
 * 复制自 lander-screenshot.service.js，逻辑保持一致。
 */
function buildSignedUrl(url) {
  const t = Math.floor(Date.now() / 10000)
  const n = crypto.randomBytes(4).toString('hex')
  const raw = `eflp${t}${n}`
  const s = crypto
    .createHash('md5')
    .update(raw)
    .digest('hex')
    .substring(0, 10)

  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}go=1&t=${t}&n=${n}&s=${s}&w=1`
}

/**
 * 对单个 lander 截图（同步等待结果）
 * @param {{landerId:number, landerUrl:string}} param0
 * @returns {Promise<{success:boolean, screenshot_url?:string, error?:string}>}
 */
async function captureLanderScreenshot({ landerId, landerUrl }) {
  if (!landerUrl) {
    return { success: false, error: 'lander url 为空' }
  }

  let browser = null
  try {
    const chromePath = getChromePath()
    if (!chromePath) {
      throw new Error('未配置 Chrome 路径（DEV_CHROME_PATH / PROD_CHROME_PATH）')
    }

    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    })

    const page = await browser.newPage()
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT })
    await page.setDefaultTimeout(TIMEOUT)

    const fullUrl = buildSignedUrl(landerUrl)
    await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: TIMEOUT })

    const filename = `ef_lander_${landerId}_${Date.now()}.jpg`
    const filepath = path.join(SCREENSHOT_DIR, filename)
    await page.screenshot({ path: filepath, type: 'jpeg', quality: 80 })

    const screenshotUrl = `/uploads/ef_lander_screenshots/${filename}`

    await efLanderService.upsertScreenshot({
      landerId,
      landerUrl,
      screenshotUrl,
      status: 'success',
      error: null
    })

    console.log(`[ef-lander 截图] 成功: lander_id=${landerId}`)
    return { success: true, screenshot_url: screenshotUrl }
  } catch (error) {
    console.error(`[ef-lander 截图] 失败: lander_id=${landerId}`, error.message)
    await efLanderService.upsertScreenshot({
      landerId,
      landerUrl,
      screenshotUrl: null,
      screenshotPath: null,
      status: 'failed',
      error: error.message
    })
    return { success: false, error: error.message }
  } finally {
    if (browser) {
      try { await browser.close() } catch (e) { /* 忽略 */ }
    }
  }
}

module.exports = { captureLanderScreenshot }
