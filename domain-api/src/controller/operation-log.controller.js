const operationLogService = require('../service/operation-log.service')

class OperationLogController {

  async create(ctx, next) {
    const { module, operation, description, details } = ctx.request.body
    const userId = ctx.user?.id || null
    const userName = ctx.user?.name || ctx.user?.nickname || '系统'

    await operationLogService.log(userId, userName, module, operation, description, null, details)

    ctx.body = {
      code: 0,
      message: '日志记录成功'
    }
  }


  async list(ctx, next) {
    const { page = 1, pageSize = 20, module, startTime, endTime, userName } = ctx.request.body

    const result = await operationLogService.list(page, pageSize, module, startTime, endTime, userName)

    ctx.body = {
      code: 0,
      message: '获取日志列表成功',
      data: result
    }
  }


  async remove(ctx, next) {
    const { ids } = ctx.request.body

    await operationLogService.remove(ids)

    ctx.body = {
      code: 0,
      message: '删除日志成功'
    }
  }


  async removeByRange(ctx, next) {
    const { startTime, endTime } = ctx.request.body

    await operationLogService.removeByTimeRange(startTime, endTime)

    ctx.body = {
      code: 0,
      message: '批量删除日志成功'
    }
  }
}

module.exports = new OperationLogController()
