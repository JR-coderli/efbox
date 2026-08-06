<template>
  <div class="google-content">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">媒体点击</h1>
        <!-- <p class="page-subtitle">system_clicks · 媒体/系统点击流水</p> -->
      </div>
      <div class="header-actions">
        <el-popover
          trigger="click"
          placement="bottom-end"
          :width="260"
          popper-class="clicks-col-popover"
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
                  placeholder="click_id / 活动 / 广告组 / 素材 / IP"
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
              <el-form-item label="媒体ID">
                <el-input v-model="filters.mid" placeholder="mid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="Tracker">
                <el-input v-model="filters.tid" placeholder="tid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="Offer">
                <el-input v-model="filters.oid" placeholder="oid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="LP">
                <el-input v-model="filters.lid" placeholder="lid" clearable style="width: 110px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="路径">
                <el-input v-model="filters.path_code" placeholder="path_code" clearable style="width: 130px" @keyup.enter="handleSearch" />
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
        <el-table :data="tableData" v-loading="loading" class="google-table" :border="false" :tooltip-options="{ popperClass: 'clicks-overflow-tooltip' }">
          <template v-for="col in visibleColumns" :key="col.key">
            <!-- 漏斗列 -->
            <el-table-column
              v-if="col.type === 'funnel'"
              :label="col.label"
              :min-width="col.minWidth"
              :align="col.align"
            >
              <template #default="{ row }">
                <div
                  v-if="row.funnel"
                  class="funnel-chain"
                  @mouseover="onStepOver"
                  @mousemove="onStepMove"
                  @mouseout="onStepOut"
                >
                  <template v-if="isDirectPath(row.funnel)">
                    <!-- 路径2：媒体点击 › Offer › 转化 › 下发（直连，未经 LP）-->
                    <span class="funnel-step fs-ok" :data-tip="stepBoolTitle('媒体点击', true, row.created_at)">媒体点击</span>
                    <span class="funnel-arrow">›</span>
                    <span class="funnel-step fs-ok" data-tip="Offer：是 · 直连路径（未经 LP）">Offer</span>
                    <span class="funnel-arrow">›</span>
                    <span
                      class="funnel-step"
                      :class="[stepBoolClass(row.funnel.converted), { 'funnel-clickable': hasDetail('conversion', row.funnel) }]"
                      :data-tip="stepBoolTitle('转化', row.funnel.converted, row.funnel.converted_at)"
                      @click="hasDetail('conversion', row.funnel) && openDetail('conversion', row)"
                    >转化</span>
                    <span class="funnel-arrow">›</span>
                    <span
                      class="funnel-step"
                      :class="[postbackClass(row.funnel.media_postback), { 'funnel-clickable': hasDetail('postback', row.funnel) }]"
                      :data-tip="postbackTitle(row.funnel.media_postback, row.funnel.media_postback_at)"
                      @click="hasDetail('postback', row.funnel) && openDetail('conversion', row)"
                    >下发</span>
                  </template>
                  <template v-else>
                    <!-- 路径1：媒体点击 › LP展示 › LP点击 › 转化 › 下发 -->
                    <span class="funnel-step fs-ok" :data-tip="stepBoolTitle('媒体点击', true, row.created_at)">媒体点击</span>
                    <span class="funnel-arrow">›</span>
                    <span
                      class="funnel-step"
                      :class="[stepBoolClass(row.funnel.reached_lp), { 'funnel-clickable': hasDetail('lp_visit', row.funnel) }]"
                      :data-tip="stepBoolTitle('到达落地页', row.funnel.reached_lp, row.funnel.reached_lp_at)"
                      @click="hasDetail('lp_visit', row.funnel) && openDetail('lp_visit', row)"
                    >LP展示</span>
                    <span class="funnel-arrow">›</span>
                    <span
                      class="funnel-step"
                      :class="[stepBoolClass(row.funnel.lp_click), { 'funnel-clickable': hasDetail('lp_click', row.funnel) }]"
                      :data-tip="stepBoolTitle('点击 Offer', row.funnel.lp_click, row.funnel.lp_click_at)"
                      @click="hasDetail('lp_click', row.funnel) && openDetail('lp_click', row)"
                    >LP点击</span>
                    <span class="funnel-arrow">›</span>
                    <span
                      class="funnel-step"
                      :class="[stepBoolClass(row.funnel.converted), { 'funnel-clickable': hasDetail('conversion', row.funnel) }]"
                      :data-tip="stepBoolTitle('转化', row.funnel.converted, row.funnel.converted_at)"
                      @click="hasDetail('conversion', row.funnel) && openDetail('conversion', row)"
                    >转化</span>
                    <span class="funnel-arrow">›</span>
                    <span
                      class="funnel-step"
                      :class="[postbackClass(row.funnel.media_postback), { 'funnel-clickable': hasDetail('postback', row.funnel) }]"
                      :data-tip="postbackTitle(row.funnel.media_postback, row.funnel.media_postback_at)"
                      @click="hasDetail('postback', row.funnel) && openDetail('conversion', row)"
                    >下发</span>
                  </template>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <!-- 总用时（媒体点击 → 最远已完成步骤的时间差）-->
            <el-table-column
              v-else-if="col.type === 'duration'"
              :label="col.label"
              :width="col.width"
              :align="col.align"
            >
              <template #default="{ row }">
                <span>{{ totalDuration(row) }}</span>
              </template>
            </el-table-column>
            <!-- 创建时间（格式化） -->
            <el-table-column
              v-else-if="col.type === 'time'"
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
            <!-- preview_url：lander_url 去查询串 + eflp 签名（点击实时生成、新窗口打开）-->
            <el-table-column
              v-else-if="col.type === 'preview'"
              :label="col.label"
              :min-width="col.minWidth"
              :show-overflow-tooltip="col.overflow"
            >
              <template #default="{ row }">
                <a v-if="row.lander_url" class="preview-link" href="#" :title="`点击预览：${row.lander_url}`" @click.prevent="openPreview(row.lander_url)">{{ landerPath(row.lander_url) }}</a>
                <span v-else>-</span>
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
              :class-name="col.cellClass"
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
    <!-- 漏斗徽章悬浮提示（跟随鼠标的自定义浮层）-->
    <div v-if="tip.visible" class="funnel-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">{{ tip.text }}</div>

    <!-- 漏斗步骤详情弹窗 -->
    <el-dialog
      v-model="detailDialog.visible"
      :title="detailDialog.title + (detailDialog.systemClickId ? ' · ' + detailDialog.systemClickId : '')"
      class="funnel-detail-dialog"
      append-to-body
      destroy-on-close
      align-center
    >
      <el-table :data="detailDialog.list" v-loading="detailDialog.loading" size="small" :height="detailTableMaxHeight" class="detail-table" border>
        <el-table-column
          v-for="col in detailDialog.columns"
          :key="col.label"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ col.get(row) }}</template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import Sortable from 'sortablejs'
import { getClicks, getLpVisitLogs, getLpClicks, getConversions } from '@/services/main/ef-tracker'
import SparkMD5 from 'spark-md5'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

// 服务端分页：page 从 1 开始，size 上限 100
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

// 该表精确过滤参数（全部可选，不传即不过滤）
const filters = reactive({
  keyword: '',
  mid: '',
  tid: '',
  oid: '',
  lid: '',
  path_code: ''
})

// 日期范围（el-date-picker daterange，元素为 Date 对象）
const dateRange = ref([])

// 时间显示：接口已按 tz 返回带偏移的 ISO 串，这里只把 T 换成空格方便阅读
function fmtTime(s) {
  if (!s) return '-'
  return String(s).replace('T', ' ').replace(/\.\d+/, '').replace(/([+-])(\d{2}):(\d{2})$/, (_m, sign, h, min) => ' ' + sign + parseInt(h, 10) + (parseInt(min, 10) ? ':' + parseInt(min, 10) : '')).replace(/Z$/, ' +0')
}

// 总用时：媒体点击(created_at) → 漏斗里最远一个已完成步骤的时间差
// 步骤优先级：下发 > 转化 > LP点击 > LP展示（取最远那个有时间戳的）；都没有则显示 -
function lastStepAt(f) {
  if (!f) return null
  return f.media_postback_at || f.converted_at || f.lp_click_at || f.reached_lp_at || null
}
function fmtDuration(ms) {
  if (ms == null || ms < 0 || Number.isNaN(ms)) return '-'
  if (ms < 1000) return parseFloat((ms / 1000).toFixed(2)) + 's' // 不足 1 秒：两位小数四舍五入并去末尾 0（0.43s / 0.99s / 0.5s / 1s）
  const s = Math.round(ms / 1000)
  if (s < 60) return s + 's'
  const m = Math.floor(s / 60)
  const rest = s % 60
  if (m < 60) return rest ? `${m}m ${rest}s` : `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm ? `${h}h ${mm}m` : `${h}h`
}
function totalDuration(row) {
  const last = lastStepAt(row.funnel)
  if (!last || !row.created_at) return '-'
  return fmtDuration(new Date(last) - new Date(row.created_at))
}

// preview_url：lander_url 去掉原查询串（只留域名+路径）+ eflp 访问签名
// 签名点击时实时生成（t/n 最新，保证门禁放行），逻辑复制自 落地页列表 handleOpenUrl
function buildEflpQuery() {
  const t = Math.floor(Date.now() / 10000)
  const n = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const s = SparkMD5.hash(`eflp${t}${n}`).substring(0, 10)
  return `go=1&t=${t}&n=${n}&s=${s}&w=1`
}
function landerPath(url) {
  return url ? String(url).split('?')[0] : '-'
}
function openPreview(url) {
  if (!url) return
  window.open(`${url.split('?')[0]}?${buildEflpQuery()}`, '_blank')
}

// ===== 归因漏斗（funnel）徽章渲染 =====
// funnel 由外部接口 with_funnel=true 返回：reached_lp / lp_click / converted（布尔）+ media_postback（枚举）
// 布尔阶段用 绿(完成)/灰(未完成) 两态；media_postback 用查表 + 默认灰，兼容未知枚举值
const PB_LABEL = {
  none: '未下发',
  pending: '处理中',
  sent: '已发送',
  success: '成功',
  failed: '失败',
  error: '错误'
}
const PB_CLASS = {
  none: 'fs-no',
  pending: 'fs-wait',
  sent: 'fs-wait',
  success: 'fs-ok',
  failed: 'fs-bad',
  error: 'fs-bad'
}
function stepBoolClass(ok) {
  return ok ? 'fs-ok' : 'fs-no'
}
function stepBoolTitle(label, ok, at) {
  return `${label}：${ok ? '是' : '否'}${at ? ' · ' + fmtTime(at) : ''}`
}
function postbackClass(v) {
  return PB_CLASS[v] || 'fs-no'
}
function postbackTitle(v, at) {
  return `媒体下发：${PB_LABEL[v] || v || '-'}${at ? ' · ' + fmtTime(at) : ''}`
}

// 直连路径判定：已转化但完全没碰 LP（reached_lp / lp_click 都为 false）
// → 媒体点击直接进 Offer 转化、不经 LP，漏斗按路径2（媒体点击 › Offer › 转化 › 下发）渲染
// 其余（含尚未转化、判断不出路径）一律按路径1（媒体点击 › LP展示 › LP点击 › 转化 › 下发）渲染
function isDirectPath(f) {
  return !!(f && f.converted && !f.reached_lp && !f.lp_click)
}

// 漏斗徽章悬浮提示：事件委托在 funnel-chain 上，单浮层跟随鼠标（比原生 title 醒目，不限行数）
const tip = reactive({ visible: false, text: '', x: 0, y: 0 })
function positionTip(e) {
  const pad = 14
  const w = 240
  // 靠近视口右边缘时改到鼠标左侧，避免浮层超出屏幕
  tip.x = e.clientX + pad + w > window.innerWidth ? e.clientX - pad - w : e.clientX + pad
  tip.y = e.clientY + pad
}
function onStepOver(e) {
  const step = e.target.closest('.funnel-step')
  if (!step) return
  const text = step.dataset.tip
  if (!text) return
  tip.text = text
  tip.visible = true
  positionTip(e)
}
function onStepMove(e) {
  if (tip.visible) positionTip(e)
}
function onStepOut(e) {
  // 移向的目标仍是某个徽章（徽章间切换）则不隐藏
  const to = e.relatedTarget
  if (!to || !to.closest || !to.closest('.funnel-step')) {
    tip.visible = false
  }
}

// 漏斗徽章点击 → 弹窗查该步骤详情（用 system_click_id 跨表查）
// 可点击判定按"有数据"：前三个看布尔；下发看 media_postback !== 'none'
function hasDetail(step, f) {
  if (!f) return false
  if (step === 'lp_visit') return !!f.reached_lp
  if (step === 'lp_click') return !!f.lp_click
  if (step === 'conversion') return !!f.converted
  if (step === 'postback') return !!f.media_postback && f.media_postback !== 'none'
  return false
}

// 各步骤：标题 + 查询函数 + 弹窗表格列（get 取值，兼容嵌套 names）。转化/下发共用 conversion 配置
const STEP_CONFIG = {
  lp_visit: {
    title: 'LP 展示详情',
    fetch: (id) => getLpVisitLogs({ keyword: id, size: 100, with_names: true, tz: tz.value }),
    columns: [
      { label: 'ID', width: 80, get: (r) => r.id },
      { label: '时间', width: 180, get: (r) => fmtTime(r.created_at) },
      { label: 'visitor_id', minWidth: 160, get: (r) => r.visitor_id || '-' },
      { label: 'Lander', minWidth: 110, get: (r) => r.names?.lander || '-' },
      { label: 'Tracker', minWidth: 110, get: (r) => r.names?.tracker || '-' },
      { label: 'IP', width: 140, get: (r) => r.ip_address || '-' },
      { label: 'User-Agent', minWidth: 220, get: (r) => r.user_agent || '-' }
    ]
  },
  lp_click: {
    title: 'LP 点击详情',
    fetch: (id) => getLpClicks({ keyword: id, size: 100, with_names: true, tz: tz.value }),
    columns: [
      { label: 'ID', width: 80, get: (r) => r.id },
      { label: '时间', width: 180, get: (r) => fmtTime(r.created_at) },
      { label: '媒体', minWidth: 100, get: (r) => r.names?.media || '-' },
      { label: 'Tracker', minWidth: 100, get: (r) => r.names?.tracker || '-' },
      { label: 'Lander', minWidth: 100, get: (r) => r.names?.lander || '-' },
      { label: 'Offer', minWidth: 100, get: (r) => r.names?.offer || '-' },
      { label: 'path_code', width: 110, get: (r) => r.path_code || '-' },
      { label: 'IP', width: 140, get: (r) => r.ip_address || '-' },
      { label: 'referer', minWidth: 200, get: (r) => r.referer || '-' },
      { label: 'offer_url', minWidth: 220, get: (r) => r.offer_url || '-' }
    ]
  },
  conversion: {
    title: '转化 / 回传详情',
    fetch: (id) => getConversions({ keyword: id, size: 100, with_names: true, tz: tz.value }),
    columns: [
      { label: 'ID', width: 80, get: (r) => r.id },
      { label: '转化时间', width: 180, get: (r) => fmtTime(r.created_at) },
      { label: '回传时间', width: 180, get: (r) => fmtTime(r.posted_at) },
      { label: 'payout', width: 90, get: (r) => r.payout ?? '-' },
      { label: 'should_postback', width: 130, get: (r) => String(r.should_postback ?? '-') },
      { label: 'HTTP', width: 80, get: (r) => r.http_status_code ?? '-' },
      { label: '媒体', minWidth: 100, get: (r) => r.names?.media || '-' },
      { label: '回传URL', minWidth: 220, get: (r) => r.media_postback_url || '-' },
      { label: '响应', minWidth: 220, get: (r) => r.response_body || '-' }
    ]
  }
}

const detailDialog = reactive({
  visible: false,
  loading: false,
  title: '',
  systemClickId: '',
  list: [],
  columns: []
})

// 详情弹窗表格最大高度：按视口 62%，适配移动端（resize 时重算）
const detailTableMaxHeight = ref(460)
function calcDetailHeight() {
  detailTableMaxHeight.value = Math.max(220, Math.floor(window.innerHeight * 0.62))
}

async function openDetail(step, row) {
  const cfg = STEP_CONFIG[step]
  if (!cfg) return
  detailDialog.title = cfg.title
  detailDialog.systemClickId = row.system_click_id
  detailDialog.columns = cfg.columns
  detailDialog.list = []
  detailDialog.visible = true
  detailDialog.loading = true
  try {
    const res = await cfg.fetch(row.system_click_id)
    detailDialog.list = res?.list || []
  } catch (error) {
    ElMessage.error('详情加载失败: ' + (error?.response?.data?.error || error?.message || '网络错误'))
  } finally {
    detailDialog.loading = false
  }
}

// ===== 列配置（数据驱动，配合齿轮面板做显隐 / 拖拽排序）=====
// type：plain 纯字段 / time 时间格式化 / names 名称映射(row.names[nameKey]) / funnel 漏斗
// 不做持久化：组件每次重建（路由切换 / 刷新）都回到 DEFAULT_COLUMNS 的默认顺序与可见性
// defaultHidden: true → 该列默认隐藏（可在齿轮面板里手动勾开）
const DEFAULT_COLUMNS = [
  { key: 'id', label: 'ID', type: 'plain', prop: 'id', width: 80, align: 'center' },
  { key: 'created_at', label: '创建时间', type: 'time', prop: 'created_at', width: 200 },
  { key: 'funnel', label: '漏斗', type: 'funnel', minWidth: 350, align: 'center' },
  { key: 'total_time', label: '总用时', type: 'duration', width: 90, align: 'center' },
  { key: 'system_click_id', label: 'system_click_id', type: 'plain', prop: 'system_click_id', minWidth: 270, overflow: true },
  { key: 'media_click_id', label: 'media_click_id', type: 'plain', prop: 'media_click_id', minWidth: 160, overflow: true },
  { key: 'mid', label: 'mid', type: 'plain', prop: 'mid', width: 70, align: 'center', defaultHidden: true },
  { key: 'tid', label: 'tid', type: 'plain', prop: 'tid', width: 80, align: 'center', defaultHidden: true },
  { key: 'oid', label: 'oid', type: 'plain', prop: 'oid', width: 80, align: 'center', defaultHidden: true },
  { key: 'lid', label: 'lid', type: 'plain', prop: 'lid', width: 80, align: 'center', defaultHidden: true },
  { key: 'cost', label: 'cost', type: 'plain', prop: 'cost', width: 100, align: 'right', cellClass: 'col-money' },
  { key: 'names.media', label: 'Media_name', type: 'names', nameKey: 'media', prop: 'names.media', minWidth: 110, overflow: true },
  { key: 'names.tracker', label: 'Tracker_name', type: 'names', nameKey: 'tracker', prop: 'names.tracker', minWidth: 210, overflow: true },
  { key: 'names.lander', label: 'Lander_name', type: 'names', nameKey: 'lander', prop: 'names.lander', minWidth: 210, overflow: true },
  { key: 'names.offer', label: 'Offer_name', type: 'names', nameKey: 'offer', prop: 'names.offer', minWidth: 210, overflow: true },
  { key: 'path_code', label: 'path_code', type: 'plain', prop: 'path_code', width: 100, overflow: true, defaultHidden: true },
  { key: 'campaign', label: 'campaign', type: 'plain', prop: 'campaign_name', minWidth: 120, overflow: true, defaultHidden: true },
  { key: 'adset', label: 'adset', type: 'plain', prop: 'adset_name', minWidth: 100, overflow: true, defaultHidden: true },
  { key: 'creative', label: 'creative', type: 'plain', prop: 'creative_name', minWidth: 100, overflow: true, defaultHidden: true },
  { key: 'ip', label: 'ip', type: 'plain', prop: 'ip_address', width: 120, overflow: true, defaultHidden: true },
  { key: 'lander_url', label: 'lander_url', type: 'plain', prop: 'lander_url', minWidth: 220, overflow: true },
  { key: 'preview_url', label: 'preview_url', type: 'preview', minWidth: 220, overflow: true },
  { key: 'referer', label: 'referer', type: 'plain', prop: 'referer', minWidth: 220, overflow: true, defaultHidden: true }
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

// daterange → start/end。end 为排除上界（<），因此 +1 天以包含结束日整天
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
  if (filters.oid) p.oid = filters.oid
  if (filters.lid) p.lid = filters.lid
  if (filters.path_code) p.path_code = filters.path_code
  p.with_names = true // 返回 mid/tid/oid/lid 对应的名称（names 字段）
  p.with_funnel = true // 返回归因漏斗（funnel：到达LP / 点击Offer / 转化 / 媒体下发）
  if (uniqueOnly.value) p.unique = true // 去重：按 media_click_id 只保留最新一条
  Object.assign(p, rangeToParams(dateRange.value))
  return p
}

async function loadData() {
  loading.value = true
  try {
    const result = await getClicks(buildParams())
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
  filters.oid = ''
  filters.lid = ''
  filters.path_code = ''
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
  calcDetailHeight()
  window.addEventListener('resize', calcDetailHeight)
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
  window.removeEventListener('resize', calcDetailHeight)
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
        text-align: center !important; // 表头文字统一居中（覆盖各列 align 的继承）
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

// 金额列用等宽数字字体（tabular figures），数字对齐、便于比较金额
:deep(.google-table td.col-money .cell) {
  font-family: 'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
}

.preview-link {
  color: #1a73e8;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

// 归因漏斗：LP › 点击 › 转化 › 回传，每段一个状态徽章，hover 显示时间/状态
.funnel-chain {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.funnel-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  cursor: default;
  white-space: nowrap;
}

.funnel-arrow {
  color: #bdc1c6;
  font-size: 12px;
  line-height: 1;
}

.fs-ok {
  background: #e6f4ea;
  color: #137333;
}

.fs-no {
  background: #f1f3f4;
  color: #80868b;
}

.fs-wait {
  background: #fef7e0;
  color: #b06000;
}

.fs-bad {
  background: #fce8e6;
  color: #c5221f;
}

.funnel-tip {
  position: fixed;
  z-index: 9999;
  max-width: 320px;
  padding: 6px 10px;
  background: #2c2c2c;
  color: #fff;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-line;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.funnel-clickable {
  cursor: pointer;
  transition: opacity 0.15s, box-shadow 0.15s;

  &:hover {
    opacity: 0.85;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  }
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
/* el-table 溢出 tooltip（已传送到 body，scoped 选不中）：限制最大宽度，避免 lander_url 等长文本超出屏幕 */
.clicks-overflow-tooltip {
  max-width: 400px;
  word-break: break-all;
}

/* 列配置面板（el-popover teleported 到 body，scoped 选不中，写在全局） */
.clicks-col-popover.el-popper {
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

/* 漏斗详情弹窗（el-dialog teleported 到 body，写在全局）*/
.funnel-detail-dialog.el-dialog {
  width: min(94vw, 1100px);
  border-radius: 12px;
  overflow: hidden;
}

.funnel-detail-dialog .el-dialog__header {
  padding: 18px 24px 14px;
  margin-right: 0;
  border-bottom: 1px solid #e8eaed;
}

.funnel-detail-dialog .el-dialog__title {
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: #202124;
}

.funnel-detail-dialog .el-dialog__headerbtn {
  top: 16px;
  right: 16px;
  font-size: 20px;
}

.funnel-detail-dialog .el-dialog__body {
  padding: 14px 16px 18px;
}

/* 详情弹窗内的表格（Google 风格）*/
.detail-table.el-table {
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  font-size: 13px;
}

.detail-table .el-table__header-wrapper th {
  background-color: #f1f3f4;
  color: #3c4043;
  font-weight: 500;
  font-size: 13px;
}

.detail-table .el-table__row:hover > td {
  background-color: #f8f9fa !important;
}

.detail-table .el-table__row td {
  color: #202124;
}
</style>
