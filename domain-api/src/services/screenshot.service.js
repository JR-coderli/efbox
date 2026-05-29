/**
 * 截图服务
 */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')
const connection = require('../app/database')
const { DEV_CHROME_PATH, PROD_CHROME_PATH, SERVER_HOST, SERVER_PORT } = require('../config/server')
const { getIO } = require('./websocket.service')

const isProd = process.env.NODE_ENV === 'production'

/**
 * 构建完整的预览图 URL
 */
function getFullPreviewUrl(relativePath) {

  const baseUrl = isProd
    ? `${SERVER_HOST}/api`  // 生产环境: https://efbox.work/api
    : `${SERVER_HOST}:${SERVER_PORT}`  // 开发环境: http://localhost:8001
  return `${baseUrl}${relativePath}`
}

/**
 * Chrome 路径
 */
function getChromePath() {
  return isProd
    ? PROD_CHROME_PATH
    : DEV_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
}

/**
 * 预览图目录
 */
function getPreviewDir() {
  const previewDir = path.join(__dirname, '..', '..', 'uploads', 'landing_preview')
  if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true })
  return previewDir
}

/**
 * 截图函数
 */
async function captureScreenshot(landingPageId, url, userId, screenshotType = 'mobile') {
  let browser = null
  try {
    console.log(`[Screenshot] 开始截图: landingPageId=${landingPageId}, url=${url}, type=${screenshotType}`)

    const previewDir = getPreviewDir()

    browser = await puppeteer.launch({
      executablePath: getChromePath(),
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
    })

    const page = await browser.newPage()

    if (screenshotType === 'mobile') {
      await page.setViewport({ width: 375, height: 812 })
    } else {
      await page.setViewport({ width: 1440, height: 900 })
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    const timestamp = Date.now()
    const filename = `landing_${landingPageId}_${timestamp}.png`
    const filepath = path.join(previewDir, filename)

    await page.screenshot({ path: filepath, fullPage: false, type: 'png' })
    await browser.close()
    browser = null


    const relativePath = `/uploads/landing_preview/${filename}`

    const previewUrl = getFullPreviewUrl(relativePath)

    const stats = fs.statSync(filepath)
    const statement = `
      INSERT INTO land_preview_config
      (filename, mimetype, size, landingpage_id, destination)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        filename = VALUES(filename),
        mimetype = VALUES(mimetype),
        size = VALUES(size),
        destination = VALUES(destination),
        updateAt = CURRENT_TIMESTAMP
    `
    await connection.execute(statement, [filename, 'image/png', stats.size, landingPageId, './uploads/landing_preview'])

    console.log(`[Screenshot] 截图完成: ${previewUrl}`)

    const io = getIO()
    if (io) {
      io.emit('screenshot-ready', { landingPageId, previewUrl, filename })
    }

    return { success: true, previewUrl, filename }

  } catch (error) {
    console.error('[Screenshot] 截图失败:', error.message)

    const io = getIO()
    if (io) io.emit('screenshot-failed', { landingPageId, error: error.message })

    if (browser) {
      try { await browser.close() } catch (e) {}
    }

    return { success: false, error: error.message }
  }
}

module.exports = { captureScreenshot }
