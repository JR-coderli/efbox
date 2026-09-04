<template>
  <div class="google-content">
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
                  placeholder="错误码 / 错误信息 / URL / endpoint / IP"
                  clearable
                  style="width: 260px"
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
              <el-form-item label="媒体ID">
                <el-input v-model="filters.mid" placeholder="mid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="Tracker">
                <el-input v-model="filters.tid" placeholder="tid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="HTTP状态">
                <el-input v-model="filters.http_status" placeholder="如 500" clearable style="width: 120px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="排除错误码">
                <el-input v-model="filters.exclude_error_code" placeholder="如 SYSTEM_CLICK_FORMAT_ERR" clearable style="width: 240px" @keyup.enter="handleSearch" />
              </el-form-item>
            </el-form>
          </div>
          <div class="filter-actions">
            <el-popover
              trigger="click"
              placement="bottom-end"
              :width="260"
              popper-class="error-logs-col-popover"
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
            <button class="google-btn google-btn-primary" @click="handleSearch">搜索</button>
            <button class="google-btn google-btn-secondary" @click="handleReset">重置</button>
            <button class="google-btn google-btn-secondary" @click="handleRefresh" :disabled="loading || refreshCountdown > 0">
              <svg class="btn-icon" :class="{ 'is-loading': loading }" viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <span>{{ refreshCountdown > 0 ? `刷新中 ${refreshCountdown}s` : '刷新' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-wrapper" ref="tableWrapperRef">
        <div class="table-toolbar">
          <span class="selected-info">
            {{ selectedRows.length ? `已选 ${selectedRows.length} 条` : '勾选多条可批量删除' }}
          </span>
          <button
            class="google-btn google-btn-danger"
            :disabled="!selectedRows.length || deleting"
            @click="handleDelete"
          >
            <svg class="btn-icon" viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            <span>删除选中</span>
          </button>
        </div>
        <el-table
          ref="tableRef"
          :data="tableData"
          v-loading="loading"
          class="google-table"
          :border="false"
          :max-height="tableMaxHeight"
          :tooltip-options="{ popperClass: 'error-logs-overflow-tooltip' }"
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="48" />
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
import Sortable from 'sortablejs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getErrorLogs, deleteErrorLogs } from '@/services/main/ef-tracker'

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
  { label: 'UTC+0', value: 0 },
  { label: 'UTC-5', value: -5 }
]

const filters = reactive({
  keyword: '',
  mid: '',
  tid: '',
  http_status: '',
  exclude_error_code: 'SYSTEM_CLICK_FORMAT_ERR' // 默认排除该错误码
})

const dateRange = ref([])

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
  if (filters.mid) p.mid = filters.mid
  if (filters.tid) p.tid = filters.tid
  if (filters.http_status) p.http_status = filters.http_status
  if (filters.exclude_error_code) p.exclude_error_code = filters.exclude_error_code // 排除某个 error_code（如高频的 SYSTEM_CLICK_FORMAT_ERR）
  Object.assign(p, rangeToParams(dateRange.value))
  return p
}

async function loadData() {
  loading.value = true
  try {
    const result = await getErrorLogs(buildParams())
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
  filters.mid = ''
  filters.tid = ''
  filters.http_status = ''
  filters.exclude_error_code = 'SYSTEM_CLICK_FORMAT_ERR' // 恢复默认排除
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

// ===== 批量删除（多选）=====
const tableRef = ref(null)
const selectedRows = ref([])
const deleting = ref(false)

function onSelectionChange(rows) {
  selectedRows.value = rows
}

async function handleDelete() {
  if (!selectedRows.value.length) return
  const ids = selectedRows.value.map((r) => r.id)
  try {
    await ElMessageBox.confirm(
      `确认硬删除选中的 ${ids.length} 条错误日志？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return // 用户取消
  }
  deleting.value = true
  try {
    const res = await deleteErrorLogs(ids)
    ElMessage.success(`已删除 ${res?.deleted ?? ids.length} 条`)
    tableRef.value?.clearSelection()
    // 当前页被删空且不是第一页 → 回退一页，避免停在空页
    if (tableData.value.length <= ids.length && pagination.page > 1) {
      pagination.page--
    }
    loadData()
  } catch (error) {
    ElMessage.error('删除失败: ' + (error?.response?.data?.error || error?.message || '网络错误'))
  } finally {
    deleting.value = false
  }
}

// 表格高度自适应：表头固定，表体按视口剩余高度内部滚动（数据多时滚动的是表格，而非整页）
const tableWrapperRef = ref(null)
const tableMaxHeight = ref(undefined) // undefined → 不限高，首帧避免收缩闪烁
function calcTableHeight() {
  const el = tableWrapperRef.value
  if (!el) return
  const top = el.getBoundingClientRect().top // 表格上方（标题+筛选区）实际占位，能适应筛选区换行
  const bottomReserve = 60 // 分页栏 + 外边距
  tableMaxHeight.value = Math.max(220, window.innerHeight - top - bottomReserve)
}

// ===== 列配置（数据驱动，齿轮面板做显隐 / 拖拽排序）=====
// type：plain 纯字段 / time 时间格式化
// 不做持久化：组件每次重建（路由切换 / 刷新）都回到 DEFAULT_COLUMNS 的默认顺序与可见性
// defaultHidden: true → 该列默认隐藏（可在齿轮面板里手动勾开）
const DEFAULT_COLUMNS = [
  { key: 'id', label: 'ID', type: 'plain', prop: 'id', width: 80, align: 'center' },
  { key: 'created_at', label: '创建时间', type: 'time', prop: 'created_at', width: 200 },
  { key: 'request_url', label: 'request_url', type: 'plain', prop: 'request_url', minWidth: 220, overflow: true },
  { key: 'error_code', label: 'error_code', type: 'plain', prop: 'error_code', width: 120, overflow: true },
  { key: 'http_status', label: 'http状态', type: 'plain', prop: 'http_status', width: 90, align: 'center', defaultHidden: true },
  { key: 'error_message', label: 'error_message', type: 'plain', prop: 'error_message', minWidth: 220, overflow: true },
  { key: 'error_reason', label: 'error_reason', type: 'plain', prop: 'error_reason', minWidth: 180, overflow: true },
  { key: 'endpoint', label: 'endpoint', type: 'plain', prop: 'endpoint', minWidth: 160, overflow: true },
  { key: 'method', label: 'method', type: 'plain', prop: 'request_method', width: 80, align: 'center' },
  { key: 'mid', label: 'mid', type: 'plain', prop: 'mid', width: 70, align: 'center', defaultHidden: true },
  { key: 'tid', label: 'tid', type: 'plain', prop: 'tid', width: 80, align: 'center', defaultHidden: true },
  { key: 'ip', label: 'ip', type: 'plain', prop: 'ip_address', width: 120, overflow: true }
]

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
      columns.value = arr
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

onMounted(() => {
  loadData()
  nextTick(calcTableHeight)
  window.addEventListener('resize', calcTableHeight)
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
  window.removeEventListener('resize', calcTableHeight)
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
})
</script>

<style lang="less" scoped>
.google-content {
  padding: 8px;
  margin: 0 auto;
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

.google-btn-danger {
  background-color: #d93025;
  color: #fff;

  &:hover:not(:disabled) {
    background-color: #b3261e;
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

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e8eaed;
  background-color: #f8f9fa;
}

.selected-info {
  font-size: 13px;
  color: #5f6368;
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
/* el-table 溢出 tooltip（已传送到 body，scoped 选不中）：限制最大宽度，避免 request_url 等长文本超出屏幕 */
.error-logs-overflow-tooltip {
  max-width: 400px;
  word-break: break-all;
}

/* 列配置面板（el-popover teleported 到 body，scoped 选不中，写在全局） */
.error-logs-col-popover.el-popper {
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

.col-sortable-ghost {
  opacity: 0.4;
}

.col-sortable-chosen {
  background: #e8f0fe;
  border-radius: 6px;
}
</style>
