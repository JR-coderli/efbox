<template>
  <div class="google-content">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">LP访问流水</h1>
        <p class="page-subtitle">system_lp_visit_logs · LP 着陆流水</p>
      </div>
      <div class="header-actions">
        <el-popover
          trigger="click"
          placement="bottom-end"
          :width="260"
          popper-class="lp-visit-logs-col-popover"
          @after-enter="onPanelShown"
          @hide="onPanelHidden"
        >
          <template #reference>
            <button class="google-btn google-btn-secondary" title="配置列（显示 / 排序）">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
          </template>
          <div class="col-config-panel">
            <div class="col-config-header">
              <span>列配置</span>
              <button class="col-reset-btn" @click="resetColumns">重置</button>
            </div>
            <ul ref="colListRef" class="col-config-list">
              <li v-for="col in columns" :key="col.key" class="col-config-item" :class="{ 'is-hidden': !col.visible }">
                <span class="col-drag-handle" title="拖拽排序">
                  <svg class="grip-icon" viewBox="0 0 10 16"><circle cx="2.5" cy="3" r="1.2"/><circle cx="2.5" cy="8" r="1.2"/><circle cx="2.5" cy="13" r="1.2"/><circle cx="7.5" cy="3" r="1.2"/><circle cx="7.5" cy="8" r="1.2"/><circle cx="7.5" cy="13" r="1.2"/></svg>
                </span>
                <el-checkbox v-model="col.visible">{{ col.label }}</el-checkbox>
              </li>
            </ul>
          </div>
        </el-popover>
        <button
          class="google-btn"
          :class="uniqueOnly ? 'google-btn-primary' : 'google-btn-secondary'"
          @click="toggleUnique"
          title="按 media_click_id 去重，仅保留最新一条"
        >
          <span>{{ uniqueOnly ? '已去重' : '去重' }}</span>
        </button>
        <button class="google-btn google-btn-secondary" @click="handleRefresh" :disabled="loading || refreshCountdown > 0">
          <svg class="btn-icon" :class="{ 'is-loading': loading }" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>{{ refreshCountdown > 0 ? `刷新中 ${refreshCountdown}s` : '刷新' }}</span>
        </button>
      </div>
    </div>

    <!-- 内容卡片 -->
    <div class="content-card">
      <!-- 搜索栏 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-items">
            <el-form :inline="true" class="filter-form" @submit.prevent>
              <el-form-item label="关键词">
                <el-input
                  v-model="filters.keyword"
                  placeholder="click_id / visitor_id / IP"
                  clearable
                  style="width: 240px"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item label="时区">
                <el-select v-model="tz" style="width: 130px" @change="handleSearch">
                  <el-option v-for="o in tzOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="日期">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  clearable
                  style="width: 240px"
                />
              </el-form-item>
              <el-form-item label="Tracker">
                <el-input v-model="filters.tid" placeholder="tid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="LP">
                <el-input v-model="filters.lid" placeholder="lid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
            </el-form>
          </div>
          <div class="filter-actions">
            <button class="google-btn google-btn-primary" @click="handleSearch">搜索</button>
            <button class="google-btn google-btn-secondary" @click="handleReset">重置</button>
          </div>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-wrapper">
        <el-table :data="tableData" v-loading="loading" class="google-table" :border="false" :tooltip-options="{ popperClass: 'lp-visit-overflow-tooltip' }">
          <template v-for="col in visibleColumns" :key="col.key">
            <!-- 创建时间（格式化）-->
            <el-table-column
              v-if="col.type === 'time'"
              :label="col.label"
              :prop="col.prop"
              :width="col.width"
            >
              <template #default="{ row }">
                <span class="date-text">{{ fmtTime(row.created_at) }}</span>
              </template>
            </el-table-column>
            <!-- names 名称映射列（row.names[nameKey]） -->
            <el-table-column
              v-else-if="col.type === 'names'"
              :label="col.label"
              :prop="col.prop"
              :min-width="col.minWidth"
              :show-overflow-tooltip="col.overflow"
            >
              <template #default="{ row }">
                <span>{{ row.names?.[col.nameKey] || '-' }}</span>
              </template>
            </el-table-column>
            <!-- 普通字段列 -->
            <el-table-column
              v-else
              :label="col.label"
              :prop="col.prop"
              :width="col.width"
              :min-width="col.minWidth"
              :align="col.align"
              :show-overflow-tooltip="col.overflow"
            />
          </template>
          <template #empty>
            <el-empty description="暂无数据" />
          </template>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          class="google-pagination"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import Sortable from 'sortablejs'
import { getLpVisitLogs } from '@/services/main/ef-tracker'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 时区：默认 +8；切路由 / 刷新都会重建组件 → 回到 +8；分页不修改 tz → 保留当前选择
const tz = ref(8)
const tzOptions = [
  { label: 'UTC+8', value: 8 },
  { label: 'UTC+7', value: 7 },
  { label: 'UTC+5:30', value: 5.5 },
  { label: 'UTC+0', value: 0 },
  { label: 'UTC-3', value: -3 },
  { label: 'UTC-4', value: -4 },
  { label: 'UTC-5', value: -5 },
  { label: 'UTC-8', value: -8 }
]

const filters = reactive({
  keyword: '',
  tid: '',
  lid: ''
})

const dateRange = ref([])

// ===== 列配置（数据驱动，配合齿轮面板做显隐 / 拖拽排序）=====
// type：plain 纯字段 / time 时间格式化 / names 名称映射(row.names[nameKey])
// 不做持久化：组件每次重建（路由切换 / 刷新）都回到 DEFAULT_COLUMNS 的默认顺序与可见性
// defaultHidden: true → 该列默认隐藏（可在齿轮面板里手动勾开）
const DEFAULT_COLUMNS = [
  { key: 'id', label: 'ID', type: 'plain', prop: 'id', width: 80, align: 'center' },
  { key: 'created_at', label: '创建时间', type: 'time', prop: 'created_at', width: 200 },
  { key: 'system_click_id', label: 'system_click_id', type: 'plain', prop: 'system_click_id', minWidth: 200, overflow: true },
  { key: 'media_click_id', label: 'media_click_id', type: 'plain', prop: 'media_click_id', minWidth: 160, overflow: true },
  { key: 'visitor_id', label: 'visitor_id', type: 'plain', prop: 'visitor_id', minWidth: 160, overflow: true },
  { key: 'tid', label: 'tid', type: 'plain', prop: 'tid', width: 90, align: 'center', defaultHidden: true },
  { key: 'lid', label: 'lid', type: 'plain', prop: 'lid', width: 90, align: 'center', defaultHidden: true },
  { key: 'names.lander', label: 'Lander_name', type: 'names', nameKey: 'lander', prop: 'names.lander', minWidth: 110, overflow: true },
  { key: 'names.tracker', label: 'Tracker_name', type: 'names', nameKey: 'tracker', prop: 'names.tracker', minWidth: 110, overflow: true },
  { key: 'ip', label: 'ip', type: 'plain', prop: 'ip_address', width: 120, overflow: true, defaultHidden: true },
  { key: 'user_agent', label: 'user_agent', type: 'plain', prop: 'user_agent', minWidth: 220, overflow: true, defaultHidden: true }
]

// 工作副本：齿轮面板只改它（visible / 顺序），不影响 DEFAULT_COLUMNS
const columns = ref(DEFAULT_COLUMNS.map((c) => ({ ...c, visible: !c.defaultHidden })))
const visibleColumns = computed(() => columns.value.filter((c) => c.visible))

// 齿轮配置面板
const colListRef = ref(null)
let sortableInstance = null

function resetColumns() {
  columns.value = DEFAULT_COLUMNS.map((c) => ({ ...c, visible: !c.defaultHidden }))
}

// 面板展开后挂 Sortable（幂等）。popover 内容 teleported 且关闭即卸载，
// 故每次 @after-enter 重新挂载、@hide 销毁，保证绑定的始终是当前 DOM。
function ensureSortable() {
  if (!colListRef.value) return
  if (sortableInstance) sortableInstance.destroy()
  sortableInstance = Sortable.create(colListRef.value, {
    animation: 150,
    handle: '.col-drag-handle',
    ghostClass: 'col-sortable-ghost',
    chosenClass: 'col-sortable-chosen',
    onEnd: ({ oldIndex, newIndex }) => {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
      const arr = [...columns.value]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved)
      columns.value = arr // 同步回数据，Vue 按 key(col.key) 重排便表格列顺序
    }
  })
}

function onPanelShown() {
  nextTick(ensureSortable)
}

function onPanelHidden() {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
}

function fmtTime(s) {
  if (!s) return '-'
  return String(s).replace('T', ' ').replace(/\.\d+/, '').replace(/([+-])(\d{2}):(\d{2})$/, (_m, sign, h, min) => ' ' + sign + parseInt(h, 10) + (parseInt(min, 10) ? ':' + parseInt(min, 10) : '')).replace(/Z$/, ' +0')
}

function rangeToParams(range) {
  if (!range || range.length !== 2) return {}
  const [d1, d2] = range
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} 00:00:00`
  const end = new Date(d2.getTime())
  end.setDate(end.getDate() + 1)
  return { start: fmt(d1), end: fmt(end) }
}

function buildParams() {
  const p = {
    page: pagination.page,
    size: pagination.pageSize,
    tz: tz.value
  }
  if (filters.keyword) p.keyword = filters.keyword
  if (filters.tid) p.tid = filters.tid
  if (filters.lid) p.lid = filters.lid
  p.with_names = true // 返回 tid/lid 对应的名称（names 字段）
  if (uniqueOnly.value) p.unique = true // 去重：按 media_click_id 只保留最新一条
  Object.assign(p, rangeToParams(dateRange.value))
  return p
}

async function loadData() {
  loading.value = true
  try {
    const result = await getLpVisitLogs(buildParams())
    tableData.value = result?.list || []
    total.value = result?.total ?? 0
  } catch (error) {
    ElMessage.error('加载失败: ' + (error?.response?.data?.error || error?.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filters.keyword = ''
  filters.tid = ''
  filters.lid = ''
  dateRange.value = []
  tz.value = 8
  pagination.page = 1
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function handleCurrentChange(page) {
  pagination.page = page
  loadData()
}

onMounted(() => {
  loadData()
})

// 刷新按钮 5 秒倒计时（点击后禁用，防止频繁刷新）
const refreshCountdown = ref(0)
let refreshTimer = null

function handleRefresh() {
  if (refreshCountdown.value > 0) return
  loadData()
  refreshCountdown.value = 5
  clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    refreshCountdown.value--
    if (refreshCountdown.value <= 0) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  clearInterval(refreshTimer)
  refreshTimer = null
})

// 去重开关：按 media_click_id 只保留最新一条（unique=true）。分页时保留选中状态
const uniqueOnly = ref(false)

function toggleUnique() {
  uniqueOnly.value = !uniqueOnly.value
  pagination.page = 1
  loadData()
}
</script>

<style lang="less" scoped>
.google-content {
  padding: 8px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  flex: 1;
  min-width: 200px;
}

.page-title {
  font-size: 20px;
  font-weight: 500;
  color: #202124;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: #5f6368;
  margin: 4px 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

.filter-section {
  padding: 16px 20px;
  border-bottom: 1px solid #e8eaed;
  background-color: #f8f9fa;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-items {
  flex: 1;
  min-width: 0;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 30px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;

  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 0;
  }

  :deep(.el-form-item__label) {
    color: #5f6368;
    font-size: 13px;
    font-weight: 500;
    width: auto;
  }
}

.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 32px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  transition: background-color 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;

  &:hover:not(:disabled) {
    background-color: #1557b0;
  }
}

.google-btn-secondary {
  background-color: #fff;
  color: #5f6368;
  border: 1px solid #dadce0;

  &:hover:not(:disabled) {
    background-color: #f1f3f4;
    color: #202124;
  }
}

.btn-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;

  &.is-loading {
    animation: btn-spin 0.8s linear infinite;
  }
}

@keyframes btn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.table-wrapper {
  overflow-x: auto;
}

:deep(.google-table) {
  border: none;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;

  .el-table__header-wrapper {
    th {
      background-color: #f1f3f4;
      border-bottom: 1px solid #e8eaed;
      color: #3c4043;
      font-weight: 500;
      font-size: 13px;
      height: 44px;
      padding: 0 14px;

      .cell {
        padding: 0;
      }
    }
  }

  .el-table__body-wrapper {
    .el-table__row {
      border-bottom: 1px solid #f1f3f4;

      &:hover {
        background-color: #f8f9fa;

        td {
          background-color: transparent;
        }
      }

      td {
        color: #202124;
        font-size: 13px;
        height: 48px;
        padding: 0 14px;

        .cell {
          padding: 0;
        }
      }
    }
  }

  &::before,
  &::after {
    display: none;
  }
}

.date-text {
  color: #5f6368;
  font-size: 13px;
}

.pagination-wrapper {
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
  display: flex;
  justify-content: flex-end;
}

:deep(.google-pagination) {
  .el-pagination__total {
    color: #5f6368;
    font-size: 13px;
  }

  .el-pager li {
    border-radius: 4px;
    margin: 0 2px;
    color: #5f6368;
    font-weight: 500;
    min-width: 32px;
    height: 32px;
    line-height: 30px;

    &:hover {
      background-color: #f1f3f4;
    }

    &.is-active {
      background-color: #1a73e8;
      color: #fff;
    }
  }
}

:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1 !important;

  .el-loading-spinner {
    .circular {
      stroke: #1a73e8;
    }

    .el-loading-text {
      color: #5f6368;
      font-size: 13px;
    }
  }
}
</style>

<style>
/* el-table 溢出 tooltip（已传送到 body，scoped 选不中）：限制最大宽度，避免 user_agent 等长文本超出屏幕 */
.lp-visit-overflow-tooltip {
  max-width: 400px;
  word-break: break-all;
}

/* 列配置面板（el-popover teleported 到 body，scoped 选不中，写在全局） */
.lp-visit-logs-col-popover.el-popper {
  padding: 0 !important;
}

.col-config-panel {
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

.col-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e8eaed;
  font-size: 13px;
  font-weight: 500;
  color: #202124;
}

.col-reset-btn {
  border: none;
  background: transparent;
  color: #1a73e8;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.col-reset-btn:hover {
  background: #f1f3f4;
}

.col-config-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  max-height: 320px;
  overflow-y: auto;
}

.col-config-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
}

.col-config-item:hover {
  background: #f8f9fa;
}

.col-config-item.is-hidden {
  opacity: 0.5;
}

.col-drag-handle {
  display: inline-flex;
  align-items: center;
  cursor: grab;
  color: #bdc1c6;
}

.col-drag-handle:active {
  cursor: grabbing;
}

.grip-icon {
  width: 10px;
  height: 16px;
  fill: currentColor;
}

.col-config-item .el-checkbox {
  flex: 1;
  height: auto;
  margin-right: 0;
}

.col-config-item .el-checkbox__label {
  font-size: 13px;
  color: #202124;
}

/* sortable 拖拽视觉 */
.col-sortable-ghost {
  opacity: 0.4;
}

.col-sortable-chosen {
  background: #e8f0fe;
  border-radius: 6px;
}
</style>
