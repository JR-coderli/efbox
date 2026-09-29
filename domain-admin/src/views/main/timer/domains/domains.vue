<template>
  <div class="domains-page">
    <!-- 检测状态条：最后检测时间来自 url_detection_database 脚本每轮检测完成的上报；
         时间长期不推进 = 脚本没在跑（15 分钟一轮，留 5 分钟余量判"疑似停跑"）。
         点击状态条展开/收起替换过程日志 -->
    <div class="check-status-bar" @click="toggleLogs" title="点击展开/收起替换过程日志">
      <span class="coverage-arrow" :class="{ expanded: logsVisible }">▶</span>
      <span class="status-dot" :class="checkStatusClass"></span>
      <span class="status-label">最后检测时间：</span>
      <span class="status-time">{{ lastCheckTime || '暂无检测记录' }}</span>
      <span class="status-hint">{{ checkStatusText }}</span>
    </div>

    <!-- 替换过程日志面板（点击上方状态条展开）：
         url_detection_database 写入 domain_replacement_logs 的全过程事件流
         (替换/复核/异地核验/告警/移出监控, 不只结果也有过程) -->
    <div v-if="logsVisible" class="status-logs-panel" v-loading="logsLoading">
      <div class="coverage-toolbar">
        <el-switch v-model="showLatestRoundOnly" active-text="只看最新一轮" inactive-text="显示全部" />
        <el-input
          v-model="logsDomainFilter"
          placeholder="按域名过滤, 如 pro.xxx.com"
          clearable
          size="small"
          style="width: 260px; margin-left: 14px"
          @keyup.enter="loadLogs"
          @clear="loadLogs"
        />
        <span v-if="logsTableData.length" style="margin-left: 10px; color: #909399; font-size: 12px">
          共 {{ logsTableData.length }} 条（新事件在前）
        </span>
      </div>
      <el-table :data="logsTableData" size="small" max-height="420" class="coverage-table">
        <el-table-column label="时间" width="150" align="center">
          <template #default="{ row }">{{ row.created_at }}</template>
        </el-table-column>
        <el-table-column label="域名" prop="domain" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="log-domain-chip" :style="{ backgroundColor: domainBgColor(row.domain) }">{{ row.domain }}</span>
          </template>
        </el-table-column>
        <el-table-column label="轮次" width="60" align="center">
          <template #default="{ row }">
            <span v-if="row.round" class="log-round-chip" :style="{ backgroundColor: roundBgColor(row.round) }">{{ row.round }}</span>
            <span v-else class="coverage-empty">-</span>
          </template>
        </el-table-column>
        <el-table-column label="事件" width="140" align="center">
          <template #default="{ row }">
            <span>{{ logEventLabel(row.event) }}<span v-if="logEventDone(row)" class="log-done-check"> ✓</span></span>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="320">
          <template #default="{ row }">
            <!-- 自定义 tooltip 限宽换行(popper 挂 body, 样式在全局 style 块),
                 替代 show-overflow-tooltip 的原生黑框——长内容会撑出屏幕 -->
            <!-- popper-options strategy=fixed: 弹出层脱离文档流, 滚动时悬停触发也不会把页面撑出水平滚动条 -->
            <el-tooltip
              placement="top"
              popper-class="log-detail-tooltip"
              :show-after="150"
              :popper-options="{ strategy: 'fixed' }"
            >
              <template #content>{{ formatLogDetail(row.detail) }}</template>
              <span class="log-detail-text">
                <!-- 发送了飞书/邮件的通知类记录: 开头显示铃铛图标 -->
                <svg v-if="isNotifyEvent(row.event)" class="log-notify-icon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                  <path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>{{ formatLogDetail(row.detail) }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <div class="coverage-empty-tip">暂无替换日志（域名替换 / 复核 / 告警时会记录在这里）</div>
        </template>
      </el-table>
    </div>

    <!-- 域名覆盖对比：Clickflare(本地 cf_landers) + ef-tracker(/query/landers) 两侧提取域名，
         对照检测表找出未纳入检测的域名。默认折叠，展开才拉数据 -->
    <div class="coverage-card">
      <div class="coverage-header" @click="toggleCoverage">
        <span class="coverage-arrow" :class="{ expanded: coverageVisible }">▶</span>
        <span class="coverage-title">域名覆盖对比</span>
        <template v-if="coverageSummary">
          <span class="coverage-badge is-total">在用 {{ coverageSummary.total }} 个域名</span>
          <span class="coverage-badge is-covered">已纳入 {{ coverageSummary.covered }}</span>
          <span class="coverage-badge" :class="coverageSummary.uncovered > 0 ? 'is-uncovered' : 'is-covered'">未纳入 {{ coverageSummary.uncovered }}</span>
        </template>
        <span v-else class="coverage-hint">（展开查看 Clickflare / ef-tracker 在用域名是否都已纳入检测）</span>
        <button class="coverage-refresh" @click.stop="loadCoverage" :disabled="coverageLoading" title="重新拉取对比数据">
          {{ coverageLoading ? '拉取中...' : '刷新' }}
        </button>
      </div>

      <div v-if="coverageVisible" class="coverage-body" v-loading="coverageLoading">
        <div v-if="coverageData && !coverageLoading" class="coverage-content">
          <div v-if="coverageData.ef_error" class="coverage-error-tip">⚠ ef-tracker 落地页列表拉取失败，当前仅展示 Clickflare 侧数据，可点刷新重试</div>
          <div class="coverage-toolbar">
            <el-switch v-model="showAllCoverage" active-text="显示全部" inactive-text="只看未纳入" />
          </div>
          <el-table :data="coverageFiltered" size="small" max-height="320" class="coverage-table">
            <el-table-column label="域名" prop="domain" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="coverage-domain">{{ row.domain }}</span>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="170" align="center">
              <template #default="{ row }">
                <span
                  v-for="s in row.sources"
                  :key="s"
                  class="coverage-source"
                  :class="s === 'clickflare' ? 'is-cf' : 'is-ef'"
                >{{ s === 'clickflare' ? 'Clickflare' : 'ef-tracker' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Lander 数" prop="lander_count" width="90" align="center" />
            <el-table-column label="检测状态" width="130" align="center">
              <template #default="{ row }">
                <span v-if="row.in_detection && row.is_important === 1" class="coverage-status is-ok">✓ 检测中</span>
                <span v-else-if="row.in_detection" class="coverage-status is-registered">已登记非重要</span>
                <span v-else class="coverage-status is-missing">⚠ 未纳入</span>
              </template>
            </el-table-column>
            <el-table-column label="用途" prop="purpose" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.purpose">{{ row.purpose }}</span>
                <span v-else class="coverage-empty">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" align="center">
              <template #default="{ row }">
                <button v-if="!row.in_detection" class="coverage-add-btn" @click="handleAddToDetection(row)">添加到检测</button>
                <span v-else class="coverage-empty">-</span>
              </template>
            </el-table-column>
            <template #empty>
              <div class="coverage-empty-tip">
                {{ showAllCoverage ? '暂无数据' : '🎉 两个系统在用域名已全部纳入检测' }}
              </div>
            </template>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 搜索区域 (同时搜索重要域名和黑名单域名) -->
    <div class="domains-search">
      <page-search
        :search-config="searchConfig"
        instant
        @query-click="handleQueryClick"
        @reset-click="handleResetClick"
      />
    </div>

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
import { onMounted, ref, nextTick, reactive, computed } from 'vue'
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
  fetchLastCheckTime()
})


// ===== 最后检测时间（url_detection_database 脚本上报的打点）=====
const lastCheckTime = ref('')

async function fetchLastCheckTime() {
  try {
    const res = await hyRequest.get({ url: '/domains/last_check' })
    if (res.code === 0) {
      // 后端存的是服务器本地时间字符串(YYYY-MM-DD HH:mm:ss)，直接展示，不再做时区换算
      lastCheckTime.value = res.data?.last_check_time || ''
    }
  } catch (error) {
    console.error('获取最后检测时间失败:', error)
  }
}

// 运行状态：距最后检测 ≤20 分钟视为运行中(绿)，超时视为疑似停跑(橙)；无记录为灰
const CHECK_STALE_MS = 20 * 60 * 1000
const checkStatusClass = computed(() => {
  if (!lastCheckTime.value) return 'is-unknown'
  return Date.now() - new Date(lastCheckTime.value.replace(/-/g, '/')).getTime() <= CHECK_STALE_MS
    ? 'is-running'
    : 'is-stalled'
})
const checkStatusText = computed(() => {
  if (!lastCheckTime.value) return '（检测脚本未上报过）'
  return checkStatusClass.value === 'is-running' ? '检测脚本运行中' : '检测脚本疑似已停止, 请检查'
})


// ===== Clickflare 域名覆盖对比（只读 cf_landers 本地同步数据，不触发同步）=====
const coverageVisible = ref(false)
const coverageLoading = ref(false)
const coverageData = ref(null) // { list, summary }
const showAllCoverage = ref(false)

const coverageSummary = computed(() => (coverageVisible.value || coverageData.value) ? coverageData.value?.summary : null)
const coverageFiltered = computed(() => {
  const list = coverageData.value?.list || []
  return showAllCoverage.value ? list : list.filter((x) => !x.in_detection)
})

function toggleCoverage() {
  coverageVisible.value = !coverageVisible.value
  if (coverageVisible.value && !coverageData.value) {
    loadCoverage() // 首次展开懒加载
  }
}

async function loadCoverage() {
  coverageLoading.value = true
  try {
    const res = await hyRequest.get({ url: '/domains/coverage' })
    if (res.code === 0) {
      coverageData.value = res.data
    } else {
      ElMessage.error(res.message || '获取覆盖对比失败')
    }
  } catch (error) {
    console.error('获取覆盖对比失败:', error)
    ElMessage.error('获取覆盖对比失败: ' + (error?.message || '网络错误'))
  } finally {
    coverageLoading.value = false
  }
}

// 未纳入域名 → 打开现有新增弹窗并预填：域名 + 落地页地址（该域名的一条 lander URL）
function handleAddToDetection(row) {
  handleNewClick('import_list')
  nextTick(() => {
    if (modalRef.value?.formData) {
      modalRef.value.formData.existing_domain = row.domain
      if (row.sample_url) {
        modalRef.value.formData.landing_page_url = row.sample_url
      }
    }
  })
}


// ===== 替换过程日志（domain_replacement_logs: 替换/复核/核验/告警/降级全过程事件流）=====
const logsVisible = ref(false)
const logsLoading = ref(false)
const logsData = ref([])
const logsDomainFilter = ref('')

// 事件中文名（与 url_detection_database 写入的事件一一对应）
const LOG_EVENT_MAP = {
  replace_start: '开始替换',
  backup_selected: '选定备用',
  sync: '数据同步',
  cf_result: 'Clickflare结果',
  ef_result: 'ef-tracker结果',
  both_unused: '两侧未使用',
  verdict: '裁决结果',
  notice: '发送通知',
  verify_start: '复核开始',
  verify_result: '复核结果',
  verify_call: '异地核验',
  safe_browsing: '谷歌安全检测',
  alert_sent: '告警发送',
  daily_report: '日报发送',
  auto_demoted: '自动移出监控',
  manual_demoted: '手动移出监控'
}

function logEventLabel(event) {
  return LOG_EVENT_MAP[event] || event
}

// 轮次背景色: 轮次越高越"红"(异常持续升级的视觉暗示)
function roundBgColor(round) {
  const map = { 1: '#dcebfd', 2: '#fdeccd', 3: '#fbdddd' }
  return map[round] || '#eceff1'
}

// 是否为"发送了飞书通知或邮件"的事件(详情开头显示铃铛图标)
function isNotifyEvent(event) {
  return ['notice', 'alert_sent', 'daily_report', 'auto_demoted', 'manual_demoted'].includes(event)
}

// 域名背景色: 按域名哈希生成稳定的浅色, 不同域名不同色, 多域名日志一眼可分。
// 系统级事件(domain 为 (system))固定灰色。
function domainBgColor(domain) {
  if (!domain) return 'transparent'
  if (domain === '(system)') return '#eceff1'
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) % 360
  }
  return `hsl(${hash}, 65%, 90%)`
}

function parseLogDetail(detail) {
  if (!detail) return {}
  try {
    return JSON.parse(detail)
  } catch (e) {
    return {}
  }
}

// 该步骤是否成功完成: 成功的打 ✓。
// - 开始类(开始替换/复核开始): 无完成语义, 不打勾
// - 核验调用: 拿到结果即完成(结论是"可访问"还是"不可访问"不影响本步骤完成)
// - 通知/告警/日报/移出监控/两侧未使用: 记录即完成(描述里的"未成功"指内容不指本步骤)
// - 其余(选定备用/数据同步/两侧结果/裁决): 描述含失败类字眼则不打勾
// 旧数据(JSON 英文字段)同样兼容: failed/timeout 也算失败字眼。
function logEventDone(row) {
  const e = row.event
  if (e === 'replace_start' || e === 'verify_start') return false
  const text = String(row.detail || '')
  if (e === 'verify_call') return !/(调用失败|返回异常)/.test(text)
  if (['notice', 'alert_sent', 'daily_report', 'auto_demoted', 'manual_demoted', 'both_unused'].includes(e)) return true
  return !/(失败|未找到|未成功|超时|异常|failed|timeout)/i.test(text)
}

// detail 是 JSON 字符串, 展示成 k=v, k=v 的紧凑形式方便扫读
function formatLogDetail(detail) {
  if (!detail) return '-'
  const obj = parseLogDetail(detail)
  const keys = Object.keys(obj)
  if (!keys.length) return detail
  return keys.map((k) => `${k}=${obj[k]}`).join(', ')
}

function toggleLogs() {
  logsVisible.value = !logsVisible.value
  if (logsVisible.value && !logsData.value.length) {
    loadLogs() // 首次展开懒加载
  }
}

// 只看最新一轮(默认开): 每个域名只保留它"最新一轮"的事件, 历史轮次的重复过程日志隐藏;
// 系统级事件(轮次为空, 如日报/谷歌检测)不受影响全保留。关掉开关则显示全部。
const showLatestRoundOnly = ref(true)
const logsTableData = computed(() => {
  const list = logsData.value
  if (!showLatestRoundOnly.value) return list
  const maxRoundByDomain = new Map()
  for (const row of list) {
    if (row.round == null) continue
    const cur = maxRoundByDomain.get(row.domain) || 0
    if (row.round > cur) maxRoundByDomain.set(row.domain, row.round)
  }
  return list.filter((r) => r.round == null || r.round === maxRoundByDomain.get(r.domain))
})

async function loadLogs() {
  logsLoading.value = true
  try {
    const params = { limit: 200 }
    if (logsDomainFilter.value.trim()) params.domain = logsDomainFilter.value.trim()
    const res = await hyRequest.get({ url: '/domains/replacement_logs', params })
    if (res.code === 0) {
      logsData.value = res.data?.list || []
    } else {
      ElMessage.error(res.message || '获取替换日志失败')
    }
  } catch (error) {
    console.error('获取替换日志失败:', error)
    ElMessage.error('获取替换日志失败: ' + (error?.message || '网络错误'))
  } finally {
    logsLoading.value = false
  }
}
</script>

<style lang="less" scoped>
.domains-page {
  padding: 10px;
  // max-width: 1600px;
  margin: 0 auto;
}

/* 检测状态条：与搜索栏同款卡片风格 */
.check-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  cursor: pointer; /* 点击整条展开/收起替换过程日志 */
  user-select: none;

  &:hover {
    background: #f8f9fa;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &.is-running {
      background: #34a853;
      box-shadow: 0 0 0 3px rgba(52, 168, 83, 0.15);
    }

    &.is-stalled {
      background: #ea8600;
      box-shadow: 0 0 0 3px rgba(234, 134, 0, 0.15);
    }

    &.is-unknown {
      background: #9aa0a6;
    }
  }

  .status-label {
    color: #5f6368;
  }

  .status-time {
    color: #202124;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .status-hint {
    color: #9aa0a6;
    font-size: 12px;
  }
}

/* Clickflare 域名覆盖对比卡片：与状态条同款卡片风格，可折叠 */
// 点击状态条展开的替换过程日志面板。
// overflow-x hidden: 吸收 el-table 数据刷新/快速滚动时的瞬间重排超宽, 避免出现页面级横向滚动条
.status-logs-panel {
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 10px 16px 14px;
  min-height: 60px;
  overflow-x: hidden;
}

// 日志事件列的成功勾
.log-done-check {
  color: #34a853;
  font-weight: 600;
}

// 域名列的彩色底 chip
.log-domain-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #202124;
  line-height: 18px;
}

// 轮次列的彩色底 chip
.log-round-chip {
  display: inline-block;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 9px;
  font-size: 12px;
  color: #202124;
  line-height: 16px;
}

// 详情列: 单行省略(tooltip 看全文)
.log-detail-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #3c4043;
}

// 通知类记录的铃铛图标
.log-notify-icon {
  color: #f29900;
  vertical-align: -2px;
  margin-right: 3px;
}

.coverage-card {
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.coverage-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: #f8f9fa;
  }
}

.coverage-arrow {
  font-size: 10px;
  color: #5f6368;
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(90deg);
  }
}

.coverage-title {
  font-size: 13px;
  font-weight: 500;
  color: #202124;
}

.coverage-badge {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;

  &.is-total {
    background: #f1f3f4;
    color: #5f6368;
  }

  &.is-covered {
    background: #e6f4ea;
    color: #137333;
  }

  &.is-uncovered {
    background: #fce8e6;
    color: #c5221f;
    font-weight: 500;
  }
}

.coverage-hint {
  color: #9aa0a6;
  font-size: 12px;
}

.coverage-refresh {
  margin-left: auto;
  padding: 2px 12px;
  height: 26px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: #fff;
  color: #5f6368;
  font-size: 12px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f1f3f4;
    color: #202124;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.coverage-body {
  border-top: 1px solid #f1f3f4;
  min-height: 60px;
}

.coverage-content {
  padding: 10px 16px 14px;
}

.coverage-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.coverage-domain {
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #202124;
}

/* 来源徽章：Clickflare 蓝 / ef-tracker 紫，同一域名两侧都用时并排显示 */
.coverage-source {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 11px;
  margin-right: 4px;

  &.is-cf {
    background: #e8f0fe;
    color: #1a73e8;
  }

  &.is-ef {
    background: #f3e8fd;
    color: #7627bb;
  }
}

.coverage-error-tip {
  padding: 6px 12px;
  margin-bottom: 8px;
  background: #fef7e0;
  color: #b06000;
  border-radius: 4px;
  font-size: 12px;
}

.coverage-status {
  font-size: 12px;

  &.is-ok {
    color: #137333;
  }

  &.is-registered {
    color: #9aa0a6;
  }

  &.is-missing {
    color: #c5221f;
    font-weight: 500;
  }
}

.coverage-empty {
  color: #9aa0a6;
}

.coverage-add-btn {
  padding: 3px 10px;
  border: 1px solid #1a73e8;
  border-radius: 4px;
  background: #fff;
  color: #1a73e8;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: #e8f0fe;
  }
}

.coverage-empty-tip {
  padding: 16px 0;
  color: #5f6368;
  font-size: 13px;
}


/* 搜索栏 - 紧凑单行排版,仅覆盖本页面的 page-search 样式 */
.domains-search {
  margin-bottom: 12px;

  :deep(.search) {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 16px;
    background: #fff;
    border: 1px solid #e8eaed;
    border-radius: 8px;

    .el-form {
      flex: 1;
    }

    .el-row {
      width: 100%;
    }

    .el-col {
      flex: 0 0 100%;
      max-width: 320px;
    }

    .el-form-item {
      padding: 0;
      margin-bottom: 0;
    }

    .btns {
      padding: 0;
      flex-shrink: 0;
    }
  }
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

<!-- 全局样式(非 scoped): el-tooltip 的 popper 挂载在 body 上, scoped 样式作用不到。
     限宽 + 自动换行, 修复长详情(如异地核验的原始返回 JSON)悬浮撑出屏幕的问题 -->
<style lang="less">
.log-detail-tooltip {
  // min(640px, 90vw): 窄屏下也控制在视口内, 配合 fixed 定位彻底避免撑出页面滚动条
  max-width: min(640px, 90vw);
  word-break: break-all;
  white-space: normal;
}
</style>
