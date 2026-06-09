/**
 * Clickflare 报表数据控制器
 * 处理报表数据的同步和查询请求
 */

const reportService = require('../service/report.service')

class ReportController {
  /**
   * 手动同步指定日期的报表数据
   * POST /api/report/sync
   * Body: { date: "2026-04-15" }
   */
  async syncByDate(ctx, next) {
    const { date } = ctx.request.body

    console.log('[报表同步] 接收到的 date 参数:', date, '类型:', typeof date)

    if (!date) {
      ctx.body = {
        code: 1,
        message: '请指定要同步的日期'
      }
      return
    }


    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      console.error('[报表同步] 日期格式验证失败, date:', date)
      ctx.body = {
        code: 1,
        message: '日期格式不正确，请使用 YYYY-MM-DD 格式'
      }
      return
    }

    try {
      const result = await reportService.syncReportByDate(date)

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
   * 批量同步多个日期的报表数据
   * POST /api/report/sync/batch
   * Body: { dates: ["2026-04-01", "2026-04-02"], stopOnError: false }
   */
  async syncByDates(ctx, next) {
    const { dates, stopOnError = false } = ctx.request.body

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      ctx.body = {
        code: 1,
        message: '请提供要同步的日期数组'
      }
      return
    }


    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const invalidDates = dates.filter(d => !dateRegex.test(d))
    if (invalidDates.length > 0) {
      ctx.body = {
        code: 1,
        message: `日期格式不正确: ${invalidDates.join(', ')}`
      }
      return
    }

    try {
      const result = await reportService.syncReportByDates(dates, null, stopOnError)

      ctx.body = {
        code: 0,
        message: result.success ? '批量同步完成' : '批量同步完成，部分失败',
        data: result
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '批量同步失败',
        error: error.message
      }
    }
  }

  /**
   * 获取报表数据列表
   * POST /api/report/list
   */
  async list(ctx, next) {
    const {
      startDate,
      endDate,
      landingId,
      landingName,
      trafficSourceId,
      offerId,
      offset = 0,
      size = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = ctx.request.body

    try {
      const [list, total] = await reportService.getReportList({
        startDate,
        endDate,
        landingId,
        landingName,
        trafficSourceId,
        offerId,
        offset,
        size,
        sortBy,
        sortOrder
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: { list, total }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取报表统计摘要（按维度聚合）
   * POST /api/report/summary
   */
  async summary(ctx, next) {
    const {
      startDate,
      endDate,
      landingId,
      groupBy = 'date'
    } = ctx.request.body

    try {
      const result = await reportService.getReportSummary({
        startDate,
        endDate,
        landingId,
        groupBy
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取某个日期的同步状态
   * GET /api/report/status/:date
   */
  async getStatus(ctx, next) {
    const { date } = ctx.params

    if (!date) {
      ctx.body = {
        code: 1,
        message: '请提供日期'
      }
      return
    }

    try {
      const status = await reportService.getSyncStatus(date)

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: status
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取已同步的日期列表
   * GET /api/report/synced-dates
   */
  async getSyncedDates(ctx, next) {
    const { limit = 100 } = ctx.query

    try {
      const dates = await reportService.getSyncedDates(limit)

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: dates
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 删除指定日期的所有报表数据
   * DELETE /api/report/:date
   */
  async deleteByDate(ctx, next) {
    const { date } = ctx.params

    if (!date) {
      ctx.body = {
        code: 1,
        message: '请提供日期'
      }
      return
    }

    try {
      const result = await reportService.deleteReportByDate(date)

      ctx.body = {
        code: 0,
        message: '删除成功',
        data: { affectedRows: result.affectedRows }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '删除失败',
        error: error.message
      }
    }
  }

  /**
   * 获取今天的数据（快捷方式）
   * GET /api/report/today
   */
  async getToday(ctx, next) {

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`

    try {
      const [list, total] = await reportService.getReportList({
        startDate: today,
        endDate: today,
        offset: 0,
        size: 9999,
        sortBy: 'clicks',
        sortOrder: 'desc'
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: { list, total, date: today }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }



  /**
   * 同步指定日期的小时报表数据（从0点到当前小时）
   * POST /api/report/hourly/sync
   * Body: { date: "2026-04-17" }
   */
  async syncHourlyByDate(ctx, next) {
    const { date } = ctx.request.body

    if (!date) {
      ctx.body = {
        code: 1,
        message: '请指定要同步的日期'
      }
      return
    }


    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      ctx.body = {
        code: 1,
        message: '日期格式不正确，请使用 YYYY-MM-DD 格式'
      }
      return
    }

    try {
      const result = await reportService.syncHourlyReportByDate(date)

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
   * 获取小时报表数据列表
   * POST /api/report/hourly/list
   */
  async getHourlyList(ctx, next) {
    const {
      startDate,
      endDate,
      landingId,
      hour,
      offset = 0,
      size = 100,
      sortBy = 'date',
      sortOrder = 'desc'
    } = ctx.request.body

    try {
      const [list, total] = await reportService.getHourlyReportList({
        startDate,
        endDate,
        landingId,
        hour,
        offset,
        size,
        sortBy,
        sortOrder
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: { list, total }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取小时报表统计摘要（按指定维度聚合）
   * POST /api/report/hourly/summary
   */
  async getHourlySummary(ctx, next) {
    const {
      startDate,
      endDate,
      landingId,
      groupBy = 'hour'
    } = ctx.request.body

    try {
      const result = await reportService.getHourlyReportSummary({
        startDate,
        endDate,
        landingId,
        groupBy
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 删除指定日期的所有小时报表数据
   * DELETE /api/report/hourly/:date
   */
  async deleteHourlyByDate(ctx, next) {
    const { date } = ctx.params

    if (!date) {
      ctx.body = {
        code: 1,
        message: '请提供日期'
      }
      return
    }

    try {
      const result = await reportService.deleteHourlyReportByDate(date)

      ctx.body = {
        code: 0,
        message: '删除成功',
        data: { affectedRows: result.affectedRows }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '删除失败',
        error: error.message
      }
    }
  }

  /**
   * 获取小时数据已同步的日期列表
   * GET /api/report/hourly/synced-dates
   */
  async getHourlySyncedDates(ctx, next) {
    const { limit = 100 } = ctx.query

    try {
      const dates = await reportService.getHourlySyncedDates(limit)

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: dates
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取今天的小时数据（快捷方式，从0点到当前小时）
   * GET /api/report/hourly/today
   */
  async getHourlyToday(ctx, next) {

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    const currentHour = now.getHours()

    try {
      const result = await reportService.getHourlyReportSummary({
        startDate: today,
        endDate: today
      })


      const filteredResult = result.filter(item => {
        return item.date === today && item.hour <= currentHour
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: {
          list: filteredResult,
          date: today,
          currentHour
        }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取某日期的详细数据（按维度聚合，支持多级查询）
   * POST /api/report/daily/detail
   * Body: { startDate: "2026-04-01", endDate: "2026-04-30", groupBy: "landing", filters: {} }
   */
  async getDailyDetailByDate(ctx, next) {
    const { startDate, endDate, groupBy = 'landing', filters = {}, level = 0 } = ctx.request.body


    const allowedGroupBy = ['date', 'landing', 'source', 'offer']
    if (!allowedGroupBy.includes(groupBy)) {
      ctx.body = {
        code: 1,
        message: '无效的分组维度，必须是 date、landing、source 或 offer'
      }
      return
    }

    try {
      const result = await reportService.getDailyReportDetailByDate({
        startDate,
        endDate,
        groupBy,
        filters,
        level
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取某日期/小时的详细数据（按维度聚合）
   * POST /api/report/hourly/detail
   * Body: { date: "2026-04-17", hour: 12, groupBy: "hour|landing|source|offer", filters: {} }
   */
  async getHourlyDetailByHour(ctx, next) {
    const { date, hour, groupBy = 'hour', filters = {}, level = 0 } = ctx.request.body

    if (!date) {
      ctx.body = {
        code: 1,
        message: '请提供日期'
      }
      return
    }


    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      ctx.body = {
        code: 1,
        message: '日期格式不正确，请使用 YYYY-MM-DD 格式'
      }
      return
    }



    if (groupBy !== 'hour' && hour !== undefined && hour !== null && hour !== '' && (hour < 0 || hour > 23)) {
      ctx.body = {
        code: 1,
        message: '小时范围必须在 0-23 之间'
      }
      return
    }


    const allowedGroupBy = ['hour', 'landing', 'source', 'offer']
    if (!allowedGroupBy.includes(groupBy)) {
      ctx.body = {
        code: 1,
        message: '无效的分组维度，必须是 hour、landing、source 或 offer'
      }
      return
    }

    try {
      const result = await reportService.getHourlyReportDetailByHour({
        date,
        hour,
        groupBy,
        filters,
        level
      })

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }
}

module.exports = new ReportController()
