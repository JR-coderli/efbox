/**
 * Block 任务
 * 当 Source CPA >= $15 时，点击 Block 按钮
 */
const { CONFIG, DRY_RUN, TEST_MODE } = require('../utils/config.js')
const { logger, createLogger } = require('../utils/logger.js')
const cooldownManager = require('../utils/cooldown.js')
const db = require('../utils/db.js')

const log = createLogger('Block')

/**
 * Block 规则
 */
const BLOCK_RULE = {
  condition: 'CPA >= 15, action = block',
  threshold: 15
}

class BlockTask {
  constructor(page) {
    this.page = page
    this.executionId = null  // 当前执行日志 ID
    this.stats = {
      totalSources: 0,
      processedSources: 0,
      skippedSources: 0,
      blockedSources: 0,
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
    log.info('开始执行 Block 任务')
    log.info(`规则: ${BLOCK_RULE.condition}`)
    log.info(`冷却时间: ${CONFIG.block.cooldownMinutes} 分钟/Source`)

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

    const result = {
      sourceId: source.id,
      sourceName: source.name,
      campaignName,
      skipped: false,
      blocked: false,
      error: false,
      reason: ''
    }

    try {

      const canProceed = await cooldownManager.checkAndRecord(
        'block',
        'source',
        source.id,
        CONFIG.block.cooldownMinutes,
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


      if (source.cpa < BLOCK_RULE.threshold) {
        result.skipped = true
        result.reason = `CPA=${source.cpa} < ${BLOCK_RULE.threshold}，不满足 Block 条件`
        this.stats.skippedSources++
        log.info(`  Source ${source.id} CPA=${source.cpa} 不满足 Block 条件`)
        return result
      }


      const success = await this._blockSource(source)

      if (success) {
        result.blocked = true
        result.cpa = source.cpa

        this.stats.blockedSources++
        this.stats.processedSources++

        log.success(`  Source ${source.id} (CPA=${source.cpa}) 已 Block`)


        await db.recordOperation({
          taskType: 'block',
          entityType: 'source',
          entityId: source.id,
          campaignName: campaignName,
          oldValue: 'active',
          newValue: 'blocked',
          ruleCondition: BLOCK_RULE.condition,
          conversions: source.conversions,
          clicks: source.clicks,
          spent: source.spent,
          cpa: source.cpa,
          totalSpend: campaignSpent,  // Campaign 维度的总花费
          isDryRun: DRY_RUN,
          executionId: this.executionId
        })
      } else {
        result.error = true
        result.reason = 'Block 操作失败'
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
   * 点击 Block 按钮
   */
  async _blockSource(source) {

    if (DRY_RUN) {
      logger.dryRunAction('Block Source', {
        sourceId: source.id,
        sourceName: source.name,
        cpa: source.cpa,
        rule: BLOCK_RULE.condition
      })
      return true
    }


    if (TEST_MODE) {
      try {
        const checked = await this.page.evaluate((rowIndex) => {
          const trs = [...document.querySelectorAll('tbody tr')]
          if (rowIndex >= trs.length) return { success: false, message: '行不存在' }

          const tr = trs[rowIndex]
          const firstTd = tr.querySelector('td:first-child')

          if (!firstTd) return { success: false, message: '第一列不存在' }


          const checkbox = firstTd.querySelector('input[type="checkbox"]')
          if (checkbox) {

            if (!checkbox.checked) {
              checkbox.click()
            }
            return { success: true, method: 'checkbox', checked: checkbox.checked }
          }


          const clickable = firstTd.querySelector('input[type="radio"], button, a, span')
          if (clickable) {
            clickable.click()
            return { success: true, method: 'clickable' }
          }

          return { success: false, message: '未找到可操作的元素' }
        }, source.rowIndex)

        if (checked.success) {
          log.info(`  [TEST MODE] 已选中 Source ${source.id} 第一列复选框 (${checked.method})`)
          await this.sleep(500)
          return true
        } else {
          log.warning(`  [TEST MODE] 未找到 Source ${source.id} 的复选框: ${checked.message}`)
          return false
        }
      } catch (error) {
        log.error(`  [TEST MODE] 测试操作失败: ${error.message}`)
        return false
      }
    }


    try {
      const blocked = await this.page.evaluate((rowIndex) => {
        const trs = [...document.querySelectorAll('tbody tr')]
        if (rowIndex >= trs.length) return { success: false, message: '行不存在' }

        const tr = trs[rowIndex]
        const tds = tr.querySelectorAll('td')


        for (let i = 0; i < tds.length; i++) {
          const buttons = tds[i].querySelectorAll('button')
          for (const btn of buttons) {
            if (btn.textContent.includes('Block') || btn.textContent.includes('block')) {
              btn.click()
              return { success: true, method: 'button' }
            }
          }
        }


        const allElements = tr.querySelectorAll('button, span, div, a')
        for (const el of allElements) {
          if (el.textContent.includes('Block') || el.textContent.includes('block')) {
            el.click()
            return { success: true, method: 'element' }
          }
        }

        return { success: false, message: '未找到 Block 按钮' }
      }, source.rowIndex)

      if (blocked.success) {
        await this.sleep(1000)
        log.info(`  已使用 ${blocked.method} 方法点击 Block 按钮`)
        return true
      }

      log.warning(`未找到 Source ${source.id} 的 Block 按钮: ${blocked.message}`)
      return false

    } catch (error) {
      log.error(`Block 操作失败: ${error.message}`)
      return false
    }
  }

  /**
   * 打印统计信息
   */
  printStats() {
    log.info('\n' + '='.repeat(60))
    log.info('【Block 任务统计】')
    log.info('='.repeat(60))
    log.info(`总 Source 数: ${this.stats.totalSources}`)
    log.info(`已处理: ${this.stats.processedSources}`)
    log.info(`已 Block: ${this.stats.blockedSources}`)
    log.info(`跳过: ${this.stats.skippedSources}`)
    log.info(`错误: ${this.stats.errors}`)
    log.info('='.repeat(60))
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = BlockTask
