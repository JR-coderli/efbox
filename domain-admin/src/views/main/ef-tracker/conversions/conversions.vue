<template>
  <div class="google-content">
    <!-- 内容卡片 -->
    <div class="content-card">
      <!-- 搜索栏 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-items">
            <el-form :inline="true" class="filter-form" @submit.prevent>
              <!-- 顶部关键词框已去除(2026-11-19): scid/mcid 改为各自列表头的精确搜索框(可走索引, 比模糊快) -->
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
              <!-- mid/tid/应回传/回传状态 的精确查询已集成到多级表头第二行，此处不再重复放输入框 -->
            </el-form>
          </div>
          <div class="filter-actions">
            <el-popover
              trigger="click"
              placement="bottom-end"
              :width="260"
              popper-class="conversions-col-popover"
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
            <button class="google-btn google-btn-secondary" @click="handleRefresh" :disabled="loading || refreshCountdown > 0">
              <svg class="btn-icon" :class="{ 'is-loading': loading }" viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <span>{{ refreshCountdown > 0 ? `刷新中 ${refreshCountdown}s` : '刷新' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 表格(单表格: "类型"列表头内置类型选择器, 默认 Sales; 切类型只换数据, 2026-11-19) -->
      <div class="table-wrapper" ref="tableWrapperRef">
        <!-- 加载蒙版：只盖表体，每行行首一枚「圆环+Loading」动画（不受 td 宽度限制，表头不加蒙版） -->
        <div v-if="loading" class="rows-loading-mask">
          <div v-for="i in pagination.pageSize" :key="i" class="rows-loading-row">
            <cell-loading />
          </div>
        </div>
        <el-table ref="tableRef" :data="tableData" class="google-table" :border="false" :max-height="tableMaxHeight" :tooltip-options="{ popperClass: 'conversions-overflow-tooltip' }">
          <!-- 固定列: ID + 类型(事件切换器)不参与列配置 -->
          <el-table-column label="ID" align="center">
            <el-table-column prop="id" align="center" :width="colWidths.id" />
          </el-table-column>
          <el-table-column label="类型" align="center">
            <el-table-column align="center" width="150">
              <template #header>
                <el-select v-model="eventType" size="small" @change="handleEventTypeChange">
                  <el-option label="全部事件" value="all" />
                  <el-option label="Sales" value="sales" />
                  <el-option label="Lead" value="lead" />
                  <el-option label="TK_CLICKS" value="tk_clicks" />
                  <el-option label="LP_U_VISITS" value="lp_u_visits" />
                  <el-option label="LP_U_CLICKS" value="lp_u_clicks" />
                </el-select>
              </template>
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ eventType === 'sales' ? 'sales' : row.event_type }}</el-tag>
              </template>
            </el-table-column>
          </el-table-column>

          <!-- 可配置列(2026-11-20, 参考媒体点击 tab): 齿轮面板显隐+拖拽排序, ui_settings 持久化 -->
          <template v-for="col in visibleColumns" :key="col.key">
            <!-- time: 时间格式化列 -->
            <el-table-column v-if="col.type === 'time'" :label="col.label">
              <el-table-column :prop="col.prop" :width="colWidths[col.key]" :min-width="col.minWidth">
                <template #default="{ row }">
                  <span class="date-text">{{ fmtTime(row[col.prop]) }}</span>
                </template>
              </el-table-column>
            </el-table-column>
            <!-- names: 名称映射列; advertiser 带稳定散列彩 chip -->
            <el-table-column v-else-if="col.type === 'names'" :label="col.label">
              <el-table-column :prop="col.prop" :width="colWidths[col.key]" :min-width="col.minWidth" show-overflow-tooltip>
                <template #default="{ row }">
                  <span v-if="col.key === 'advertiser'" class="advertiser-chip" :class="advertiserColorClass(row.names?.advertiser)">{{ row.names?.advertiser || '-' }}</span>
                  <span v-else>{{ row.names?.[col.nameKey] || '-' }}</span>
                </template>
              </el-table-column>
            </el-table-column>
            <!-- money: 金额右对齐 -->
            <el-table-column v-else-if="col.type === 'money'" :label="col.label" align="right">
              <el-table-column :prop="col.prop" align="right" class-name="col-money" :width="colWidths[col.key]" :min-width="col.minWidth" />
            </el-table-column>
            <!-- filter: 表头第二行精确查询输入框 -->
            <el-table-column v-else-if="col.type === 'filter'" :label="col.label" :align="col.align || 'center'">
              <el-table-column :prop="col.prop" :align="col.align || 'center'" :width="colWidths[col.key]" :min-width="col.minWidth" show-overflow-tooltip>
                <template #header>
                  <el-input
                    v-model="filters[col.filterKey]"
                    size="small"
                    :placeholder="col.placeholder || col.label"
                    clearable
                    class="header-filter-input"
                    @input="(v) => (filters[col.filterKey] = col.digits ? String(v ?? '').replace(/\D/g, '') : filters[col.filterKey])"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </template>
              </el-table-column>
            </el-table-column>
            <!-- bool-tag: 应下发 是/否; 表头下拉过滤 -->
            <el-table-column v-else-if="col.type === 'bool-tag'" :label="col.label" align="center">
              <el-table-column :prop="col.prop" align="center" :width="colWidths[col.key]" :min-width="col.minWidth">
                <template #header>
                  <el-select v-model="filters[col.filterKey]" size="small" clearable placeholder="全部" class="header-filter-input" @change="handleSearch">
                    <el-option label="是" value="true" />
                    <el-option label="否" value="false" />
                  </el-select>
                </template>
                <template #default="{ row }">
                  <el-tag :type="row[col.prop] ? 'success' : 'danger'" size="small">{{ row[col.prop] ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
            </el-table-column>
            <!-- block-reason: 枚举码 + 悬浮中文 -->
            <el-table-column v-else-if="col.type === 'block-reason'" :label="col.label">
              <el-table-column :prop="col.prop" :width="colWidths[col.key]" :min-width="col.minWidth" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tooltip :content="blockReasonText(row.block_reason)" placement="top" :disabled="!row.block_reason">
                    <span>{{ row.block_reason || '-' }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table-column>
            <!-- status-chip: 状态码区间着色 + 表头精确过滤 -->
            <el-table-column v-else-if="col.type === 'status-chip'" :label="col.label" align="center">
              <el-table-column :prop="col.prop" align="center" :width="colWidths[col.key]" :min-width="col.minWidth">
                <template #header>
                  <el-input
                    v-model="filters[col.filterKey]"
                    size="small"
                    :placeholder="col.placeholder || col.label"
                    clearable
                    class="header-filter-input"
                    @input="(v) => (filters[col.filterKey] = String(v ?? '').replace(/\D/g, ''))"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </template>
                <template #default="{ row }">
                  <span class="status-chip" :class="statusChipClass(row.http_status_code)">{{ row.http_status_code ?? '-' }}</span>
                </template>
              </el-table-column>
            </el-table-column>
            <!-- text: 纯文本省略列(默认) -->
            <el-table-column v-else :label="col.label">
              <el-table-column :prop="col.prop" :width="colWidths[col.key]" :min-width="col.minWidth" show-overflow-tooltip />
            </el-table-column>
          </template>
          <template #empty>
            <el-empty description="暂无数据" />
          </template>
        </el-table>
      </div>

      <!-- 分页(统一) -->
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
import { getConversions, getPostbackEvents } from '@/services/main/ef-tracker'
import Sortable from 'sortablejs'
import useSystemStore from '@/stores/main/system/system'
import { localCache } from '@/utils/cache'
import CellLoading from '../clicks/cell-loading.vue'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const pagination = reactive({
  page: 1,
  pageSize: 10
})

// ===== 列配置（2026-11-20, 参考媒体点击 tab）: 齿轮面板显隐 + 拖拽排序, ui_settings 按用户+页面持久化 =====
// type: time 时间 / names 名称映射 / money 金额 / filter 表头精确查询框 / bool-tag 是否 /
//       block-reason 扣量枚举码 / status-chip 状态码 / text 纯文本
// salesOnly: 仅 Sales 类型显示(非 Sales 类型自动隐藏——数据来自 with_names/转化表, 其他事件没有)
const DEFAULT_COLUMNS = [
  { key: 'created_at', label: '上游回传时间', type: 'time', prop: 'created_at', minWidth: 180 },
  { key: 'advertiser', label: '广告主', type: 'names', nameKey: 'advertiser', prop: 'names.advertiser', minWidth: 110, salesOnly: true },
  { key: 'payout', label: 'payout', type: 'money', prop: 'payout', minWidth: 90 },
  { key: 'system_click_id', label: 'system_click_id', type: 'filter', prop: 'system_click_id', filterKey: 'system_click_id', minWidth: 200, placeholder: 'system_click_id' },
  { key: 'media_click_id', label: 'media_click_id', type: 'filter', prop: 'media_click_id', filterKey: 'media_click_id', minWidth: 160, placeholder: 'media_click_id' },
  { key: 'media', label: 'Media_name', type: 'names', nameKey: 'media', prop: 'names.media', minWidth: 110, salesOnly: true },
  { key: 'mid', label: 'mid', type: 'filter', prop: 'mid', filterKey: 'mid', minWidth: 90, digits: true, placeholder: 'mid' },
  { key: 'tracker', label: 'Tracker_name', type: 'names', nameKey: 'tracker', prop: 'names.tracker', minWidth: 110, salesOnly: true },
  { key: 'tid', label: 'tid', type: 'filter', prop: 'tid', filterKey: 'tid', minWidth: 90, digits: true, placeholder: 'tid' },
  { key: 'should_postback', label: '应下发', type: 'bool-tag', prop: 'should_postback', filterKey: 'should_postback', minWidth: 110, salesOnly: true },
  { key: 'block_reason', label: '扣量原因', type: 'block-reason', prop: 'block_reason', minWidth: 120, salesOnly: true },
  { key: 'block_note', label: '扣量说明', type: 'text', prop: 'block_note', minWidth: 280, salesOnly: true },
  { key: 'posted_at', label: '下发媒体时间', type: 'time', prop: 'posted_at', minWidth: 180 },
  { key: 'http_status_code', label: '下发状态', type: 'status-chip', prop: 'http_status_code', filterKey: 'http_status_code', minWidth: 110, placeholder: '下发状态' },
  { key: 'media_postback_url', label: 'media_postback_url', type: 'text', prop: 'media_postback_url', minWidth: 200, defaultHidden: true },
  { key: 'response_body', label: 'response_body', type: 'text', prop: 'response_body', minWidth: 220, defaultHidden: true }
]

const columns = ref(DEFAULT_COLUMNS.map((c) => ({ ...c, visible: !c.defaultHidden })))
// 可见列 = 勾选显示 && (非 salesOnly 或 当前是 Sales); ID/类型是固定列不在其中
const visibleColumns = computed(() =>
  columns.value.filter((c) => c.visible && (!c.salesOnly || eventType.value === 'sales'))
)

const COLUMN_SETTINGS_PAGE_KEY = 'ef_tracker_conversions'
const systemStore = useSystemStore()

// 库中偏好(可能缺列/多列)与 DEFAULT_COLUMNS 对齐: 新列按默认补进, 死键丢弃
function mergeColumns(saved) {
  const defByKey = new Map(DEFAULT_COLUMNS.map((c) => [c.key, c]))
  const seen = new Set()
  const merged = []
  for (const item of saved || []) {
    const def = defByKey.get(item.key)
    if (!def) continue
    merged.push({ ...def, visible: item.visible !== false })
    seen.add(def.key)
  }
  for (const def of DEFAULT_COLUMNS) {
    if (!seen.has(def.key)) merged.push({ ...def, visible: !def.defaultHidden })
  }
  return merged
}

function persistColumns() {
  systemStore
    .saveUiColumnSettingsAction(
      COLUMN_SETTINGS_PAGE_KEY,
      columns.value.map((c) => ({ key: c.key, visible: c.visible !== false }))
    )
    .catch(() => {})
}

async function loadColumns() {
  try {
    const saved = await systemStore.getUiColumnSettingsAction(COLUMN_SETTINGS_PAGE_KEY)
    if (Array.isArray(saved) && saved.length > 0) {
      columns.value = mergeColumns(saved)
    }
  } catch { /* 读库失败保持默认 */ }
}

const colListRef = ref(null)
let sortableInstance = null

function resetColumns() {
  systemStore.removeUiColumnSettingsAction(COLUMN_SETTINGS_PAGE_KEY).catch(() => {})
  columns.value = DEFAULT_COLUMNS.map((c) => ({ ...c, visible: !c.defaultHidden }))
}

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
      persistColumns()
    }
  })
}

function onPanelShown() { nextTick(ensureSortable) }
function onPanelHidden() {
  if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
}

// ===== 列宽：默认值 + 第一行表头拖动（复制自媒体点击 Tab 的方案）=====
// EP 的列宽拖动只对叶子列表头生效，组表头（第一行）拖不了 → 事件委托在表头容器上，
// 鼠标移到第一行某个 th 右缘 8px 内 → col-resize 光标；按下拖动 → 反查列，新宽度写回 colWidths。
// 列顺序（模板里的 el-table-column 顺序）与这里一一对应。
const COLUMN_KEYS = [
  'id', 'created_at', 'advertiser', 'payout', 'system_click_id', 'media_click_id',
  'media', 'mid', 'tracker', 'tid', 'should_postback', 'block_reason', 'block_note',
  'posted_at', 'http_status_code',
  'media_postback_url', 'response_body'
]
// 各列初始宽度：null = 未拖过，走各自 min-width；表头带过滤控件的列给足默认宽度，避免控件被挤压
const DEFAULT_COL_WIDTHS = { created_at: 180, media: 200, tracker: 200, should_postback: 120, http_status_code: 120, posted_at: 180 }
const colWidths = reactive(Object.fromEntries(COLUMN_KEYS.map((k) => [k, DEFAULT_COL_WIDTHS[k] ?? null])))

const tableRef = ref(null)
const colDrag = { col: null, startX: 0, startWidth: 0, active: false }
let headerWrapEl = null

// 反查：事件 target 所在的第一行 th → 当前可见列中同下标的列 key
// 前两列是固定列(ID/类型), 配置列从下标 2 开始; 列顺序随齿轮面板拖拽动态变化
function row1ColOf(e) {
  const th = e.target?.closest?.('th')
  if (!th || !headerWrapEl) return null
  const thead = headerWrapEl.querySelector('thead')
  if (!thead || th.parentElement !== thead.rows[0]) return null // 只处理第一行（组表头行）
  const idx = Array.prototype.indexOf.call(th.parentElement.children, th)
  const keys = ['id', '__type__', ...visibleColumns.value.map((c) => c.key)]
  return keys[idx] || null
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
  system_click_id: '',
  media_click_id: '',
  mid: '',
  tid: '',
  http_status_code: '',
  should_postback: ''
})

// 默认选「近三天」(前天~今天)：不带时间过滤时后端要对整张分区表全表 COUNT，列表要 10s+
// daysAgo(0)=今天 0 点、daysAgo(2)=前天 0 点；rangeToParams 会对 end 再 +1 天，恰好盖住今天全天
function daysAgo(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}
const dateRange = ref([daysAgo(2), daysAgo(0)])

// 下发状态胶囊配色：2xx 成功(绿) / 3xx 重定向(蓝) / 4xx 客户端错(橙) / 5xx 服务端错(红) / 空(灰)
function statusChipClass(code) {
  if (code == null || code === '') return 'sc-none'
  const n = Number(code)
  if (n >= 200 && n < 300) return 'sc-2xx'
  if (n >= 300 && n < 400) return 'sc-3xx'
  if (n >= 400 && n < 500) return 'sc-4xx'
  if (n >= 500) return 'sc-5xx'
  return 'sc-none'
}

// 广告主配色：对名称做稳定散列 → 8 组浅底深字（adv-c0 ~ adv-c7）。
// 同一名称永远得到同一颜色（跨页码/刷新稳定）；空值不给色
function advertiserColorClass(name) {
  if (!name) return ''
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return 'adv-c' + (h % 8)
}

// 扣量原因枚举码 → 中文(2026-11-20): 与后端 block_reason 写入值一一对应(docs/33)
const BLOCK_REASON_TEXT = {
  qdf_count: '按次数扣量',
  qdf_workday: '按工作日扣量',
  qdf_amount: '按金额扣量',
  dedup: '当天去重',
  media_disabled: '媒体总闸',
  no_config: '未配Sales回传地址',
  invalid_url: '媒体URL无效',
  send_failed: '发送失败'
}
function blockReasonText(code) {
  if (!code) return '-'
  // qdf_amount 的 note 里带判定条件, 主码是纯枚举; 兜底显示原码
  return BLOCK_REASON_TEXT[code] || code
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
  // scid/mcid/状态码 = 各列专属精确过滤(全类型可用, 2026-11-19)
  if (filters.system_click_id) p.system_click_id = filters.system_click_id
  if (filters.media_click_id) p.media_click_id = filters.media_click_id
  if (filters.http_status_code) p.http_status_code = filters.http_status_code
  if (filters.mid) p.mid = filters.mid
  if (filters.tid) p.tid = filters.tid
  if (eventType.value === 'sales') {
    // Sales 专属: 应下发过滤 + 名称映射(其他事件接口不支持这些参数)
    if (filters.should_postback) p.should_postback = filters.should_postback
    p.with_names = true
  } else {
    p.event_type = eventType.value
  }
  Object.assign(p, rangeToParams(dateRange.value))
  return p
}

async function loadData() {
  loading.value = true
  // 清掉旧数据：配合 rows-loading-mask 蒙版（行首 Loading 动画盖在表格上），
  // 空表格 + 蒙版即「每页 N 行、每行行首一枚加载动画」的效果
  tableData.value = []
  try {
    // Sales→转化表(带名称); 其他事件→通用回传事件表(字段同为小写蛇形, 直接渲染)
    const result = eventType.value === 'sales'
      ? await getConversions(buildParams())
      : await getPostbackEvents(buildParams())
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

// ===== 事件类型(2026-11-19 单表格版): "类型"列表头选择器切换, 默认 Sales =====
// Sales→/query/conversions(带名称/扣量过滤); 其他→/query/postback-events。
// 通用过滤(page/size/tz/keyword/mid/tid/日期)两类型共用; Sales 专属(with_names/http_status/should_postback)仅 Sales 带。
// 事件类型默认值记在 localStorage(2026-11-20 用户拍板: 不入库): 刷新/重登回到上次选的类型
const EVENT_TYPE_KEYS = ['all', 'sales', 'lead', 'tk_clicks', 'lp_u_visits', 'lp_u_clicks']
const EVENT_TYPE_CACHE_KEY = 'ef_conversions_event_type'
const eventType = ref(EVENT_TYPE_KEYS.includes(localCache.getCache(EVENT_TYPE_CACHE_KEY)) ? localCache.getCache(EVENT_TYPE_CACHE_KEY) : 'all')

function handleEventTypeChange() {
  localCache.setCache(EVENT_TYPE_CACHE_KEY, eventType.value)
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
  loadColumns() // 列偏好(顺序+可见性)从 ui_settings 异步加载, 加载前先渲染默认列
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
  // padding-top: 30px;
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
  position: relative;
}

/* 行级加载蒙版：只盖表格表体（每行行首一枚「圆环+Loading」）。从表头底部开始（两级表头 ~82px），
   表头不加蒙版、完全可见可交互。行高对齐 td(48px) + 1px 分隔线（同媒体点击 Tab） */
.rows-loading-mask {
  position: absolute;
  top: 92px; /* 两级表头高度：第一行列名 44 + 第二行过滤行 ~48（含 el-select 略高的余量） */
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

  // 省略号截断修复（同媒体点击 Tab）：Element 的 .cell.el-tooltip 自带 min-width:50px
  // （nowrap 长内容会把省略号顶出 td 边界），取消最小宽度让 .cell 能收缩到列宽内
  .cell.el-tooltip {
    min-width: 0 !important;
  }

  // 分组分隔线：应回传列是「我们 → 媒体回传」分组的起始（左边是广告主 → 我们的回传数据），
  // 其左侧画一条明显的深色竖线，表头两行 + 表体单元格都要有
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
        // 省略号在 .cell 内截断，绝不会越过 td 边界。
        // 垂直居中用 line-height 方案而非 flex：flex 会让裸文本列（system_click_id 等
        // 无 default 插槽的纯字段列）失去 text-overflow 省略号、且贴边无对齐
        .cell {
          padding: 0 14px;
          text-align: center;
          line-height: 47px; /* (行高 48 - 1px 分隔线) / 1，单行文本垂直居中 */
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

/* payout 金额列：等宽数字字体 + 表格数字对齐 + 单元格内垂直居中（与媒体点击 cost 列一致） */
:deep(.google-table td.col-money .cell) {
  font-family: 'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  height: 100%;
}

/* 金额列表头：加粗 + 用表格同款表头字重的字体 */
:deep(.google-table th.col-money .cell) {
  font-weight: 700;
  font-family: 'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 代码型列（两个 click_id）：等宽字体，长 ID 串逐位比对友好 */
:deep(.google-table td.col-mono .cell) {
  font-family: 'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

/* 下发状态胶囊：按 HTTP 区间着色（样式体系同错误日志 Tab） */
.status-chip {
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

.sc-2xx { background: #e6f4ea; color: #137333; }
.sc-3xx { background: #e8f0fe; color: #1a73e8; }
.sc-4xx { background: #fef7e0; color: #b06000; }
.sc-5xx { background: #fce8e6; color: #c5221f; }
.sc-none { background: #f1f3f4; color: #80868b; }

/* 广告主名胶囊：形状与状态胶囊一致；底色按名称散列到 8 组浅底深字（互不冲突的柔和色板） */
.advertiser-chip {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  background: #f1f3f4;
  color: #5f6368;
}

.adv-c0 { background: #e8f0fe; color: #1a73e8; } /* 蓝 */
.adv-c1 { background: #e6f4ea; color: #137333; } /* 绿 */
.adv-c2 { background: #fef7e0; color: #b06000; } /* 橙 */
.adv-c3 { background: #fce8e6; color: #c5221f; } /* 红 */
.adv-c4 { background: #f3e8fd; color: #7627bb; } /* 紫 */
.adv-c5 { background: #e4f7fb; color: #007b83; } /* 青 */
.adv-c6 { background: #feefc3; color: #8a6100; } /* 黄 */
.adv-c7 { background: #e6ecf7; color: #3f51b5; } /* 靛 */

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

<!-- 列配置面板(2026-11-20, popover teleported 到 body, 全局样式) -->
<style>
.conversions-col-popover.el-popper {
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