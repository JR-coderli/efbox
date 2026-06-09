/**
 * 导航器模块
 * 负责遍历 Campaign 和 Source，执行回调函数
 */
const PageParser = require('./page-parser.js')
const { logger } = require('../utils/logger.js')

class Navigator {
  constructor(page) {
    this.page = page
    this.currentCampaignMetrics = null // 当前 Campaign 的指标（Target CPA 等）
  }

  /**
   * 遍历所有 Campaign（包括分页）
   * @param {Function} callback - 对每个 Campaign 执行的回调函数
   * @returns {Promise<Object>} 统计信息
   */
  async traverseCampaigns(callback) {
    logger.info('开始遍历所有 Campaign...')

    const stats = {
      totalCampaigns: 0,
      processedCampaigns: 0,
      skippedCampaigns: 0,
      errors: 0,
      totalPages: 0
    }


    await this._applyCampaignFilters()


    logger.info('验证当前页面状态...')
    const finalState = await PageParser.checkCampaignPageState(this.page)
    logger.info(`当前状态: Active=${finalState.isActive}, Today=${finalState.isToday}`)


    if (!finalState.isActive || !finalState.isToday) {
      logger.warning('筛选状态不正确，重新应用筛选条件...')
      await this._applyCampaignFilters()
      await this.sleep(2000)
    }


    const confirmedState = await PageParser.checkCampaignPageState(this.page)
    if (confirmedState.isActive && confirmedState.isToday) {
      logger.success('状态验证通过: Active + Today，开始执行任务')
    } else {
      logger.warning(`状态验证未完全通过，但继续执行: Active=${confirmedState.isActive}, Today=${confirmedState.isToday}`)
    }

    let currentPageNum = 1

    while (true) {
      logger.info(`\n--- 第 ${currentPageNum} 页 ---`)


      const campaigns = await PageParser.getCampaignList(this.page)
      stats.totalCampaigns += campaigns.length
      stats.totalPages = currentPageNum

      logger.info(`当前页有 ${campaigns.length} 个 Campaign`)


      for (let i = 0; i < campaigns.length; i++) {
        const campaign = campaigns[i]
        logger.blank()
        logger.info(`[Campaign ${i + 1}/${campaigns.length}] ${campaign.name} (campaign spent: $${campaign.spent}, Conversions: ${campaign.conversions})`)

        try {

          const enterResult = await this._enterCampaign(campaign.rowIndex)


          if (enterResult.hasNoSources) {
            stats.skippedCampaigns++
            continue
          }


          const result = await callback(campaign)

          if (result.skipped) {
            stats.skippedCampaigns++
          } else {
            stats.processedCampaigns++
          }

          if (result.error) {
            stats.errors++
          }


          await this._exitCampaign()

        } catch (error) {

          if (error.message === 'TASK_STOPPED') {
            logger.warning('收到停止信号，中断 Campaign 遍历')
            try {
              await this._exitCampaign()
            } catch (e) {}
            throw error  // 重新抛出停止信号
          }
          logger.error(`处理 Campaign 失败: ${error.message}`)
          stats.errors++
          try {
            await this._exitCampaign()
          } catch (e) {}
        }
      }


      const hasNext = await PageParser.hasNextPage(this.page)
      if (hasNext) {
        logger.info(`\n翻页到第 ${currentPageNum + 1} 页...`)
        await PageParser.clickNextPage(this.page)
        await this.sleep(3000)
        currentPageNum++
      } else {
        logger.info('\n所有 Campaign 遍历完成')
        break
      }
    }

    return stats
  }

  /**
   * 遍历指定 Campaign 的所有 Source（包括分页）
   * @param {Function} callback - 对每个 Source 执行的回调函数
   * @returns {Promise<Object>} 统计信息
   */
  async traverseSources(callback) {
    logger.info('开始遍历当前 Campaign 的所有 Source...')


    const targetCpa = this.currentCampaignMetrics?.targetCpa
    if (targetCpa !== null && targetCpa !== undefined) {
      logger.info(`  Target CPA: $${targetCpa.toFixed(2)}`)
      logger.info(`  跳过逻辑: Source Spent <= Target CPA ($${targetCpa.toFixed(2)}) 时跳过`)
    } else {
      logger.warning('  未获取到 Target CPA，将不进行跳过')
    }


    logger.info('  正在对 Spent 列进行正序排序（从大到小）...')
    const sortResult = await PageParser.sortSpentDescending(this.page)
    if (sortResult.success) {
      logger.success(`  ${sortResult.message}`)
    } else {
      logger.warning(`  排序失败: ${sortResult.reason}`)
    }

    const stats = {
      totalSources: 0,
      processedSources: 0,
      skippedSources: 0,
      errors: 0,
      totalPages: 0
    }

    let currentPageNum = 1
    let shouldStopAll = false  // 全局停止标志

    while (true) {
      logger.info(`  --- Source 第 ${currentPageNum} 页 ---`)


      const sources = await PageParser.getSourceList(this.page)
      stats.totalSources += sources.length
      stats.totalPages = currentPageNum

      logger.info(`  当前页有 ${sources.length} 个 Source`)


      for (let i = 0; i < sources.length; i++) {
        const source = sources[i]
        logger.blank()
        logger.source(`Source ${i + 1}/${sources.length}: ID=${source.id}, Spent=$${source.spent}, Conversions=${source.conversions}, Clicks=${source.clicks}, CPA=${source.cpa}, Bid=${source.currentBid}`)


        if (targetCpa !== null && targetCpa !== undefined && source.spent <= targetCpa) {
          logger.info(`  Source Spent = $${source.spent} (<= Target CPA $${targetCpa.toFixed(2)}), 跳过剩余所有 Source(降序排序后后续都 <= $${targetCpa.toFixed(2)})`)
          shouldStopAll = true
          break
        }

        try {

          const sourceWithMetrics = {
            ...source,
            targetCpa: targetCpa
          }
          const result = await callback(sourceWithMetrics)

          if (result.skipped) {
            stats.skippedSources++
          } else {
            stats.processedSources++
          }

          if (result.error) {
            stats.errors++
          }

        } catch (error) {

          if (error.message === 'TASK_STOPPED') {
            logger.warning('收到停止信号，中断 Source 遍历')
            throw error  // 重新抛出停止信号
          }
          logger.error(`处理 Source 失败: ${error.message}`)
          stats.errors++
        }
      }


      if (shouldStopAll) {
        logger.info(`  因 Spent <= Target CPA ($${targetCpa?.toFixed(2)}), 提前结束 Source 遍历`)
        break
      }


      const hasNext = await PageParser.hasNextPage(this.page)
      if (hasNext) {
        await PageParser.clickNextPage(this.page)
        await this.sleep(3000)
        currentPageNum++
      } else {
        logger.info('  所有 Source 遍历完成')
        break
      }
    }

    return stats
  }

  /**
   * 应用 Campaign 筛选条件
   * 1. 确保选中 Active 状态
   * 2. 确保其他状态不选中
   * 3. 选择 Today 时间范围
   */
  async _applyCampaignFilters() {
    logger.info('正在应用 Campaign 筛选条件...')
    await this.sleep(2000)


    const statusResult = await this.page.evaluate(() => {
      const actions = []
      const statusButtons = [...document.querySelectorAll('button[nbbuttontoggle]')]

      for (const btn of statusButtons) {
        const text = btn.textContent?.trim()
        const ariaPressed = btn.getAttribute('aria-pressed')
        const statusClass = btn.className

        if (text === 'Active') {

          if (ariaPressed !== 'true' || !statusClass.includes('status-primary')) {
            actions.push({ action: 'click', type: 'Active', reason: '需要选中' })
            btn.click()
          }
        } else if (text === 'Paused' || text === 'Pending' || text === 'Archived') {

          if (ariaPressed === 'true' || statusClass.includes('status-primary')) {
            actions.push({ action: 'click', type: text, reason: '需要取消选中' })
            btn.click()
          }
        }
      }

      return {
        actions,
        statusButtonsFound: statusButtons.length
      }
    })

    logger.info(`状态筛选操作: ${JSON.stringify(statusResult.actions)}`)
    await this.sleep(1000)


    const timeResult = await this.page.evaluate(() => {
      const selectButton = document.querySelector('nb-select button.select-button')
      if (selectButton) {
        const currentText = selectButton.textContent?.trim() || ''
        return { found: true, current: currentText, isToday: currentText === 'Today' }
      }
      return { found: false, current: null, isToday: false }
    })

    if (timeResult.found && !timeResult.isToday) {
      logger.info(`当前时间选择: ${timeResult.current}，需要改为 Today`)


      await this.page.click('nb-select button.select-button')
      await this.sleep(500)


      const todayClicked = await this.page.evaluate(() => {
        const todayOption = [...document.querySelectorAll('nb-option')].find(opt => {
          const text = opt.textContent?.trim()
          return text === 'Today'
        })

        if (todayOption) {
          todayOption.click()
          return true
        }
        return false
      })

      if (todayClicked) {
        logger.success('已选择 Today')
      } else {
        logger.warning('未找到 Today 选项')
      }
    } else if (timeResult.found && timeResult.isToday) {
      logger.info('时间筛选已经是 Today')
    } else {
      logger.warning('未找到时间选择下拉框')
    }


    await this.sleep(3000)

    logger.success('Campaign 筛选已应用: Active + Today')
  }

  /**
   * 进入 Campaign 详情页
   * 等待页面加载完成后再返回
   * 返回值：{ hasNoSources: boolean } - 如果 hasNoSources 为 true 表示该 Campaign 没有 Source
   */
  async _enterCampaign(rowIndex) {
    await this.sleep(1000)

    await this.page.evaluate((idx) => {
      const trs = [...document.querySelectorAll('tbody tr')]
      if (idx >= trs.length) return false

      const tr = trs[idx]
      const tds = tr.querySelectorAll('td')


      if (tds.length > 1) {
        tds[1].click()
        return true
      }
      return false
    }, rowIndex)


    await this.sleep(1000)


    const hasNoSources = await this._checkNoSourcesFound(3000)

    if (hasNoSources) {
      logger.info('  该 Campaign 没有 Source')

      await this._exitCampaign()
      return { hasNoSources: true }
    }


    await this._waitForPageLoad()


    this.currentCampaignMetrics = await PageParser.getCampaignMetrics(this.page)
    if (this.currentCampaignMetrics.targetCpa !== null) {
      logger.info(`  Target CPA: $${this.currentCampaignMetrics.targetCpa.toFixed(2)}`)
    }

    return { hasNoSources: false }
  }

  /**
   * 检查是否有 "No sources found" 元素
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<boolean>} - true 表示没有 Source，false 表示有 Source
   */
  async _checkNoSourcesFound(timeout = 3000) {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const hasNoSources = await this.page.evaluate(() => {

        const notFoundElement = document.querySelector('pn-not-found')
        if (notFoundElement) {
          const message = notFoundElement.querySelector('.message')?.textContent || ''
          return message.toLowerCase().includes('no sources found')
        }
        return false
      })

      if (hasNoSources) {
        return true
      }


      await this.sleep(200)
    }

    return false
  }

  /**
   * 等待 Source 列表页加载完成
   * 只检查 Conversions 按钮是否存在（最可靠的加载完成标志）
   */
  async _waitForPageLoad(timeout = 30000) {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {

      const hasConversionsButton = await this.page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find(el => el.textContent.includes('Conversions'))
        return !!btn
      })

      if (hasConversionsButton) {

        await this.sleep(500)
        logger.info('  Source 页面加载完成')
        return true
      }

      await this.sleep(500)
    }

    logger.warning(`等待页面加载超时 (${timeout}ms)，继续执行`)
    return false
  }

  /**
   * 等待 Conversions 按钮出现
   */
  async _waitForConversionsButton(timeout = 30000) {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const hasButton = await this.page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find(el => el.textContent.includes('Conversions'))
        return !!btn
      })

      if (hasButton) {
        logger.success('Conversions 按钮已加载')
        return true
      }

      await this.sleep(500)
    }

    logger.warning(`等待 Conversions 按钮超时 (${timeout}ms)`)
    return false
  }

  /**
   * 退出 Campaign 详情页，返回列表页
   */
  async _exitCampaign() {
    await PageParser.goBackToCampaigns(this.page)
    await this.sleep(2000)
  }

  /**
   * 等待方法
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = Navigator
