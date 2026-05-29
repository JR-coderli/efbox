/**
 * Clickflare 报表数据路由
 */

const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const reportController = require('../controller/report.controller')

const reportRouter = new KoaRouter({ prefix: '/report' })



/**
 * 手动同步指定日期的报表数据
 * POST /api/report/sync
 * Body: { date: "2026-04-15" }
 */
reportRouter.post('/sync', verifyAuth, reportController.syncByDate)

/**
 * 批量同步多个日期的报表数据
 * POST /api/report/sync/batch
 * Body: { dates: ["2026-04-01", "2026-04-02"], stopOnError: false }
 */
reportRouter.post('/sync/batch', verifyAuth, reportController.syncByDates)

/**
 * 获取报表数据列表
 * POST /api/report/list
 */
reportRouter.post('/list', verifyAuth, reportController.list)

/**
 * 获取报表统计摘要（按维度聚合）
 * POST /api/report/summary
 * Body: { startDate, endDate, landingId, groupBy }
 * groupBy 可选值: date, landing, source, offer, landing_source
 */
reportRouter.post('/summary', verifyAuth, reportController.summary)

/**
 * 获取某日期范围的详细数据（按维度聚合，支持多级查询）
 * POST /api/report/daily/detail
 * Body: { startDate, endDate, groupBy: "landing", filters: {} }
 * groupBy 可选值: date, landing, source, offer
 */
reportRouter.post('/daily/detail', verifyAuth, reportController.getDailyDetailByDate)

/**
 * 获取某个日期的同步状态
 * GET /api/report/status/:date
 */
reportRouter.get('/status/:date', verifyAuth, reportController.getStatus)

/**
 * 获取已同步的日期列表
 * GET /api/report/synced-dates?limit=100
 */
reportRouter.get('/synced-dates', verifyAuth, reportController.getSyncedDates)

/**
 * 删除指定日期的所有报表数据
 * DELETE /api/report/:date
 */
reportRouter.delete('/:date', verifyAuth, reportController.deleteByDate)

/**
 * 获取今天的数据（快捷方式）
 * GET /api/report/today
 */
reportRouter.get('/today', verifyAuth, reportController.getToday)



/**
 * 同步指定日期的小时报表数据（从0点到当前小时）
 * POST /api/report/hourly/sync
 * Body: { date: "2026-04-17" }
 */
reportRouter.post('/hourly/sync', verifyAuth, reportController.syncHourlyByDate)

/**
 * 获取小时报表数据列表
 * POST /api/report/hourly/list
 * Body: { startDate, endDate, landingId, hour, offset, size, sortBy, sortOrder }
 */
reportRouter.post('/hourly/list', verifyAuth, reportController.getHourlyList)

/**
 * 获取小时报表统计摘要（按小时聚合）
 * POST /api/report/hourly/summary
 * Body: { startDate, endDate, landingId }
 */
reportRouter.post('/hourly/summary', verifyAuth, reportController.getHourlySummary)

/**
 * 删除指定日期的所有小时报表数据
 * DELETE /api/report/hourly/:date
 */
reportRouter.delete('/hourly/:date', verifyAuth, reportController.deleteHourlyByDate)

/**
 * 获取小时数据已同步的日期列表
 * GET /api/report/hourly/synced-dates?limit=100
 */
reportRouter.get('/hourly/synced-dates', verifyAuth, reportController.getHourlySyncedDates)

/**
 * 获取今天的小时数据（快捷方式，从0点到当前小时）
 * GET /api/report/hourly/today
 */
reportRouter.get('/hourly/today', verifyAuth, reportController.getHourlyToday)

/**
 * 获取某小时的详细数据（按维度聚合）
 * POST /api/report/hourly/detail
 * Body: { date: "2026-04-17", hour: 12, groupBy: "landing" }
 * groupBy 可选值: landing, source, offer
 */
reportRouter.post('/hourly/detail', verifyAuth, reportController.getHourlyDetailByHour)

module.exports = reportRouter
