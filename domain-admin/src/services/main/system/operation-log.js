import hyRequest from '@/services/request'

/**
 * 创建操作日志
 * @param {Object} data - 日志数据
 * @param {string} data.module - 模块名称
 * @param {string} data.operation - 操作类型 (search/pagination/create/update/delete等)
 * @param {string} data.description - 操作描述
 * @param {Object} data.details - 详细信息 (可选)
 */
export function createOperationLog(data) {
  return hyRequest.post({
    url: '/operation-log/create',
    data
  })
}

/**
 * 获取操作日志列表
 */
export function getOperationLogList(params) {
  return hyRequest.post({
    url: '/operation-log/list',
    data: params
  })
}

/**
 * 删除操作日志
 */
export function deleteOperationLog(ids) {
  return hyRequest.post({
    url: '/operation-log/delete',
    data: { ids }
  })
}

/**
 * 批量删除操作日志
 */
export function batchDeleteOperationLog(ids) {
  return hyRequest.post({
    url: '/operation-log/delete',
    data: { ids }
  })
}

/**
 * 按时间范围删除日志
 */
export function deleteLogByRange(startDate, endDate) {
  return hyRequest.post({
    url: '/operation-log/delete-by-range',
    data: { startDate, endDate }
  })
}

/**
 * 清空所有日志
 */
export function clearAllLogs() {
  return hyRequest.post({
    url: '/operation-log/delete-all'
  })
}
