const { Client } = require('@larksuiteoapi/node-sdk')
const axios = require('axios')
const feishuConfig = require('../config/feishu')

/**
 * 飞书机器人服务
 * 支持发送文本、富文本、卡片消息到私聊和群聊
 */
class FeishuService {
  constructor() {

    this.client = new Client({
      appId: feishuConfig.APP_ID,
      appSecret: feishuConfig.APP_SECRET
    })


    this.tokenCache = {
      tenantAccessToken: null,
      expireTime: 0
    }
  }

  /**
   * 获取 tenant_access_token
   */
  async getAccessToken() {
    const tokenResponse = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: feishuConfig.APP_ID,
        app_secret: feishuConfig.APP_SECRET
      }
    )

    const accessToken = tokenResponse?.data?.tenant_access_token

    if (!accessToken) {
      console.error('获取token失败:', tokenResponse.data)
      throw new Error('获取飞书access_token失败')
    }

    return accessToken
  }

  /**
   * 使用 axios 发送消息（通用方法）
   * @param {string} receiveId - 接收者ID
   * @param {string} msgType - 消息类型: text / post / interactive
   * @param {string} content - JSON 字符串格式的消息内容
   */
  async sendMessage(receiveId, msgType, content) {
    const accessToken = await this.getAccessToken()

    const requestBody = {
      msg_type: msgType,
      receive_id: receiveId,
      content: content
    }

    const response = await axios.post(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`,
      JSON.stringify(requestBody),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  }

  /**
   * 发送文本消息
   * @param {string} receiveId - 接收者ID（用户open_id或群chat_id）
   * @param {string} text - 消息内容
   * @param {string} receiveType - 接收类型: 'user'（私聊）或 'chat'（群聊）
   */
  async sendText(receiveId, text) {
    try {
      return await this.sendMessage(receiveId, 'text', JSON.stringify({ text }))
    } catch (error) {
      console.error('[飞书服务] 发送文本消息失败:', error.message)
      throw error
    }
  }

  /**
   * 发送富文本消息
   * @param {string} receiveId - 接收者ID
   * @param {Array} content - 富文本内容结构
   * @param {string} receiveType - 接收类型: 'user' 或 'chat'
   *
   * content示例:
   * [
   *   [{ tag: "text", text: "文本内容", style: ["bold"] }],
   *   [{ tag: "a", text: "链接文字", href: "https://xxx.com" }],
   *   [{ tag: "at", user_id: "ou_xxx", text: "@某人" }]
   * ]
   */
  async sendPost(receiveId, content, title = '') {
    try {
      const postBody = {
        zh_cn: {
          title: title,
          content: content
        }
      }
      return await this.sendMessage(receiveId, 'post', JSON.stringify(postBody))
    } catch (error) {
      console.error('[飞书服务] 发送富文本消息失败:', error.message)
      throw error
    }
  }

  /**
   * 发送卡片消息
   * @param {string} receiveId - 接收者ID
   * @param {Object} cardContent - 卡片内容
   */
  async sendCard(receiveId, cardContent) {
    try {
      return await this.sendMessage(receiveId, 'interactive', JSON.stringify(cardContent))
    } catch (error) {
      console.error('[飞书服务] 发送卡片消息失败:', error.message)
      throw error
    }
  }

  /**
   * 发送告警通知（卡片形式）
   * @param {string} receiveId - 接收者ID
   * @param {Object} alertData - 告警数据
   * @param {string} receiveType - 接收类型
   */
  async sendAlert(receiveId, alertData) {
    const { title, level, message, url, time } = alertData


    const levelColors = {
      high: 'red',
      medium: 'orange',
      low: 'yellow',
      info: 'blue'
    }

    const card = {
      header: {
        title: {
          content: title || '系统告警',
          tag: 'plain_text'
        },
        template: levelColors[level] || 'red'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**告警级别:** ${level || '未知'}\n**告警时间:** ${time || new Date().toLocaleString('zh-CN')}\n**告警内容:**\n${message || '-'}`
          }
        }
      ]
    }


    if (url) {
      card.elements.push({
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: {
              content: '查看详情',
              tag: 'plain_text'
            },
            type: 'default',
            url: url
          }
        ]
      })
    }

    return await this.sendCard(receiveId, card)
  }

  /**
   * 发送通用通知（富文本形式）
   * @param {string} receiveId - 接收者ID
   * @param {Object} notificationData - 通知数据
   * @param {string} receiveType - 接收类型
   */
  async sendNotification(receiveId, notificationData) {
    const { title, content, url, time } = notificationData

    const postContent = [

      [
        {
          tag: 'text',
          text: `【${title || '系统通知'}】\n\n`,
          style: ['bold']
        }
      ]
    ]


    if (content) {
      postContent.push([
        {
          tag: 'text',
          text: `${content}\n`
        }
      ])
    }


    postContent.push([
      {
        tag: 'text',
        text: `\n时间: ${time || new Date().toLocaleString('zh-CN')}`,
        style: ['secondary']
      }
    ])


    if (url) {
      postContent.push([
        {
          tag: 'text',
          text: '\n'
        },
        {
          tag: 'a',
          text: '查看详情 >>',
          href: url
        }
      ])
    }

    return await this.sendPost(receiveId, postContent, title || '系统通知')
  }

  /**
   * 发送电话加急消息
   * 先发送文本消息，再调用加急电话 API
   * @param {string} receiveId - 接收者ID（用户open_id）
   * @param {string} text - 消息内容
   */
  async sendUrgentPhone(receiveId, text) {
    try {

      const msgResult = await this.sendText(receiveId, text)
      const messageId = msgResult?.data?.message_id

      if (!messageId) {
        throw new Error('发送消息后未获取到 message_id')
      }


      const accessToken = await this.getAccessToken()
      const response = await axios.patch(
        `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/urgent_phone?user_id_type=open_id`,
        { user_id_list: [receiveId] },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('[飞书服务] 电话加急发送成功')
      return response.data
    } catch (error) {
      console.error('[飞书服务] 电话加急发送失败:', error.message)
      throw error
    }
  }

  /**
   * 发送短信加急消息
   * 先发送文本消息，再调用飞书短信加急 API
   * @param {string} receiveId - 接收者 open_id
   * @param {string} text - 消息内容
   */
  async sendUrgentSms(receiveId, text) {
    try {

      const msgResult = await this.sendText(receiveId, text)
      const messageId = msgResult?.data?.message_id

      if (!messageId) {
        throw new Error('发送消息后未获取到 message_id')
      }


      const accessToken = await this.getAccessToken()
      const response = await axios.patch(
        `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/urgent_sms?user_id_type=open_id`,
        { user_id_list: [receiveId] },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('[飞书服务] 短信加急发送成功')
      return response.data
    } catch (error) {
      console.error('[飞书服务] 短信加急发送失败:', error.message)
      throw error
    }
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   */
  async getUserInfo(userId) {
    try {
      const response = await this.client.contact.user.get({
        data: {
          user_id_type: 'open_id',
          user_id: userId
        }
      })

      console.log('[飞书服务] 获取用户信息成功:', userId)
      return response
    } catch (error) {
      console.error('[飞书服务] 获取用户信息失败:', error.message)
      throw error
    }
  }

  /**
   * 批量发送消息给多个用户
   * @param Array<string userIds> - 用户ID列表
   * @param {string} text - 消息内容
   */
  async batchSendText(userIds, text) {
    const results = []
    for (const userId of userIds) {
      try {
        const result = await this.sendText(userId, text, 'user')
        results.push({ userId, success: true, result })
      } catch (error) {
        results.push({ userId, success: false, error: error.message })
      }
    }
    return results
  }

  /**
   * 批量发送告警给多个用户
   * @param {Array<string} userIds - 用户ID列表
   * @param {Object} alertData - 告警数据
   */
  async batchSendAlert(userIds, alertData) {
    const results = []
    for (const userId of userIds) {
      try {
        const result = await this.sendAlert(userId, alertData, 'user')
        results.push({ userId, success: true, result })
      } catch (error) {
        results.push({ userId, success: false, error: error.message })
      }
    }
    return results
  }

  /**
   * 获取用户列表
   * @param {Object} options - 查询选项 { pageSize, pageToken }
   */
  async getUserList(options = {}) {
    try {
      const response = await this.client.contact.user.list({
        data: {
          user_id_type: 'open_id',
          page_size: options.pageSize || 50,
          page_token: options.pageToken || ''
        }
      })

      console.log('[飞书服务] 获取用户列表成功')
      return response
    } catch (error) {
      console.error('[飞书服务] 获取用户列表失败:', error.message)
      throw error
    }
  }

  /**
   * 搜索用户
   * @param {string} query - 搜索关键词（姓名或手机号）
   */
  async searchUser(query) {
    try {
      const response = await this.client.contact.user.search({
        data: {
          query: query,
          user_id_type: 'open_id'
        }
      })

      console.log('[飞书服务] 搜索用户成功:', query)
      return response
    } catch (error) {
      console.error('[飞书服务] 搜索用户失败:', error.message)
      throw error
    }
  }

  /**
 * 获取【全公司所有用户】（应用身份权限）
 */
async getAllCompanyUsers() {
  try {
    const allUsers = []
    let pageToken = ''

    do {
      const res = await this.client.contact.user.findByDepartment({
        params: {
          user_id_type: 'open_id',
          department_id_type: 'open_department_id',
          department_id: '0',       // 全公司根部门
          fetch_child: true,        // 递归所有子部门
          page_size: 50,
          page_token: pageToken
        }
      })

      const { items, page_token, has_more } = res.data
      allUsers.push(...items)
      pageToken = has_more ? page_token : ''
    } while (pageToken)


    return allUsers
  } catch (err) {
    console.error('[飞书服务] 获取全公司用户失败：', err.message)
    throw err
  }
}
}


module.exports = new FeishuService()
