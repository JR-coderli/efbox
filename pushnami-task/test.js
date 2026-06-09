/**
 * Pushnami Bid 调整脚本
 *
 * 从 .env 读取环境配置
 * 支持遍历所有分页的所有 Campaign
 */

require('dotenv').config()
const puppeteer = require('puppeteer-core')


const NODE_ENV = process.env.NODE_ENV || 'development'
const isDev = NODE_ENV === 'development'

console.log(`[环境] 当前模式: ${NODE_ENV}`)


const PREFIX = isDev ? 'DEV' : 'PROD'


const CONFIG = {

  loginUrl: process.env[`${PREFIX}_LOGIN_URL`],
  username: process.env[`${PREFIX}_USERNAME`],
  password: process.env[`${PREFIX}_PASSWORD`],


  chromePath: process.env[`${PREFIX}_CHROME_PATH`],
  headless: process.env[`${PREFIX}_HEADLESS`] === 'true',
  windowSize: process.env[`${PREFIX}_WINDOW_SIZE`] || '1280,800',


  filterStatusSequence: process.env.FILTER_STATUS_SEQUENCE
    ? process.env.FILTER_STATUS_SEQUENCE.split(',').map(s => s.trim()).filter(s => s)
    : [],
  targetCpcColumn: process.env.TARGET_CPC_COLUMN || 'CPC',
  targetCpcValue: process.env.TARGET_CPC_VALUE || '$0.11',
  newBidValue: process.env.NEW_BID_VALUE || '0.19',
  actionMode: process.env.ACTION_MODE || 'edit_bid'  // edit_bid 或 select_row
}


const requiredVars = [`${PREFIX}_LOGIN_URL`, `${PREFIX}_USERNAME`, `${PREFIX}_PASSWORD`, `${PREFIX}_CHROME_PATH`]
const missingVars = requiredVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.error(`错误: 缺少必需的环境变量: ${missingVars.join(', ')}`)
  console.error(`请检查 .env 文件中 ${PREFIX}_ 开头的配置`)
  process.exit(1)
}


const [windowWidth, windowHeight] = CONFIG.windowSize.split(',').map(v => parseInt(v.trim()))

console.log(`[配置] 筛选列: ${CONFIG.targetCpcColumn}`)
console.log(`[配置] 目标值: ${CONFIG.targetCpcValue}`)
console.log(`[配置] 新 Bid: ${CONFIG.newBidValue}`)
console.log(`[配置] 操作模式: ${CONFIG.actionMode === 'select_row' ? '选中行（测试）' : '修改Bid'}`)
console.log(`[配置] Headless: ${CONFIG.headless}`)


async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


const stats = {
  totalCampaigns: 0,
  processedCampaigns: 0,
  successCount: 0,
  skippedCount: 0,
  errorCount: 0,
  totalPages: 0,
  details: []  // 记录每个 Campaign 的处理详情
}

function printStats() {
  console.log('\n' + '='.repeat(50))
  console.log('【处理汇总报告】')
  console.log('='.repeat(50))
  console.log(`总页数: ${stats.totalPages}`)
  console.log(`总 Campaign 数: ${stats.totalCampaigns}`)
  console.log(`已处理: ${stats.processedCampaigns}`)
  console.log(`成功修改: ${stats.successCount}`)
  console.log(`跳过(未找到目标): ${stats.skippedCount}`)
  console.log(`处理出错: ${stats.errorCount}`)
  console.log('='.repeat(50))


  if (stats.details.length > 0) {
    console.log('\n【详细处理记录】')
    stats.details.forEach((d, i) => {
      const status = d.success ? '✅' : (d.skipped ? '⏭️' : '❌')
      console.log(`${status} [${i + 1}] ${d.campaignName} - ${d.message}`)
    })
  }
  console.log('='.repeat(50) + '\n')
}


/**
 * 处理单个 Campaign：进入详情页，查找所有目标行，修改所有匹配的 Bid，返回列表页
 * @param {Page} page - Puppeteer Page 对象
 * @param {number} rowIndex - Campaign 在表格中的行索引
 * @param {string} campaignName - Campaign 名称
 * @returns {Object} 处理结果
 */
async function processCampaign(page, rowIndex, campaignName) {
  try {
    console.log(`\n  [处理] Campaign [${rowIndex + 1}] ${campaignName}`)


    await sleep(1000)

    const clicked = await page.evaluate((idx) => {
      const trs = [...document.querySelectorAll('tbody tr')]
      if (idx >= trs.length) return { success: false, message: `行不存在，当前共${trs.length}行` }

      const tr = trs[idx]
      const tds = tr.querySelectorAll('td')

      if (tds.length > 1) {
        const name = tds[1].textContent.trim()
        tds[1].click()
        return { success: true, campaignName: name }
      }

      return { success: false, message: '未找到 name 列' }
    }, rowIndex)

    if (!clicked.success) {
      return { success: false, skipped: false, message: clicked.message }
    }

    await sleep(3000)


    const tableInfo = await page.evaluate((targetColumn, targetValue) => {
      const ths = [...document.querySelectorAll('th')]

      let targetColumnIndex = -1
      let bidColumnIndex = -1


      for (let i = 0; i < ths.length; i++) {
        const text = ths[i].textContent.trim()
        if (text.includes(targetColumn)) targetColumnIndex = i
        if (text.includes('Bid')) bidColumnIndex = i
      }


      const trs = [...document.querySelectorAll('tbody tr')]
      const targetRowIndexes = []

      for (let i = 0; i < trs.length; i++) {
        const tr = trs[i]
        const tds = tr.querySelectorAll('td')

        if (targetColumnIndex >= 0 && targetColumnIndex < tds.length) {
          const cellText = tds[targetColumnIndex].textContent.trim()

          if (cellText === targetValue || cellText === '$' + targetValue) {
            targetRowIndexes.push(i)
          }
        }
      }

      return {
        targetColumnIndex,
        bidColumnIndex,
        targetRowIndexes,
        totalRows: trs.length
      }
    }, CONFIG.targetCpcColumn, CONFIG.targetCpcValue)


    if (tableInfo.targetRowIndexes.length === 0) {
      console.log(`    第一页未找到匹配数据，继续检查子分页...`)
    } else {
      console.log(`    第一页找到 ${tableInfo.targetRowIndexes.length} 个匹配行`)
    }


    let successCount = 0
    let errorCount = 0
    let subPageNum = 1

    while (true) {
      console.log(`    --- 子数据第 ${subPageNum} 页 ---`)


      const currentPageInfo = await page.evaluate((targetColumn, targetValue) => {
        const ths = [...document.querySelectorAll('th')]

        let targetColumnIndex = -1
        let bidColumnIndex = -1

        for (let i = 0; i < ths.length; i++) {
          const text = ths[i].textContent.trim()
          if (text.includes(targetColumn)) targetColumnIndex = i
          if (text.includes('Bid')) bidColumnIndex = i
        }

        const trs = [...document.querySelectorAll('tbody tr')]
        const targetRowIndexes = []

        for (let i = 0; i < trs.length; i++) {
          const tr = trs[i]
          const tds = tr.querySelectorAll('td')

          if (targetColumnIndex >= 0 && targetColumnIndex < tds.length) {
            const cellText = tds[targetColumnIndex].textContent.trim()
            if (cellText === targetValue || cellText === '$' + targetValue) {
              targetRowIndexes.push(i)
            }
          }
        }

        return { targetRowIndexes, bidColumnIndex }
      }, CONFIG.targetCpcColumn, CONFIG.targetCpcValue)

      if (currentPageInfo.targetRowIndexes.length === 0) {
        console.log(`    当前页无匹配数据`)
      } else {
        console.log(`    当前页找到 ${currentPageInfo.targetRowIndexes.length} 个匹配行`)
      }


      for (let idx = 0; idx < currentPageInfo.targetRowIndexes.length; idx++) {
        const targetRow = currentPageInfo.targetRowIndexes[idx]
        console.log(`    [${idx + 1}/${currentPageInfo.targetRowIndexes.length}] 处理第 ${targetRow + 1} 行...`)

        if (CONFIG.actionMode === 'select_row') {

          const checkboxClicked = await page.evaluate((rowIndex) => {
            const trs = [...document.querySelectorAll('tbody tr')]
            if (rowIndex >= trs.length) return { success: false }

            const tr = trs[rowIndex]
            const firstTd = tr.querySelector('td')

            if (firstTd) {

              const checkbox = firstTd.querySelector('input[type="checkbox"]')
              if (checkbox) {
                checkbox.click()
                return { success: true }
              }


              firstTd.click()
              return { success: true }
            }

            return { success: false }
          }, targetRow)

          if (checkboxClicked) {
            console.log(`      ✓ 已选中行`)
            successCount++
          } else {
            console.log(`      ❌ 未找到复选框`)
            errorCount++
          }

          await sleep(500)

        } else {


          const buttonClicked = await page.evaluate((rowIndex, bidIndex) => {
            const trs = [...document.querySelectorAll('tbody tr')]
            if (rowIndex >= trs.length) return { success: false }

            const tr = trs[rowIndex]
            const tds = tr.querySelectorAll('td')

            if (bidIndex >= 0 && bidIndex < tds.length) {
              const bidTd = tds[bidIndex]
              const button = bidTd.querySelector('button')
              if (button) {
                button.click()
                return { success: true }
              }
            }

            for (let i = 0; i < tds.length; i++) {
              const buttons = tds[i].querySelectorAll('button')
              for (const btn of buttons) {
                if (btn.textContent.includes('edit') || btn.innerHTML.includes('edit')) {
                  btn.click()
                  return { success: true }
                }
              }
            }

            return { success: false }
          }, targetRow, currentPageInfo.bidColumnIndex)

          if (!buttonClicked.success) {
            console.log(`      ❌ 未找到 Bid 列的 button`)
            errorCount++
            continue
          }

          await sleep(1000)


          const editBidClicked = await page.evaluate(() => {
            const spans = [...document.querySelectorAll('span')]
            for (const span of spans) {
              if (span.textContent.includes('Edit Bid')) {
                span.click()
                return true
              }
            }
            return false
          })

          if (!editBidClicked) {
            console.log('      ⚠️ 未找到 Edit Bid span，继续尝试')
          }
          await sleep(1000)


          const inputs = await page.$$('input[type="number"]')
          if (inputs.length > 0) {
            await inputs[0].click()
            await inputs[0].click({ clickCount: 3 })
            await page.keyboard.press('Backspace')
            await sleep(200)
            await inputs[0].type(CONFIG.newBidValue)
            console.log(`      ✓ 已修改 Bid 为 ${CONFIG.newBidValue}`)
          } else {
            console.log('      ⚠️ 未找到 number 类型输入框')
            errorCount++
            await page.keyboard.press('Escape')
            await sleep(500)
            continue
          }

          await sleep(500)


          await page.keyboard.press('Enter')
          console.log('      ✓ 已保存')

          await sleep(1000)
          successCount++
        }
      }


      const hasNextSubPage = await page.evaluate(() => {
        const nextButtons = [...document.querySelectorAll('button')]
          .filter(btn => {
            const icon = btn.querySelector('nb-icon[icon="keyboard_arrow_right"], .keyboard_arrow_right, [class*="keyboard_arrow_right"]')
            if (!icon) return false
            const ariaDisabled = btn.getAttribute('aria-disabled')
            const disabled = btn.disabled
            return ariaDisabled !== 'true' && !disabled
          })
        return nextButtons.length > 0
      })

      if (!hasNextSubPage) {
        console.log(`    子数据处理完成，共 ${subPageNum} 页`)
        break
      }


      const nextClicked = await page.evaluate(() => {
        const nextButton = [...document.querySelectorAll('button')]
          .find(btn => {
            const icon = btn.querySelector('nb-icon[icon="keyboard_arrow_right"], .keyboard_arrow_right, [class*="keyboard_arrow_right"]')
            if (!icon) return false
            const ariaDisabled = btn.getAttribute('aria-disabled')
            const disabled = btn.disabled
            return ariaDisabled !== 'true' && !disabled
          })

        if (nextButton) {
          nextButton.click()
          return true
        }
        return false
      })

      if (!nextClicked) {
        console.log(`    无法点击下一页，结束`)
        break
      }

      subPageNum++
      await sleep(3000)
    }


    await goBackToList(page)

    return {
      success: successCount > 0,
      skipped: successCount === 0,
      message: successCount > 0
        ? `已修改 ${successCount} 行` + (errorCount > 0 ? `，失败 ${errorCount} 行` : '')
        : `未找到 ${CONFIG.targetCpcColumn} = ${CONFIG.targetCpcValue}`,
      processedCount: successCount,
      errorCount: errorCount
    }

  } catch (error) {
    console.error(`    ❌ 处理出错: ${error.message}`)
    try {
      await goBackToList(page)
    } catch (e) {}
    return {
      success: false,
      skipped: false,
      message: `错误: ${error.message}`,
      processedCount: 0
    }
  }
}

/**
 * 返回到 Campaign 列表页
 * 点击左上角的返回按钮 (a 元素，href="/ad/campaigns")
 */
async function goBackToList(page) {
  await sleep(500)


  const backClicked = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')]
    for (const link of links) {
      const href = link.getAttribute('href') || ''
      if (href === '/ad/campaigns' || href.includes('/ad/campaigns')) {
        link.click()
        return true
      }
    }
    return false
  })

  if (backClicked) {
    await sleep(2000)
    return
  }

  console.log('    ⚠️ 未找到返回按钮，尝试浏览器后退')
  try {
    await page.goBack()
    await sleep(2000)
  } catch (e) {
    console.log('    ⚠️ 无法返回列表页')
  }
}

/**
 * 获取当前页的 Campaign 数量
 */
async function getCampaignCount(page) {
  return await page.evaluate(() => {
    const trs = [...document.querySelectorAll('tbody tr')]
    return trs.length
  })
}

/**
 * 检查是否有下一页
 * 通过查找包含 keyboard_arrow_right 图标的按钮
 */
async function hasNextPage(page) {
  return await page.evaluate(() => {

    const nextButtons = [...document.querySelectorAll('button')]
      .filter(btn => {

        const icon = btn.querySelector('nb-icon[icon="keyboard_arrow_right"], .keyboard_arrow_right, [class*="keyboard_arrow_right"]')
        if (!icon) return false


        const ariaDisabled = btn.getAttribute('aria-disabled')
        const disabled = btn.disabled
        return ariaDisabled !== 'true' && !disabled
      })

    return nextButtons.length > 0
  })
}

/**
 * 点击下一页
 * 点击包含 keyboard_arrow_right 图标的按钮
 */
async function clickNextPage(page) {
  const clicked = await page.evaluate(() => {

    const nextButton = [...document.querySelectorAll('button')]
      .find(btn => {
        const icon = btn.querySelector('nb-icon[icon="keyboard_arrow_right"], .keyboard_arrow_right, [class*="keyboard_arrow_right"]')
        if (!icon) return false

        const ariaDisabled = btn.getAttribute('aria-disabled')
        const disabled = btn.disabled
        return ariaDisabled !== 'true' && !disabled
      })

    if (nextButton) {
      nextButton.click()
      return true
    }

    return false
  })

  if (clicked) {
    await sleep(3000)
    return true
  }

  return false
}

async function run() {
  let browser = null

  try {
    console.log('[启动] 启动浏览器...')
    browser = await puppeteer.launch({
      executablePath: CONFIG.chromePath,
      headless: CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        `--window-size=${CONFIG.windowSize}`,
        '--window-position=100,100'
      ]
    })

    const page = await browser.newPage()


    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })

      window.chrome = {
        runtime: {}
      }

      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      )
    })


    await page.setViewport({ width: windowWidth, height: windowHeight })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')


    console.log('[登录] 正在登录...')
    await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 60000 })
    await sleep(3000)

    await page.type('input[name="username"]', CONFIG.username)
    await sleep(500)

    const passwordInputs = await page.$$('input[type="password"]')
    if (passwordInputs.length > 0) {
      await passwordInputs[0].click()
      await page.keyboard.type(CONFIG.password)
    }

    const loginClicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')]
      const btn = buttons.find(el => el.textContent.includes('Sign'))
      if (btn) {
        btn.click()
        return true
      }
      return false
    })

    if (!loginClicked) {
      await page.keyboard.press('Enter')
    }
    console.log('  ✅ 登录完成')
    await sleep(8000)


    console.log('[导航] 点击 "Advertiser Campaigns" 菜单...')
    const menuClicked = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('a, button, span, div')]
      const menu = elements.find(el => el.textContent && el.textContent.trim() === 'Advertiser Campaigns')
      if (menu) {
        menu.click()
        return true
      }
      return false
    })

    if (menuClicked) console.log('  ✅ 已点击')
    await sleep(5000)


    if (CONFIG.filterStatusSequence.length > 0) {
      console.log(`[筛选] 按顺序点击按钮: ${CONFIG.filterStatusSequence.join(' → ')}`)
      for (const status of CONFIG.filterStatusSequence) {
        console.log(`[筛选] 点击 "${status}" 按钮...`)
        const clicked = await page.evaluate((buttonText) => {
          const buttons = [...document.querySelectorAll('button')]
          const btn = buttons.find(el => el.textContent && el.textContent.trim() === buttonText)
          if (btn) {
            btn.click()
            return true
          }
          return false
        }, status)
        if (!clicked) {
          console.log(`  ⚠️ 未找到 "${status}" 按钮`)
        }
        await sleep(1000)
      }
      console.log('  ✅ 筛选完成')
      await sleep(3000)
    } else {
      console.log('[筛选] 跳过状态筛选（未配置）')
    }


    console.log('\n' + '='.repeat(50))
    console.log('[开始] 遍历所有 Campaign 并处理')
    console.log('='.repeat(50))

    let currentPageNum = 1

    while (true) {
      console.log(`\n【第 ${currentPageNum} 页】`)


      const campaignCount = await getCampaignCount(page)
      console.log(`当前页共有 ${campaignCount} 个 Campaign`)

      if (campaignCount === 0) {
        console.log('  当前页没有 Campaign，跳过')
      }


      for (let i = 0; i < campaignCount; i++) {
        stats.totalCampaigns++


        const campaignInfo = await page.evaluate((rowIndex) => {
          const trs = [...document.querySelectorAll('tbody tr')]
          if (rowIndex >= trs.length) return { name: 'Unknown' }
          const tr = trs[rowIndex]
          const tds = tr.querySelectorAll('td')

          const name = tds.length > 1 ? tds[1].textContent.trim() : `Campaign ${rowIndex + 1}`
          return { name }
        }, i)

        const campaignName = campaignInfo.name


        const result = await processCampaign(page, i, campaignName)

        stats.processedCampaigns++


        stats.details.push({
          campaignName: campaignName,
          success: result.success,
          skipped: result.skipped,
          message: result.message
        })

        if (result.success) {
          stats.successCount++
        } else if (result.skipped) {
          stats.skippedCount++
        } else {
          stats.errorCount++
        }


        await sleep(1000)
      }

      stats.totalPages = currentPageNum


      const hasNext = await hasNextPage(page)
      if (hasNext) {
        console.log(`\n[翻页] 第 ${currentPageNum} 页处理完成，正在进入下一页...`)
        const nextClicked = await clickNextPage(page)
        if (nextClicked) {
          currentPageNum++
        } else {
          console.log('  ⚠️ 无法点击下一页，结束')
          break
        }
      } else {
        console.log(`\n[完成] 第 ${currentPageNum} 页是最后一页，处理完成`)
        break
      }
    }


    printStats()

    console.log('[等待] 浏览器将保持打开 30 秒...')
    await sleep(30000)

  } catch (error) {
    console.error('[错误]', error.message)
    console.error(error.stack)
  } finally {
    if (browser) {
      console.log('[关闭] 关闭浏览器...')
      await browser.close()
    }
  }
}

run().catch(console.error)
