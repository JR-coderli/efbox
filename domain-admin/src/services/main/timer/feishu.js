import hyRequest from '@/services/request'

/**
 * 飞书机器人服务
 */
export default {
  /**
   * 发送文本消息
   * @param {Object} data - { receiveId, text, receiveType }
   */
  sendText(data) {
    return hyRequest.post({
      url: '/feishu/send/text',
      data
    })
  },

  /**
   * 发送富文本消息
   * @param {Object} data - { receiveId, content, receiveType }
   */
  sendPost(data) {
    return hyRequest.post({
      url: '/feishu/send/post',
      data
    })
  },

  /**
   * 发送卡片消息
   * @param {Object} data - { receiveId, cardContent, receiveType }
   */
  sendCard(data) {
    return hyRequest.post({
      url: '/feishu/send/card',
      data
    })
  },

  /**
   * 发送告警通知
   * @param {Object} data - { receiveId, alertData, receiveType }
   * alertData: { title, level, message, url, time }
   */
  sendAlert(data) {
    return hyRequest.post({
      url: '/feishu/send/alert',
      data
    })
  },

  /**
   * 发送通用通知
   * @param {Object} data - { receiveId, notificationData, receiveType }
   * notificationData: { title, content, url, time }
   */
  sendNotification(data) {
    return hyRequest.post({
      url: '/feishu/send/notification',
      data
    })
  },

  /**
   * 发送电话加急消息
   * @param {Object} data - { receiveId, text }
   */
  sendUrgentPhone(data) {
    return hyRequest.post({
      url: '/feishu/send/urgent-phone',
      data
    })
  },

  /**
   * 发送短信加急消息
   * @param {Object} data - { receiveId, text }
   */
  sendUrgentSms(data) {
    return hyRequest.post({
      url: '/feishu/send/urgent-sms',
      data
    })
  },

  /**
   * 批量发送消息
   * @param {Object} data - { userIds, text }
   */
  batchSend(data) {
    return hyRequest.post({
      url: '/feishu/send/batch',
      data
    })
  },

  /**
   * 批量发送告警
   * @param {Object} data - { userIds, alertData }
   */
  batchSendAlert(data) {
    return hyRequest.post({
      url: '/feishu/send/batch-alert',
      data
    })
  },

  /**
   * 获取用户列表
   * @param {Object} params - { pageSize, pageToken }
   */
  getUserList(params) {
    return hyRequest.get({
      url: '/feishu/users',
      params
    })
  },

  /**
   * 搜索用户
   * @param {string} query - 搜索关键词
   */
  searchUser(query) {
    return hyRequest.get({
      url: '/feishu/users/search',
      params: { query }
    })
  },

  /**
   * 获取全公司所有用户
   */
  getAllCompanyUsers() {
    return hyRequest.get({
      url: '/feishu/users/all'
    })
  }
}
