/**
 * Budget 放量任务
 * 当 Total Spend >= Daily Spend Limit * 50% 且 Campaign CPA <= Target CPA 时
 * 将 Daily Spend Limit 翻倍
 */
const { CONFIG, DRY_RUN, TEST_MODE } = require('../utils/config.js')
const { logger, createLogger } = require('../utils/logger.js')
const PageParser = require('../core/page-parser.js')
const cooldownManager = require('../utils/cooldown.js')
const db = require('../utils/db.js')

const log = createLogger('BudgetBoost')

/**
 * Budget 放量规则
 */
const BUDGET_BOOST_RULE = {
  condition: 'Total Spend >= Daily Spend Limit * 50% 且 Campaign CPA <= Target CPA, daily spend limit * 2',
  spendThreshold: 0.5,  // 50%
  multiplier: 2          // 翻倍
}

class BudgetBoostTask {
  constructor(page) {
    this.page = page
    this.executionId = null  // 当前执行日志 ID
    this.stats = {
      totalCampaigns: 0,
      processedCampaigns: 0,
      skippedCampaigns: 0,
      boostedCampaigns: 0,
      errors: 0,
      details: []
    }
  }

  /**
   * 设置执行日志 ID
   * @param {number} executionId - 执行日志 ID
   */
  setExecutionId(executionId) {
    this.executionId = executionId
  }

  /**
   * 执行任务
   */
  async run() {
    log.info('开始执行 Budget 放量任务')
    log.info(`规则: ${BUDGET_BOOST_RULE.condition}`)
    log.info(`放量倍数: ${BUDGET_BOOST_RULE.multiplier}x`)
    log.info(`冷却时间: ${CONFIG.budgetBoost.cooldownMinutes} 分钟/Campaign`)

    return this.stats
  }

  /**
   * 处理单个 Campaign
   * @param {Object} campaign - Campaign 数据
   * @returns {Promise<Object>} 处理结果
   */
  async processCampaign(campaign) {
    this.stats.totalCampaigns++

    const result = {
      campaignId: this._extractCampaignId(campaign.name),
      campaignName: campaign.name,
      skipped: false,
      boosted: false,
      error: false,
      reason: '',
      metrics: {}
    }

    try {

      const metrics = await PageParser.getCampaignMetrics(this.page)
      result.metrics = metrics

      log.info(`  Campaign: ${campaign.name}`)
      log.info(`    Total Spend: ${campaign.totalSpend}`)
      log.info(`    Campaign CPA: ${campaign.cpa}`)
      log.info(`    Daily Spend Limit: ${metrics.dailySpendLimit}`)
      log.info(`    Target CPA: ${metrics.targetCpa}`)


      if (!metrics.dailySpendLimit || metrics.targetCpa === null) {
        result.skipped = true
        result.reason = '缺少必要的指标数据 (Daily Spend Limit 或 Target CPA)'
        this.stats.skippedCampaigns++
        log.warning(`  Campaign ${campaign.name} 缺少必要指标，跳过`)
        return result
      }


      const campaignId = result.campaignId
      const canProceed = await cooldownManager.checkAndRecord(
        'budget_boost',
        'campaign',
        campaignId,
        CONFIG.budgetBoost.cooldownMinutes,
        db.isInCooldown.bind(db)
      )

      if (!canProceed) {
        result.skipped = true
        result.reason = '冷却期内'
        this.stats.skippedCampaigns++
        log.info(`  Campaign ${campaignId} 在冷却期内，跳过`)
        return result
      }



      const spendThreshold = metrics.dailySpendLimit * BUDGET_BOOST_RULE.spendThreshold
      const spendCondition = campaign.totalSpend >= spendThreshold


      const cpaCondition = campaign.cpa <= metrics.targetCpa

      log.info(`    条件检查:`)
      log.info(`      Total Spend (${campaign.totalSpend}) >= Limit * 50% (${spendThreshold}): ${spendCondition ? '✅' : '❌'}`)
      log.info(`      CPA (${campaign.cpa}) <= Target CPA (${metrics.targetCpa}): ${cpaCondition ? '✅' : '❌'}`)

      if (!spendCondition || !cpaCondition) {
        result.skipped = true
        result.reason = !spendCondition
          ? `Total Spend 未达到阈值 (需要 >= ${spendThreshold})`
          : `CPA 未达标 (需要 <= ${metrics.targetCpa})`
        this.stats.skippedCampaigns++
        log.info(`  Campaign ${campaign.name} 不满足放量条件`)
        return result
      }


      const newDailySpendLimit = metrics.dailySpendLimit * BUDGET_BOOST_RULE.multiplier


      const success = await this._boostBudget(campaign, metrics.dailySpendLimit, newDailySpendLimit)

      if (success) {
        result.boosted = true
        result.oldValue = metrics.dailySpendLimit
        result.newValue = newDailySpendLimit
        result.totalSpend = campaign.spent
        result.campaignCpa = campaign.cpa
        result.targetCpa = metrics.targetCpa

        this.stats.boostedCampaigns++
        this.stats.processedCampaigns++

        log.success(`  Campaign ${campaign.name} Daily Spend Limit 已调整: ${metrics.dailySpendLimit} -> ${newDailySpendLimit}`)


        await db.recordOperation({
          taskType: 'budget_boost',
          entityType: 'campaign',
          entityId: campaignId,
          campaignName: campaign.name,
          oldValue: metrics.dailySpendLimit,
          newValue: newDailySpendLimit,
          ruleCondition: BUDGET_BOOST_RULE.condition,
          totalSpend: campaign.totalSpend,
          dailySpendLimit: metrics.dailySpendLimit,
          targetCpa: metrics.targetCpa,
          isDryRun: DRY_RUN,
          executionId: this.executionId
        })
      } else {
        result.error = true
        result.reason = '放量操作失败'
        this.stats.errors++
      }

      this.stats.details.push(result)

    } catch (error) {
      result.error = true
      result.reason = error.message
      this.stats.errors++
      log.error(`处理 Campaign ${campaign.name} 失败: ${error.message}`)
    }


    log.blank()

    return result
  }

  /**
   * 调整 Daily Spend Limit
   */
  async _boostBudget(campaign, currentLimit, newLimit) {

    if (DRY_RUN) {
      logger.dryRunAction('Budget 放量', {
        campaignName: campaign.name,
        currentLimit: currentLimit,
        newLimit: newLimit,
        totalSpend: campaign.totalSpend,
        campaignCpa: campaign.cpa,
        multiplier: `${BUDGET_BOOST_RULE.multiplier}x`
      })
      return true
    }


    if (TEST_MODE) {
      try {
        log.info(`  [TEST MODE] 模拟修改 Daily Spend Limit: ${currentLimit} -> ${currentLimit}`)
        const tested = await this.page.evaluate((targetValue) => {

          const allElements = [...document.querySelectorAll('*')]
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i]
            if (el.textContent.includes('Daily Spend Limit') || el.textContent.includes('Spend Limit')) {
              const parent = el.parentElement
              const siblings = parent ? [...parent.children] : []

              for (const sibling of siblings) {
                const input = sibling.querySelector('input[type="number"], input[type="text"]')
                if (input) {
                  input.click()
                  input.select()

                  input.value = ''
                  input.dispatchEvent(new Event('input', { bubbles: true }))

                  input.value = targetValue
                  input.dispatchEvent(new Event('input', { bubbles: true }))
                  input.dispatchEvent(new Event('change', { bubbles: true }))
                  return { success: true, method: 'input' }
                }

                const editButton = sibling.querySelector('button')
                if (editButton && (editButton.textContent.includes('edit') || editButton.textContent.includes('Edit'))) {
                  editButton.click()
                  return { success: true, method: 'edit_button', needsInput: true }
                }
              }
            }
          }


          const inputs = [...document.querySelectorAll('input[type="number"], input[type="text"]')]
          for (const input of inputs) {
            if (input.value && parseFloat(input.value.replace(/[$,]/g, '')) === targetValue) {
              input.click()
              input.select()

              input.value = ''
              input.dispatchEvent(new Event('input', { bubbles: true }))

              input.value = targetValue
              input.dispatchEvent(new Event('input', { bubbles: true }))
              input.dispatchEvent(new Event('change', { bubbles: true }))
              return { success: true, method: 'value_match' }
            }
          }

          return { success: false, message: '未找到 Daily Spend Limit 输入框' }
        }, currentLimit)

        if (tested.success) {
          if (tested.needsInput) {
            await this.sleep(500)
            const inputs = await this.page.$$('input[type="number"], input[type="text"]')
            if (inputs.length > 0) {
              await inputs[0].click({ clickCount: 3 })
              await this.page.keyboard.press('Backspace')
              await this.sleep(200)
              await inputs[0].type(String(currentLimit))
            }
          }

          await this.sleep(500)


          if (this.page.keyboard) {
            await this.page.keyboard.press('Enter')
          }

          await this.sleep(1000)
          log.info(`  [TEST MODE] 已测试 Daily Spend Limit 操作 (${tested.method})`)
          return true
        }

        log.warning(`  [TEST MODE] 未找到 Daily Spend Limit: ${tested.message}`)
        return false

      } catch (error) {
        log.error(`  [TEST MODE] 测试操作失败: ${error.message}`)
        return false
      }
    }


    try {

      const boosted = await this.page.evaluate((currentValue, newValue) => {

        const allElements = [...document.querySelectorAll('*')]
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i]
          if (el.textContent.includes('Daily Spend Limit') || el.textContent.includes('Spend Limit')) {

            const parent = el.parentElement
            const siblings = parent ? [...parent.children] : []

            for (const sibling of siblings) {

              const input = sibling.querySelector('input[type="number"], input[type="text"]')
              if (input) {
                input.click()
                input.select()
                input.value = newValue
                input.dispatchEvent(new Event('input', { bubbles: true }))
                input.dispatchEvent(new Event('change', { bubbles: true }))
                return { success: true, method: 'input' }
              }


              const editButton = sibling.querySelector('button')
              if (editButton && (editButton.textContent.includes('edit') || editButton.textContent.includes('Edit'))) {
                editButton.click()
                return { success: true, method: 'edit_button', needsInput: true }
              }
            }
          }
        }


        const inputs = [...document.querySelectorAll('input[type="number"], input[type="text"]')]
        for (const input of inputs) {
          if (input.value && parseFloat(input.value.replace(/[$,]/g, '')) === currentValue) {
            input.click()
            input.select()
            input.value = newValue
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            return { success: true, method: 'value_match' }
          }
        }

        return { success: false, message: '未找到 Daily Spend Limit 输入框' }
      }, currentLimit, newLimit)

      if (boosted.success) {
        if (boosted.needsInput) {

          await this.sleep(500)
          const inputs = await this.page.$$('input[type="number"], input[type="text"]')
          if (inputs.length > 0) {
            await inputs[0].click({ clickCount: 2 })
            await inputs[0].type(String(newLimit))
          }
        }

        await this.sleep(500)


        await this.page.evaluate(() => {
          const saveButton = [...document.querySelectorAll('button')]
            .find(btn => btn.textContent.includes('Save') || btn.textContent.includes('保存'))
          if (saveButton) {
            saveButton.click()
            return 'button'
          }
          return 'none'
        })

        if (this.page.keyboard) {
          await this.page.keyboard.press('Enter')
        }

        await this.sleep(1000)
        log.info(`  已使用 ${boosted.method} 方法调整 Daily Spend Limit`)
        return true
      }

      log.warning(`未找到 Daily Spend Limit 的编辑位置: ${boosted.message}`)
      return false

    } catch (error) {
      log.error(`Budget 放量操作失败: ${error.message}`)
      return false
    }
  }

  /**
   * 从 Campaign 名称中提取 ID
   */
  _extractCampaignId(campaignName) {

    const match = campaignName.match(/\d+/)
    return match ? match[0] : campaignName.replace(/\s+/g, '_')
  }

  /**
   * 打印统计信息
   */
  printStats() {
    log.info('\n' + '='.repeat(60))
    log.info('【Budget 放量任务统计】')
    log.info('='.repeat(60))
    log.info(`总 Campaign 数: ${this.stats.totalCampaigns}`)
    log.info(`已处理: ${this.stats.processedCampaigns}`)
    log.info(`已放量: ${this.stats.boostedCampaigns}`)
    log.info(`跳过: ${this.stats.skippedCampaigns}`)
    log.info(`错误: ${this.stats.errors}`)
    log.info('='.repeat(60))
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = BudgetBoostTask
