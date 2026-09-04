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
                  placeholder="click_id / response_body"
                  clearable
                  style="width: 240px"
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
              <el-form-item label="回传状态">
                <el-input v-model="filters.http_status_code" placeholder="如 200" clearable style="width: 120px" @keyup.enter="handleSearch" @clear="handleSearch" />
              </el-form-item>
              <el-form-item label="应回传">
                <el-select v-model="filters.should_postback" clearable placeholder="全部" style="width: 110px" @change="handleSearch">
                  <el-option label="是" value="true" />
                  <el-option label="否" value="false" />
                </el-select>
              </el-form-item>
              <!-- mid/tid 的精确查询已集成到多级表头第二行，此处不再重复放输入框 -->
            </el-form>
          </div>
          <div class="filter-actions">
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
        <el-table ref="tableRef" :data="tableData" v-loading="loading" class="google-table" :border="false" :max-height="tableMaxHeight" :tooltip-options="{ popperClass: 'conversions-overflow-tooltip' }">
          <!-- 所有列统一两级表头：第一行列名、第二行过滤行——mid/tid 内嵌精确查询输入框，其余列空白，形似媒体点击 Tab。
               内层列 :width 绑定 colWidths（第一行表头拖动改的就是它）；null = 未拖过，走 min-width 弹性 -->
          <el-table-column label="ID" align="center">
            <el-table-column prop="id" align="center" :width="colWidths.id" />
          </el-table-column>
          <el-table-column label="上游回传时间">
            <el-table-column prop="created_at" :width="colWidths.created_at">
              <template #default="{ row }">
                <span class="date-text">{{ fmtTime(row.created_at) }}</span>
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="system_click_id">
            <el-table-column prop="system_click_id" :width="colWidths.system_click_id" min-width="200" show-overflow-tooltip />
          </el-table-column>
          <el-table-column label="media_click_id">
            <el-table-column prop="media_click_id" :width="colWidths.media_click_id" min-width="160" show-overflow-tooltip />
          </el-table-column>
          <el-table-column label="mid" align="center">
            <el-table-column prop="mid" align="center" :width="colWidths.mid">
              <template #header>
                <el-input
                  v-model="filters.mid"
                  size="small"
                  placeholder="mid"
                  clearable
                  class="header-filter-input"
                  @input="(v) => (filters.mid = String(v ?? '').replace(/\D/g, ''))"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="tid" align="center">
            <el-table-column prop="tid" align="center" :width="colWidths.tid">
              <template #header>
                <el-input
                  v-model="filters.tid"
                  size="small"
                  placeholder="tid"
                  clearable
                  class="header-filter-input"
                  @input="(v) => (filters.tid = String(v ?? '').replace(/\D/g, ''))"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="媒体">
            <el-table-column prop="names.media" :width="colWidths.media" min-width="110" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ row.names?.media || '-' }}</span>
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="Tracker">
            <el-table-column prop="names.tracker" :width="colWidths.tracker" min-width="110" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ row.names?.tracker || '-' }}</span>
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="payout" align="right">
            <el-table-column prop="payout" align="right" class-name="col-money" :width="colWidths.payout" />
          </el-table-column>
          <el-table-column label="应回传" align="center">
            <el-table-column prop="should_postback" align="center" :width="colWidths.should_postback">
              <template #default="{ row }">
                <el-tag :type="row.should_postback ? 'success' : 'danger'" size="small">{{ row.should_postback ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="回传状态" align="center">
            <el-table-column prop="http_status_code" align="center" :width="colWidths.http_status_code" />
          </el-table-column>
          <el-table-column label="media_postback_url">
            <el-table-column prop="media_postback_url" :width="colWidths.media_postback_url" min-width="200" show-overflow-tooltip />
          </el-table-column>
          <el-table-column label="response_body">
            <el-table-column prop="response_body" :width="colWidths.response_body" min-width="220" show-overflow-tooltip />
          </el-table-column>
          <el-table-column label="下发媒体时间">
            <el-table-column prop="posted_at" :width="colWidths.posted_at">
              <template #default="{ row }">
                <span class="date-text">{{ fmtTime(row.posted_at) }}</span>
              </template>
            </el-table-column>
          </el-table-column>
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
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getConversions } from '@/services/main/ef-tracker'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const pagination = reactive({
  page: 1,
  pageSize: 10
})

// ===== 列宽：默认值 + 第一行表头拖动（复制自媒体点击 Tab 的方案）=====
// EP 的列宽拖动只对叶子列表头生效，组表头（第一行）拖不了 → 事件委托在表头容器上，
// 鼠标移到第一行某个 th 右缘 8px 内 → col-resize 光标；按下拖动 → 反查列，新宽度写回 colWidths。
// 列顺序（模板里的 el-table-column 顺序）与这里一一对应。
const COLUMN_KEYS = [
  'id', 'created_at', 'system_click_id', 'media_click_id', 'mid', 'tid',
  'media', 'tracker', 'payout', 'should_postback', 'http_status_code',
  'media_postback_url', 'response_body', 'posted_at'
]
const colWidths = reactive(Object.fromEntries(COLUMN_KEYS.map((k) => [k, null]))) // null = 未拖过，走各自 min-width

const tableRef = ref(null)
const colDrag = { col: null, startX: 0, startWidth: 0, active: false }
let headerWrapEl = null

// 反查：事件 target 所在的第一行 th → COLUMN_KEYS 中同下标的列 key
function row1ColOf(e) {
  const th = e.target?.closest?.('th')
  if (!th || !headerWrapEl) return null
  const thead = headerWrapEl.querySelector('thead')
  if (!thead || th.parentElement !== thead.rows[0]) return null // 只处理第一行（组表头行）
  const idx = Array.prototype.indexOf.call(th.parentElement.children, th)
  return COLUMN_KEYS[idx] || null
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
    colWidths[colDrag.col] = w
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

// 表格高度自适应：动态测量表格 wrapper 顶部到视口底部的距离，表格恰好占满剩余页面高度
// （表头吸顶、表体在表格内部滚动，页面本身不出滚动条）。能自动适应筛选区换行、Tab 栏等占位变化
const tableWrapperRef = ref(null)
const tableMaxHeight = ref(undefined) // undefined → 不限高，首帧避免收缩闪烁
function calcTableHeight() {
  const el = tableWrapperRef.value
  if (!el) return
  const top = el.getBoundingClientRect().top // 表格上方（Tab 栏 + 筛选区）实际占位
  const bottomReserve = 60 // 分页栏 + 外边距
  tableMaxHeight.value = Math.max(220, window.innerHeight - top - bottomReserve)
}

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
  http_status_code: '',
  should_postback: ''
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
  if (filters.http_status_code) p.http_status_code = filters.http_status_code
  if (filters.should_postback) p.should_postback = filters.should_postback
  p.with_names = true // 返回 mid/tid 对应的名称（names 字段）
  Object.assign(p, rangeToParams(dateRange.value))
  return p
}

async function loadData() {
  loading.value = true
  try {
    const result = await getConversions(buildParams())
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

onMounted(() => {
  loadData()
  nextTick(() => {
    calcTableHeight() // 等 DOM 渲染完再测量表格上方占位（Tab 栏 + 筛选区）
    bindHeaderDrag() // 同时机挂表头列宽拖动
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

  // 省略号截断修复（同媒体点击 Tab）：Element 的 .cell.el-tooltip 自带 min-width:50px
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

/* 表头过滤输入框撑满列宽 */
.header-filter-input {
  width: 100%;
}

/* payout 金额列：等宽数字字体 + 表格数字对齐（与媒体点击 cost 列一致） */
:deep(.google-table td.col-money .cell) {
  font-family: 'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
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
/* el-table 溢出 tooltip（已传送到 body，scoped 选不中）：限制最大宽度，避免 media_click_id / media_postback_url 等长文本超出屏幕 */
.conversions-overflow-tooltip {
  max-width: 400px;
  word-break: break-all;
}
</style>
