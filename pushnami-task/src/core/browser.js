/**
 * 浏览器管理模块
 * 负责启动浏览器、登录、页面导航等核心操作
 */
const puppeteer = require('puppeteer-core')
const { CONFIG } = require('../utils/config.js')
const { logger } = require('../utils/logger.js')

class BrowserManager {
  constructor() {
    this.browser = null
    this.page = null
    this.isLoggedIn = false
  }

  /**
   * 启动浏览器
   */
  async launch() {
    logger.info('正在启动浏览器...')

    const [windowWidth, windowHeight] = CONFIG.browser.windowSize.split(',').map(v => parseInt(v.trim()))

    this.browser = await puppeteer.launch({
      executablePath: CONFIG.browser.chromePath,
      headless: CONFIG.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        `--window-size=${CONFIG.browser.windowSize}`,
        '--window-position=100,100'
      ]
    })

    this.page = await this.browser.newPage()


    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      window.chrome = { runtime: {} }

      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
      )
    })


    await this.page.setViewport({ width: windowWidth, height: windowHeight })
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    logger.success('浏览器启动成功')
    return this.page
  }

  /**
   * 登录 Pushnami
   */
  async login(retryCount = 0) {
    if (this.isLoggedIn) {
      logger.info('已登录，跳过登录流程')
      return true
    }

    const maxRetries = 2
    const currentAttempt = retryCount + 1

    logger.info(`正在登录 Pushnami... (尝试 ${currentAttempt}/${maxRetries + 1})`)

    try {

      await this.page.goto(CONFIG.login.url, { waitUntil: 'domcontentloaded', timeout: 60000 })


      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 }).catch(() => {})
      await this.sleep(2000)


      const usernameInput = await this.page.$('input[name="username"]')
      if (usernameInput) {
        await usernameInput.click()
        await this.sleep(200)
        await this.page.keyboard.type(CONFIG.login.username)
        logger.info('用户名已输入')
      } else {
        logger.warning('未找到用户名输入框')
      }
      await this.sleep(500)


      const passwordInputs = await this.page.$$('input[type="password"]')
      if (passwordInputs.length > 0) {
        await passwordInputs[0].click()
        await this.sleep(200)
        await this.page.keyboard.type(CONFIG.login.password)
        logger.info('密码已输入')
      } else {
        logger.warning('未找到密码输入框')
      }
      await this.sleep(500)


      let loginClicked = false


      const buttons = await this.page.$$('button')
      for (const btn of buttons) {
        const text = await this.page.evaluate(el => el.textContent, btn)
        if (text && (text.includes('Sign In') || text.includes('Log In') || text.includes('Login'))) {
          await btn.click()
          loginClicked = true
          logger.info(`已点击登录按钮: "${text.trim()}"`)
          break
        }
      }


      if (!loginClicked) {
        logger.info('未找到登录按钮，尝试按回车')
        await this.page.keyboard.press('Enter')
        loginClicked = true
      }

      if (!loginClicked) {
        throw new Error('无法点击登录按钮')
      }

      logger.success('登录请求已发送，等待页面跳转...')


      const maxWaitTime = 30000 // 最多等待30秒
      const startTime = Date.now()
      let loginSuccess = false

      while (Date.now() - startTime < maxWaitTime) {
        await this.sleep(1000)

        const currentUrl = this.page.url()


        if (!currentUrl.includes('signin') && !currentUrl.includes('login')) {

          const checkResult = await this.page.evaluate(() => {

            const errorElements = [...document.querySelectorAll('.error, .alert-danger, [class*="error"], .alert, [role="alert"]')]
            const errors = errorElements.map(el => el.textContent).filter(t => t && t.trim())


            const hasMainContent = document.querySelector('nb-sidebar, [class*="sidebar"], nav')

            return {
              hasError: errors.length > 0,
              errors,
              hasMainContent: !!hasMainContent
            }
          })

          if (checkResult.hasError) {
            logger.error(`登录失败，错误信息: ${checkResult.errors.join(', ')}`)
            throw new Error('登录失败: ' + checkResult.errors.join(', '))
          }

          if (checkResult.hasMainContent) {
            loginSuccess = true
            break
          }
        }
      }

      if (!loginSuccess) {
        const currentUrl = this.page.url()
        logger.warning(`登录超时，当前 URL: ${currentUrl}`)
        throw new Error('登录超时，请检查网络或账号密码')
      }

      logger.success(`登录成功！当前页面: ${this.page.url()}`)


      await this.sleep(3000)

      this.isLoggedIn = true
      return true

    } catch (error) {
      logger.error(`登录失败 (尝试 ${currentAttempt}): ${error.message}`)


      if (retryCount < maxRetries) {
        logger.info(`准备重试登录...`)
        await this.sleep(2000)


        try {

          await this.page.evaluate(() => {

            document.cookie.split(";").forEach(c => {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
          })


          try {
            const client = await this.page.createCDPSession()
            await client.send('Network.clearBrowserCookies')
          } catch (e) {

          }

          logger.info('已清除 cookies，准备重试')
        } catch (e) {
          logger.warning('清除 cookies 失败，直接重试')
        }

        return this.login(retryCount + 1)
      }

      throw error
    }
  }

  /**
   * 导航到 Advertiser Campaigns 页面
   */
  async navigateToCampaigns() {
    logger.info('正在导航到 Advertiser Campaigns...')


    await this.sleep(3000)

    const menuClicked = await this.page.evaluate(() => {
      const elements = [...document.querySelectorAll('a, button, span, div, nb-sidebar, nb-menu')]


      let menu = elements.find(el => el.textContent && el.textContent.trim() === 'Advertiser Campaigns')
      if (menu) {
        menu.click()
        return { success: true, method: 'exact' }
      }


      menu = elements.find(el => {
        const text = el.textContent?.toLowerCase() || ''
        return text.includes('advertiser') && text.includes('campaign')
      })
      if (menu) {
        menu.click()
        return { success: true, method: 'partial' }
      }


      menu = elements.find(el => {
        const text = el.textContent?.trim() || ''
        return text === 'Campaigns' || text === 'Campaign'
      })
      if (menu) {
        menu.click()
        return { success: true, method: 'campaigns_only' }
      }


      const visibleTexts = elements
        .filter(el => el.textContent && el.textContent.trim().length > 0 && el.textContent.trim().length < 50)
        .map(el => el.textContent.trim())
        .slice(0, 20)

      return { success: false, visibleTexts }
    })

    if (menuClicked.success) {
      logger.success(`已导航到 Campaign 列表页 (${menuClicked.method})`)


      await this._waitForCampaignPageLoad()
      return true
    }

    logger.warning('未找到 Advertiser Campaigns 菜单')
    if (menuClicked.visibleTexts) {
      logger.info(`页面上可见的菜单项: ${menuClicked.visibleTexts.join(', ')}`)
    }
    return false
  }

  /**
   * 等待 Campaign 列表页加载完成
   * 只检查 Conversions 按钮是否存在（最可靠的加载完成标志）
   */
  async _waitForCampaignPageLoad(timeout = 30000) {
    const startTime = Date.now()
    logger.info('等待 Campaign 页面加载...')

    while (Date.now() - startTime < timeout) {

      const hasConversionsButton = await this.page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find(el => el.textContent.includes('Conversions'))
        return !!btn
      })

      if (hasConversionsButton) {

        await this.sleep(500)
        logger.success('Campaign 页面加载完成')
        return true
      }

      await this.sleep(500)
    }

    logger.warning(`等待 Campaign 页面加载超时 (${timeout}ms)，继续执行`)
    return false
  }

  /**
   * 等待方法
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      logger.info('正在关闭浏览器...')
      await this.browser.close()
      this.browser = null
      this.page = null
      this.isLoggedIn = false
    }
  }

  /**
   * 截图保存（用于调试）
   */
  async screenshot(filename) {
    if (this.page) {
      try {
        const fs = require('fs')
        const path = require('path')


        const dir = path.dirname(filename)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        await this.page.screenshot({ path: filename, fullPage: false })
        logger.info(`截图已保存: ${filename}`)
      } catch (error) {
        logger.warning(`截图保存失败: ${error.message}`)
      }
    }
  }
}

module.exports = BrowserManager
