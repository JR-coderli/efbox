import hyRequest from '@/services/request'

/**
 * Pushnami 服务
 */
export default {
  /**
   * 获取配置
   */
  getConfig() {
    return hyRequest.get({
      url: '/pushnami/config'
    })
  },

  /**
   * 更新配置
   */
  updateConfig(data) {
    return hyRequest.put({
      url: '/pushnami/config',
      data
    })
  },

  /**
   * 获取操作日志
   */
  getOperationLogs(params) {
    return hyRequest.get({
      url: '/pushnami/operation-log',
      params
    })
  },

  /**
   * 获取执行日志
   */
  getExecutionLogs(params) {
    return hyRequest.get({
      url: '/pushnami/execution-log',
      params
    })
  },

  /**
   * 获取统计信息
   */
  getStats(params) {
    return hyRequest.get({
      url: '/pushnami/stats',
      params
    })
  },

  /**
   * 触发任务
   */
  triggerTask(task) {
    return hyRequest.post({
      url: `/pushnami/trigger/${task}`
    })
  },

  /**
   * 停止脚本执行
   */
  stopExecution(id) {
    return hyRequest.post({
      url: '/pushnami/stop',
      data: { id }
    })
  },

  /**
   * 获取 Pushnami 服务状态
   */
  getServiceStatus() {
    return hyRequest.get({
      url: '/pushnami/service-status'
    })
  },

  /**
   * 获取任务详细状态（包含每个任务的运行状态和下次运行时间）
   */
  getTasksStatus() {
    return hyRequest.get({
      url: '/pushnami/tasks-status'
    })
  },

  /**
   * 取消待执行的任务
   */
  cancelScheduledTask(taskType) {
    return hyRequest.post({
      url: '/pushnami/cancel-scheduled',
      data: { taskType }
    })
  },

  /**
   * 关闭浏览器
   */
  closeBrowser() {
    return hyRequest.post({
      url: '/pushnami/close-browser'
    })
  },

  /**
   * 检查浏览器健康状态
   */
  checkHealth() {
    return hyRequest.get({
      url: '/pushnami/health'
    })
  },

  /**
   * 下载日志文件
   */
  downloadLog(id) {
    return hyRequest.get({
      url: `/pushnami/download-log/${id}`,
      responseType: 'blob'
    })
  },

  /**
   * 获取运行日志（实时缓存）
   */
  getRunningLogs() {
    return hyRequest.get({
      url: '/pushnami/running-logs'
    })
  }
}
