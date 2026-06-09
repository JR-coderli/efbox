const landerReplacementService = require('../service/lander-replacement.service')
const landerService = require('../service/lander.service')

class LanderReplacementController {
  /**
   * 替换危险域名
   */
  async replaceDangerousDomain(ctx, next) {
    const { domain, replacement_domain, workspace_type = 'all' } = ctx.request.body

    if (!domain) {
      ctx.body = {
        code: 1,
        message: '危险域名参数不能为空',
        data: null
      }
      return
    }

    try {

      const result = await landerReplacementService.replaceDangerousDomainAsync(domain, replacement_domain, workspace_type)

      if (result.success) {
        ctx.body = {
          code: 0,
          message: result.message,
          data: result.data
        }
      } else {
        ctx.body = {
          code: 1,
          message: result.message,
          data: null
        }
      }
    } catch (error) {
      console.error('启动批量替换任务失败:', error)
      ctx.body = {
        code: 1,
        message: '启动批量替换任务失败: ' + error.message,
        data: null
      }
    }
  }

  /**
   * 获取任务进度
   */
  async getProgress(ctx, next) {
    const { id } = ctx.params

    if (!id) {
      ctx.body = {
        code: 1,
        message: '任务ID不能为空',
        data: null
      }
      return
    }

    try {
      const progress = await landerReplacementService.getProgress(id)

      if (!progress) {
        ctx.body = {
          code: 1,
          message: '任务不存在',
          data: null
        }
        return
      }


      let needSync = false
      if (progress.status === 'success' || progress.status === 'partial' || progress.status === 'failed') {
        if (!progress.synced_at && progress.success_count > 0) {
          needSync = true

          setImmediate(async () => {
            try {
              const { syncLanderService } = require('../tasks/lander-sync.task')
              await syncLanderService()
              await landerReplacementService.markSynced(id)
              console.log(`[批量替换] 任务 ${id} 同步完成`)
            } catch (syncErr) {
              console.error('[批量替换] 触发同步失败:', syncErr)
            }
          })
        }
      }

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: {
          ...progress,
          needSync
        }
      }
    } catch (error) {
      console.error('获取进度失败:', error)
      ctx.body = {
        code: 1,
        message: '获取进度失败: ' + error.message,
        data: null
      }
    }
  }

  /**
   * 预览域名替换（不执行实际替换）
   */
  async previewReplace(ctx, next) {
    const { domain, replacement_domain, workspace_type = 'all', offset = 0, size = 100 } = ctx.request.body

    if (!domain) {
      ctx.body = {
        code: 1,
        message: '域名参数不能为空',
        data: null
      }
      return
    }

    if (!replacement_domain) {
      ctx.body = {
        code: 1,
        message: '替换域名参数不能为空',
        data: null
      }
      return
    }

    try {
      const result = await landerReplacementService.previewReplace(domain, replacement_domain, workspace_type, offset, size)

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      console.error('预览替换失败:', error)
      ctx.body = {
        code: 1,
        message: '预览失败: ' + error.message,
        data: null
      }
    }
  }

  /**
   * 获取替换记录列表
   */
  async getList(ctx, next) {
    const { offset = 0, size = 20 } = ctx.request.body

    try {
      const [list, total] = await landerReplacementService.getList(offset, size)

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: {
          list,
          total
        }
      }
    } catch (error) {
      console.error('获取替换记录失败:', error)
      ctx.body = {
        code: 1,
        message: '获取失败: ' + error.message,
        data: null
      }
    }
  }

  /**
   * 获取替换记录详情
   */
  async getDetail(ctx, next) {
    const { id } = ctx.params

    try {
      const detail = await landerReplacementService.getDetail(id)

      if (!detail) {
        ctx.body = {
          code: 1,
          message: '记录不存在',
          data: null
        }
        return
      }

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: detail
      }
    } catch (error) {
      console.error('获取详情失败:', error)
      ctx.body = {
        code: 1,
        message: '获取失败: ' + error.message,
        data: null
      }
    }
  }

  
  /**
   * 获取队列状态
   */
  async getQueueStatus(ctx, next) {
    try {
      const status = landerReplacementService.getQueueStatus()

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: status
      }
    } catch (error) {
      console.error('获取队列状态失败:', error)
      ctx.body = {
        code: 1,
        message: '获取失败: ' + error.message,
        data: null
      }
    }
  }
}

module.exports = new LanderReplacementController()
