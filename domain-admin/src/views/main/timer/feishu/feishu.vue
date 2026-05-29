<template>
  <div class="feishu-page">
    <!-- Page Header -->
    <!-- <div class="page-header">
      <h1 class="page-title">飞书机器人</h1>
      <p class="page-subtitle">发送告警通知和消息到飞书</p>
    </div> -->

    <div class="outter">
          <!-- Message Card -->
      <div class="md-card">
      <div class="md-card-header">
        <span class="md-card-title">发送消息</span>
      </div>
      <div class="md-card-body">
        <!-- 消息类型 -->
        <div class="form-row">
          <label class="form-label">消息类型</label>
          <div class="md-segment">
            <button
              :class="['md-segment-btn', { active: messageForm.type === 'text' }]"
              @click="messageForm.type = 'text'"
            >文本</button>
            <button
              :class="['md-segment-btn', { active: messageForm.type === 'alert' }]"
              @click="messageForm.type = 'alert'"
            >卡片</button>
            <button
              :class="['md-segment-btn', { active: messageForm.type === 'notification' }]"
              @click="messageForm.type = 'notification'"
            >富文本</button>
            <button
              :class="['md-segment-btn', { active: messageForm.type === 'urgent_phone' }]"
              @click="messageForm.type = 'urgent_phone'"
            >电话加急</button>
            <button
              :class="['md-segment-btn', { active: messageForm.type === 'urgent_sms' }]"
              @click="messageForm.type = 'urgent_sms'"
            >短信加急</button>
          </div>
        </div>

        <!-- 输入方式 -->
          <div class="form-row">
            <label class="form-label">输入方式</label>
            <div class="md-segment">
              <button
                :class="['md-segment-btn', { active: userInputMode === 'select' }]"
                @click="userInputMode = 'select'"
              >从列表选择</button>
              <button
                :class="['md-segment-btn', { active: userInputMode === 'manual' }]"
                @click="userInputMode = 'manual'"
              >手动输入ID</button>
            </div>
          </div>

          <!-- 从列表选择 -->
          <template v-if="userInputMode === 'select'">
            <div class="form-row">
              <label class="form-label required">选择用户</label>
              <div :class="['md-select-wrapper', { 'md-select-open': showUserDropdown }]">
                <div class="md-select-trigger" @click="openUserDropdown">
                  <input
                    class="md-select-input"
                    v-model="userSearchQuery"
                    placeholder="搜索用户姓名..."
                    @input="onUserSearchInput"
                    @focus="openUserDropdown"
                  />
                  <svg class="md-select-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                </div>
                <transition name="md-dropdown">
                  <div v-if="showUserDropdown" class="md-select-dropdown">
                    <div class="md-dropdown-loading" v-if="searchingUsers">
                      <div class="md-spinner"></div>
                      <span>搜索中...</span>
                    </div>
                    <template v-else>
                      <div
                        v-for="user in userList"
                        :key="user.open_id"
                        :class="['md-dropdown-item', { selected: messageForm.receiveId === user.open_id }]"
                        @click="selectUser(user)"
                      >
                        <div class="user-item">
                          <div class="user-avatar">{{ user.name?.charAt(0) || '?' }}</div>
                          <div class="user-info">
                            <span class="user-item-name">{{ user.name }}</span>
                            <span class="user-item-id">{{ user.employee_id || '无工号' }}</span>
                          </div>
                        </div>
                      </div>
                      <div v-if="userList.length === 0" class="md-dropdown-empty">无匹配用户</div>
                    </template>
                  </div>
                </transition>
              </div>
              <span class="form-hint">输入姓名搜索，或从下方列表中选择</span>
            </div>

          </template>

          <!-- 手动输入ID -->
          <template v-if="userInputMode === 'manual'">
            <div class="form-row">
              <label class="form-label required">用户 open_id</label>
              <div class="md-input-wrapper">
                <input
                  class="md-input"
                  v-model="messageForm.receiveId"
                  placeholder=" "
                />
                <label class="md-input-label">请输入用户的 open_id, 如: ou_xxx</label>
              </div>
              <!-- <span class="form-hint">提示：在飞书中打开用户资料，通过分享链接获取 open_id</span> -->
            </div>
          </template>

        <!-- 文本消息 -->
        <template v-if="messageForm.type === 'text'">
          <div class="form-row">
            <label class="form-label required">消息内容</label>
            <div class="md-input-wrapper md-input-wrapper--textarea">
              <textarea
                class="md-textarea"
                v-model="messageForm.text"
                rows="4"
                placeholder=" "
              ></textarea>
              <label class="md-input-label">请输入要发送的文本内容</label>
            </div>
          </div>
        </template>

        <!-- 电话加急消息 -->
        <template v-if="messageForm.type === 'urgent_phone'">
          <div class="form-row">
            <div class="urgent-phone-tip">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              <span>发送文本消息后触发电话加急通知，对方会接到飞书电话提醒</span>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label required">加急内容</label>
            <div class="md-input-wrapper md-input-wrapper--textarea">
              <textarea
                class="md-textarea"
                v-model="messageForm.urgentPhoneText"
                rows="4"
                placeholder=" "
              ></textarea>
              <label class="md-input-label">请输入要加急发送的文本内容</label>
            </div>
          </div>
        </template>

        <!-- 短信加急消息 -->
        <template v-if="messageForm.type === 'urgent_sms'">
          <div class="form-row">
            <div class="urgent-sms-tip">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              <span>发送文本消息后触发短信加急通知，对方会收到飞书短信提醒</span>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label required">加急内容</label>
            <div class="md-input-wrapper md-input-wrapper--textarea">
              <textarea
                class="md-textarea"
                v-model="messageForm.urgentSmsText"
                rows="4"
                placeholder=" "
              ></textarea>
              <label class="md-input-label">请输入要加急发送的文本内容</label>
            </div>
          </div>
        </template>

        <!-- 告警消息 -->
        <template v-if="messageForm.type === 'alert'">
          <div class="form-row">
            <label class="form-label required">告警标题</label>
            <div class="md-input-wrapper">
              <input class="md-input" v-model="messageForm.alertData.title" placeholder=" " />
              <label class="md-input-label">如：域名异常告警</label>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label required">告警级别</label>
            <div class="md-segment">
              <button
                :class="['md-segment-btn', { active: messageForm.alertData.level === 'high' }]"
                @click="messageForm.alertData.level = 'high'"
              >
                <span class="severity-dot severity-high"></span> 严重
              </button>
              <button
                :class="['md-segment-btn', { active: messageForm.alertData.level === 'medium' }]"
                @click="messageForm.alertData.level = 'medium'"
              >
                <span class="severity-dot severity-medium"></span> 警告
              </button>
              <button
                :class="['md-segment-btn', { active: messageForm.alertData.level === 'low' }]"
                @click="messageForm.alertData.level = 'low'"
              >
                <span class="severity-dot severity-low"></span> 提示
              </button>
              <button
                :class="['md-segment-btn', { active: messageForm.alertData.level === 'info' }]"
                @click="messageForm.alertData.level = 'info'"
              >
                <span class="severity-dot severity-info"></span> 信息
              </button>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label required">告警内容</label>
            <div class="md-input-wrapper md-input-wrapper--textarea">
              <textarea class="md-textarea" v-model="messageForm.alertData.message" rows="4" placeholder=" "></textarea>
              <label class="md-input-label">请输入告警详情</label>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">相关链接</label>
            <div class="md-input-wrapper">
              <input class="md-input" v-model="messageForm.alertData.url" placeholder=" " />
              <label class="md-input-label">https://...</label>
            </div>
          </div>
        </template>

        <!-- 通知消息 -->
        <template v-if="messageForm.type === 'notification'">
          <div class="form-row">
            <label class="form-label required">通知标题</label>
            <div class="md-input-wrapper">
              <input class="md-input" v-model="messageForm.notificationData.title" placeholder=" " />
              <label class="md-input-label">如：任务完成</label>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label required">通知内容</label>
            <div class="md-input-wrapper md-input-wrapper--textarea">
              <textarea class="md-textarea" v-model="messageForm.notificationData.content" rows="4" placeholder=" "></textarea>
              <label class="md-input-label">请输入通知详情</label>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">相关链接</label>
            <div class="md-input-wrapper">
              <input class="md-input" v-model="messageForm.notificationData.url" placeholder=" " />
              <label class="md-input-label">https://...</label>
            </div>
          </div>
        </template>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <button class="md-btn md-btn-primary" @click="handleSend" :disabled="sending">
            <svg v-if="sending" class="md-spinner-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="30 70"/></svg>
            <svg v-else class="btn-icon" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            {{ sending ? '发送中...' : '发送消息' }}
          </button>
          <button class="md-btn md-btn-outlined" @click="handleReset">重置</button>
        </div>
      </div>
    </div>

    <!-- History Card -->
    <div class="md-card">
      <div class="md-card-header">
        <span class="md-card-title">发送记录</span>
        <button class="md-btn-text" @click="clearHistory" v-if="sendHistory.length > 0">清空</button>
      </div>
      <div class="md-card-body">
        <div v-if="sendHistory.length === 0" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
          <p>暂无发送记录</p>
        </div>
        <div v-else class="history-list">
          <div
            v-for="(item, index) in sendHistory"
            :key="index"
            :class="['history-item', { 'history-success': item.success, 'history-error': !item.success }]"
          >
            <div class="history-item-left">
              <div :class="['history-icon-wrapper', item.success ? 'success' : 'error']">
                <svg v-if="item.success" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                <svg v-else viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
              </div>
              <div class="history-item-content">
                <span class="history-type">{{ item.typeLabel }}</span>
                <span class="history-receiver">{{ item.receiveId }}</span>
              </div>
            </div>
            <div class="history-item-right">
              <span class="history-time">{{ item.time }}</span>
              <span v-if="!item.success" class="history-error-msg">{{ item.error }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import feishuService from '@/services/main/timer/feishu'


const messageForm = reactive({
  type: 'text',
  receiveId: '',
  text: '',
  urgentPhoneText: '',
  urgentSmsText: '',
  alertData: {
    title: '',
    level: 'high',
    message: '',
    url: ''
  },
  notificationData: {
    title: '',
    content: '',
    url: ''
  }
})


const sending = ref(false)


const sendHistory = ref([])


const userList = ref([])
const quickUserList = ref([])
const loadingUsers = ref(false)
const searchingUsers = ref(false)


const userInputMode = ref('select')


const showUserDropdown = ref(false)
const userSearchQuery = ref('')

const selectUser = (user) => {
  messageForm.receiveId = user.open_id
  userSearchQuery.value = `${user.name} (${user.employee_id || '无工号'})`
  showUserDropdown.value = false
}

const onUserSearchInput = () => {
  if (userSearchQuery.value) {
    searchUsers(userSearchQuery.value)
  } else {
    userList.value = quickUserList.value
  }
  showUserDropdown.value = true
}

const openUserDropdown = () => {
  showUserDropdown.value = true
  if (userList.value.length === 0) {
    loadUserList()
  }
}


const handleClickOutside = (e) => {
  if (!e.target.closest('.md-select-wrapper')) {
    showUserDropdown.value = false
  }
}


const loadUserList = async () => {
  try {
    loadingUsers.value = true
    const response = await feishuService.getAllCompanyUsers()
    const users = response?.data

    if (users && Array.isArray(users)) {
      userList.value = users
      quickUserList.value = users.slice(0, 20)


    } else {


    }
  } catch (error) {

    ElMessage.error(`加载失败: ${error.response?.data?.message || error.message}`)
  } finally {
    loadingUsers.value = false
  }
}


const searchUsers = async (query) => {
  if (!query) {
    userList.value = quickUserList.value
    return
  }

  try {
    searchingUsers.value = true
    const response = await feishuService.searchUser(query)
    const users = response?.data?.data?.items

    if (users && Array.isArray(users)) {
      userList.value = users
      console.log('[前端] 搜索用户成功:', users.length, '个结果')
    } else {
      console.warn('[前端] 搜索未找到用户')
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
  } finally {
    searchingUsers.value = false
  }
}


const getTypeLabel = (type) => {
  const labels = {
    text: '文本消息',
    alert: '告警通知',
    notification: '系统通知',
    urgent_phone: '电话加急',
    urgent_sms: '短信加急'
  }
  return labels[type] || type
}


const validateForm = () => {
  if (!messageForm.receiveId) {
    ElMessage.warning('请选择接收者')
    return false
  }
  const { type } = messageForm
  switch (type) {
    case 'text':
      if (!messageForm.text) { ElMessage.warning('请输入消息内容'); return false }
      break
    case 'alert':
      if (!messageForm.alertData.title || !messageForm.alertData.message) { ElMessage.warning('请填写告警标题和内容'); return false }
      break
    case 'notification':
      if (!messageForm.notificationData.title || !messageForm.notificationData.content) { ElMessage.warning('请填写通知标题和内容'); return false }
      break
    case 'urgent_phone':
      if (!messageForm.urgentPhoneText) { ElMessage.warning('请输入加急内容'); return false }
      break
    case 'urgent_sms':
      if (!messageForm.urgentSmsText) { ElMessage.warning('请输入加急内容'); return false }
      break
  }
  return true
}


const handleSend = async () => {
  if (!validateForm()) return

  try {
    await ElMessageBox.confirm(
      `确认发送${getTypeLabel(messageForm.type)}？`,
      '发送确认',
      { confirmButtonText: '确认发送', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  try {
    sending.value = true

    let result
    const { type, receiveId } = messageForm

    switch (type) {
      case 'text':
        result = await feishuService.sendText({
          receiveId,
          text: messageForm.text
        })
        break

      case 'alert':
        result = await feishuService.sendAlert({
          receiveId,
          alertData: messageForm.alertData
        })
        break

      case 'notification':
        result = await feishuService.sendNotification({
          receiveId,
          notificationData: messageForm.notificationData
        })
        break

      case 'urgent_phone':
        result = await feishuService.sendUrgentPhone({
          receiveId,
          text: messageForm.urgentPhoneText
        })
        break

      case 'urgent_sms':
        result = await feishuService.sendUrgentSms({
          receiveId,
          text: messageForm.urgentSmsText
        })
        break
    }

    ElMessage.success('消息发送成功')

    sendHistory.value.unshift({
      type,
      typeLabel: getTypeLabel(type),
      receiveId,
      time: new Date().toLocaleString('zh-CN'),
      success: true
    })

    if (sendHistory.value.length > 20) {
      sendHistory.value = sendHistory.value.slice(0, 20)
    }
  } catch (error) {
    console.error('发送失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '未知错误'

    ElMessage.error(`发送失败: ${errorMsg}`)

    sendHistory.value.unshift({
      type: messageForm.type,
      typeLabel: getTypeLabel(messageForm.type),
      receiveId: messageForm.receiveId,
      time: new Date().toLocaleString('zh-CN'),
      success: false,
      error: errorMsg
    })
  } finally {
    sending.value = false
  }
}


const handleReset = () => {
  messageForm.type = 'text'
  messageForm.receiveId = ''
  messageForm.text = ''
  messageForm.urgentPhoneText = ''
  messageForm.urgentSmsText = ''
  messageForm.alertData = {
    title: '',
    level: 'high',
    message: '',
    url: ''
  }
  messageForm.notificationData = {
    title: '',
    content: '',
    url: ''
  }
  userSearchQuery.value = ''
}


const clearHistory = () => {
  sendHistory.value = []
}


onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ============================================
   Google Material Design Style
   ============================================ */

.feishu-page {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
  font-family: 'Google Sans', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1f1f1f;
  line-height: 1.6;
  background: #f1f3f4;
}

/* --- Page Header --- */
.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 400;
  color: #202124;
  margin: 0 0 4px 0;
  letter-spacing: -0.2px;
}

.page-subtitle {
  font-size: 14px;
  color: #5f6368;
  margin: 0;
}

.outter {
  display: flex;
  gap: 20px;
  height: 100%;
}

/* --- Card --- */
.md-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.1), 0 2px 6px 2px rgba(60, 64, 67, 0.06);
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.md-card:first-child {
  flex: 0 0 440px;
  min-width: 380px;
}

.md-card:last-child {
  flex: 1;
  min-width: 0;
}

.md-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 12px 12px 0 0;
}

.md-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  letter-spacing: 0.1px;
}

.md-card-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

/* --- Form Row --- */
.form-row {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #5f6368;
  margin-bottom: 8px;
  letter-spacing: 0.2px;
}

.form-label.required::after {
  content: ' *';
  color: #d93025;
}

.form-hint {
  display: block;
  font-size: 12px;
  color: #5f6368;
  margin-top: 4px;
}

/* --- Segment Control --- */
.md-segment {
  display: inline-flex;
  border: 1px solid #c4c7c5;
  border-radius: 20px;
  overflow: hidden;
}

.md-segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  color: #444746;
  background: #fff;
  border: none;
  border-right: 1px solid #c4c7c5;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
}

.md-segment-btn:last-child {
  border-right: none;
}

.md-segment-btn:hover {
  background: #f8f9fa;
}

.md-segment-btn.active {
  background: #d3e3fd;
  color: #041e49;
}

/* --- Severity Dots --- */
.severity-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.severity-high { background: #d93025; }
.severity-medium { background: #e37400; }
.severity-low { background: #f9ab00; }
.severity-info { background: #1a73e8; }

/* --- Urgent Phone Tip --- */
.urgent-phone-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fad2cf;
  border-radius: 8px;
  font-size: 13px;
  color: #601410;
  line-height: 1.5;
}

.urgent-phone-tip svg {
  flex-shrink: 0;
}

/* --- Urgent Sms Tip --- */
.urgent-sms-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #d3e3fd;
  border-radius: 8px;
  font-size: 13px;
  color: #041e49;
  line-height: 1.5;
}

.urgent-sms-tip svg {
  flex-shrink: 0;
}

/* --- Material Outlined Input --- */
.md-input-wrapper {
  position: relative;
}

.md-input {
  width: 100%;
  padding: 13px 16px;
  font-size: 14px;
  color: #1f1f1f;
  background: #e8eaed;
  border: none;
  border-bottom: 2px solid #747775;
  border-radius: 8px 8px 0 0;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
  font-family: inherit;
  box-sizing: border-box;
}

.md-input:focus {
  border-bottom-color: #0b57d0;
  /* background: #d3e3fd; */
  padding: 13px 16px;
}

.md-input:focus + .md-input-label,
.md-input:not(:placeholder-shown) + .md-input-label {
  top: 2px;
  left: 12px;
  font-size: 11px;
  color: #0b57d0;
  background: transparent;
  padding: 0 4px;
}

.md-input-label {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  font-size: 14px;
  color: #5f6368;
  pointer-events: none;
  transition: all 0.15s ease;
}

/* --- Textarea --- */
.md-input-wrapper--textarea {
  position: relative;
}

.md-textarea {
  width: 100%;
  padding: 13px 16px;
  font-size: 14px;
  color: #1f1f1f;
  background: #e8eaed;
  border: none;
  border-bottom: 2px solid #747775;
  border-radius: 8px 8px 0 0;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s ease, background 0.15s ease;
  font-family: inherit;
  box-sizing: border-box;
  min-height: 100px;
}

.md-textarea:focus {
  border-bottom-color: #0b57d0;
  /* background: #d3e3fd; */
}

.md-input-wrapper--textarea .md-input-label {
  top: 16px;
  transform: none;
}

.md-textarea:focus + .md-input-label,
.md-textarea:not(:placeholder-shown) + .md-input-label {
  top: -8px;
  left: 12px;
  font-size: 11px;
  color: #0b57d0;
  background: transparent;
  padding: 0 4px;
  transform: none;
}

/* --- Custom Select Dropdown --- */
.md-select-wrapper {
  position: relative;
}

.md-select-trigger {
  display: flex;
  align-items: center;
  border: none;
  border-bottom: 2px solid #747775;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  transition: border-color 0.15s ease;
  background: #e8eaed;
}

.md-select-wrapper.md-select-open .md-select-trigger {
  border-bottom-color: #0b57d0;
}

.md-select-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 14px;
  color: #202124;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
}

.md-select-arrow {
  width: 24px;
  height: 24px;
  fill: #5f6368;
  margin-right: 8px;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.md-select-wrapper.md-select-open .md-select-arrow {
  transform: rotate(180deg);
}

.md-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 1px 3px 0 rgba(60, 64, 67, 0.15), 0 4px 8px 3px rgba(60, 64, 67, 0.1);
  max-height: 280px;
  overflow-y: auto;
  z-index: 100;
}

.md-dropdown-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.md-dropdown-item:hover {
  background: #d3e3fd;
}

.md-dropdown-item.selected {
  background: #c2e7ff;
}

.md-dropdown-empty {
  padding: 16px;
  text-align: center;
  color: #5f6368;
  font-size: 14px;
}

.md-dropdown-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #5f6368;
  font-size: 14px;
}

/* --- Dropdown Transition --- */
.md-dropdown-enter-active,
.md-dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.md-dropdown-enter-from,
.md-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* --- User/Group Items in Dropdown --- */
.user-item, .group-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar, .group-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8f0fe;
  color: #1a73e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.group-avatar svg {
  width: 18px;
  height: 18px;
  fill: #1a73e8;
}

.user-info, .group-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-item-name, .group-item-name {
  font-size: 14px;
  color: #202124;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-item-id, .group-item-id {
  font-size: 12px;
  color: #5f6368;
  font-family: 'Roboto Mono', 'Courier New', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- Chips --- */
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.md-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #444746;
  background: #e8eaed;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  user-select: none;
}

.md-chip:hover {
  background: #dadce0;
}

.md-chip-selected {
  background: #d3e3fd;
  color: #041e49;
  border-color: #0b57d0;
}

.chip-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #0b57d0;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
}

.chip-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.md-chip-action {
  color: #0b57d0;
  background: #f8f9fa;
  border: 1px solid #747775;
}

.md-chip-action:hover {
  background: #d3e3fd;
}

.md-chip-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* --- Buttons --- */
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.md-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  font-family: inherit;
  letter-spacing: 0.2px;
}

.md-btn-primary {
  background: #0b57d0;
  color: #fff;
  box-shadow: 0 1px 3px 0 rgba(11, 87, 208, 0.3);
}

.md-btn-primary:hover {
  background: #0842a0;
  box-shadow: 0 2px 6px 0 rgba(11, 87, 208, 0.4);
}

.md-btn-primary:disabled {
  background: #a8c7fa;
  box-shadow: none;
  cursor: not-allowed;
}

.md-btn-outlined {
  background: #fff;
  color: #0b57d0;
  border: 1px solid #747775;
}

.md-btn-outlined:hover {
  background: #d3e3fd;
}

.md-btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #0b57d0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 8px;
  font-family: inherit;
}

.md-btn-text:hover {
  background: #d3e3fd;
}

.btn-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* --- Spinner --- */
.md-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e8eaed;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.md-spinner-sm {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- Empty State --- */
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #5f6368;
}

.empty-icon {
  width: 48px;
  height: 48px;
  fill: #dadce0;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* --- History --- */
.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  margin: 2px 0;
  border-radius: 12px;
  border-bottom: none;
  transition: background 0.15s ease;
}

.history-item:hover {
  background: #e8eaed;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.history-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-icon-wrapper.success {
  background: #e6f4ea;
}

.history-icon-wrapper.success svg {
  fill: #1e8e3e;
  width: 18px;
  height: 18px;
}

.history-icon-wrapper.error {
  background: #fce8e6;
}

.history-icon-wrapper.error svg {
  fill: #d93025;
  width: 18px;
  height: 18px;
}

.history-item-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-type {
  font-size: 14px;
  font-weight: 500;
  color: #202124;
}

.history-receiver {
  font-size: 12px;
  color: #5f6368;
  font-family: 'Roboto Mono', 'Courier New', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  margin-left: 16px;
}

.history-time {
  font-size: 12px;
  color: #5f6368;
}

.history-error-msg {
  font-size: 12px;
  color: #d93025;
  max-width: 200px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Scrollbar (Google style) --- */
.history-list::-webkit-scrollbar,
.md-select-dropdown::-webkit-scrollbar {
  width: 8px;
}

.history-list::-webkit-scrollbar-track,
.md-select-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb,
.md-select-dropdown::-webkit-scrollbar-thumb {
  background: #dadce0;
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb:hover,
.md-select-dropdown::-webkit-scrollbar-thumb:hover {
  background: #bdc1c6;
}

/* --- Responsive: Mobile vertical layout --- */
@media (max-width: 768px) {
  .feishu-page {
    padding: 12px;
    height: auto;
  }

  .outter {
    flex-direction: column;
    height: auto;
  }

  .md-card:first-child {
    flex: none;
    min-width: 0;
  }

  .md-card:last-child {
    flex: none;
  }

  .md-card-body {
    padding: 16px;
  }

  .md-segment {
    flex-wrap: wrap;
    border-radius: 12px;
  }

  .md-segment-btn {
    flex: 1;
    justify-content: center;
    min-width: 70px;
    font-size: 13px;
    padding: 8px 10px;
  }

  .history-list {
    max-height: 300px;
  }
}
</style>
