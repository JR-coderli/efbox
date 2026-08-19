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
                <!-- 快捷+日历一体的时间面板：左侧快捷选项,右侧 daterange 日历(teleport 到 body 不被裁剪) -->
                <el-popover
                  :visible="showRangePanel"
                  placement="bottom-start"
                  :width="800"
                  :show-arrow="false"
                  popper-class="datapanel-range-popover"
                >
                  <template #reference>
                    <button
                      class="range-trigger-btn"
                      :class="{ 'is-open': showRangePanel }"
                      @click="toggleRangePanel"
                    >
                      <svg viewBox="0 0 24 24" class="rt-icon">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                      </svg>
                      <span class="rt-text">{{ rangeLabel }}</span>
                      <svg viewBox="0 0 24 24" class="rt-arrow" :class="{ 'is-open': showRangePanel }">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                      </svg>
                    </button>
                  </template>

                  <div class="range-panel">
                    <!-- 左侧：快捷时间 -->
                    <div class="range-shortcuts">
                      <button
                        v-for="o in rangeOptions"
                        :key="o.value"
                        class="range-shortcut-item"
                        :class="{ active: range === o.value && !customActive }"
                        @click="pickShortcut(o.value)"
                      >
                        {{ o.label }}
                      </button>
                    </div>
                    <!-- 右侧：日历直选自定义范围(teleported=false 让日历渲染在面板内,单月+左右箭头防溢出) -->
                    <div class="range-calendar" @mousedown.stop>
                      <el-date-picker
                        ref="calendarPickerRef"
                        v-model="calendarRange"
                        type="daterange"
                        :teleported="false"
                        :clearable="false"
                        popper-class="datapanel-range-inner-popper"
                      />
                    </div>
                  </div>
                </el-popover>
              </el-form-item>
              <el-form-item label="时区">
                <el-select v-model="tz" style="width: 100px" @change="handleSearch">
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
          <span>{{ formatDimensionPreview() }}</span>
        </div>
      </div>

      <!-- 表格：嵌套展开(行首箭头点开下一维度,与 report 数据报表页一致) -->
      <div class="table-wrapper" v-loading="loading">
        <table class="nested-table">
          <thead>
            <tr>
              <th class="nt-dim">维度</th>
              <th class="nt-num nt-sortable" @click="toggleSort('clicks')">
                <span class="nt-th-text">Clicks</span>
                <span class="nt-sort-icon" :class="sortClass('clicks')">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 18l4-4h12v4H4zm0-8l4-4h12v4H4z" opacity="0" />
                    <path d="M7 10l5-5 5 5H7zm0 4h10l-5 5-5-5z" />
                  </svg>
                </span>
              </th>
              <th class="nt-num nt-sortable" @click="toggleSort('cost')">
                <span class="nt-th-text">Cost</span>
                <span class="nt-sort-icon" :class="sortClass('cost')">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 10l5-5 5 5H7zm0 4h10l-5 5-5-5z" />
                  </svg>
                </span>
              </th>
              <th class="nt-num nt-sortable" @click="toggleSort('conversions')">
                <span class="nt-th-text">Conversions</span>
                <span class="nt-sort-icon" :class="sortClass('conversions')">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 10l5-5 5 5H7zm0 4h10l-5 5-5-5z" />
                  </svg>
                </span>
              </th>
              <th class="nt-num nt-sortable" @click="toggleSort('revenue')">
                <span class="nt-th-text">Revenue</span>
                <span class="nt-sort-icon" :class="sortClass('revenue')">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 10l5-5 5 5H7zm0 4h10l-5 5-5-5z" />
                  </svg>
                </span>
              </th>
              <th class="nt-num nt-sortable" @click="toggleSort('profit')">
                <span class="nt-th-text">Profit</span>
                <span class="nt-sort-icon" :class="sortClass('profit')">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 10l5-5 5 5H7zm0 4h10l-5 5-5-5z" />
                  </svg>
                </span>
                <el-tooltip
                  content="Profit = Revenue − Cost(正数为盈利,负数为亏损)"
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
              <th class="nt-num nt-sortable" @click="toggleSort('cvr')">
                <span class="nt-th-text">CVR</span>
                <span class="nt-sort-icon" :class="sortClass('cvr')">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 10l5-5 5 5H7zm0 4h10l-5 5-5-5z" />
                  </svg>
                </span>
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
              <th class="nt-num nt-sortable" @click="toggleSort('roi')">
                <span class="nt-th-text">ROI</span>
                <span class="nt-sort-icon" :class="sortClass('roi')">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 10l5-5 5 5H7zm0 4h10l-5 5-5-5z" />
                  </svg>
                </span>
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
              <!-- 维度列整格可点击展开(点击预览图/外链图标除外,它们自带 .stop) -->
              <td
                class="nt-dim"
                :class="{ 'nt-dim-clickable': hasChildLevel(row.level) && row.key !== '' && row.key != null }"
                :title="hasChildLevel(row.level) && (row.key === '' || row.key == null) ? '空值组无法展开' : ''"
                @click="toggleRow(row)"
              >
                <!-- 层级缩进:每层一条竖虚线引导,直观呈现父子层级 -->
                <span
                  v-for="lv in row.level"
                  :key="lv"
                  class="nt-indent-line"
                ></span>
                <span
                  v-if="hasChildLevel(row.level)"
                  class="nt-expand-icon"
                  :class="{ 'is-open': isRowExpanded(row) }"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </span>
                <span v-else class="nt-expand-placeholder"></span>
                <!-- lander 维度：名称前显示预览图缩略图(点击放大) -->
                <el-image
                  v-if="row.dim === 'lander' && row.key && landerImages[row.key]"
                  class="nt-preview-img"
                  :src="landerImages[row.key]"
                  :preview-src-list="[landerImages[row.key]]"
                  preview-teleported
                  fit="cover"
                  hide-on-click-modal
                />
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
              <td class="nt-num">{{ fmtNum(row.clicks) }}</td>
              <td class="nt-num">{{ fmtMoney(row.cost) }}</td>
              <td class="nt-num">{{ fmtNum(row.conversions) }}</td>
              <td class="nt-num nt-revenue">{{ fmtMoney(row.revenue) }}</td>
              <td
                class="nt-num nt-profit"
                :class="row.profit > 0 ? 'profit-pos' : row.profit < 0 ? 'profit-neg' : ''"
              >{{ fmtMoney(row.profit) }}</td>
              <td class="nt-num">{{ fmtPct(row.cvr) }}</td>
              <td class="nt-num">{{ fmtRoi(row.roi) }}</td>
            </tr>
            <tr v-if="!loading && tableRows.length === 0">
              <td colspan="8" class="nt-empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 合计行：第一层全部分组合计(不受分页影响) -->
      <div v-if="totals" class="totals-bar">
        <span class="totals-label">合计: </span>
        <span class="totals-item">点击 <b>{{ fmtNum(totals.clicks) }}</b></span>
        <span class="totals-item">花费 <b>{{ fmtMoney(totals.cost) }}</b></span>
        <span class="totals-item">转化 <b>{{ fmtNum(totals.conversions) }}</b></span>
        <span class="totals-item ti-revenue">收入 <b>{{ fmtMoney(totals.revenue) }}</b></span>
        <span class="totals-item" :class="totalProfit > 0 ? 'ti-profit-pos' : totalProfit < 0 ? 'ti-profit-neg' : ''">利润 <b>{{ fmtMoney(totalProfit) }}</b></span>
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
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import SparkMD5 from 'spark-md5'
import { getStatsBreakdown, getLanders, getEfLanderScreenshots } from '@/services/main/ef-tracker'
import { BASE_URL } from '@/services/request/config'

// ===== 维度定义(与 QUERY_API.md 第12节一致) =====
// id 类维度带 name；string/date/hour 维度 key 即名
const DIM_OPTIONS = [
  { value: 'date', label: 'Date', hint: '按 tz 的日期' },
  { value: 'lander', label: 'Lander', hint: '落地页 id→名称' },
  { value: 'media', label: 'Media', hint: '媒体 id→名称' },
  { value: 'offer', label: 'Offer', hint: 'Offer id→名称' },
  { value: 'tracker', label: 'Tracker', hint: 'Tracker id→名称' },
  { value: 'advertiser', label: 'Advertiser', hint: '广告主 id→名称' },
  { value: 'campaign', label: 'Campaign', hint: '广告活动名' },
  { value: 'adset', label: 'AdSet', hint: '广告组名' },
  { value: 'creative', label: 'Creative', hint: '素材名' },
  { value: 'hour', label: 'Hour', hint: '0~23 档' }
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

// 时区：默认 +8,只保留 +8/+0/+5/+6 四档
const tz = ref(-5) // 默认 UTC-5
const tzOptions = [
  { label: 'UTC+8', value: 8 },
  { label: 'UTC-6', value: -6 },
  { label: 'UTC-5', value: -5 },
  { label: 'UTC+0', value: 0 }
]

// 时间范围：预设(range) 或 自定义(start/end);面板=左侧快捷+右侧日历
const rangeOptions = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '近7天', value: '7d' },
  { label: '近14天', value: '14d' },
  { label: '本月', value: 'this_month' }
]
const range = ref('today')
const dateRange = ref([])
const showRangePanel = ref(false)
const calendarRange = ref(null) // 日历选择(选完即应用为自定义范围)
const calendarPickerRef = ref(null)

// 开/关面板;打开时把内嵌日历展开(输入框被隐藏,日历需程序化打开)
function toggleRangePanel() {
  showRangePanel.value = !showRangePanel.value
  if (showRangePanel.value) {
    nextTick(() => {
      calendarPickerRef.value?.handleOpen?.()
    })
  }
}

// 当前生效的时间范围文案(按钮上显示)
const customActive = computed(() => range.value === 'custom')
const rangeLabel = computed(() => {
  if (range.value !== 'custom') {
    return rangeOptions.find((o) => o.value === range.value)?.label || '今天'
  }
  if (dateRange.value?.length === 2) {
    const fmt = (d) => {
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    return `${fmt(dateRange.value[0])} ~ ${fmt(dateRange.value[1])}`
  }
  return '自定义'
})

// 选快捷项：直接生效并关面板
function pickShortcut(value) {
  range.value = value
  calendarRange.value = null
  showRangePanel.value = false
  pagination.page = 1
  loadData()
}

// 日历选完(daterange 一次选出两个日期)→ 应用为自定义范围
watch(calendarRange, (val) => {
  if (val && val.length === 2) {
    range.value = 'custom'
    dateRange.value = val
    showRangePanel.value = false
    pagination.page = 1
    loadData()
  }
})

// ===== 维度选择(顺序=下钻顺序,样式与 report 数据报表页一致) =====
// 默认三个维度：Media → Offer → Lander(下钻顺序)
const DEFAULT_DIMS = ['media', 'campaign', 'lander']
const selectedDims = ref(DEFAULT_DIMS.map((v) => DIM_OPTIONS.find((d) => d.value === v)).filter(Boolean))
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
  const t = event.target
  // 维度菜单：点在添加按钮或弹层外 → 关闭
  if (
    showDimensionPicker.value &&
    !t.closest('.dimension-add-btn') &&
    !t.closest('.datapanel-dim-popover')
  ) {
    showDimensionPicker.value = false
  }
  // 时间范围面板：点在触发按钮、弹层或内部日历弹层外 → 关闭
  if (
    showRangePanel.value &&
    !t.closest('.range-trigger-btn') &&
    !t.closest('.datapanel-range-popover') &&
    !t.closest('.datapanel-range-inner-popper')
  ) {
    showRangePanel.value = false
  }
}

// ===== 嵌套展开逻辑 =====
// rows(上方已声明): 扁平化嵌套行。子行分页状态记在行上(page/pageSize/total),展开过滤由行链(filtersOf)生成
const dimValues = computed(() => selectedDims.value.map((d) => d.value))

// 合计条利润 = 第一层全部分组的 Revenue - Cost(totals 不含 profit,前端算)
const totalProfit = computed(() => {
  if (!totals.value) return 0
  return Number(totals.value.revenue) - Number(totals.value.cost)
})

function hasChildLevel(level) {
  return level < dimValues.value.length - 1
}

function isRowExpanded(row) {
  return !!row.expanded
}

// 派生指标：CVR = 转化/点击；ROI = 收入/花费(cost 为 0 时显示 -)；Profit = 收入-花费
function decorate(list) {
  for (const row of list) {
    row.cvr = row.clicks > 0 ? (Number(row.conversions) / Number(row.clicks)) * 100 : 0
    row.roi = Number(row.cost) > 0 ? (Number(row.revenue) / Number(row.cost)) * 100 : null
    row.profit = Number(row.revenue) - Number(row.cost)
  }
  return list
}

// ===== 列排序(前端本地排序;接口不支持排序参数) =====
// 对同级兄弟行排序,保持嵌套结构(父子相对位置不变,同层内部重排)
const sortState = ref({ field: null, order: null }) // order: 'desc' | 'asc'

function toggleSort(field) {
  if (sortState.value.field !== field) {
    sortState.value = { field, order: 'desc' } // 首次点击默认倒序(从大到小)
  } else if (sortState.value.order === 'desc') {
    sortState.value = { field, order: 'asc' }
  } else {
    sortState.value = { field: null, order: null } // 第三次点击取消排序
  }
  applySort()
}

function sortClass(field) {
  const { field: f, order } = sortState.value
  if (f !== field) return ''
  return order === 'desc' ? 'sort-desc' : 'sort-asc'
}

// 对 rows 做分层排序:提取每行直接子行的序列,按 sortState 排序后重组。
// 同层排序只影响该层兄弟顺序,展开的子行始终跟在父行后
function applySort() {
  const { field, order } = sortState.value
  if (!field || !order) {
    // 恢复原始顺序(按 path 的数值链排序)
    const natural = (a, b) => {
      const pa = a.path.split('-').map(Number)
      const pb = b.path.split('-').map(Number)
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] ?? -1) - (pb[i] ?? -1)
        if (d !== 0) return d
      }
      return 0
    }
    rows.value = [...rows.value].sort(natural)
    return
  }

  const val = (r) => Number(r[field] ?? 0) || 0
  const cmp = order === 'desc' ? (a, b) => val(b) - val(a) : (a, b) => val(a) - val(b)

  // 递归:对每棵子树,同层子行按 cmp 排序,再按顺序串起(子行跟父行)
  const sortLevel = (siblings) => {
    const sorted = [...siblings].sort(cmp)
    const out = []
    for (const r of sorted) {
      out.push(r)
      const children = rows.value.filter((x) => x.parent === r)
      if (children.length) out.push(...sortLevel(children))
    }
    return out
  }
  rows.value = sortLevel(rows.value.filter((r) => r.level === 0))
}

// ===== Lander 打开(维度含 lander 时,名称旁小图标) =====
// url 不在 breakdown 返回里;按 lander name 精确匹配 /query/landers(keyword 同时搜 name/url,
// 返回后本地精确比对 name,避免模糊误配),缓存 { id: url }
const landerUrls = reactive({})
// 预览图 { id: 图url }:优先对方 ab_landers.preview_url,回退本地 ef_lander_screenshots 截图缓存
const landerImages = reactive({})
const landerUrlPending = new Set() // 防并发重复请求

async function ensureLanderUrl(row) {
  const id = String(row.key)
  if (landerUrls[id] !== undefined || landerUrlPending.has(id)) return
  landerUrlPending.add(id)
  try {
    const res = await getLanders({ keyword: row.name, page: 1, size: 50 })
    const hit = (res?.list || []).find((l) => l.name === row.name) || (res?.list || [])[0]
    landerUrls[id] = hit?.url || ''
    // 对方接口本身带 preview_url(截图成功后由我们后端回写),直接可用
    if (hit?.preview_url) landerImages[id] = hit.preview_url
  } catch (e) {
    landerUrls[id] = '' // 失败也写入空串,避免反复重试
  } finally {
    landerUrlPending.delete(id)
  }
}

// 没有 preview_url 的 lander:批量取本地 ef_lander_screenshots 缓存截图(与落地页列表同源)
async function prefetchLanderScreenshots() {
  const ids = rows.value
    .filter((r) => r.dim === 'lander' && r.key && !landerImages[r.key])
    .map((r) => Number(r.key))
    .filter((n) => !isNaN(n))
  if (ids.length === 0) return
  try {
    const res = await getEfLanderScreenshots(ids)
    const map = res?.data || {}
    for (const [id, s] of Object.entries(map)) {
      if (s?.screenshot_url && s.screenshot_status === 'success' && !landerImages[id]) {
        const u = s.screenshot_url
        landerImages[id] = u.startsWith('http') ? u : `${BASE_URL}${u.startsWith('/') ? '' : '/'}${u}`
      }
    }
  } catch (e) {
    // 截图取失败不影响表格
  }
}

// 行渲染时预取 lander url + 预览图(不阻塞表格)
function prefetchLanderUrls() {
  for (const row of rows.value) {
    if (row.dim === 'lander' && row.key) ensureLanderUrl(row)
  }
  prefetchLanderScreenshots()
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
  showRangePanel.value = false
  pagination.page = 1
  loadData()
}

function handleReset() {
  selectedDims.value = DEFAULT_DIMS.map((v) => DIM_OPTIONS.find((d) => d.value === v)).filter(Boolean)
  range.value = 'today'
  dateRange.value = []
  calendarRange.value = null
  tz.value = -5
  uniqueOnly.value = false
  showDimensionPicker.value = false
  showRangePanel.value = false
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
const uniqueOnly = ref(true) // 默认开启去重(按 media_click_id)
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
  if (isNaN(num)) return '-'
  return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

// ===== 时间范围触发按钮 =====
.range-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 13px;
  color: #202124;
  cursor: pointer;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  transition: all 0.2s;
  min-width: 150px;

  &:hover,
  &.is-open {
    border-color: #1a73e8;
    color: #1a73e8;
  }

  .rt-icon {
    width: 15px;
    height: 15px;
    fill: #5f6368;
    flex-shrink: 0;
  }

  .rt-text {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rt-arrow {
    width: 14px;
    height: 14px;
    fill: #5f6368;
    flex-shrink: 0;
    transition: transform 0.2s;

    &.is-open {
      transform: rotate(180deg);
    }
  }
}

// ===== 时间面板(左快捷右日历) =====
.range-panel {
  display: flex;
  align-items: stretch;
}

.range-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  width: 112px;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.range-shortcut-item {
  border: none;
  background: transparent;
  text-align: left;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #3c4043;
  cursor: pointer;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  transition: all 0.15s;

  &:hover {
    background: rgba(26, 115, 232, 0.08);
  }

  &.active {
    background: rgba(26, 115, 232, 0.14);
    color: #1a73e8;
    font-weight: 500;
  }
}

.range-calendar {
  position: relative; /* 隐藏输入框绝对定位的锚点 */
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px 8px 12px 14px;
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
      font-weight: 700; /* 表头加粗 */
      font-size: 12px;
      text-align: center; /* 表头统一居中 */
      padding: 12px 14px;
      position: sticky;
      top: 0;
      z-index: 10;
      white-space: nowrap;

      &.nt-dim {
        text-align: left; /* 维度列左对齐(展开时名称不跳位) */
      }
    }

    th.nt-sortable {
      cursor: pointer;
      user-select: none;

      &:hover {
        color: #1a73e8;
      }
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
    text-align: center; /* 数值列居中 */
    font-variant-numeric: tabular-nums;
  }

  td.nt-dim {
    text-align: left; /* 维度列数据左对齐:层级缩进+名称从左展开,收起/展开不跳位 */
  }

  thead th.nt-num {
    text-align: center; /* 表头居中(含排序/问号图标一起) */
  }

  thead th.nt-sortable {
    .nt-th-text,
    .nt-sort-icon,
    .nt-help-icon {
      vertical-align: middle;
    }
  }

  // Revenue 列绿色(收益)
  td.nt-revenue {
    color: #1e8e3e;
    font-weight: 500;
  }

  // Profit 列:正数绿 / 负数红 / 零默认色
  td.nt-profit.profit-pos {
    color: #1e8e3e;
    font-weight: 500;
  }

  td.nt-profit.profit-neg {
    color: #d93025;
    font-weight: 500;
  }

  .nt-expanded-row > td:first-child .nt-name {
    font-weight: 500;
  }
}

// 维度列整格可点展开(hover 底色提示;空值组/最深层不响应)
td.nt-dim.nt-dim-clickable {
  cursor: pointer;
}

// 层级缩进引导线:每层一条 20px 宽的竖虚线(画在格子中间),层级关系一目了然
.nt-indent-line {
  display: inline-block;
  width: 20px;
  height: 22px; // 与行高协调,上下留空
  vertical-align: middle;
  flex-shrink: 0;
  border-left: 1px dashed #c4c7cc;
  margin-right: 0;
}

.nt-expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: 4px;
  vertical-align: middle;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
    fill: #5f6368;
    transition: transform 0.2s;
  }

  &.is-open svg {
    transform: rotate(90deg);
    fill: #1a73e8;
  }
}

// 最深一层没有箭头,占位保持对齐(与箭头同宽:26 + 4 margin)
.nt-expand-placeholder {
  display: inline-block;
  width: 30px;
  flex-shrink: 0;
}

.nt-name {
  color: #202124;
}

// lander 维度行首预览图缩略图(点击放大)
.nt-preview-img {
  width: 44px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid #e8eaed;
  margin-right: 6px;
  vertical-align: middle;
  cursor: zoom-in;
  flex-shrink: 0;
  background: #f1f3f4;

  :deep(.el-image__inner) {
    width: 100%;
    height: 100%;
    display: block;
  }
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

// 表头排序图标(上下双箭头,激活后单侧高亮)
.nt-sort-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  margin-left: 3px;
  opacity: 0.45;
  transition: opacity 0.15s;

  svg {
    width: 13px;
    height: 13px;
    fill: #5f6368;
  }

  &.sort-desc,
  &.sort-asc {
    opacity: 1;

    svg {
      fill: #1a73e8;
    }
  }

  // 倒序:只亮上箭头(大的在前);正序:只亮下箭头 —— 用半掩效果近似
  &.sort-desc svg path:nth-child(1) { fill: #1a73e8; }
  &.sort-desc svg path:nth-child(2) { fill: #c4c7cc; }

  &.sort-asc svg path:nth-child(1) { fill: #c4c7cc; }
  &.sort-asc svg path:nth-child(2) { fill: #1a73e8; }
}

// 表头公式提示图标(? 圆圈)
.nt-help-icon {  display: inline-flex;
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

// 合计条里的收入同样绿色
.totals-item.ti-revenue b {
  color: #1e8e3e;
}

// 合计条利润:正绿负红
.totals-item.ti-profit-pos b {
  color: #1e8e3e;
}

.totals-item.ti-profit-neg b {
  color: #d93025;
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

/* ===== 时间范围面板(el-popover teleported 到 body) ===== */
.datapanel-range-popover.el-popper {
  padding: 0 !important;
  border-radius: 12px;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  background: #ffffff; /* 白底 */
  overflow: visible; /* 弹层自身不裁剪日历 */
}

/* 隐藏 picker 的输入框(保留组件挂载以承载日历;零尺寸可能影响弹层定位计算,
   这里改用 1px + opacity 0,保证组件内部 offsetParent/宽度测量正常) */
.datapanel-range-popover .range-calendar .el-date-editor--daterange {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

/* teleported=false 时日历渲染在 .range-calendar 里:
   只去掉定位/边框,不动宽度和内部布局(宽度由 element-plus 自身默认值决定,避免 header/body 错位) */
.datapanel-range-popover .el-picker__popper {
  position: static !important;
  box-shadow: none !important;
  border: none;
  background: transparent;
  transform: none !important;
  margin: 0 !important;

  .el-picker-panel {
    background: #ffffff;
    border: none;
    box-shadow: none;
  }

  .el-popper__arrow {
    display: none;
  }
}

/* daterange 面板是 element 默认的 646px 双月布局(body min-width 513px,两个月份块 float 50%×2)。
   之前把外壳压到 322px 导致第二个月历溢出外壳、超出部分无背景(透明)。
   现在不再压宽度:时间面板整体放宽到容纳双月日历,按默认布局完整显示 */
.datapanel-range-popover .el-date-range-picker {
  width: auto;
  max-width: none;
}

.datapanel-range-popover .el-date-range-picker .el-picker-panel__body {
  min-width: 513px; /* element 默认值,显式声明防止被其它规则覆盖 */
}

/* 预览查看器图片尺寸(preview-teleported 把 viewer 挂到 body 下,须全局;
   限制与 落地页列表页 一致:65vw / 75vh) */
.el-image-viewer__canvas {
  .el-image-viewer__img {
    max-width: 65vw !important;
    max-height: 75vh !important;
  }
}
</style>

