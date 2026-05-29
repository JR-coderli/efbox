<template>
  <div class="customer-page">
    <!-- 表格列表 -->
    <customer-content
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
          @dblclick="startEdit(scope.id, 'payment_cycle_days', scope.payment_cycle_days)"
          class="editable-cell"
          :class="{ 'is-empty': !scope.payment_cycle_days }"
        >
          <template v-if="scope.payment_cycle_days">
            <span class="payment-badge">{{ scope.payment_cycle_days }}</span>
            <span class="payment-unit">Day</span>
          </template>
          <span v-else class="edit-hint">双击编辑</span>
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

      <!-- 备注 -->
      <template #remark="scope">
        <el-tooltip
          v-if="!isEditing(scope.id, 'remark')"
          effect="light"
          placement="top"
          :show-after="500"
          :content="scope.remark || '双击编辑备注'"
        >
          <div
            @dblclick="startEdit(scope.id, 'remark', scope.remark)"
            class="editable-cell"
            :class="{ 'has-content': scope.remark, 'is-empty': !scope.remark }"
          >
            <span v-if="scope.remark" class="remark-text">{{ scope.remark }}</span>
            <span v-else class="edit-hint">双击编辑</span>
          </div>
        </el-tooltip>

        <!-- 编辑状态 - 使用 Teleport 挂载到 body -->
        <teleport to="body" v-if="isEditing(scope.id, 'remark')">
          <div
            class="remark-edit-overlay"
            @click.self="saveEdit"
          >
            <textarea
              v-model="editingCell.value"
              ref="inputRef"
              @blur="saveEdit"
              @keydown.esc="cancelEdit"
              rows="3"
              class="remark-textarea-floating"
              placeholder="请输入备注..."
            />
            <div class="edit-hint-text">按 Esc 取消，点击外部保存</div>
          </div>
        </teleport>
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
    </customer-content>

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

import { nextTick, ref } from 'vue'
import useSystemStore from '@/stores/main/system/system'

const systemStore = useSystemStore()


const modalRef = ref()
const inputRef = ref(null)
const editingCell = ref({
  id: null,
  field: null,
  value: '',
  initialValue: ''
})


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


function startEdit(id, field, value) {
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


function saveEdit() {
  const { id, field, value, initialValue } = editingCell.value

  if (value !== initialValue && field === 'remark') {
    systemStore.editCustomerRemarkAction(id, { [field]: value })
  }

  if (value !== initialValue && field === 'payment_cycle_days') {
    systemStore.editCustomerPayDayAction(id, { [field]: value })
  }

  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
}


function cancelEdit() {
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
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: #1a73e8;
  }


  &.has-content {
    color: #202124;
  }


  &.is-empty {
    color: #9aa0a6;
  }

  .remark-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.edit-hint {
  color: #9aa0a6;
  font-size: 13px;
  user-select: none;
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


.remark-edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;

  .remark-textarea-floating {
    width: 100%;
    max-width: 500px;
    min-height: 100px;
    padding: 12px 16px;
    border: 1px solid #1a73e8;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    outline: none;
    background-color: #fff;
    line-height: 1.5;
    word-break: break-all;

    &:focus {
      border-color: #1a73e8;
    }
  }

  .edit-hint-text {
    margin-top: 12px;
    font-size: 13px;
    color: #5f6368;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 6px 12px;
    border-radius: 4px;
  }
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
