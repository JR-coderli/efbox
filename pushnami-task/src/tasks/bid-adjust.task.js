/**
 * Bid 调整任务
 * 根据 Conversions 和 CPA 值自动调整 Source 的 Bid
 */
const { CONFIG, DRY_RUN, TEST_MODE } = require('../utils/config.js')
const { logger, createLogger } = require('../utils/logger.js')
const cooldownManager = require('../utils/cooldown.js')
const db = require('../utils/db.js')

const log = createLogger('BidAdjust')

/**
 * 默认 Bid 调整规则（后备规则）
 * 降价规则: Conversions > 1
 * 提价规则: Conversions > 3
 */
const DEFAULT_BID_RULES = [

  { minConversions: 1, minCpa: 7, maxCpa: null, newBid: 0.10, direction: 'down' },
  { minConversions: 1, minCpa: 5, maxCpa: 7, newBid: 0.12, direction: 'down' },
  { minConversions: 1, minCpa: 4, maxCpa: 5, newBid: 0.15, direction: 'down' },

  { minConversions: 3, minCpa: null, maxCpa: 2.8, newBid: 0.18, direction: 'up' },
  { minConversions: 3, minCpa: 2.8, maxCpa: 4, newBid: 0.16, direction: 'up' }
]

class BidAdjustTask {
  constructor(page) {
    this.page = page
    this.executionId = null  // 当前执行日志 ID
    this.rules = [] // 从数据库加载的规则
    this.stats = {
      totalSources: 0,
      processedSources: 0,
      skippedSources: 0,
      adjustedSources: 0,
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
   * 从数据库加载规则配置
   * @returns {Promise<boolean>} 是否成功加载规则
   */
  async loadRules() {
    try {
      const config = await db.getTaskConfig()
      const dbRules = config.bid_adjust_rules?.rules

      if (dbRules && Array.isArray(dbRules) && dbRules.length > 0) {

        const isNewFormat = dbRules.some(rule => rule.conditions)

        if (isNewFormat) {

          this.rules = dbRules
          log.info(`已从数据库加载 ${this.rules.length} 条规则（新格式）`)


          this.rules.forEach((r, idx) => {
            const conditionStr = r.conditions.map(c => {
              const valueStr = c.valueType === 'target_cpa' ? `${c.value}% of Target CPA` : c.value
              return `${c.field} ${c.operator} ${valueStr}${c.logic ? ' ' + c.logic : ''}`
            }).join(' ')
            log.info(`  规则${idx + 1}: ${conditionStr} → bid = ${r.newBid}`)
          })
        } else {

          this.rules = dbRules.map(rule => {
            const conditions = []
            if (rule.minConversions !== undefined) {
              conditions.push({ field: 'conversions', operator: '>', value: rule.minConversions, logic: '&&' })
            }
            if (rule.minCpa !== undefined && rule.minCpa !== null && rule.minCpa !== '') {
              conditions.push({ field: 'cpa', operator: '>=', value: rule.minCpa, logic: '&&' })
            }
            if (rule.maxCpa !== undefined && rule.maxCpa !== null && rule.maxCpa !== '') {
              conditions[conditions.length - 1].logic = '&&'
              conditions.push({ field: 'cpa', operator: '<', value: rule.maxCpa, logic: '' })
            }

            if (conditions.length > 0) {
              conditions[conditions.length - 1].logic = ''
            }
            return {
              conditions: conditions.length > 0 ? conditions : [{ field: 'cpa', operator: '>=', value: 7, logic: '' }],
              newBid: rule.newBid
            }
          })
          log.info(`已从数据库加载 ${this.rules.length} 条规则（旧格式已转换）`)
        }


        if (config.bid_adjust_rules?.cooldownMinutes) {
          CONFIG.bidAdjust.cooldownMinutes = config.bid_adjust_rules.cooldownMinutes
          log.info(`冷却时间: ${CONFIG.bidAdjust.cooldownMinutes} 分钟/Source`)
        }

        return true
      } else {
        log.error('数据库中没有配置 Bid 调整规则，任务终止')
        return false
      }
    } catch (error) {
      log.error(`加载规则失败: ${error.message}`)
      return false
    }
  }

  /**
   * 执行任务
   */
  async run() {
    const startedAt = new Date().toISOString()

    log.info('开始执行 Bid 调整任务')


    const hasRules = await this.loadRules()


    if (!hasRules) {
      const errorMessage = '数据库中没有配置 Bid 调整规则'
      log.error(errorMessage)


      await db.logTaskExecution({
        taskType: 'bid_adjust',
        status: 'failed',
        campaignsProcessed: 0,
        sourcesProcessed: 0,
        actionsTaken: 0,
        errors: 1,
        message: errorMessage,
        startedAt: startedAt,
        completedAt: new Date().toISOString()
      })


      this.stats.failed = true
      this.stats.errorMessage = errorMessage

      return this.stats
    }

    log.info(`冷却时间: ${CONFIG.bidAdjust.cooldownMinutes} 分钟/Source`)

    return this.stats
  }

  /**
   * 处理单个 Source
   * @param {Object} source - Source 数据
   * @param {string} campaignName - 所属 Campaign 名称
   * @param {number} campaignSpent - Campaign 的总花费（所有 Source 的 spent 总和）
   * @returns {Promise<Object>} 处理结果
   */
  async processSource(source, campaignName, campaignSpent = 0) {
    this.stats.totalSources++


    if (!this.rules || this.rules.length === 0) {
      log.error('规则未加载！请确保在处理 Source 之前已调用 loadRules()')
      return {
        sourceId: source.id,
        sourceName: source.name,
        campaignName,
        skipped: true,
        adjusted: false,
        error: true,
        reason: '规则未加载'
      }
    }

    const result = {
      sourceId: source.id,
      sourceName: source.name,
      campaignName,
      skipped: false,
      adjusted: false,
      error: false,
      reason: ''
    }

    try {

      log.info(`  [DEBUG] 处理 Source ${source.id}: conversions=${source.conversions}, cpa=${source.cpa}, currentBid=${source.currentBid}`)


      const canProceed = await cooldownManager.checkAndRecord(
        'bid_adjust',
        'source',
        source.id,
        CONFIG.bidAdjust.cooldownMinutes,
        db.isInCooldown.bind(db),
        campaignName  // 传入 campaignName
      )

      if (!canProceed) {
        result.skipped = true
        result.reason = '冷却期内'
        this.stats.skippedSources++
        log.info(`  Source ${source.id} 在冷却期内，跳过`)
        return result
      }


      const matchedRule = this._findMatchedRule(source)

      if (!matchedRule) {
        result.skipped = true
        result.reason = `未匹配任何规则`
        this.stats.skippedSources++
        log.info(`  Source ${source.id} 未匹配规则`)
        return result
      }


      if (Math.abs(source.currentBid - matchedRule.newBid) < 0.01) {
        result.skipped = true
        result.reason = `当前 Bid=${source.currentBid} 已是目标值`
        this.stats.skippedSources++
        log.info(`  Source ${source.id} 当前 Bid=${source.currentBid} 已是目标值`)
        return result
      }


      const success = await this._adjustBid(source, matchedRule)

      if (success) {
        result.adjusted = true
        result.oldBid = source.currentBid
        result.newBid = matchedRule.newBid
        result.ruleCondition = matchedRule.condition
        result.cpa = source.cpa

        this.stats.adjustedSources++
        this.stats.processedSources++

        log.success(`  Source ${source.id} Bid 已调整: Conversions=${source.conversions}, CPA=${source.cpa}, ${source.currentBid} -> ${matchedRule.newBid}`)


        await db.recordOperation({
          taskType: 'bid_adjust',
          entityType: 'source',
          entityId: source.id,
          campaignName: campaignName,
          oldValue: source.currentBid,
          newValue: matchedRule.newBid,
          ruleCondition: matchedRule.condition,
          conversions: source.conversions,
          clicks: source.clicks,
          spent: source.spent,
          cpa: source.cpa,
          totalSpend: campaignSpent,  // Campaign 维度的总花费
          targetCpa: source.targetCpa,
          isDryRun: DRY_RUN,
          executionId: this.executionId
        })
      } else {
        result.error = true
        result.reason = '调整 Bid 失败'
        this.stats.errors++
      }

      this.stats.details.push(result)

    } catch (error) {
      result.error = true
      result.reason = error.message
      this.stats.errors++
      log.error(`处理 Source ${source.id} 失败: ${error.message}`)
    }


    log.blank()

    return result
  }

  /**
   * 根据规则查找匹配的规则
   * @param {Object} source - Source 数据，包含 bid, conversions, clicks, spent, cpa, targetCpa 等字段
   */
  _findMatchedRule(source) {
    const sourceData = {
      bid: source.currentBid,
      conversions: source.conversions || 0,
      clicks: source.clicks || 0,
      spent: source.spent || 0,
      cpa: source.cpa || 0
    }

    const targetCpa = source.targetCpa !== undefined ? source.targetCpa : null

    log.info(`    [规则匹配] Source数据: bid=${sourceData.bid}, conversions=${sourceData.conversions}, clicks=${sourceData.clicks}, spent=${sourceData.spent}, cpa=${sourceData.cpa}, targetCpa=${targetCpa}`)


    const formatConditionStr = (conditions) => {
      return conditions.map(c => {
        const fieldValue = sourceData[c.field] ?? 0

        let valueStr
        let actualValueStr

        if (c.valueType === 'target_cpa') {
          valueStr = `${c.value}% of Target CPA`
          if (targetCpa !== null) {
            const multiplier = c.value / 100
            const calculatedValue = targetCpa * multiplier

            const formatNum = (n) => Number(n.toFixed(2))
            actualValueStr = `【${formatNum(fieldValue)} ${c.operator} ${formatNum(targetCpa)} * ${formatNum(multiplier)}】`
          } else {
            actualValueStr = `【无 Target CPA】`
          }
        } else {
          valueStr = c.value
          const formatNum = (n) => Number(n.toFixed(2))
          actualValueStr = `【${formatNum(fieldValue)} ${c.operator} ${formatNum(c.value)}】`
        }

        return `${c.field} ${c.operator} ${valueStr} ${actualValueStr}${c.logic ? ' ' + c.logic : ''}`
      }).join(' ')
    }


    for (let ruleIdx = 0; ruleIdx < this.rules.length; ruleIdx++) {
      const rule = this.rules[ruleIdx]


      if (rule.conditions) {

        const isMatch = this._evaluateConditions(rule.conditions, sourceData, targetCpa)

        const conditionStr = formatConditionStr(rule.conditions)

        if (isMatch) {
          log.info(`    ✅ 规则${ruleIdx + 1}匹配: ${conditionStr} → bid = ${rule.newBid}`)
          return { ...rule, condition: `${conditionStr} → Bid = ${rule.newBid}` }
        } else {
          log.info(`    ❌ 规则${ruleIdx + 1}未匹配: ${conditionStr}`)
        }
      }
    }

    log.info(`    没有规则匹配`)
    return null
  }

  /**
   * 评估条件是否匹配
   * @param {Array} conditions - 条件数组
   * @param {Object} sourceData - Source 数据
   * @param {number} targetCpa - Target CPA 值
   * @returns {boolean} 是否匹配
   */
  _evaluateConditions(conditions, sourceData, targetCpa = null) {

    let expression = ''
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i]
      const fieldValue = sourceData[cond.field] ?? 0


      let compareValue = cond.value
      if (cond.valueType === 'target_cpa') {
        if (targetCpa !== null && targetCpa !== undefined) {
          compareValue = targetCpa * (cond.value / 100)
        } else {
          log.warning(`    条件使用了 Target CPA 百分比，但该 Source 没有 Target CPA，跳过此条件`)
          return false
        }
      }


      let conditionExpr = `${fieldValue} ${cond.operator} ${compareValue}`


      if (i < conditions.length - 1) {
        conditionExpr += ` ${cond.logic} `
      }

      expression += conditionExpr
    }

    try {


      const result = new Function(`return (${expression})`)()
      return !!result
    } catch (error) {
      log.error(`    条件评估失败: ${expression}, 错误: ${error.message}`)
      return false
    }
  }

  /**
   * 调整 Source 的 Bid
   */
  async _adjustBid(source, rule) {

    if (DRY_RUN) {
      logger.dryRunAction('调整 Bid', {
        sourceId: source.id,
        sourceName: source.name,
        conversions: source.conversions,
        cpa: source.cpa,
        currentBid: source.currentBid,
        newBid: rule.newBid,
        rule: rule.condition
      })
      return true
    }



    if (TEST_MODE) {
      try {
        log.info(`  [TEST MODE] 模拟修改 Bid: Conversions=${source.conversions}, CPA=${source.cpa}, ${source.currentBid} -> ${rule.newBid} -> ${source.currentBid}`)


        const buttonClicked = await this.page.evaluate((rowIndex) => {
          const trs = [...document.querySelectorAll('tbody tr')]
          if (rowIndex >= trs.length) return { success: false }

          const tr = trs[rowIndex]
          const tds = tr.querySelectorAll('td')


          for (let i = 0; i < tds.length; i++) {
            const th = document.querySelectorAll('th')[i]
            if (th && (th.textContent.includes('Bid') || th.textContent.includes('Max Bid'))) {
              const button = tds[i].querySelector('button')
              if (button) {
                button.click()
                return { success: true }
              }
            }
          }

          return { success: false }
        }, source.rowIndex)

        if (!buttonClicked.success) {
          log.warning(`  [TEST MODE] 未找到 Source ${source.id} 的 Bid 编辑按钮`)
          return false
        }

        await this.sleep(1000)


        await this.page.evaluate(() => {
          const spans = [...document.querySelectorAll('span')]
          for (const span of spans) {
            if (span.textContent.includes('Edit Bid')) {
              span.click()
              return true
            }
          }
          return false
        })

        await this.sleep(500)


        const inputs = await this.page.$$('input[type="number"]')
        if (inputs.length > 0) {

          await inputs[0].click({ clickCount: 3 })
          await this.sleep(200)


          await inputs[0].type(String(rule.newBid))
          await this.sleep(500)

          log.info(`  [TEST MODE] 已改为规则值: ${rule.newBid}`)


          await inputs[0].click({ clickCount: 3 })
          await this.page.keyboard.press('Backspace')
          await this.sleep(200)
          await inputs[0].type(String(source.currentBid))
          await this.sleep(500)

          log.info(`  [TEST MODE] 已改回原值: ${source.currentBid}`)


          await this.page.keyboard.press('Enter')
          await this.sleep(1000)

          return true
        }

        log.warning(`  [TEST MODE] 未找到 Source ${source.id} 的 Bid 输入框`)
        return false

      } catch (error) {
        log.error(`  [TEST MODE] 测试操作失败: ${error.message}`)
        return false
      }
    }


    try {

      const buttonClicked = await this.page.evaluate((rowIndex) => {
        const trs = [...document.querySelectorAll('tbody tr')]
        if (rowIndex >= trs.length) return { success: false }

        const tr = trs[rowIndex]
        const tds = tr.querySelectorAll('td')


        for (let i = 0; i < tds.length; i++) {
          const th = document.querySelectorAll('th')[i]
          if (th && (th.textContent.includes('Bid') || th.textContent.includes('Max Bid'))) {
            const button = tds[i].querySelector('button')
            if (button) {
              button.click()
              return { success: true }
            }
          }
        }

        return { success: false }
      }, source.rowIndex)

      if (!buttonClicked.success) {
        log.warning(`未找到 Source ${source.id} 的 Bid 编辑按钮`)
        return false
      }

      await this.sleep(1000)


      await this.page.evaluate(() => {
        const spans = [...document.querySelectorAll('span')]
        for (const span of spans) {
          if (span.textContent.includes('Edit Bid')) {
            span.click()
            return true
          }
        }
        return false
      })

      await this.sleep(500)


      const inputs = await this.page.$$('input[type="number"]')
      if (inputs.length > 0) {
        await inputs[0].click({ clickCount: 3 }) // 全选
        await this.page.keyboard.press('Backspace')
        await this.sleep(200)
        await inputs[0].type(String(rule.newBid))
        await this.sleep(500)


        await this.page.keyboard.press('Enter')
        await this.sleep(1000)

        return true
      }

      log.warning(`未找到 Source ${source.id} 的 Bid 输入框`)
      return false

    } catch (error) {
      log.error(`调整 Bid 失败: ${error.message}`)
      return false
    }
  }

  /**
   * 打印统计信息
   */
  printStats() {
    log.info('\n' + '='.repeat(60))
    log.info('【Bid 调整任务统计】')
    log.info('='.repeat(60))
    log.info(`总 Source 数: ${this.stats.totalSources}`)
    log.info(`已处理: ${this.stats.processedSources}`)
    log.info(`已调整: ${this.stats.adjustedSources}`)
    log.info(`跳过: ${this.stats.skippedSources}`)
    log.info(`错误: ${this.stats.errors}`)
    log.info('='.repeat(60))
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = BidAdjustTask
