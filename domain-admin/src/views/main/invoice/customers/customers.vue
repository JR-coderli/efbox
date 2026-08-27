<template>
  <div class="customer-page">
    <!-- 表格列表 -->
    <customer-content
      ref="contentRef"
      :content-config="contentConfig"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
    >
      <!-- 其他邮箱 -->
      <template #normal_emails="scope">
        <el-tooltip
          v-if="scope.normal_emails && scope.normal_emails.length !== 0"
          effect="light"
          placement="top"
          :show-after="500"
        >
          <template #content>
            <div class="email-tooltip-content">
              <div v-for="item in scope.normal_emails" :key="item.id">{{ item.email }}</div>
            </div>
          </template>
          <div class="email-cell">
            <span class="email-text">{{ scope.normal_emails[0].email }}</span>
            <span v-if="scope.normal_emails.length > 1" class="email-count">+{{ scope.normal_emails.length - 1 }}</span>
          </div>
        </el-tooltip>
        <span v-else class="empty-placeholder"></span>
      </template>

      <!-- 接收邮箱 -->
      <template #send_emails="scope">
        <el-tooltip
          v-if="scope.send_emails && scope.send_emails.length !== 0"
          effect="light"
          placement="top"
          :show-after="500"
        >
          <template #content>
            <div class="email-tooltip-content">
              <div v-for="item in scope.send_emails" :key="item.id">{{ item.email }}</div>
            </div>
          </template>
          <div class="email-cell">
            <span class="email-text">{{ scope.send_emails[0].email }}</span>
            <span v-if="scope.send_emails.length > 1" class="email-count">+{{ scope.send_emails.length - 1 }}</span>
          </div>
        </el-tooltip>
        <span v-else class="empty-placeholder"></span>
      </template>

      <!-- 付款周期 -->
      <template #payment_cycle_days="scope">
        <div
          v-if="!isEditing(scope.id, 'payment_cycle_days')"
          @dblclick="startEdit($event, scope.id, 'payment_cycle_days', scope.payment_cycle_days)"
          class="editable-cell"
          :class="{ 'is-empty': !scope.payment_cycle_days }"
        >
          <template v-if="scope.payment_cycle_days">
            <span class="payment-badge">{{ scope.payment_cycle_days }}</span>
            <span class="payment-unit">Day</span>
          </template>
          <span v-else class="edit-hint"></span>
        </div>

        <!-- 编辑状态 -->
        <div v-else @wheel.prevent class="editing-cell">
          <el-input-number
            v-model="editingCell.value"
            ref="inputRef"
            @blur="saveEdit"
            class="payment-input"
            :precision="0"
            :controls="false"
          />
        </div>
      </template>

      <!-- 注意事项 -->
      <template #remark="scope">
        <div
          v-if="!isEditing(scope.id, 'remark')"
          class="editable-cell remark-cell"
          :class="{ 'has-content': scope.remark, 'is-empty': !scope.remark }"
          @dblclick="startInlineEdit($event, scope.id, 'remark', scope.remark)"
        >
          <span v-if="scope.remark" class="remark-text">{{ scope.remark }}</span>
          <span v-else class="edit-hint"></span>
        </div>
        <div v-else class="inline-edit-placeholder"></div>
      </template>

      <!-- 开票主体 -->
      <template #invoice_entity="scope">
        <span
          v-if="scope.invoice_entity && scope.invoice_entity.name"
          class="invoice-entity-name"
          :style="{ backgroundColor: getEntityColor(scope.invoice_entity.name).bg, color: getEntityColor(scope.invoice_entity.name).text }"
        >
          {{ scope.invoice_entity.name }}
        </span>
        <span v-else class="empty-placeholder"></span>
      </template>

      <!-- 用户授权（仅 system:customers:grant 权限用户可见此列） -->
      <template #user_grant="scope">
        <div
          class="grant-cell"
          :class="{ 'is-active': grantBubble.customerId === scope.id }"
          @dblclick.stop="openGrantBubble($event, scope)"
        >
          <template v-if="scope.granted_users && scope.granted_users.length > 0">
            <span class="grant-count-badge">{{ scope.granted_users.length }}人</span>
            <span class="grant-names">{{ scope.granted_users.map(u => u.name || u.nickname).join('、') }}</span>
          </template>
          <span v-else class="grant-empty-hint"></span>
        </div>
      </template>
    </customer-content>

    <!-- 授权气泡（teleport 到 body 避免被表格遮挡） -->
    <teleport to="body">
      <div
        v-if="grantBubble.customerId"
        class="grant-bubble-backdrop"
        @mousedown="closeGrantBubble"
      >
        <div
          class="grant-bubble"
          :style="grantBubbleStyle"
          @mousedown.stop
        >
          <div class="grant-bubble-header">
            <div class="grant-bubble-title">附件授权</div>
            <div class="grant-bubble-subtitle">{{ grantBubble.customerName }}</div>
            <button class="grant-close-btn" title="关闭" @click="closeGrantBubble">✕</button>
          </div>

          <!-- 已授权列表（可撤销） -->
          <div class="grant-list" v-if="grantBubble.grantedUsers.length > 0">
            <div v-for="u in grantBubble.grantedUsers" :key="u.id" class="grant-list-item">
              <span class="grant-avatar" :style="getAvatarStyle(u)">{{ getAvatarText(u) }}</span>
              <div class="grant-user-meta">
                <span class="grant-user-name">{{ u.name || u.nickname }}</span>
                <span v-if="u.role_name" class="grant-user-role">{{ u.role_name }}</span>
              </div>
              <button class="grant-revoke-btn" @click="handleRevoke(u)">撤销</button>
            </div>
          </div>
          <div v-else class="grant-list-empty">暂无授权，该客户下附件仅创建者和特权角色可见</div>

          <!-- 添加授权 -->
          <div class="grant-add">
            <select v-model="grantBubble.selectedUserId" class="grant-select">
              <option value="" disabled>选择要授权的用户…</option>
              <option v-for="u in grantableUserOptions" :key="u.id" :value="u.id">
                {{ u.name }}{{ u.role_name ? `（${u.role_name}）` : '' }}
              </option>
            </select>
            <button class="grant-add-btn" :disabled="!grantBubble.selectedUserId" @click="handleGrant">授权</button>
          </div>
          <div class="grant-hint">授权后，该用户可查看此客户下全部附件（含他人创建），并可直接删改</div>
        </div>
      </div>
    </teleport>

    <!-- 注意事项行内编辑（teleport 到 body 避免被表格遮挡） -->
    <teleport to="body">
      <div
        v-if="editingCell.field === 'remark'"
        class="inline-edit-overlay"
        @mousedown="saveInlineEdit"
      >
        <div
          class="inline-edit-wrapper"
          :style="inlineEditStyle"
          @mousedown.stop
        >
          <textarea
            v-model="editingCell.value"
            ref="inlineInputRef"
            class="inline-edit-textarea"
            placeholder="请输入注意事项..."
            @input="autoResizeTextarea"
            @keydown.esc.prevent="cancelInlineEdit"
          />
        </div>
      </div>
    </teleport>

    <!-- 弹窗 -->
    <customer-modal
      ref="modalRef"
      :modal-config="modalConfig"
    />
  </div>
</template>

<script setup>
import CustomerContent from './c-cpns/customer-content.vue'
import contentConfig from './config/content.config'
import CustomerModal from './c-cpns/customer-modal.vue'
import modalConfig from './config/modal.config'

import { nextTick, ref, computed } from 'vue'
import useSystemStore from '@/stores/main/system/system'

const systemStore = useSystemStore()


// ===== 用户授权（客户附件查看授权） =====
const grantBubble = ref({
  customerId: null,
  customerName: '',
  rect: null,
  grantedUsers: [],   // [{id, name, nickname, role_name?}]
  selectedUserId: ''
})
const grantableUsers = ref([]) // 可授权的用户简表

const grantableUserOptions = computed(() => {
  // 排除已授权的用户，避免重复授权
  const grantedIds = new Set(grantBubble.value.grantedUsers.map(u => u.id))
  return grantableUsers.value.filter(u => !grantedIds.has(u.id))
})

const grantBubbleStyle = computed(() => {
  const rect = grantBubble.value.rect
  if (!rect) return {}
  const bubbleWidth = 340
  let left = rect.left + rect.width / 2 - bubbleWidth / 2
  if (left < 12) left = 12
  const maxLeft = window.innerWidth - bubbleWidth - 12
  if (left > maxLeft) left = maxLeft

  const bubbleHeight = 320
  const gap = 10
  let top
  const spaceBelow = window.innerHeight - rect.bottom
  if (spaceBelow >= bubbleHeight + gap) {
    top = rect.bottom + gap
  } else if (rect.top >= bubbleHeight + gap) {
    top = rect.top - bubbleHeight - gap
  } else {
    top = 12
  }
  return { left: `${left}px`, top: `${top}px`, width: `${bubbleWidth}px` }
})

async function openGrantBubble(event, row) {
  grantBubble.value = {
    customerId: row.id,
    customerName: row.short_name || row.full_name || `客户#${row.id}`,
    rect: event.currentTarget.getBoundingClientRect(),
    grantedUsers: (row.granted_users || []).slice(),
    selectedUserId: ''
  }
  // 懒加载一次可授权用户列表
  if (grantableUsers.value.length === 0) {
    try {
      grantableUsers.value = await systemStore.getGrantableUsersAction()
    } catch {
      grantableUsers.value = []
    }
  }
}

function closeGrantBubble() {
  grantBubble.value = {
    customerId: null,
    customerName: '',
    rect: null,
    grantedUsers: [],
    selectedUserId: ''
  }
}

// 同步授权数据到表格行（不重新拉列表，避免打断滚动位置）
function syncGrantedToRow(customerId, grantedUsers) {
  const content = contentRef.value
  if (!content?.finalList) return
  const row = content.finalList.find(r => r.id === customerId)
  if (row) row.granted_users = grantedUsers.map(u => ({ id: u.id, name: u.name, nickname: u.nickname }))
}

async function handleGrant() {
  const { customerId, selectedUserId } = grantBubble.value
  if (!customerId || !selectedUserId) return
  try {
    const data = await systemStore.grantCustomerAttachmentAction(customerId, selectedUserId)
    grantBubble.value.grantedUsers = data?.grantedUsers || []
    grantBubble.value.selectedUserId = ''
    syncGrantedToRow(customerId, grantBubble.value.grantedUsers)
    ElNotification({ message: '授权成功', type: 'success', duration: 2000 })
  } catch {
    ElNotification({ message: '授权失败', type: 'error' })
  }
}

async function handleRevoke(user) {
  const { customerId } = grantBubble.value
  if (!customerId) return
  try {
    const data = await systemStore.revokeCustomerAttachmentAction(customerId, user.id)
    grantBubble.value.grantedUsers = data?.grantedUsers || []
    syncGrantedToRow(customerId, grantBubble.value.grantedUsers)
    ElNotification({ message: '已撤销授权', type: 'success', duration: 2000 })
  } catch {
    ElNotification({ message: '撤销失败', type: 'error' })
  }
}


// 谷歌风格头像：取名字首字符，背景色由名字哈希决定（复用开票实体的调色板）
function getAvatarText(u) {
  const name = u.name || u.nickname || '?'
  return name.trim().charAt(0).toUpperCase()
}

function getAvatarStyle(u) {
  const name = u.name || u.nickname || '?'
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const { bg, text } = defaultColors[hash % defaultColors.length]
  return { backgroundColor: bg, color: text }
}


const modalRef = ref()
const contentRef = ref(null)
const inlineInputRef = ref(null)
const editingCell = ref({
  id: null,
  field: null,
  value: '',
  initialValue: ''
})
const inlineEditStyle = ref({})


const entityColors = [
  { name: 'Eflow', bg: '#e8f0fe', text: '#1967d2' },
  { name: 'Terra', bg: '#e6f4ea', text: '#137333' },
]


const defaultColors = [
  { bg: '#e8f0fe', text: '#1967d2' },
  { bg: '#e6f4ea', text: '#137333' },
  { bg: '#fce8e6', text: '#c5221f' },
  { bg: '#fef7e0', text: '#b06000' },
  { bg: '#f3e8fd', text: '#7b1fa2' },
]


function getEntityColor(name) {

  for (const item of entityColors) {
    if (name === item.name) {
      return { bg: item.bg, text: item.text }
    }
  }

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return defaultColors[hash % defaultColors.length]
}


function handleNewClick() {
  modalRef.value?.setModalVisible('new')
}

function handleEditClick(rowData) {
  modalRef.value?.setModalVisible('edit', rowData)
}


function startEdit(event, id, field, value) {
  editingCell.value = {
    id,
    field,
    value,
    initialValue: value
  }

  nextTick(() => {
    inputRef.value?.focus()
  })
}


const inputRef = ref(null)

function startInlineEdit(event, id, field, value) {
  const cellEl = event.currentTarget
  const cellRect = cellEl.getBoundingClientRect()
  editingCell.value = { id, field, value: value || '', initialValue: value || '' }

  inlineEditStyle.value = {
    position: 'absolute',
    left: `${cellRect.left - 14}px`,
    top: `${cellRect.top - 1}px`,
    minWidth: `${cellRect.width + 2}px`,
    minHeight: `${cellRect.height + 2}px`
  }

  nextTick(() => {
    const textarea = inlineInputRef.value
    if (textarea) {
      textarea.focus()
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.max(cellRect.height, textarea.scrollHeight)}px`
    }
  })
}

function autoResizeTextarea() {
  const textarea = inlineInputRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  const newHeight = Math.max(30, textarea.scrollHeight)
  textarea.style.height = `${newHeight}px`
}

function saveInlineEdit() {
  const { id, field, value, initialValue } = editingCell.value
  if (value !== initialValue && field === 'remark') {
    systemStore.editCustomerRemarkAction(id, { [field]: value })
  }
  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
  inlineEditStyle.value = {}
}

function cancelInlineEdit() {
  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
  inlineEditStyle.value = {}
}


function saveEdit() {
  const { id, field, value, initialValue } = editingCell.value

  if (value !== initialValue && field === 'payment_cycle_days') {
    systemStore.editCustomerPayDayAction(id, { [field]: value })
  }

  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
}


function isEditing(id, field) {
  return editingCell.value.id === id && editingCell.value.field === field
}


function handleWheel(event) {
  const { deltaY } = event
  const step = 1

  if (deltaY < 0) {
    editingCell.value.value += step
  } else if (deltaY > 0) {
    editingCell.value.value -= step
  }

  if (editingCell.value.value < 0) {
    editingCell.value.value = 0
  }
}
</script>

<style lang="less">
.customer-page {
  width: 100%;
  height: 100%;
}


.el-tooltip__popper.is-light {
  background-color: #fff !important;
  border: 1px solid #e8eaed !important;

  .el-tooltip__arrow::before {
    border: 1px solid #e8eaed !important;
    background-color: #fff !important;
  }
}
</style>

<style lang="less" scoped>

// ===== 用户授权列 =====
.grant-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 40px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, background-color 0.15s;

  &:hover, &.is-active {
    border-color: #1a73e8;
    background-color: #f0f5ff;
  }

  .grant-count-badge {
    flex-shrink: 0;
    padding: 2px 8px;
    background-color: #e6f4ea;
    color: #137333;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  }

  .grant-names {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: #202124;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  .grant-empty-hint {
    width: 8px;
    height: 8px;
    background-color: #e8eaed;
    border-radius: 50%;
  }

  // 与付款周期/注意事项等可编辑列一致：悬停空单元格显示"双击编辑"
  &:hover > .grant-empty-hint {
    width: auto;
    height: auto;
    background-color: transparent;
    border-radius: 0;
    color: #9aa0a6;
    font-size: 13px;

    &::after {
      content: '双击编辑';
    }
  }
}

.grant-bubble-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.grant-bubble {
  position: absolute;
  background: #fff;
  border-radius: 8px;
  // Material 高程：env light + key light 双层投影
  box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
  padding: 16px 16px 12px;
  box-sizing: border-box;
  z-index: 10000;
  font-family: 'Google Sans', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.grant-bubble-header {
  position: relative;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8eaed;
  margin-bottom: 4px;

  .grant-bubble-title {
    font-size: 16px;
    font-weight: 500;
    color: #202124;
    line-height: 24px;
  }

  .grant-bubble-subtitle {
    font-size: 13px;
    color: #5f6368;
    line-height: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .grant-close-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: #5f6368;
    font-size: 14px;
    cursor: pointer;
    border-radius: 50%;
    transition: background-color 0.15s;

    &:hover { background-color: #f1f3f4; color: #202124; }
  }
}

.grant-list {
  max-height: 180px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background-color: #dadce0; border-radius: 2px; }
}

.grant-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background-color 0.15s;

  &:hover { background-color: #f1f3f4; }

  .grant-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    user-select: none;
  }

  .grant-user-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.4;
  }

  .grant-user-name {
    font-size: 14px;
    color: #202124;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .grant-user-role {
    font-size: 12px;
    color: #5f6368;
  }

  // Material 文字按钮：无边框，悬停蓝色浅底
  .grant-revoke-btn {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: #1a73e8;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover { background-color: rgba(26, 115, 232, 0.08); }
  }
}

.grant-list-empty {
  font-size: 13px;
  color: #5f6368;
  text-align: center;
  padding: 18px 8px;
  line-height: 1.6;
}

.grant-add {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #e8eaed;

  // Material 描边输入框：灰描边 → 悬停加深 → 聚焦蓝框，自绘下拉箭头
  .grant-select {
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 32px 0 12px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 14px;
    color: #202124;
    outline: none;
    appearance: none;
    cursor: pointer;
    background: #fff url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='%235f6368'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 10px center;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover { border-color: #9aa0a6; }
    &:focus { border-color: #1a73e8; box-shadow: 0 0 0 1px #1a73e8; }
  }

  // Material 填充按钮：禁用态为灰底灰字（非透明）
  .grant-add-btn {
    flex-shrink: 0;
    height: 36px;
    border: none;
    background: #1a73e8;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    padding: 0 20px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s, box-shadow 0.15s;

    &:hover:not(:disabled) {
      background: #1765cc;
      box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
    }
    &:disabled { background: #f1f3f4; color: #9aa0a6; cursor: not-allowed; }
  }
}

.grant-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #5f6368;
  line-height: 1.6;
}

</style>

<style lang="less" scoped>

.email-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #202124;
  overflow: hidden;

  .email-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .email-count {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background-color: #e8f0fe;
    color: #1a73e8;
    font-size: 11px;
    border-radius: 3px;
    font-weight: 500;
  }
}

.email-tooltip-content {
  div {
    font-size: 13px;
    line-height: 1.6;
    color: #202124;
  }
}

.empty-placeholder {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}


.invoice-entity-name {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}


.editable-cell {
  cursor: text;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid transparent;

  &:hover {
    border-color: #1a73e8;
    background-color: #f0f5ff;
    color: #1a73e8;
  }


  &.has-content {
    color: #202124;
    display: flex;
    align-items: center;
  }


  &.is-empty {
    color: #9aa0a6;
    display: flex;
    align-items: center;
  }

  .remark-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }
}

.remark-cell {
  &.has-content {
    justify-content: flex-start;
  }
}

.edit-hint {
  user-select: none;
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}

.editable-cell:hover > .edit-hint {
  width: auto;
  height: auto;
  background-color: transparent;
  border-radius: 0;
  color: #9aa0a6;
  font-size: 13px;

  &::after {
    content: '双击编辑';
  }
}

.payment-badge {
  display: inline-block;
  padding: 4px 10px;
  background-color: #e8f0fe;
  color: #1967d2;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.payment-unit {
  color: #202124;
  font-size: 13px;
  margin-left: 4px;
  flex-shrink: 0;
}


.editing-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 300px;

  .payment-input {
    width: 80px;

    :deep(.el-input__wrapper) {
      border-radius: 4px;
      border: 1px solid #1a73e8;
      padding: 0 8px;
    }

    :deep(.el-input__inner) {
      text-align: center;
    }
  }

  .remark-textarea {
    width: 200px;
    min-width: 150px;
    max-width: 250px;
    padding: 6px 8px;
    border: 1px solid #1a73e8;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    outline: none;
    line-height: 1.4;
    overflow-y: auto;
    word-break: break-all;

    &:focus {
      border-color: #1a73e8;
    }
  }
}


.inline-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.inline-edit-placeholder {
  min-height: 40px;
}

.inline-edit-wrapper {
  box-sizing: border-box;
  background: #fff !important;
  border: 2px solid #1a73e8;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(26, 115, 232, 0.15);
  overflow: visible;
  padding: 0;
}

.inline-edit-textarea {
  display: block;
  width: 100%;
  min-height: 30px;
  padding: 4px 6px;
  border: none;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  outline: none;
  color: #202124;
  word-break: break-all;
  background: #fff !important;
  box-sizing: border-box;
}


@media (max-width: 768px) {
  .editing-cell {
    .remark-textarea {
      min-width: 150px;
      font-size: 12px;
    }

    .payment-input {
      width: 60px;
    }
  }

  .email-list .email-item {
    font-size: 12px;
  }

  .payment-badge {
    font-size: 12px;
    padding: 3px 8px;
  }

  .payment-unit {
    font-size: 12px;
  }
}
</style>
