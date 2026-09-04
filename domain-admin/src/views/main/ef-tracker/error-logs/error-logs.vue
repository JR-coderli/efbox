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
                  @clear="handleSearch"
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
                  @change="handleSearch"
                />
              </el-form-item>
              <el-form-item label="排除错误码">
                <el-input v-model="filters.exclude_error_code" placeholder="如 SYSTEM_CLICK_FORMAT_ERR" clearable style="width: 240px" @keyup.enter="handleSearch" @clear="handleSearch" />
              </el-form-item>
              <!-- mid/tid/http_status 的精确查询已集成到多级表头第二行，此处不再重复放输入框 -->
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
                    <el-checkbox v-model="col.visible" @change="rebindHeaderDrag">{{ col.label }}</el-checkbox>
                  </li>
                </ul>
              </div>
            </el-popover>
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
        <!-- 加载蒙版：只盖表体，每行行首一枚「圆环+Loading」动画（不受 td 宽度限制，表头不加蒙版）。
             top 额外加上工具栏高度（~53px）：蒙版挂在 el-table 的容器内，表头以下开始 -->
        <div v-if="loading" class="rows-loading-mask">
          <div v-for="i in pagination.pageSize" :key="i" class="rows-loading-row">
            <cell-loading />
          </div>
        </div>
        <el-table
          ref="tableRef"
          :data="tableData"
          class="google-table"
          :border="false"
          :max-height="tableMaxHeight"
          :tooltip-options="{ popperClass: 'error-logs-overflow-tooltip' }"
          @selection-change="onSelectionChange"
        >
          <!-- 勾选列也是两级表头（第二行空白），与其他列对齐 -->
          <el-table-column type="selection" width="48" />
          <template v-for="col in visibleColumns" :key="col.key">
            <!-- 所有列统一两级表头：第一行列名、第二行过滤行——type=filter 列内嵌精确查询输入框，其余列空白 -->
            <el-table-column :label="col.label" :align="col.align">
              <!-- 创建时间（格式化）-->
              <el-table-column
                v-if="col.type === 'time'"
                :prop="col.prop"
                :width="col.width"
              >
                <template #default="{ row }">
                  <span class="date-text">{{ fmtTime(row.created_at) }}</span>
                </template>
              </el-table-column>
              <!-- 表头精确查询列（mid/tid/http_status）：第二行为只允许数字的输入框 -->
              <el-table-column
                v-else-if="col.type === 'filter'"
                :prop="col.prop"
                :width="col.width"
                :min-width="col.minWidth"
                :align="col.align"
                :show-overflow-tooltip="col.overflow"
              >
                <template #header>
                  <el-input
                    v-model="filters[col.filterKey]"
                    size="small"
                    :placeholder="col.label"
                    clearable
                    class="header-filter-input"
                    @input="(v) => onFilterInput(col, v)"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </template>
                <!-- http状态：按区间着色（2xx 绿 / 3xx 蓝 / 4xx 橙 / 5xx 红 / 空 灰） -->
                <template v-if="col.key === 'http_status'" #default="{ row }">
                  <span class="status-chip" :class="statusChipClass(row.http_status)">{{ row.http_status ?? '-' }}</span>
                </template>
              </el-table-column>
              <!-- error_code：徽章底色（等宽字体 + 圆角胶囊） -->
              <el-table-column
                v-else-if="col.key === 'error_code'"
                :prop="col.prop"
                :width="col.width"
                :min-width="col.minWidth"
                :align="col.align"
                :show-overflow-tooltip="col.overflow"
              >
                <template #default="{ row }">
                  <span class="code-chip">{{ row.error_code || '-' }}</span>
                </template>
              </el-table-column>
              <!-- method：请求方法徽章（GET 蓝 / POST 绿 / 其他灰） -->
              <el-table-column
                v-else-if="col.key === 'method'"
                :prop="col.prop"
                :width="col.width"
                :min-width="col.minWidth"
                :align="col.align"
                :show-overflow-tooltip="col.overflow"
              >
                <template #default="{ row }">
                  <span class="method-chip" :class="methodChipClass(row.request_method)">{{ row.request_method || '-' }}</span>
                </template>
              </el-table-column>
              <!-- ip：等宽字体（与金额列同款），便于逐位比对 -->
              <el-table-column
                v-else-if="col.key === 'ip'"
                :prop="col.prop"
                :width="col.width"
                :min-width="col.minWidth"
                :align="col.align"
                :show-overflow-tooltip="col.overflow"
              >
                <template #default="{ row }">
                  <span class="mono-text">{{ row.ip_address || '-' }}</span>
                </template>
              </el-table-column>
              <!-- 普通字段列 -->
              <el-table-column
                v-else
                :prop="col.prop"
                :width="col.width"
                :min-width="col.minWidth"
                :align="col.align"
                :show-overflow-tooltip="col.overflow"
              />
            </el-table-column>
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
import CellLoading from '../clicks/cell-loading.vue'

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
  // 清掉旧数据：配合 rows-loading-mask 蒙版（行首 Loading 动画盖在表格上），
  // 空表格 + 蒙版即「每页 N 行、每行行首一枚加载动画」的效果
  tableData.value = []
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
// type：plain 纯字段 / time 时间格式化 / filter 表头精确查询（第二行输入框，走专用查询串）
// 不做持久化：组件每次重建（路由切换 / 刷新）都回到 DEFAULT_COLUMNS 的默认顺序与可见性
// defaultHidden: true → 该列默认隐藏（可在齿轮面板里手动勾开）
const DEFAULT_COLUMNS = [
  { key: 'id', label: 'ID', type: 'plain', prop: 'id', width: 80, align: 'center' },
  { key: 'created_at', label: '创建时间', type: 'time', prop: 'created_at', width: 200 },
  { key: 'request_url', label: 'request_url', type: 'plain', prop: 'request_url', minWidth: 220, overflow: true },
  { key: 'error_code', label: 'error_code', type: 'plain', prop: 'error_code', width: 220, overflow: true },
  { key: 'http_status', label: 'http状态', type: 'filter', prop: 'http_status', filterKey: 'http_status', width: 110, align: 'center' },
  { key: 'error_message', label: 'error_message', type: 'plain', prop: 'error_message', minWidth: 220, overflow: true },
  { key: 'error_reason', label: 'error_reason', type: 'plain', prop: 'error_reason', minWidth: 180, overflow: true },
  { key: 'endpoint', label: 'endpoint', type: 'plain', prop: 'endpoint', minWidth: 160, overflow: true },
  { key: 'method', label: 'method', type: 'plain', prop: 'request_method', width: 80, align: 'center' },
  { key: 'mid', label: 'mid', type: 'filter', prop: 'mid', filterKey: 'mid', width: 110, align: 'center' },
  { key: 'tid', label: 'tid', type: 'filter', prop: 'tid', filterKey: 'tid', width: 110, align: 'center' },
  { key: 'ip', label: 'ip', type: 'plain', prop: 'ip_address', width: 120, overflow: true }
]

// 表头过滤输入框统一入口：数字列（mid/tid/http_status）只保留数字（接口对非数字返回 400）
function onFilterInput(col, v) {
  filters[col.filterKey] = String(v ?? '').replace(/\D/g, '')
}

// ===== 单元格特殊样式 =====
// http状态按区间着色：2xx 成功(绿) / 3xx 重定向(蓝) / 4xx 客户端错(橙) / 5xx 服务端错(红) / 空(灰)
function statusChipClass(code) {
  if (code == null || code === '') return 'sc-none'
  const n = Number(code)
  if (n >= 200 && n < 300) return 'sc-2xx'
  if (n >= 300 && n < 400) return 'sc-3xx'
  if (n >= 400 && n < 500) return 'sc-4xx'
  if (n >= 500) return 'sc-5xx'
  return 'sc-none'
}

// 请求方法徽章：GET 蓝 / POST 绿 / 其他灰
function methodChipClass(m) {
  if (m === 'GET') return 'mc-get'
  if (m === 'POST') return 'mc-post'
  return 'mc-other'
}

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

// ===== 第一行表头（列名行）自定义列宽拖动（事件委托，同媒体点击/转化回传 Tab）=====
// EP 的拖动只对叶子列表头生效，组表头（第一行）拖不了 → 直接监听表头容器：
// 鼠标移到第一行某个 th 右缘 8px 内 → col-resize 光标；按下拖动 → 反查列配置，新宽度写回 col.width。
// 勾选列在最前面，因此第一行 th 下标要比 visibleColumns 偏移 1。
const colDrag = { col: null, startX: 0, startWidth: 0, active: false }
let headerWrapEl = null

// 反查：事件 target 所在的第一行 th → visibleColumns 中对应列（跳过 selection 列）
function row1ColOf(e) {
  const th = e.target?.closest?.('th')
  if (!th || !headerWrapEl) return null
  const thead = headerWrapEl.querySelector('thead')
  if (!thead || th.parentElement !== thead.rows[0]) return null // 只处理第一行（组表头行）
  const idx = Array.prototype.indexOf.call(th.parentElement.children, th)
  return visibleColumns.value[idx - 1] || null
}

function onHeaderMouseMove(e) {
  if (colDrag.active) return
  const th = e.target?.closest?.('th')
  const col = row1ColOf(e)
  if (!th || !col) {
    if (th) th.style.cursor = ''
    colDrag.col = null
    return
  }
  const rect = th.getBoundingClientRect()
  const nearRight = rect.width > 12 && rect.right - e.clientX < 8
  th.style.cursor = nearRight ? 'col-resize' : ''
  colDrag.col = nearRight ? col : null
  colDrag.startWidth = rect.width
}

function onHeaderMouseLeave() {
  if (colDrag.active) return
  if (headerWrapEl) {
    headerWrapEl.querySelectorAll('th').forEach((th) => (th.style.cursor = ''))
  }
  colDrag.col = null
}

function onHeaderMouseDown(e) {
  if (!colDrag.col) return
  colDrag.active = true
  colDrag.startX = e.clientX
  e.preventDefault()

  const onMove = (ev) => {
    const w = Math.max(60, Math.round(colDrag.startWidth + ev.clientX - colDrag.startX))
    colDrag.col.width = w
  }
  const onUp = () => {
    colDrag.active = false
    colDrag.col = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function bindHeaderDrag() {
  unbindHeaderDrag()
  headerWrapEl = tableRef.value?.$el?.querySelector('.el-table__header-wrapper')
  if (!headerWrapEl) return
  headerWrapEl.addEventListener('mousemove', onHeaderMouseMove)
  headerWrapEl.addEventListener('mousedown', onHeaderMouseDown)
  headerWrapEl.addEventListener('mouseleave', onHeaderMouseLeave)
}

function unbindHeaderDrag() {
  if (!headerWrapEl) return
  headerWrapEl.removeEventListener('mousemove', onHeaderMouseMove)
  headerWrapEl.removeEventListener('mousedown', onHeaderMouseDown)
  headerWrapEl.removeEventListener('mouseleave', onHeaderMouseLeave)
  headerWrapEl = null
}

// 列显隐切换后表头 DOM 会重建，拖动监听要重新挂（绑定的是旧 DOM 会失效）
function rebindHeaderDrag() {
  nextTick(bindHeaderDrag)
}

onMounted(() => {
  loadData()
  nextTick(() => {
    calcTableHeight()
    bindHeaderDrag()
  })
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
  unbindHeaderDrag()
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
  position: relative;
}

/* 行级加载蒙版：只盖表格表体（每行行首一枚「圆环+Loading」）。从表头底部开始——
   top = 工具栏(~53px) + 两级表头(~82px)；表头不加蒙版、完全可见可交互。
   行高对齐 td(48px) + 1px 分隔线（同媒体点击 Tab） */
.rows-loading-mask {
  position: absolute;
  top: 143px; /* 工具栏 ~53px + 两级表头 ~90px（第一行列名 44 + 第二行过滤行 ~46） */
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  background: rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

.rows-loading-row {
  height: 49px;
  display: flex;
  align-items: center;
  padding-left: 14px;
  border-bottom: 1px solid #f1f3f4;
  box-sizing: border-box;
}

:deep(.google-table) {
  border: none;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;

  // 省略号截断修复（同媒体点击/转化回传 Tab）：Element 的 .cell.el-tooltip 自带 min-width:50px
  // （nowrap 长内容会把省略号顶出 td 边界），取消最小宽度让 .cell 能收缩到列宽内
  .cell.el-tooltip {
    min-width: 0 !important;
  }

  .el-table__header-wrapper {
    th {
      background-color: #f1f3f4;
      border-bottom: 1px solid #e8eaed;
      color: #3c4043;
      font-weight: 500;
      font-size: 13px;
      height: 44px;

      .cell {
        padding: 0 14px;
        text-align: center !important; // 表头文字统一居中（覆盖各列 align 的继承）
      }
    }

    // 多级表头第二行 = 精确查询输入行：白底、上下留白，与第一行（灰底列名）视觉分离（同媒体点击 Tab）
    tr:nth-child(2) th {
      background-color: #fff;
      height: auto;
      padding: 6px 10px;

      .cell {
        padding: 0;
      }
    }

    // 第一行列名是自定义拖动区域：禁止选中文字，拖动手感更干净
    tr:first-child th .cell {
      user-select: none;
    }

    // 第一行列名（所有列的表头文字）加粗黑体
    tr:first-child th .cell {
      font-weight: 700;
      color: #202124;
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

        // 横向 padding 放在 .cell 上（Element 原生模式）而非 td 上：
        // .cell 自带 overflow:hidden + ellipsis，padding 在其盒模型内部，
        // 省略号在 .cell 内截断，绝不会越过 td 边界
        .cell {
          padding: 0 14px;
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

/* ===== 单元格特殊样式 ===== */
/* 通用胶囊底：等宽字体 + 圆角 + 轻底色，长文本可截断（不换行） */
.status-chip,
.code-chip,
.method-chip {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  padding: 2px 10px;
  border-radius: 10px;
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}

/* http状态：2xx 绿 / 3xx 蓝 / 4xx 橙 / 5xx 红 / 空 灰（沿用漏斗徽章配色体系） */
.sc-2xx { background: #e6f4ea; color: #137333; }
.sc-3xx { background: #e8f0fe; color: #1a73e8; }
.sc-4xx { background: #fef7e0; color: #b06000; }
.sc-5xx { background: #fce8e6; color: #c5221f; }
.sc-none { background: #f1f3f4; color: #80868b; }

/* error_code：中性深灰胶囊（错误码本身即语义，不按内容分色，醒目但不刺眼） */
.code-chip {
  background: #f1f3f4;
  color: #3c4043;
}

/* method：GET 蓝 / POST 绿 / 其他灰 */
.mc-get { background: #e8f0fe; color: #1a73e8; }
.mc-post { background: #e6f4ea; color: #137333; }
.mc-other { background: #f1f3f4; color: #5f6368; }

/* ip：等宽字体（逐位比对友好），不加底色 */
.mono-text {
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 12px;
}

/* 表头过滤输入框撑满列宽 */
.header-filter-input {
  width: 100%;
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
