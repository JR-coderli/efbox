<template>
  <div class="domains-page">
    <!-- 表格1内容区域 (重要域名) -->
    <domains-content
      :content-config="contentConfigImport"
      :menu-config="{ levelText: '取消置顶' }"
      ref="importContentRef"
      :show-create-btn="true"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
      @delete-click="handleDeleteBtnClick"
      list-type="import_list"
      data-source-type="import"
    >
      <!-- 域名状态 -->
      <template #is_normal="scope">
        <div class="status-tags">
          <span
            v-if="scope[scope.prop02] === 1"
            class="status-tag status-safe"
          >安全</span>
          <span
            v-else-if="scope[scope.prop02] === 0"
            class="status-tag status-danger"
          >危险</span>

          <span
            v-if="scope[scope.prop01] === 1"
            class="status-tag status-accessible"
          >可访问</span>
          <span
            v-else-if="scope[scope.prop01] === 0"
            class="status-tag status-inaccessible"
          >不可访问</span>
        </div>
      </template>

      <!-- 域名落地页 -->
      <template #landing_page_url="scope">
        <a
          :href="scope.landing_page_url"
          target="_blank"
          class="link-text"
        >{{ scope[scope.prop] }}</a>
      </template>

      <!-- 备注双击编辑 -->
      <template #remark="scope">
        <EditableRemark
          :remark="scope.remark"
          :domain-id="scope.id"
          @updated="handleRemarkUpdated"
        />
      </template>

      <!-- 用途列 - 带背景颜色 -->
      <template #purpose="scope">
        <span
          v-if="scope.purpose"
          class="purpose-tag"
          :style="{ backgroundColor: getPurposeColor(scope.purpose) }"
        >
          {{ scope.purpose }}
        </span>
        <span v-else class="purpose-empty">-</span>
      </template>

      <!-- 自定义操作列 -->
      <template #handler="scope">
        <div class="action-buttons">
          <button
            class="icon-btn check-btn"
            @click="handleCheckDomain(scope)"
            :disabled="checkingMap.has(scope.id)"
            title="检测域名"
          >
            <svg v-if="!checkingMap.has(scope.id)" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <svg v-else class="spinning" viewBox="0 0 24 24">
              <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 14c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
            </svg>
          </button>
          <button
            class="icon-btn edit-btn"
            @click="handleEditClick(scope)"
            title="编辑"
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button
            class="icon-btn delete-btn"
            @click="handleDeleteBtnClick(scope.id)"
            title="删除"
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </template>
    </domains-content>

    <!-- 表格2内容区域 (普通域名) -->
    <domains-content
      :content-config="contentConfig"
      :menu-config="{ levelText: '置顶' }"
      ref="normalContentRef"
      :show-create-btn="false"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
      @delete-click="handleDeleteBtnClick"
      @upload-file="handleUploadFile"
      list-type="normal_list"
      data-source-type="normal"
    >
      <!-- 域名状态 -->
      <template #is_normal="scope">
        <div class="status-tags">
          <span
            v-if="scope[scope.prop02] === 1"
            class="status-tag status-safe"
          >安全</span>
          <span
            v-else-if="scope[scope.prop02] === 0"
            class="status-tag status-danger"
          >危险</span>

          <span
            v-if="scope[scope.prop01] === 1"
            class="status-tag status-accessible"
          >可访问</span>
          <span
            v-else-if="scope[scope.prop01] === 0"
            class="status-tag status-inaccessible"
          >不可访问</span>
        </div>
      </template>

      <!-- 域名落地页 -->
      <template #landing_page_url="scope">
        <a
          :href="scope.landing_page_url"
          target="_blank"
          class="link-text"
        >{{ scope.landing_page_url }}</a>
      </template>

      <!-- 备注双击编辑 -->
      <template #remark="scope">
        <EditableRemark
          :remark="scope.remark"
          :domain-id="scope.id"
          @updated="handleRemarkUpdated"
        />
      </template>

      <!-- 用途列 - 带背景颜色 -->
      <template #purpose="scope">
        <span
          v-if="scope.purpose"
          class="purpose-tag"
          :style="{ backgroundColor: getPurposeColor(scope.purpose) }"
        >
          {{ scope.purpose }}
        </span>
        <span v-else class="purpose-empty">-</span>
      </template>

      <!-- 自定义操作列 -->
      <template #handler="scope">
        <div class="action-buttons">
          <button
            class="icon-btn check-btn"
            @click="handleCheckDomain(scope)"
            :disabled="checkingMap.has(scope.id)"
            title="检测域名"
          >
            <svg v-if="!checkingMap.has(scope.id)" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <svg v-else class="spinning" viewBox="0 0 24 24">
              <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 14c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
            </svg>
          </button>
          <button
            class="icon-btn edit-btn"
            @click="handleEditClick(scope)"
            title="编辑"
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button
            class="icon-btn delete-btn"
            @click="handleDeleteBtnClick(scope.id)"
            title="删除"
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </template>
    </domains-content>

    <!-- 弹窗区域 -->
    <domains-modal
      ref="modalRef"
      :modal-config="modalConfig"
      :list-type="currentListType"
    >
      <!-- 自定义用途选择插槽 -->
      <template #purpose>
        <div class="purpose-select-wrapper">
          <el-select
            v-model="purposeValue"
            placeholder="请选择用途"
            clearable
            filterable
            allow-create
            @change="handlePurposeChange"
          >
            <el-option
              v-for="item in purposeOptions"
              :key="item.id"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
          <el-button
            link
            type="primary"
            @click="openPurposeManageDialog"
            class="manage-btn"
          >
            管理用途
          </el-button>
        </div>
      </template>
    </domains-modal>

    <page-upload-modal
      ref="uploadModalRef"
      page-name="domains"
      upload-url="/file/domains"
      file-name="domains_file"
    />

    <!-- 用途管理对话框 -->
    <el-dialog
      v-model="purposeManageVisible"
      title="用途管理"
      width="440px"
      class="purpose-manage-dialog"
      :close-on-click-modal="false"
    >
      <div class="purpose-manage-content">
        <div class="purpose-input-row">
          <el-input
            v-model="newPurposeName"
            placeholder="输入新用途名称"
            clearable
            @keyup.enter="addPurpose"
            class="purpose-input"
            size="large"
          />
          <el-button @click="addPurpose" class="add-btn">
            <svg viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            添加
          </el-button>
        </div>
        <div class="purpose-list">
          <div
            v-for="item in purposeOptions"
            :key="item.id"
            class="purpose-item"
            :class="{ 'system-purpose': item.is_system }"
          >
            <span class="purpose-name">{{ item.name }}</span>
            <span v-if="item.is_system" class="system-badge">系统</span>
            <button
              v-if="!item.is_system"
              class="delete-icon-btn"
              @click="removePurpose(item.id)"
              title="删除"
            >
              <svg viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
          <div v-if="purposeOptions.length === 0" class="empty-state">
            <p>暂无用途数据</p>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import PageSearch from '@/components/page-search/page-search.vue'
import searchConfig from './config/search.config'

import DomainsContent from './c-cpns/domains.content.vue'
import contentConfig from './config/content.config'
import contentConfigImport from './config/content.config_import'

import DomainsModal from './c-cpns/domains.modal.vue'
import modalConfig from './config/modal.config'

import PageUploadModal from '@/components/page-upload-modal/page-upload-modal.vue'
import hyRequest from '@/services/request'

import usePageContent from '@/hooks/usePageContent';
import usePageModal from '@/hooks/usePageModal'
import { onMounted, ref, nextTick, reactive } from 'vue'
import useSystemStore from '@/stores/main/system/system'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'


import EditableRemark from './c-cpns/EditableRemark.vue'


const { contentRefs, handleQueryClick, handleResetClick } = usePageContent()


const { modalRef, uploadModalRef } = usePageModal()


const importContentRef = ref(null)
const normalContentRef = ref(null)


const purposeValue = ref('')


const purposeOptions = ref([])
const purposeManageVisible = ref(false)
const newPurposeName = ref('')


const currentListType = ref('list')


const checkingMap = reactive(new Map())



function getPurposeColor(purpose) {
  if (!purpose) return 'transparent'


  const predefinedColors = {
    '推广': '#e8f0fe',
    '测试': '#fef7e0',
    '生产': '#ceead6',
    '开发': '#fad2cf',
    '备用': '#e8dff5',
    '临时': '#e8eaed',
    '正式': '#ceead6',
    '预发布': '#feefe3',
  }


  if (predefinedColors[purpose]) {
    return predefinedColors[purpose]
  }


  let hash = 0
  for (let i = 0; i < purpose.length; i++) {
    hash = purpose.charCodeAt(i) + ((hash << 5) - hash)
  }


  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 92%)`
}


function handleNewClick(listType) {
  purposeValue.value = ''
  currentListType.value = listType
  modalRef.value?.setModalVisible(true)
}


function handleEditClick(itemData, listType = 'list') {
  purposeValue.value = itemData.purpose || ''
  currentListType.value = listType
  modalRef.value?.setModalVisible(false, itemData)
}


function handleUploadFile() {
  uploadModalRef.value?.setModalVisible()
}


async function fetchPurposeOptions() {
  try {
    const res = await hyRequest.get({
      url: '/domain-purposes/active'
    })
    if (res.code === 0) {
      purposeOptions.value = res.data || []
    }
  } catch (error) {
    console.error('获取用途列表失败:', error)
  }
}


function handlePurposeChange(value) {
  nextTick(() => {
    if (modalRef.value) {
      const formData = modalRef.value.formData || {}
      formData.purpose = value
    }
  })
}


async function openPurposeManageDialog() {
  purposeManageVisible.value = true
  await fetchPurposeOptions()
}


async function addPurpose() {
  if (!newPurposeName.value.trim()) {
    ElMessage.warning('请输入用途名称')
    return
  }

  try {
    const res = await hyRequest.post({
      url: '/domain-purposes',
      data: {
        name: newPurposeName.value.trim(),
        sort_order: purposeOptions.value.length + 1
      }
    })
    if (res.code === 0) {
      ElMessage.success('添加成功')
      newPurposeName.value = ''
      await fetchPurposeOptions()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (error) {
    console.error('添加用途失败:', error)
    ElMessage.error('添加失败')
  }
}


async function removePurpose(id) {
  try {
    const res = await hyRequest.delete({
      url: `/domain-purposes/${id}`
    })
    if (res.code === 0) {
      ElMessage.success('删除成功')
      await fetchPurposeOptions()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    console.error('删除用途失败:', error)
    ElMessage.error('删除失败')
  }
}


function handleRemarkUpdated() {
  importContentRef.value?.refreshData()
  normalContentRef.value?.refreshData()
}


async function handleDeleteBtnClick(id) {

  try {
    await ElMessageBox.confirm(
      '删除后数据无法恢复，是否确定删除？',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )


    await hyRequest.delete({
      url: `/domains/${id}`
    })
    ElMessage.success('删除成功')

    if (importContentRef.value) {
      if (importContentRef.value.selectedPurpose) {
        importContentRef.value.fetchAllDataForFilter()
      } else {
        importContentRef.value.fetchPageListData()
      }
    }
    if (normalContentRef.value) {
      if (normalContentRef.value.selectedPurpose) {
        normalContentRef.value.fetchAllDataForFilter()
      } else {
        normalContentRef.value.fetchPageListData()
      }
    }
  } catch (error) {

    if (error === 'cancel') {
      return
    }
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}




async function handleCheckDomain(row) {

  checkingMap.set(row.id, true)


  const urlToCheck = row.landing_page_url || `https://${row.existing_domain}`

  try {

    const res = await hyRequest.post({
      url: '/domains/check',
      data: { url: urlToCheck }
    })

    if (res.code === 0) {
      const { accessible, isDanger, threatTypes } = res.data


      ElNotification({
        title: '检测结果',
        message: `
          <div style="line-height: 1.8;">
            <div><strong>检测地址:</strong> ${urlToCheck}</div>
            <div style="margin-top: 8px;">
              <strong>可访问性:</strong>
              <span style="color: ${accessible ? '#137333' : '#c5221f'}; margin-left: 8px;">
                ${accessible ? '✓ 可访问' : '✗ 不可访问'}
              </span>
            </div>
            <div>
              <strong>安全性:</strong>
              <span style="color: ${isDanger ? '#c5221f' : '#137333'}; margin-left: 8px;">
                ${isDanger ? '✗ 危险' : '✓ 安全'}
              </span>
            </div>
          </div>
        `,
        dangerouslyUseHTMLString: true,
        duration: 5000,
        type: (!accessible || isDanger) ? 'warning' : 'success'
      })








    } else {
      ElMessage.error(res.message || '检测失败')
    }
  } catch (error) {
    console.error('检测失败:', error)
    ElMessage.error('检测失败: ' + error.message)
  } finally {

    checkingMap.delete(row.id)
  }
}

onMounted(() => {
  contentRefs.value = [importContentRef.value, normalContentRef.value]
  fetchPurposeOptions()
})
</script>

<style lang="less" scoped>
.domains-page {
  padding: 10px;
  // max-width: 1600px;
  margin: 0 auto;
}


.status-tags {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}


.purpose-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #202124;
  white-space: nowrap;
}

.purpose-empty {
  color: #9aa0a6;
  font-size: 13px;
}


.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;

  &.status-safe {
    background-color: #e6f4ea;
    color: #137333;
  }

  &.status-danger {
    background-color: #fce8e6;
    color: #c5221f;
  }

  &.status-accessible {
    background-color: #e6f4ea;
    color: #137333;
  }

  &.status-inaccessible {
    background-color: #fef7e0;
    color: #b06000;
  }
}


.link-text {
  color: #1a73e8;
  text-decoration: none;
  font-size: 13px;

  &:hover {
    text-decoration: underline;
  }
}


.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}


:deep(.el-table-fixed-column--right) {
  background: #fff !important;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;

  svg {
    width: 18px;
    height: 18px;
    fill: #5f6368;
  }

  &:hover:not(:disabled) {
    background: #f1f3f4;

    svg {
      fill: #202124;
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &.check-btn:hover:not(:disabled) svg {
    fill: #1a73e8;
  }

  &.edit-btn:hover:not(:disabled) svg {
    fill: #1a73e8;
  }

  &.delete-btn:hover:not(:disabled) svg {
    fill: #c5221f;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}


.purpose-select-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;

  .el-select {
    flex: 1;
  }

  :deep(.manage-btn) {
    flex-shrink: 0;
    color: white;


    &:hover {
      background-color: #1557b0 !important;
      color: white !important;
    }
  }
}


.purpose-manage-content {
  .purpose-input-row {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;

    .purpose-input {
      flex: 1;
    }

    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0 20px;
      height: 40px;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;

      svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      &:hover {
        background-color: #1557b0;
      }

      &:active {
        background-color: #0d47a1;
      }
    }
  }

  .purpose-list {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid #e8eaed;
    border-radius: 12px;
    background: #fff;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f3f4;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #dadce0;
      border-radius: 4px;

      &:hover {
        background: #bdc1c6;
      }
    }
  }

  .purpose-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f3f4;
    transition: background-color 0.2s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: #f8f9fa;
    }

    &.system-purpose {
      background-color: #f8f9fa;
      .purpose-name {
        color: #5f6368;
        font-weight: 500;
      }
    }

    .purpose-name {
      font-size: 14px;
      color: #202124;
      font-weight: 400;
      flex: 1;
    }

    .system-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      background: #e8f0fe;
      color: #1a73e8;
      font-size: 11px;
      border-radius: 4px;
      margin-right: 8px;
    }

    .delete-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;

      svg {
        width: 18px;
        height: 18px;
        fill: #5f6368;
      }

      &:hover {
        background-color: #fce8e6;

        svg {
          fill: #c5221f;
        }
      }

      &:active {
        background-color: #fad2cf;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #9aa0a6;

    svg {
      width: 64px;
      height: 64px;
      fill: #dadce0;
      margin-bottom: 16px;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}


:deep(.purpose-manage-dialog) {
  .el-dialog {
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .el-dialog__header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f1f3f4;
    margin-right: 0;
  }

  .el-dialog__title {
    font-size: 18px;
    font-weight: 500;
    color: #202124;
  }

  .el-dialog__headerbtn {
    top: 20px;
    right: 20px;
    width: 32px;
    height: 32px;

    .el-dialog__close {
      color: #5f6368;
      font-size: 20px;

      &:hover {
        color: #202124;
      }
    }
  }

  .el-dialog__body {
    padding: 20px 24px;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid #f1f3f4;
  }

  .el-input__wrapper {
    border-radius: 8px;
    border: 1px solid #dadce0;
    box-shadow: none;
    transition: all 0.2s;

    &:hover {
      border-color: #1a73e8;
    }

    &.is-focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }
  }

  .cancel-btn {
    background-color: #f1f3f4;
    color: #5f6368;
    border: none;
    border-radius: 8px;
    padding: 0 20px;
    height: 36px;
    font-size: 14px;
    font-weight: 500;

    &:hover {
      background-color: #e8eaed;
      color: #202124;
    }

    &:active {
      background-color: #dadce0;
    }
  }
}
</style>
