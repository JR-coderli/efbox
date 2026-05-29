/**
 * Clickflare 报表数据 API 服务
 */

import hyRequest from '@/services/request'

const BASE_URL = '/report'

/**
 * 手动同步指定日期的报表数据
 * @param {string} date - 日期 YYYY-MM-DD
 */
export function syncReportByDate(date) {
  return hyRequest.post({
    url: `${BASE_URL}/sync`,
    data: { date }
  })
}

/**
 * 批量同步多个日期的报表数据
 * @param {string[]} dates - 日期数组
 * @param {boolean} stopOnError - 遇到错误是否停止
 */
export function syncReportByDates(dates, stopOnError = false) {
  return hyRequest.post({
    url: `${BASE_URL}/sync/batch`,
    data: { dates, stopOnError },
    timeout: 300000 // 5分钟超时
  })
}

/**
 * 获取报表数据列表
 * @param {Object} params - 查询参数
 */
export function getReportList(params) {
  return hyRequest.post({
    url: `${BASE_URL}/list`,
    data: params
  })
}

/**
 * 获取报表统计摘要
 * @param {Object} params - 查询参数
 */
export function getReportSummary(params) {
  return hyRequest.post({
    url: `${BASE_URL}/summary`,
    data: params
  })
}

/**
 * 获取某日期范围的详细数据（按维度聚合，支持多级查询）
 * @param {Object} params - 查询参数 { startDate, endDate, groupBy, filters, level }
 */
export function getDailyReportDetailByDate(params) {
  return hyRequest.post({
    url: `${BASE_URL}/daily/detail`,
    data: params
  })
}

/**
 * 获取某个日期的同步状态
 * @param {string} date - 日期
 */
export function getReportStatus(date) {
  return hyRequest.get({
    url: `${BASE_URL}/status/${date}`
  })
}

/**
 * 获取已同步的日期列表
 * @param {number} limit - 限制数量
 */
export function getSyncedDates(limit = 100) {
  return hyRequest.get({
    url: `${BASE_URL}/synced-dates`,
    params: { limit }
  })
}

/**
 * 删除指定日期的报表数据
 * @param {string} date - 日期
 */
export function deleteReportByDate(date) {
  return hyRequest.delete({
    url: `${BASE_URL}/${date}`
  })
}

/**
 * 获取今天的数据
 */
export function getTodayReport() {
  return hyRequest.get({
    url: `${BASE_URL}/today`
  })
}



/**
 * 同步指定日期的小时报表数据（从0点到当前小时）
 * @param {string} date - 日期 YYYY-MM-DD
 */
export function syncHourlyReport(date) {
  return hyRequest.post({
    url: `${BASE_URL}/hourly/sync`,
    data: { date },
    timeout: 300000 // 5分钟超时
  })
}

/**
 * 获取小时报表数据列表
 * @param {Object} params - 查询参数
 */
export function getHourlyReportList(params) {
  return hyRequest.post({
    url: `${BASE_URL}/hourly/list`,
    data: params
  })
}

/**
 * 获取小时报表统计摘要
 * @param {Object} params - 查询参数
 */
export function getHourlyReportSummary(params) {
  return hyRequest.post({
    url: `${BASE_URL}/hourly/summary`,
    data: params
  })
}

/**
 * 删除指定日期的小时报表数据
 * @param {string} date - 日期
 */
export function deleteHourlyReportByDate(date) {
  return hyRequest.delete({
    url: `${BASE_URL}/hourly/${date}`
  })
}

/**
 * 获取小时数据已同步的日期列表
 * @param {number} limit - 限制数量
 */
export function getHourlySyncedDates(limit = 100) {
  return hyRequest.get({
    url: `${BASE_URL}/hourly/synced-dates`,
    params: { limit }
  })
}

/**
 * 获取今天的小时数据（从0点到当前小时）
 */
export function getTodayHourlyReport() {
  return hyRequest.get({
    url: `${BASE_URL}/hourly/today`
  })
}

/**
 * 获取某小时的详细数据（按维度聚合）
 * @param {Object} params - 查询参数 { date, hour, groupBy }
 */
export function getHourlyReportDetailByHour(params) {
  return hyRequest.post({
    url: `${BASE_URL}/hourly/detail`,
    data: params
  })
}
