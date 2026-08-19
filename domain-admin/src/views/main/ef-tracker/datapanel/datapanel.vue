<template>
  <div class="google-content">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">数据面板</h1>
      </div>
      <div class="header-actions">
        <button
          class="google-btn"
          :class="uniqueOnly ? 'google-btn-primary' : 'google-btn-secondary'"
          @click="toggleUnique"
          title="按 media_click_id 去重，同一用户多次点击算 1 个"
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
      <!-- 查询条件 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-items">
            <el-form :inline="true" class="filter-form" @submit.prevent>
              <el-form-item label="时间范围">
                <el-select v-model="range" style="width: 110px" @change="handleSearch">
                  <el-option v-for="o in rangeOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="range === 'custom'" label="自定义">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  clearable
                  style="width: 240px"
                />
              </el-form-item>
              <el-form-item label="时区">
                <el-select v-model="tz" style="width: 130px" @change="handleSearch">
                  <el-option v-for="o in tzOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>
          <div class="filter-actions">
            <button class="google-btn google-btn-primary" @click="handleSearch">查询</button>
            <button class="google-btn google-btn-secondary" @click="handleReset">重置</button>
          </div>
        </div>
      </div>

      <!-- 维度选择器条(样式与 report 数据报表页一致)：已选维度可拖拽排序 + 添加维度 -->
      <div class="dimension-bar">
        <div class="dimension-selected-list">
          <div
            v-for="(d, index) in selectedDims"
            :key="d.value"
            class="dimension-selected-item"
            :data-index="index"
            draggable="true"
            @dragstart="handleDimDragStart"
            @dragover.prevent="handleDimDragOver"
            @drop="handleDimDrop"
            @dragend="handleDimDragEnd"
          >
            <svg class="g-drag-handle" viewBox="0 0 24 24">
              <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            <span class="dimension-order-badge">{{ index + 1 }}</span>
            <span class="dimension-name">{{ d.label }}</span>
            <button class="g-dimension-remove" @click="removeDim(d.value)" title="移除">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- 添加维度按钮 + el-popover 面板(teleport 到 body,不会被 content-card 的 overflow 裁剪) -->
          <el-popover
            v-if="availableDims.length > 0"
            :visible="showDimensionPicker"
            placement="bottom-start"
            :width="560"
            :show-arrow="false"
            popper-class="datapanel-dim-popover"
            @hide="onPickerHide"
          >
            <template #reference>
              <button
                class="dimension-add-btn"
                :class="{ 'dimension-add-btn-active': showDimensionPicker }"
                @click="togglePicker"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                添加维度
              </button>
            </template>

            <!-- 维度选择面板：两列网格,高度不超屏 -->
            <div class="dimension-picker-panel">
              <div class="dimension-picker-header">
                <span>选择要添加的维度（最多 {{ MAX_DIMS }} 个）</span>
              </div>
              <div class="dimension-picker-list">
                <div
                  v-for="dim in availableDims"
                  :key="dim.value"
                  class="dimension-picker-item"
                  @click="addDim(dim.value)"
                >
                  <span class="dimension-picker-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </span>
                  <span class="dimension-picker-label">{{ dim.label }}</span>
                  <span class="dimension-picker-hint">{{ dim.hint }}</span>
                </div>
              </div>
            </div>
          </el-popover>
        </div>

        <div class="dimension-hint" v-if="selectedDims.length > 0">
          <span>点击维度展开 → {{ formatDimensionPreview() }}</span>
        </div>
      </div>

      <!-- 表格：嵌套展开(行首箭头点开下一维度,与 report 数据报表页一致) -->
      <div class="table-wrapper" v-loading="loading">
        <table class="nested-table">
          <thead>
            <tr>
              <th class="nt-dim">维度</th>
              <th class="nt-num">Clicks</th>
              <th class="nt-num">Cost</th>
              <th class="nt-num">Conversions</th>
              <th class="nt-num">Revenue</th>
              <th class="nt-num">
                CVR
                <el-tooltip
                  content="CVR = Conversions ÷ Clicks × 100%"
                  placement="top"
                  :show-after="200"
                >
                  <span class="nt-help-icon" title="">
                    <svg viewBox="0 0 24 24">
                      <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
                    </svg>
                  </span>
                </el-tooltip>
              </th>
              <th class="nt-num">
                ROI
                <el-tooltip
                  content="ROI = Revenue ÷ Cost (Cost 为 0 时显示 -)"
                  placement="top"
                  :show-after="200"
                >
                  <span class="nt-help-icon" title="">
                    <svg viewBox="0 0 24 24">
                      <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
                    </svg>
                  </span>
                </el-tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in tableRows"
              :key="row.path"
              :class="{ 'nt-expanded-row': isRowExpanded(row) }"
            >
              <td class="nt-dim nt-clickable" @click="toggleRow(row)">
                <span
                  class="nt-indent"
                  :style="{ width: row.level * 20 + 'px' }"
                ></span>
                <span v-if="hasChildLevel(row.level)" class="nt-expand-icon" :class="{ 'is-open': isRowExpanded(row) }">
                  <svg viewBox="0 0 24 24">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </span>
                <span v-else class="nt-expand-placeholder"></span>
                <span class="nt-name" :title="row.key ? `key: ${row.key}` : '空值组'">{{ row.name }}</span>
                <!-- lander 维度：名称旁小图标,点击新窗口打开落地页(拼 eflp 签名,同落地页列表页) -->
                <a
                  v-if="row.dim === 'lander' && row.key"
                  class="external-link-btn"
                  title="打开落地页"
                  @click.stop="openLander(row.key)"
                >
                  <svg viewBox="0 0 24 24" class="external-icon">
                    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                  </svg>
                </a>
              </td>
              <td class="nt-num nt-clickable" @click="toggleRow(row)">{{ fmtNum(row.clicks) }}</td>
              <td class="nt-num nt-clickable" @click="toggleRow(row)">{{ fmtMoney(row.cost) }}</td>
              <td class="nt-num nt-clickable" @click="toggleRow(row)">{{ fmtNum(row.conversions) }}</td>
              <td class="nt-num nt-clickable" @click="toggleRow(row)">{{ fmtMoney(row.revenue) }}</td>
              <td class="nt-num nt-clickable" @click="toggleRow(row)">{{ fmtPct(row.cvr) }}</td>
              <td class="nt-num nt-clickable" @click="toggleRow(row)">{{ fmtRoi(row.roi) }}</td>
            </tr>
            <tr v-if="!loading && tableRows.length === 0">
              <td colspan="7" class="nt-empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 合计行：第一层全部分组合计(不受分页影响) -->
      <div v-if="totals" class="totals-bar">
        <span class="totals-label">合计</span>
        <span class="totals-item">点击 <b>{{ fmtNum(totals.clicks) }}</b></span>
        <span class="totals-item">花费 <b>{{ fmtMoney(totals.cost) }}</b></span>
        <span class="totals-item">转化 <b>{{ fmtNum(totals.conversions) }}</b></span>
        <span class="totals-item">收入 <b>{{ fmtMoney(totals.revenue) }}</b></span>
      </div>

      <!-- 分页：作用于第一层分组结果;展开的子层各自独立分页(记忆在行上) -->
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import SparkMD5 from 'spark-md5'
import { getStatsBreakdown, getLanders } from '@/services/main/ef-tracker'

// ===== 维度定义(与 QUERY_API.md 第12节一致) =====
// id 类维度带 name；string/date/hour 维度 key 即名
const DIM_OPTIONS = [
  { value: 'date', label: '日期', hint: '按 tz 的日期' },
  { value: 'lander', label: 'Lander', hint: '落地页 id→名称' },
  { value: 'media', label: '媒体', hint: '媒体 id→名称' },
  { value: 'offer', label: 'Offer', hint: 'Offer id→名称' },
  { value: 'tracker', label: 'Tracker', hint: 'Tracker id→名称' },
  { value: 'advertiser', label: '广告主', hint: '广告主 id→名称' },
  { value: 'campaign', label: 'Campaign', hint: '广告活动名' },
  { value: 'adset', label: 'AdSet', hint: '广告组名' },
  { value: 'creative', label: 'Creative', hint: '素材名' },
  { value: 'hour', label: '小时', hint: '0~23 档' }
]
const MAX_DIMS = 5 // 接口硬校验上限

// 嵌套表格数据声明(在下方「嵌套展开状态」一节统一定义)
const loading = ref(false)
const total = ref(0)
const totals = ref(null)
const rows = ref([])
const tableRows = computed(() => rows.value)

// 服务端分页(作用于第一层)：page 从 1 开始，size 上限 100
const pagination = reactive({ page: 1, pageSize: 20 })

// 时区：默认 +8(与其它 ef-tracker 页面一致)

// 时区：默认 +8(与其它 ef-tracker 页面一致)
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

// 时间范围：预设(range) 或 自定义(start/end)
const rangeOptions = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '近7天', value: '7d' },
  { label: '近14天', value: '14d' },
  { label: '本月', value: 'this_month' },
  { label: '自定义', value: 'custom' }
]
const range = ref('today')
const dateRange = ref([])

// ===== 维度选择(顺序=下钻顺序,样式与 report 数据报表页一致) =====
const selectedDims = ref([DIM_OPTIONS[0], DIM_OPTIONS[1]]) // 默认 [日期, Lander]
const showDimensionPicker = ref(false)

const availableDims = computed(() => DIM_OPTIONS.filter((d) => !selectedDims.value.some((s) => s.value === d.value)))

function addDim(value) {
  if (selectedDims.value.length >= MAX_DIMS) {
    ElMessage.warning(`最多 ${MAX_DIMS} 个维度`)
    showDimensionPicker.value = false
    return
  }
  const found = DIM_OPTIONS.find((d) => d.value === value)
  if (found && !selectedDims.value.some((s) => s.value === found.value)) {
    selectedDims.value.push(found)
    pagination.page = 1
    loadData() // 维度变了,展开状态随行数据一起重建
  }
  if (availableDims.value.length === 0 || selectedDims.value.length >= MAX_DIMS) {
    showDimensionPicker.value = false
  }
}

function removeDim(value) {
  if (selectedDims.value.length <= 1) {
    ElMessage.warning('至少保留一个维度')
    return
  }
  selectedDims.value = selectedDims.value.filter((d) => d.value !== value)
  pagination.page = 1
  loadData()
}

// 原生 HTML5 拖拽排序(与 report 页一致)
const draggedDimIndex = ref(null)
const dragOverDimIndex = ref(null)

function handleDimDragStart(event) {
  const index = parseInt(event.target.closest('.dimension-selected-item').dataset.index)
  draggedDimIndex.value = index
  event.target.closest('.dimension-selected-item').classList.add('dragging')
  event.dataTransfer.effectAllowed = 'move'
}

function handleDimDragOver(event) {
  const target = event.target.closest('.dimension-selected-item')
  if (target) {
    const index = parseInt(target.dataset.index)
    if (index !== draggedDimIndex.value) {
      dragOverDimIndex.value = index
    }
  }
}

function handleDimDrop(event) {
  const target = event.target.closest('.dimension-selected-item')
  if (!target) return
  const toIndex = parseInt(target.dataset.index)
  const fromIndex = draggedDimIndex.value
  if (fromIndex === toIndex || isNaN(fromIndex)) return

  const arr = [...selectedDims.value]
  const [moved] = arr.splice(fromIndex, 1)
  arr.splice(toIndex, 0, moved)
  selectedDims.value = arr

  // 顺序变了,重新加载第一层(展开状态随行数据重建)
  pagination.page = 1
  loadData()
}

function handleDimDragEnd(event) {
  const item = event.target.closest('.dimension-selected-item')
  if (item) item.classList.remove('dragging')
  draggedDimIndex.value = null
  dragOverDimIndex.value = null
}

// 顺序预览提示:[1] 日期 → [2] Lander
function formatDimensionPreview() {
  return selectedDims.value
    .map((d, i) => `[${i + 1}] ${d.label}`)
    .join(' → ')
}

// ===== 维度菜单开关 =====
// 受控模式(:visible)的 el-popover 点击外部不会自动关,这里手动监听:
// 点在按钮/弹层外 → 关闭。弹层本身 teleport 到 body,用 class 判断
function togglePicker() {
  showDimensionPicker.value = !showDimensionPicker.value
}

function onPickerHide() {
  // el-popover 自身触发的隐藏(如 ESC),同步状态
  showDimensionPicker.value = false
}

function handleDocMousedown(event) {
  if (!showDimensionPicker.value) return
  const t = event.target
  // 点在添加按钮或弹层内 → 不处理(按钮自己 toggle)
  if (t.closest('.dimension-add-btn') || t.closest('.datapanel-dim-popover')) return
  showDimensionPicker.value = false
}

// ===== 嵌套展开逻辑 =====
// rows(上方已声明): 扁平化嵌套行。子行分页状态记在行上(page/pageSize/total),展开过滤由行链(filtersOf)生成
const dimValues = computed(() => selectedDims.value.map((d) => d.value))

function hasChildLevel(level) {
  return level < dimValues.value.length - 1
}

function isRowExpanded(row) {
  return !!row.expanded
}

// 派生指标：CVR = 转化/点击；ROI = 收入/花费(cost 为 0 时显示 -)
function decorate(list) {
  for (const row of list) {
    row.cvr = row.clicks > 0 ? (Number(row.conversions) / Number(row.clicks)) * 100 : 0
    row.roi = Number(row.cost) > 0 ? (Number(row.revenue) / Number(row.cost)) * 100 : null
  }
  return list
}

// ===== Lander 打开(维度含 lander 时,名称旁小图标) =====
// url 不在 breakdown 返回里;按 lander name 精确匹配 /query/landers(keyword 同时搜 name/url,
// 返回后本地精确比对 name,避免模糊误配),缓存 { id: url }
const landerUrls = reactive({})
const landerUrlPending = new Set() // 防并发重复请求

async function ensureLanderUrl(row) {
  const id = String(row.key)
  if (landerUrls[id] !== undefined || landerUrlPending.has(id)) return
  landerUrlPending.add(id)
  try {
    const res = await getLanders({ keyword: row.name, page: 1, size: 50 })
    const hit = (res?.list || []).find((l) => l.name === row.name) || (res?.list || [])[0]
    landerUrls[id] = hit?.url || ''
  } catch (e) {
    landerUrls[id] = '' // 失败也写入空串,避免反复重试
  } finally {
    landerUrlPending.delete(id)
  }
}

// 行渲染时预取 lander url(不阻塞表格)
function prefetchLanderUrls() {
  for (const row of rows.value) {
    if (row.dim === 'lander' && row.key) ensureLanderUrl(row)
  }
}

// 打开落地页：前端拼 eflp 访问签名(与 clickflare 同一套门禁,逻辑复制自 ef-tracker>落地页列表)
async function openLander(id) {
  const key = String(id)
  if (landerUrls[key] === undefined) {
    // 未预取到(如请求失败),按行名再试一次
    const row = rows.value.find((r) => r.dim === 'lander' && String(r.key) === key)
    if (row) await ensureLanderUrl(row)
  }
  const url = landerUrls[key]
  if (!url) {
    ElMessage.warning('未取到该落地页的 url')
    return
  }
  const t = Math.floor(Date.now() / 10000)
  const n = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const raw = `eflp${t}${n}`
  const s = SparkMD5.hash(raw).substring(0, 10)
  const sep = url.includes('?') ? '&' : '?'
  window.open(`${url}${sep}go=1&t=${t}&n=${n}&s=${s}&w=1`, '_blank')
}

// ===== 请求 =====
// daterange → start/end。end 为排除上界(<)，+1 天以包含结束日整天
function rangeToParams(r) {
  if (!r || r.length !== 2) return {}
  const [d1, d2] = r
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} 00:00:00`
  const end = new Date(d2.getTime())
  end.setDate(end.getDate() + 1)
  return { start: fmt(d1), end: fmt(end) }
}

function buildParams(page, size, filters) {
  const p = {
    dims: dimValues.value.join(','),
    page,
    size,
    tz: tz.value
  }
  if (range.value === 'custom') {
    Object.assign(p, rangeToParams(dateRange.value))
  } else if (range.value) {
    p.range = range.value
  }
  if (uniqueOnly.value) p.unique = true
  // 展开过滤：父行链上锁定的维度值
  Object.assign(p, filters || {})
  return p
}

// 行的展开过滤 = 该行 dim 值 + 所有祖先 dim 值
function filtersOf(row) {
  const fs = {}
  let cur = row
  while (cur) {
    if (cur.key !== '' && cur.key != null) fs[cur.dim] = String(cur.key)
    cur = cur.parent
  }
  return fs
}

// 加载第一层(按维度顺序的第一个维度分组)
async function loadData() {
  if (!dimValues.value.length) {
    rows.value = []
    total.value = 0
    totals.value = null
    return
  }
  loading.value = true
  try {
    const result = await getStatsBreakdown(buildParams(pagination.page, pagination.pageSize))
    const list = decorate(result?.list || [])
    rows.value = list.map((item, idx) => ({
      ...item,
      path: `${idx}`,
      level: 0,
      dim: dimValues.value[0],
      parent: null,
      expanded: false,
      loading: false,
      loaded: false,
      page: 1,
      pageSize: pagination.pageSize,
      total: 0
    }))
    total.value = result?.total ?? 0
    totals.value = result?.totals ?? null
    prefetchLanderUrls() // lander 维度行预取 url(异步,不阻塞表格)
  } catch (error) {
    ElMessage.error('加载失败: ' + (error?.response?.data?.error || error?.message || '网络错误'))
    rows.value = []
  } finally {
    loading.value = false
  }
}

// 展开/收起某行:展开时按下一维度请求子行并插入到该行下方;收起时移除其子行
async function toggleRow(row) {
  if (!hasChildLevel(row.level)) return
  // 空值组(key="")不能作为过滤(接口无法区分"锁定空值"),不展开
  if (row.key === '' || row.key == null) return

  if (row.expanded) {
    // 收起:移除该行前缀的所有子孙行
    row.expanded = false
    const prefix = row.path + '-'
    rows.value = rows.value.filter((r) => !r.path.startsWith(prefix))
    return
  }

  row.expanded = true
  await loadChildren(row)
}

async function loadChildren(row) {
  const nextDim = dimValues.value[row.level + 1]
  if (!nextDim) return
  row.loading = true
  try {
    const result = await getStatsBreakdown(buildParams(row.page, row.pageSize, filtersOf(row)))
    const list = decorate(result?.list || [])
    row.total = result?.total ?? 0
    row.loaded = true

    // 先移除旧子行,再把新子行插到该行后面
    const prefix = row.path + '-'
    const filtered = rows.value.filter((r) => !r.path.startsWith(prefix))
    const idx = filtered.findIndex((r) => r.path === row.path)
    const children = list.map((item, i) => ({
      ...item,
      path: `${row.path}-${(row.page - 1) * row.pageSize + i}`,
      level: row.level + 1,
      dim: nextDim,
      parent: row,
      expanded: false,
      loading: false,
      loaded: false,
      page: 1,
      pageSize: row.pageSize,
      total: 0
    }))
    filtered.splice(idx + 1, 0, ...children)
    rows.value = filtered
    prefetchLanderUrls() // 展开的子层若含 lander 也预取
  } catch (error) {
    ElMessage.error('展开失败: ' + (error?.response?.data?.error || error?.message || '网络错误'))
    row.expanded = false
  } finally {
    row.loading = false
  }
}

function handleSearch() {
  // 自定义范围但没选日期 → 提示
  if (range.value === 'custom' && (!dateRange.value || dateRange.value.length !== 2)) {
    ElMessage.warning('请选择自定义日期范围')
    return
  }
  pagination.page = 1
  loadData()
}

function handleReset() {
  selectedDims.value = [DIM_OPTIONS[0], DIM_OPTIONS[1]]
  range.value = 'today'
  dateRange.value = []
  tz.value = 8
  uniqueOnly.value = false
  showDimensionPicker.value = false
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

// ===== 去重开关 =====
const uniqueOnly = ref(false)
function toggleUnique() {
  uniqueOnly.value = !uniqueOnly.value
  pagination.page = 1
  loadData()
}

// ===== 格式化 =====
function fmtNum(n) {
  const num = Number(n)
  return isNaN(num) ? '-' : num.toLocaleString()
}
function fmtMoney(s) {
  const num = Number(s)
  return isNaN(num) ? '-' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(v) {
  const num = Number(v)
  return isNaN(num) ? '-' : num.toFixed(2) + '%'
}
function fmtRoi(v) {
  if (v == null || isNaN(Number(v))) return '-'
  return (Number(v) / 100).toFixed(2) // ROI 展示为倍数(2.35x 风格),内部存百分比
}

// ===== 刷新倒计时(5 秒防抖,与 clicks 页一致) =====
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

onMounted(() => {
  loadData()
  document.addEventListener('mousedown', handleDocMousedown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocMousedown)
  clearInterval(refreshTimer)
  refreshTimer = null
})
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

// ===== 维度选择器条(样式与 report 数据报表页一致) =====
.dimension-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #e8eaed;
  flex-wrap: wrap;
}

.dimension-selected-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dimension-selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e8f0fe;
  border: 1px solid #1a73e8;
  border-radius: 8px;
  cursor: move;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    background: #d2e3fc;
    box-shadow: 0 2px 6px rgba(26, 115, 232, 0.2);
  }

  &.dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }
}

.g-drag-handle {
  width: 18px;
  height: 18px;
  fill: #5f6368;
  cursor: grab;
  flex-shrink: 0;

  &:active {
    cursor: grabbing;
  }
}

.dimension-order-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: #1a73e8;
  color: #ffffff;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.dimension-name {
  font-size: 13px;
  color: #1a73e8;
  font-weight: 500;
}

.g-dimension-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.2s;

  svg {
    width: 14px;
    height: 14px;
    fill: #5f6368;
    transition: all 0.2s;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.08);

    svg {
      fill: #d93025;
    }
  }
}

.dimension-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px dashed #dadce0;
  border-radius: 8px;
  background: #ffffff;
  color: #5f6368;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
  }

  &:hover {
    background: #f8f9fa;
    border-color: #1a73e8;
    color: #1a73e8;

    svg {
      fill: #1a73e8;
    }
  }

  &.dimension-add-btn-active {
    background: #e8f0fe;
    border-color: #1a73e8;
    border-style: solid;
    color: #1a73e8;

    svg {
      fill: #1a73e8;
    }
  }
}

.dimension-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 12px;
  color: #5f6368;
  margin-left: auto;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

// ===== 嵌套展开表格(样式参考 report 数据报表页) =====
.table-wrapper {
  overflow-x: auto;
  padding: 0;
}

.nested-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  font-size: 13px;

  thead {
    tr {
      border-bottom: 1px solid #e8eaed;
    }

    th {
      background: #f1f3f4;
      color: #3c4043;
      font-weight: 500;
      font-size: 12px;
      text-align: left;
      padding: 12px 14px;
      position: sticky;
      top: 0;
      z-index: 10;
      white-space: nowrap;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #f1f3f4;

      &:hover {
        background: #f8f9fa;
      }

      &.nt-expanded-row {
        background: #f8f9fa;
      }
    }

    td {
      padding: 10px 14px;
      color: #202124;
      white-space: nowrap;
    }
  }

  .nt-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  thead th.nt-num {
    text-align: right;
  }

  .nt-clickable {
    cursor: pointer;
  }

  .nt-expanded-row > .nt-clickable {
    font-weight: 500;
  }
}

// 展开箭头(右向,展开后旋转 90° 朝下)
.nt-expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  vertical-align: middle;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
    transition: transform 0.2s;
  }

  &.is-open svg {
    transform: rotate(90deg);
    fill: #1a73e8;
  }
}

// 最深一层没有箭头,占位保持对齐
.nt-expand-placeholder {
  display: inline-block;
  width: 24px;
  flex-shrink: 0;
}

.nt-name {
  color: #202124;
}

// lander 名称旁「打开落地页」小图标(样式与 ef-tracker>落地页列表页一致)
.external-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  width: 18px;
  height: 18px;
  margin-left: 7px;
  color: #5f6368;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  .external-icon {
    width: 15px;
    height: 15px;
    fill: currentColor;
  }

  &:hover {
    color: #1a73e8;
    background: #e8f0fe;
  }
}

// 表头公式提示图标(? 圆圈)
.nt-help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  margin-left: 2px;
  cursor: help;

  svg {
    width: 13px;
    height: 13px;
    fill: #9aa0a6;
    transition: fill 0.2s;
  }

  &:hover svg {
    fill: #1a73e8;
  }
}

.nt-empty {
  text-align: center;
  padding: 40px 0;
  color: #5f6368;
}

// ===== 合计条 =====
.totals-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 10px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e8eaed;
  font-size: 13px;
  color: #5f6368;
}

.totals-label {
  font-weight: 500;
  color: #202124;
}

.totals-item b {
  color: #202124;
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

<style lang="less">
/* 维度选择面板(el-popover teleported 到 body，scoped 选不中)：白卡片 + 可点维度行 */
.datapanel-dim-popover.el-popper {
  padding: 0 !important;
  border-radius: 8px;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

.datapanel-dim-popover .dimension-picker-panel {
  padding: 16px;
}

.datapanel-dim-popover .dimension-picker-header {
  font-size: 13px;
  font-weight: 500;
  color: #5f6368;
  margin-bottom: 12px;
}

/* 两列网格;行数多时列表内部滚动,弹层整体高度不超视口 */
.datapanel-dim-popover .dimension-picker-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  max-height: min(420px, 50vh);
  overflow-y: auto;
}

.datapanel-dim-popover .dimension-picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8f9fa; /* 浅灰底,不用纯白 */
  border: 1px solid #dadce0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 0;

  &:hover {
    background: #e8f0fe;
    border-color: #1a73e8;

    .dimension-picker-icon svg {
      fill: #1a73e8;
    }

    .dimension-picker-label {
      color: #1a73e8;
    }
  }
}

.datapanel-dim-popover .dimension-picker-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
    transition: all 0.2s;
  }
}

.datapanel-dim-popover .dimension-picker-label {
  font-size: 13px;
  color: #5f6368;
  transition: all 0.2s;
  white-space: nowrap;
}

.datapanel-dim-popover .dimension-picker-hint {
  margin-left: auto;
  font-size: 11px;
  color: #9aa0a6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

