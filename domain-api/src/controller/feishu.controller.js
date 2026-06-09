const fs = require('fs')
const path = require('path')
const feishuService = require('../service/feishu.service')

class FeishuController {
  /**
   * 处理飞书webhook事件
   * 1. url_verification: 飞书验证回调地址
   * 2. 其他消息事件: 处理具体的业务逻辑
   */
  async handleWebhook(ctx, next) {
    const body = ctx.request.body

    console.log('=== 飞书推送事件 ===')
    console.log('时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))
    console.log('事件类型:', body.type)
    console.log('完整数据:', JSON.stringify(body, null, 2))


    if (body.type === 'url_verification') {
      console.log('[飞书验证] 返回 challenge:', body.challenge)
      ctx.body = {
        challenge: body.challenge
      }
      return
    }


    if (body.type === 'event_callback') {
      const { event } = body


      switch (event.type) {
        case 'message': // 收到消息
          await this.handleMessage(event)
          break
        case 'im.message.receive_v1': // 收到消息（新版本）
          await this.handleMessageV1(event)
          break
        default:
          console.log('[飞书事件] 未处理的事件类型:', event.type)
      }
    }


    ctx.body = { code: 0 }
    ctx.status = 200
  }

  /**
   * 处理消息事件（旧版）
   */
  async handleMessage(event) {
    console.log('[飞书消息] 收到消息:', {
      chatType: event.chat_type,
      msgType: event.msg_type,
      content: event.content,
      sender: event.sender
    })


    let content = {}
    try {
      content = JSON.parse(event.content)
    } catch (e) {
      content = { text: event.content }
    }


    if (event.msg_type === 'text') {
      await this.handleTextMessage(event.sender.sender_id, content.text, event.chat_type)
    }
  }

  /**
   * 处理消息事件（新版 V1）
   */
  async handleMessageV1(event) {
    console.log('[飞书消息 V1] 收到消息:', {
      messageType: event.message.message_type,
      chatType: event.message.chat_type,
      content: event.message.content,
      sender: event.sender
    })

    const { message, sender } = event


    let content = {}
    try {
      content = JSON.parse(message.content)
    } catch (e) {
      content = { text: message.content }
    }


    if (message.message_type === 'text') {
      await this.handleTextMessage(sender.sender_id, content.text, message.chat_type)
    }
  }

  /**
   * 处理文本消息（命令处理）
   */
  async handleTextMessage(senderId, text, chatType) {
    console.log('[飞书命令] 收到命令:', { senderId, text, chatType })


    const command = text.trim().toLowerCase()


    switch (command) {
      case 'help':
      case '帮助':
        await feishuService.sendText(senderId, '可用命令:\n- help: 查看帮助\n- status: 查看系统状态', chatType === 'group' ? 'chat' : 'user')
        break

      case 'status':
      case '状态':
        await feishuService.sendNotification(senderId, {
          title: '系统状态',
          content: '系统运行正常\n域名监控服务: 运行中\nPushnami任务: 运行中',
          time: new Date().toLocaleString('zh-CN')
        }, chatType === 'group' ? 'chat' : 'user')
        break

      default:

        await feishuService.sendText(senderId, `未知命令: ${text}\n输入 "help" 查看可用命令`, chatType === 'group' ? 'chat' : 'user')
    }
  }

  /**
   * 发送文本消息
   * POST /feishu/send/text
   * Body: { receiveId, text, receiveType }
   */
  async sendText(ctx) {
    const { receiveId, text } = ctx.request.body

    if (!receiveId || !text) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: receiveId 或 text' }
      return
    }

    try {
      const result = await feishuService.sendText(receiveId, text)
      ctx.body = { code: 0, message: '发送成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '发送失败', error: error.message }
    }
  }

  /**
   * 发送富文本消息
   * POST /feishu/send/post
   * Body: { receiveId, content, receiveType }
   */
  async sendPost(ctx) {
    const { receiveId, content } = ctx.request.body

    if (!receiveId || !content) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: receiveId 或 content' }
      return
    }

    try {
      const result = await feishuService.sendPost(receiveId, content)
      ctx.body = { code: 0, message: '发送成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '发送失败', error: error.message }
    }
  }

  /**
   * 发送卡片消息
   * POST /feishu/send/card
   * Body: { receiveId, cardContent, receiveType }
   */
  async sendCard(ctx) {
    const { receiveId, cardContent } = ctx.request.body

    if (!receiveId || !cardContent) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: receiveId 或 cardContent' }
      return
    }

    try {
      const result = await feishuService.sendCard(receiveId, cardContent)
      ctx.body = { code: 0, message: '发送成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '发送失败', error: error.message }
    }
  }

  /**
   * 发送告警通知
   * POST /feishu/send/alert
   * Body: { receiveId, alertData, receiveType }
   *
   * alertData: { title, level, message, url, time }
   */
  async sendAlert(ctx) {
    const { receiveId, alertData } = ctx.request.body

    if (!receiveId || !alertData) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: receiveId 或 alertData' }
      return
    }

    try {
      const result = await feishuService.sendAlert(receiveId, alertData)
      ctx.body = { code: 0, message: '发送成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '发送失败', error: error.message }
    }
  }

  /**
   * 发送通用通知
   * POST /feishu/send/notification
   * Body: { receiveId, notificationData, receiveType }
   *
   * notificationData: { title, content, url, time }
   */
  async sendNotification(ctx) {
    const { receiveId, notificationData } = ctx.request.body

    if (!receiveId || !notificationData) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: receiveId 或 notificationData' }
      return
    }

    try {
      const result = await feishuService.sendNotification(receiveId, notificationData)
      ctx.body = { code: 0, message: '发送成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '发送失败', error: error.message }
    }
  }

  /**
   * 发送电话加急消息
   * POST /feishu/send/urgent-phone
   * Body: { receiveId, text }
   */
  async sendUrgentPhone(ctx) {
    const { receiveId, text } = ctx.request.body

    if (!receiveId || !text) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: receiveId 或 text' }
      return
    }

    try {
      const result = await feishuService.sendUrgentPhone(receiveId, text)
      ctx.body = { code: 0, message: '电话加急发送成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '电话加急发送失败', error: error.message }
    }
  }

  /**
   * 发送短信加急消息
   * POST /feishu/send/urgent-sms
   * Body: { receiveId, text }
   */
  async sendUrgentSms(ctx) {
    const { receiveId, text } = ctx.request.body

    if (!receiveId || !text) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: receiveId 或 text' }
      return
    }

    try {
      const result = await feishuService.sendUrgentSms(receiveId, text)
      ctx.body = { code: 0, message: '短信加急发送成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '短信加急发送失败', error: error.message }
    }
  }

  /**
   * 批量发送消息
   * POST /feishu/send/batch
   * Body: { userIds, text }
   */
  async batchSend(ctx) {
    const { userIds, text } = ctx.request.body

    if (!userIds || !Array.isArray(userIds) || !text) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: userIds (数组) 或 text' }
      return
    }

    try {
      const results = await feishuService.batchSendText(userIds, text)
      const successCount = results.filter(r => r.success).length
      ctx.body = {
        code: 0,
        message: `发送完成: ${successCount}/${userIds.length} 成功`,
        data: results
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '发送失败', error: error.message }
    }
  }

  /**
   * 批量发送告警
   * POST /feishu/send/batch-alert
   * Body: { userIds, alertData }
   */
  async batchSendAlert(ctx) {
    const { userIds, alertData } = ctx.request.body

    if (!userIds || !Array.isArray(userIds) || !alertData) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少必要参数: userIds (数组) 或 alertData' }
      return
    }

    try {
      const results = await feishuService.batchSendAlert(userIds, alertData)
      const successCount = results.filter(r => r.success).length
      ctx.body = {
        code: 0,
        message: `发送完成: ${successCount}/${userIds.length} 成功`,
        data: results
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '发送失败', error: error.message }
    }
  }

  /**
   * 获取用户列表
   * GET /feishu/users?pageSize=50&pageToken=xxx
   */
  async getUserList(ctx) {
    const { pageSize, pageToken } = ctx.query

    try {
      const result = await feishuService.getUserList({ pageSize, pageToken })
      ctx.body = { code: 0, message: '获取成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '获取失败', error: error.message }
    }
  }

  /**
   * 搜索用户
   * GET /feishu/users/search?query=xxx
   */
  async searchUser(ctx) {
    const { query } = ctx.query

    if (!query) {
      ctx.status = 400
      ctx.body = { code: -1, message: '缺少搜索关键词' }
      return
    }

    try {
      const result = await feishuService.searchUser(query)
      ctx.body = { code: 0, message: '搜索成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '搜索失败', error: error.message }
    }
  }

  /**
   * 获取全公司所有用户
   * GET /feishu/users/all
   */
  async getAllCompanyUsers(ctx) {
    try {
      const result = await feishuService.getAllCompanyUsers()
      ctx.body = { code: 0, message: '获取成功', data: result }
    } catch (error) {
      ctx.status = 500
      ctx.body = { code: -1, message: '获取失败', error: error.message }
    }
  }
}

module.exports = new FeishuController()
