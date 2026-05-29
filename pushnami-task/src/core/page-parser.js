/**
 * 页面数据解析器
 * 从 Pushnami 页面提取 Campaign 和 Source 数据
 */
const { logger } = require('../utils/logger.js')


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class PageParser {
  /**
   * 获取当前 Campaign 列表页的数据
   * @param {Page} page - Puppeteer Page 对象
   * @returns {Promise<Array>} Campaign 列表
   */
  static async getCampaignList(page) {
    const campaigns = await page.evaluate(() => {
      const trs = [...document.querySelectorAll('tbody tr')]
      return trs.map((tr, index) => {
        const tds = tr.querySelectorAll('td')


        const getName = () => tds[1]?.textContent?.trim() || ''


        const getColumnIndex = (headerClass) => {
          const ths = document.querySelectorAll('th')
          for (let i = 0; i < ths.length; i++) {
            if (ths[i].classList.contains(headerClass)) {
              return i
            }
          }
          return -1
        }


        const getSpent = () => {
          const spentIndex = getColumnIndex('nb-column-spent')
          if (spentIndex >= 0 && tds[spentIndex]) {
            const text = tds[spentIndex].textContent.trim()
            return parseFloat(text.replace(/[$,]/g, '')) || 0
          }
          return 0
        }


        const getCpa = () => {
          const cpaIndex = getColumnIndex('nb-column-cpa')
          if (cpaIndex >= 0 && tds[cpaIndex]) {
            const text = tds[cpaIndex].textContent.trim()
            return parseFloat(text.replace(/[$,]/g, '')) || 0
          }
          return 0
        }


        const getConversions = () => {
          const convIndex = getColumnIndex('nb-column-conversions')
          if (convIndex >= 0 && tds[convIndex]) {
            const text = tds[convIndex].textContent.trim()
            return parseInt(text) || 0
          }
          return 0
        }

        return {
          rowIndex: index,
          name: getName(),
          spent: getSpent(),
          cpa: getCpa(),
          conversions: getConversions()
        }
      })
    })

    return campaigns
  }

  /**
   * 获取当前 Source 列表页的数据（Campaign 详情页）
   * @param {Page} page
   * @returns {Promise<Array>} Source 列表
   */
  static async getSourceList(page) {
    return await this._getSourceListInner(page)
  }

  /**
   * 内部方法：获取 Source 列表
   */
  static async _getSourceListInner(page) {
    const sources = await page.evaluate(() => {
      const trs = [...document.querySelectorAll('tbody tr')]
      return trs.map((tr, index) => {
        const tds = tr.querySelectorAll('td')


        const getId = () => {

          const copyButton = tr.querySelector('button[nbtooltip="Click to copy"]')
          if (copyButton) {
            const buttonId = copyButton.textContent?.trim()
            if (buttonId && buttonId.startsWith('S')) {
              return buttonId
            }
          }


          const allButtons = tr.querySelectorAll('button')
          for (const btn of allButtons) {
            const text = btn.textContent?.trim()
            if (text && /^S\d+$/i.test(text)) {
              return text
            }
          }


          const firstCell = tds[0]?.textContent?.trim()
          if (firstCell && /^S?\d+$/i.test(firstCell)) return firstCell


          const rowId = tr.getAttribute('data-id') || tr.getAttribute('data-row-id')
          if (rowId) return rowId


          console.warn(`无法获取真实的 Source ID，使用行索引: source_${index}`)
          return `source_${index}`
        }

        const getName = () => tds[1]?.textContent?.trim() || ''
        const getCpa = () => {
          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]
            if (th && th.textContent.includes('CPA')) {
              const text = tds[i].textContent.trim()
              return parseFloat(text.replace(/[$,]/g, '')) || 0
            }
          }
          return 0
        }

        const getCpc = () => {
          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]
            if (th && th.textContent.includes('CPC')) {
              const text = tds[i].textContent.trim()
              return parseFloat(text.replace(/[$,]/g, '')) || 0
            }
          }
          return 0
        }

        const getCurrentBid = () => {
          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]
            if (th && (th.textContent.includes('Bid') || th.textContent.includes('Max Bid'))) {
              const text = tds[i].textContent.trim()
              return parseFloat(text.replace(/[$,]/g, '')) || 0
            }
          }
          return 0
        }

        const getSpend = () => {
          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]
            if (th && (th.textContent.includes('Spend') || th.textContent.includes('Cost'))) {
              const text = tds[i].textContent.trim()
              return parseFloat(text.replace(/[$,]/g, '')) || 0
            }
          }
          return 0
        }

        const getConversions = () => {
          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]

            if (th && (th.textContent.includes('Conversions') ||
                       th.classList.contains('nb-column-conversions') ||
                       th.getAttribute('class')?.includes('conversions'))) {
              const text = tds[i].textContent.trim()
              const value = parseInt(text) || 0
              return value
            }
          }
          return 0
        }

        const getClicks = () => {
          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]

            if (th && (th.textContent.includes('Clicks') ||
                       th.textContent.includes('clicks') ||
                       th.classList.contains('nb-column-clicks') ||
                       th.classList.contains('cdk-column-clicks') ||
                       th.getAttribute('class')?.includes('clicks'))) {
              const text = tds[i].textContent.trim()
              const value = parseInt(text) || 0
              return value
            }
          }
          return 0
        }

        const getSpent = () => {
          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]

            if (th && (th.textContent.includes('Spent') ||
                       th.textContent.includes('spent') ||
                       th.classList.contains('nb-column-spent') ||
                       th.classList.contains('cdk-column-spent') ||
                       th.getAttribute('class')?.includes('spent'))) {
              const text = tds[i].textContent.trim()

              return parseFloat(text.replace(/[$,]/g, '')) || 0
            }
          }
          return 0
        }

        return {
          rowIndex: index,
          id: getId(),
          name: getName(),
          cpa: getCpa(),
          cpc: getCpc(),
          currentBid: getCurrentBid(),
          spend: getSpend(),
          conversions: getConversions(),
          clicks: getClicks(),
          spent: getSpent()
        }
      })
    })

    return sources
  }

  /**
   * 获取 Campaign 详情页的顶部指标
   * 包括: Daily Spend Limit, Target CPA
   * @param {Page} page
   * @returns {Promise<Object>}
   */
  static async getCampaignMetrics(page) {
    const metrics = await page.evaluate(() => {
      const result = {
        dailySpendLimit: null,
        targetCpa: null,
        totalSpend: null
      }


      const targetCpaField = [...document.querySelectorAll('pn-form-field')]
        .find(field => field.getAttribute('name') === 'Target CPA')

      if (targetCpaField) {

        const inlineEditor = targetCpaField.querySelector('pn-inline-editor')
        if (inlineEditor) {
          const valueDiv = inlineEditor.querySelector('div.flex')
          if (valueDiv) {
            const text = valueDiv.childNodes[0]?.textContent || valueDiv.textContent || ''

            const match = text.match(/[\d.]+/)
            if (match) {
              result.targetCpa = parseFloat(match[0])
            }
          }
        }
      }


      if (result.targetCpa === null) {
        const allLabels = [...document.querySelectorAll('label')]
        const targetCpaLabel = allLabels.find(label => {
          const labelText = label.textContent || ''
          return labelText.includes('Target CPA')
        })

        if (targetCpaLabel) {

          const parent = targetCpaLabel.parentElement
          if (parent) {
            const inlineEditor = parent.querySelector('pn-inline-editor')
            if (inlineEditor) {
              const text = inlineEditor.textContent || ''
              const match = text.match(/[\d.]+/)
              if (match) {
                result.targetCpa = parseFloat(match[0])
              }
            }
          }
        }
      }


      if (result.targetCpa === null) {
        const allText = document.body.innerText
        const tcpaMatch = allText.match(/Target CPA[:\s]*[$]?([\d.]+)/i)
        if (tcpaMatch) {
          result.targetCpa = parseFloat(tcpaMatch[1])
        }
      }


      const dailySpendField = [...document.querySelectorAll('pn-form-field')]
        .find(field => {
          const name = field.getAttribute('name') || ''
          return name.includes('Daily Spend') || name.includes('Spend Limit')
        })

      if (dailySpendField) {
        const inlineEditor = dailySpendField.querySelector('pn-inline-editor')
        if (inlineEditor) {
          const text = inlineEditor.textContent || ''
          const match = text.match(/[\d.]+/)
          if (match) {
            result.dailySpendLimit = parseFloat(match[0])
          }
        }
      }

      return result
    })

    return metrics
  }

  /**
   * 检查是否有下一页（Campaign 或 Source 列表）
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  static async hasNextPage(page) {
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
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  static async clickNextPage(page) {
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

    return clicked
  }

  /**
   * 对 Conversions 列进行正序排序（从大到小）
   * 循环点击直到图标变成 arrow_upward，并等待数据加载完成
   * @param {Page} page
   * @returns {Promise<Object>} { sorted: boolean, currentState: string }
   */
  static async sortConversionDescending(page) {
    let clickCount = 0
    const maxClicks = 3


    const getDataSnapshot = async () => {
      return await page.evaluate(() => {
        const rows = [...document.querySelectorAll('tbody tr')]
        return rows.map(row => {
          const cells = row.querySelectorAll('td')

          for (let i = 0; i < cells.length; i++) {
            const header = document.querySelectorAll('th')[i]?.textContent
            if (header && header.includes('Conversions')) {
              return {
                id: row.getAttribute('id') || row.innerText.slice(0, 50),
                conversions: cells[i].textContent.trim()
              }
            }
          }
          return null
        }).filter(Boolean)
      })
    }

    for (let i = 0; i < maxClicks; i++) {

      const currentState = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find(el => el.textContent.includes('Conversions'))

        if (!btn) {
          return { found: false, icon: null }
        }

        const icon = btn.querySelector('nb-icon')?.textContent?.trim()
        return { found: true, icon }
      })

      if (!currentState.found) {
        return {
          success: false,
          reason: '未找到 Conversions 按钮',
          clickCount: clickCount
        }
      }


      if (currentState.icon === 'arrow_upward') {
        return {
          success: true,
          sorted: true,
          alreadySorted: true,
          currentState: 'ascending',
          clickCount: clickCount,
          finalIcon: currentState.icon
        }
      }


      const beforeSnapshot = await getDataSnapshot()


      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find(el => el.textContent.includes('Conversions'))
        if (btn) btn.click()
      })

      clickCount++


      await page.waitForFunction(
        (beforeIcon) => {
          const btn = [...document.querySelectorAll('button')]
            .find(el => el.textContent.includes('Conversions'))
          if (!btn) return false
          const icon = btn.querySelector('nb-icon')?.textContent?.trim()
          return icon !== beforeIcon
        },
        { timeout: 3000 },
        currentState.icon
      ).catch(() => {

      })


      let dataLoaded = false
      for (let waitAttempt = 0; waitAttempt < 10; waitAttempt++) {
        await new Promise(resolve => setTimeout(resolve, 500))


        const hasLoadingSpinner = await page.evaluate(() => {

          const loaders = [
            document.querySelector('.spinner'),
            document.querySelector('.loading'),
            document.querySelector('[class*="loading"]'),
            document.querySelector('[class*="spinner"]'),
            document.querySelector('.mat-progress-spinner'),
            document.querySelector('ngx-datatable .loading')
          ]
          return loaders.some(el => el && el.offsetParent !== null)
        })

        if (hasLoadingSpinner) {
          continue // 还在加载
        }


        const afterSnapshot = await getDataSnapshot()
        const dataChanged = JSON.stringify(beforeSnapshot) !== JSON.stringify(afterSnapshot)

        if (dataChanged) {

          await new Promise(resolve => setTimeout(resolve, 500))
          dataLoaded = true
          break
        }


        if (waitAttempt >= 5) {
          dataLoaded = true
          break
        }
      }

      if (dataLoaded) {

        const finalIconCheck = await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')]
            .find(el => el.textContent.includes('Conversions'))
          if (!btn) return null
          return btn.querySelector('nb-icon')?.textContent?.trim()
        })

        if (finalIconCheck === 'arrow_upward') {
          return {
            success: true,
            sorted: true,
            alreadySorted: false,
            currentState: 'ascending',
            clickCount: clickCount,
            finalIcon: finalIconCheck
          }
        }
      }
    }


    const finalState = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(el => el.textContent.includes('Conversions'))
      if (!btn) return { icon: null }
      const icon = btn.querySelector('nb-icon')?.textContent?.trim()
      return { icon }
    })

    return {
      success: finalState.icon === 'arrow_upward',
      reason: finalState.icon === 'arrow_upward' ? '成功' : `最终图标状态: ${finalState.icon || '未找到'}`,
      sorted: finalState.icon === 'arrow_upward',
      alreadySorted: false,
      currentState: finalState.icon === 'arrow_upward' ? 'ascending' : finalState.icon || 'unknown',
      clickCount: clickCount,
      finalIcon: finalState.icon
    }
  }

  /**
   * 对 Spent 列进行正序排序（从大到小）
   * 检查图标状态，如果是倒序(arrow_downward)则点击一次变为正序
   * @param {Page} page
   * @returns {Promise<Object>} { success: boolean, alreadySorted: boolean }
   */
  static async sortSpentDescending(page) {

    const currentState = await page.evaluate(() => {

      const sortButton = document.querySelector('pn-sort-button[field="spent"]')
      if (!sortButton) {
        return { found: false, icon: null }
      }

      const icon = sortButton.querySelector('nb-icon')?.textContent?.trim()
      return { found: true, icon }
    })

    if (!currentState.found) {
      return {
        success: false,
        reason: '未找到 Spent 排序按钮'
      }
    }


    if (currentState.icon === 'arrow_upward') {
      return {
        success: true,
        alreadySorted: true,
        message: 'Spent 已经是正序状态（从大到小）'
      }
    }


    if (currentState.icon === 'arrow_downward') {
      await page.evaluate(() => {
        const sortButton = document.querySelector('pn-sort-button[field="spent"] button')
        if (sortButton) {
          sortButton.click()
        }
      })


      await page.waitForFunction(
        () => {
          const icon = document.querySelector('pn-sort-button[field="spent"] nb-icon')?.textContent?.trim()
          return icon === 'arrow_upward'
        },
        { timeout: 5000 }
      ).catch(() => {

      })


      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        success: true,
        alreadySorted: false,
        message: 'Spent 已排序为正序（从大到小）'
      }
    }

    return {
      success: false,
      reason: `未知的图标状态: ${currentState.icon}`
    }
  }

  /**
   * 返回 Campaign 列表页
   * @param {Page} page
   */
  static async goBackToCampaigns(page) {
    await page.evaluate(() => {
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
    await sleep(2000)
  }

  /**
   * 回到第一页（通过连续点击上一页按钮直到禁用）
   * @param {Page} page
   * @returns {Promise<Object>} { wasOnFirstPage: boolean, success: boolean }
   * - wasOnFirstPage: 是否原本就在第一页（没有进行翻页操作）
   * - success: 是否成功回到第一页
   */
  static async goToFirstPage(page) {
    let clickCount = 0
    const maxClicks = 50 // 最多点击50次，防止无限循环


    const wasOnFirstPage = await page.evaluate(() => {
      const prevButton = [...document.querySelectorAll('button')]
        .find(btn => {
          const icon = btn.querySelector('nb-icon[icon="keyboard_arrow_left"], .keyboard_arrow_left, [class*="keyboard_arrow_left"]')
          return icon !== null
        })
      if (!prevButton) return true // 没有上一页按钮，说明只有一页

      const ariaDisabled = prevButton.getAttribute('aria-disabled')
      const disabled = prevButton.disabled
      return ariaDisabled === 'true' || disabled === true
    })

    for (let i = 0; i < maxClicks; i++) {

      const isFirstPage = await page.evaluate(() => {
        const prevButton = [...document.querySelectorAll('button')]
          .find(btn => {
            const icon = btn.querySelector('nb-icon[icon="keyboard_arrow_left"], .keyboard_arrow_left, [class*="keyboard_arrow_left"]')
            return icon !== null
          })
        if (!prevButton) return true // 没有上一页按钮，说明只有一页或已在第一页

        const ariaDisabled = prevButton.getAttribute('aria-disabled')
        const disabled = prevButton.disabled
        return ariaDisabled === 'true' || disabled === true
      })

      if (isFirstPage) {
        logger.info('已回到第一页')
        await sleep(1000)
        return { wasOnFirstPage, success: true }
      }


      const clicked = await page.evaluate(() => {
        const prevButton = [...document.querySelectorAll('button')]
          .find(btn => {
            const icon = btn.querySelector('nb-icon[icon="keyboard_arrow_left"], .keyboard_arrow_left, [class*="keyboard_arrow_left"]')
            if (!icon) return false
            const ariaDisabled = btn.getAttribute('aria-disabled')
            const disabled = btn.disabled
            return ariaDisabled !== 'true' && !disabled
          })

        if (prevButton) {
          prevButton.click()
          return true
        }
        return false
      })

      if (!clicked) {
        logger.warning('无法点击上一页按钮，可能已在第一页')
        return { wasOnFirstPage, success: true }
      }

      clickCount++
      await sleep(1500) // 等待翻页完成
    }

    logger.warning(`已点击上一页 ${clickCount} 次，仍未回到第一页`)
    return { wasOnFirstPage, success: false }
  }

  /**
   * 检查当前 Campaign 列表的筛选和排序状态
   * @param {Page} page
   * @returns {Promise<Object>} { isActive: boolean, isToday: boolean, sortAscending: boolean }
   */
  static async checkCampaignPageState(page) {
    return await page.evaluate(() => {

      let isActive = false
      const statusButtons = [...document.querySelectorAll('button[nbbuttontoggle]')]
      for (const btn of statusButtons) {
        const text = btn.textContent?.trim()
        const ariaPressed = btn.getAttribute('aria-pressed')
        const statusClass = btn.className
        if (text === 'Active' && (ariaPressed === 'true' || statusClass.includes('status-primary'))) {
          isActive = true
          break
        }
      }


      let isToday = false
      const selectButton = document.querySelector('nb-select button.select-button')
      if (selectButton) {
        const currentText = selectButton.textContent?.trim() || ''
        isToday = currentText === 'Today'
      }


      let sortAscending = false
      const convButton = [...document.querySelectorAll('button')]
        .find(el => el.textContent.includes('Conversions'))
      if (convButton) {
        const icon = convButton.querySelector('nb-icon')?.textContent?.trim()
        sortAscending = icon === 'arrow_upward'
      }

      return { isActive, isToday, sortAscending }
    })
  }

  /**
   * 刷新当前页面
   * @param {Page} page
   */
  static async refreshPage(page) {
    await page.evaluate(() => {
      window.location.reload()
    })
    await sleep(3000)
  }
}

module.exports = PageParser
