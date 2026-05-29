const landerService = require('../service/lander.service')
const clickflareConfig = require('../config/clickflare')
const { LP_SCREENSHOTS_BASE_URL } = require('../config/server')
const fs = require('fs')
const path = require('path')

class LanderController {
  /**
   * 获取 Lander 列表
   */
  async list(ctx, next) {
    const { name = '', url = '', offset = 0, size = 10, sort_by = 'cf_created_at', sort_order = 'desc', workspace_type = 'all' } = ctx.request.body

    const [list, total] = await landerService.list(name, url, offset, size, sort_by, sort_order, workspace_type)

    ctx.body = {
      code: 0,
      message: '获取 Lander 列表成功',
      data: { list, total }
    }
  }

  /**
   * 获取单个 Lander 详情
   */
  async get(ctx, next) {
    const { landerKey } = ctx.params

    const lander = await landerService.getByKey(landerKey)

    if (!lander) {
      ctx.body = {
        code: 1,
        message: 'Lander 不存在'
      }
      return
    }

    ctx.body = {
      code: 0,
      message: '获取成功',
      data: lander
    }
  }

  /**
   * 手动触发同步
   */
  async sync(ctx, next) {
    try {
      const { syncLanderService } = require('../tasks/lander-sync.task')
      const result = await syncLanderService()

      ctx.body = {
        code: 0,
        message: '同步成功',
        data: result
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '同步失败',
        error: error.message
      }
    }
  }

  /**
   * 获取同步状态
   */
  async syncStatus(ctx, next) {
    const status = await landerService.getSyncStatus()

    ctx.body = {
      code: 0,
      message: '获取同步状态成功',
      data: status
    }
  }

  /**
   * 获取截图统计
   */
  async screenshotStats(ctx, next) {
    const stats = await landerService.getScreenshotStats()

    ctx.body = {
      code: 0,
      message: '获取截图统计成功',
      data: stats
    }
  }

  /**
   * 删除 Lander
   */
  async remove(ctx, next) {
    const { landerKey } = ctx.params

    await landerService.remove(landerKey)

    ctx.body = {
      code: 0,
      message: '删除成功'
    }
  }

  /**
   * 手动触发截图（对待截图的进行处理）
   */
  async triggerScreenshot(ctx, next) {
    try {
      const { startScreenshotQueue } = require('../services/lander-screenshot.service')
      const result = await startScreenshotQueue()

      ctx.body = {
        code: 0,
        message: '截图任务已启动',
        data: result
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '启动截图任务失败',
        error: error.message
      }
    }
  }

  /**
   * 获取截图配置
   */
  async getScreenshotConfig(ctx, next) {
    ctx.body = {
      code: 0,
      message: '获取配置成功',
      data: {
        query: clickflareConfig.screenshot.query || ''
      }
    }
  }

  /**
   * 更新截图配置
   */
  async updateScreenshotConfig(ctx, next) {
    const { query } = ctx.request.body


    const configPath = path.join(__dirname, '../config/clickflare.js')
    const configContent = `/**
 * Clickflare API 配置
 */
module.exports = {
  baseURL: '${clickflareConfig.baseURL}',
  apiKey: '${clickflareConfig.apiKey}',
  endpoints: {
    landers: '${clickflareConfig.endpoints.landers}',
    offers: '${clickflareConfig.endpoints.offers}',
    report: '${clickflareConfig.endpoints.report}'
  },
  sync: {
    intervalMinutes: ${clickflareConfig.sync.intervalMinutes}
  },
  screenshot: {
    dir: '${clickflareConfig.screenshot.dir}',
    maxConcurrent: ${clickflareConfig.screenshot.maxConcurrent},
    timeout: ${clickflareConfig.screenshot.timeout},
    viewportWidth: ${clickflareConfig.screenshot.viewportWidth},
    viewportHeight: ${clickflareConfig.screenshot.viewportHeight},
    query: ${query ? `'${query}'` : 'null'}
  }
}
`

    fs.writeFileSync(configPath, configContent, 'utf8')


    delete require.cache[require.resolve('../config/clickflare')]
    console.log('[截图配置] 配置已更新，下次截图将使用新配置')

    ctx.body = {
      code: 0,
      message: '配置更新成功',
      data: { query }
    }
  }

  /**
   * 公开接口：获取 Lander 列表
   * 不需要登录，但需要 api-key 验证
   */
  async publicList(ctx, next) {


    const { name = '', url = '', offset = 0, size = 999999, sort_by = 'cf_created_at', sort_order = 'desc' } = ctx.query

    const [list, total] = await landerService.list(name, url, offset, size, sort_by, sort_order)


    const publicList = list.map(item => ({
      lander_id: item.lander_key,
      name: item.name,
      url: item.url,
      screenshot_url: item.screenshot_url ? LP_SCREENSHOTS_BASE_URL + item.screenshot_url : null,

    }))

    ctx.body = publicList
  }


  /**
   * 上传截图（手动上传覆盖自动截图）
   */
  async uploadScreenshot(ctx, next) {
    const { landerKey } = ctx.params
    const file = ctx.file

    if (!file) {
      ctx.body = {
        code: 1,
        message: '请选择要上传的图片'
      }
      return
    }

    try {

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.mimetype)) {
        ctx.body = {
          code: 1,
          message: '只支持 JPG、PNG、GIF、WebP 格式的图片'
        }
        return
      }


      const relativePath = `/uploads/lander_screenshots/${file.filename}`
      await landerService.saveScreenshot(landerKey, relativePath)

      ctx.body = {
        code: 0,
        message: '截图上传成功',
        data: {
          screenshot_url: relativePath
        }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '上传失败: ' + error.message
      }
    }
  }
}

module.exports = new LanderController()
