<template>
  <!-- LP 行为数据弹窗(2026-11-13): clickflare / eftracker 两个落地页列表共用。
       数据全部直连 eftracker Go 只读接口(/query/lp-events + /query/lp-event-dict), 不经 domain-api。
       打开=按 lid + 日期(默认今天)拉图表 + 明细分页表; 事件名经字典映射成人话。
       统计区=echarts 四卡片: 完读率环图 / 阅读深度柱图 / 行为构成饼图 / 产品点击 Top5 横条。 -->
  <el-dialog
    :model-value="modelValue"
    title="LP 行为数据"
    fullscreen
    :close-on-click-modal="false"
    class="google-dialog lp-events-dialog"
    destroy-on-close
    @update:model-value="(v) => emit('update:modelValue', v)"
    @open="handleOpen"
  >
    <!-- LP 信息行 -->
    <div class="lp-info">
      <span class="lp-name" :title="landerName">{{ landerName }}</span>
      <el-tag size="small" effect="plain" class="lid-tag">lid={{ lid }}</el-tag>
      <el-tag v-if="isExternal" type="warning" size="small" effect="plain">外部收集</el-tag>
    </div>

    <!-- 控制行: 日期范围 + 图表/明细切换 + 刷新 -->
    <div class="controls-row">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        :clearable="false"
        :disabled-date="disabledDate"
        range-separator="至"
        start-placeholder="起"
        end-placeholder="止"
        size="small"
        style="max-width: 300px"
        @change="handleDateChange"
      />
      <el-radio-group v-model="viewMode" size="default" @change="handleViewModeChange">
        <el-radio-button value="chart">图表</el-radio-button>
        <el-radio-button value="table">明细</el-radio-button>
      </el-radio-group>
      <el-button :icon="Refresh" circle class="icon-btn" title="刷新" @click="loadAll" />
      <span class="retention-hint">数据保留 31 天</span>
    </div>

    <!-- ===== 图表视图: 根据 LP 类型自动切换(电商滚动型 / 对话切屏型) ===== -->
    <template v-if="viewMode === 'chart'">

      <!-- ===== 对话型布局: 一行三卡(垂直漏斗 | 对话选择 | 跳转率), 紧凑 ===== -->
      <template v-if="lpType === 'dialog'">
        <div v-if="!statsLoading && noData" class="empty-hint">当日暂无行为数据</div>
        <div v-show="!noData" v-loading="statsLoading">
          <div class="charts-row dialog-row">
            <!-- 核心漏斗: 垂直柱, 跳出拆"点击按钮/重定向"两条路径 -->
            <div class="chart-card funnel-card">
              <div class="chart-title">
                核心漏斗
                <span v-if="avgDwellSec != null" class="dwell-badge" title="仅统计有进入且有跳出的完整会话">
                  平均停留 <b>{{ avgDwellSec >= 60 ? Math.floor(avgDwellSec / 60) + 'm' + (avgDwellSec % 60) + 's' : avgDwellSec + 's' }}</b>
                </span>
              </div>
              <div class="vcols">
                <div class="vcol" v-for="s in funnelCols" :key="s.label">
                  <span class="vcol-count">{{ s.value }}</span>
                  <div class="vcol-track">
                    <div class="vcol-bar" :style="{ height: s.pct + '%', background: s.color }"></div>
                  </div>
                  <span class="vcol-label">{{ s.label }}</span>
                  <span class="vcol-pct">{{ s.share }}%</span>
                </div>
              </div>
            </div>
            <!-- 对话选择气泡(宽) -->
            <div class="chart-card wide">
              <div class="chart-title">对话选择 <span class="chart-sub">各问题回答分布</span></div>
              <div v-if="dialogBubbles.length" class="chat-list">
                <div v-for="(item, i) in dialogBubbles" :key="i" class="chat-item">
                  <div class="chat-q">
                    <span class="chat-q-avatar">G</span>
                    <span class="chat-q-text">{{ item.question }}</span>
                  </div>
                  <div class="chat-a-row">
                    <span class="chat-a yes">
                      <span class="chat-a-label">Yes</span>
                      <span class="chat-a-count">{{ item.yes }}</span>
                    </span>
                    <span class="chat-a no">
                      <span class="chat-a-label">No</span>
                      <span class="chat-a-count">{{ item.no }}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div v-else class="chart-empty">暂无对话数据</div>
            </div>
            <div class="chart-card narrow">
              <div class="chart-title">跳转率</div>
              <div ref="readRateRef" class="chart-box tall"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- ===== 电商型布局: 四等分卡片(原有) ===== -->
      <template v-else>
        <div v-if="!statsLoading && noData" class="empty-hint">当日暂无行为数据</div>
        <div v-show="!noData" class="charts-row" v-loading="statsLoading">
          <div class="chart-card">
            <div class="chart-title">完读率</div>
            <div ref="readRateRef" class="chart-box"></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">阅读深度 <span class="chart-sub">到达各档人数 · 100%=读完</span></div>
            <div v-if="hasDepth" ref="depthRef" class="chart-box"></div>
            <div v-else class="chart-empty">未接入/无数据</div>
          </div>
          <div class="chart-card">
            <div class="chart-title">行为构成 <span class="chart-sub">除访问外</span></div>
            <div v-if="hasEventDist" ref="distRef" class="chart-box"></div>
            <div v-else class="chart-empty">无其他事件</div>
          </div>
          <div class="chart-card">
            <div class="chart-title">产品点击 Top5</div>
            <div v-if="hasProduct" ref="productRef" class="chart-box"></div>
            <div v-else class="chart-empty">未接入/无数据</div>
          </div>
        </div>
      </template>
    </template>

    <!-- ===== 明细视图 ===== -->
    <template v-else>
      <div class="table-filter-row">
        <el-select
          v-model="eventName"
          size="default"
          style="width: 220px"
          @change="handleEventChange"
        >
          <el-option value="" label="全部事件" />
          <el-option
            v-for="d in dictList"
            :key="d.event_name"
            :value="d.event_name"
            :label="d.display_name || d.event_name"
          />
        </el-select>
      </div>
      <!-- 固定高度+表头吸顶+表体内部滚动: 明细再长也不把弹窗撑出滚动条 -->
      <el-table :data="tableData" v-loading="loading" size="small" border stripe class="events-table" max-height="460">
        <el-table-column label="时间" width="170" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ fmtTime(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="事件" min-width="140" align="center">
          <template #default="{ row }">
            <el-tooltip :content="dictTooltip(row.event_name)" placement="top" :disabled="!dictTooltip(row.event_name)">
              <span class="event-cell">
                <span class="event-display">{{ displayName(row.event_name) }}</span>
                <span v-if="displayName(row.event_name) !== row.event_name" class="event-raw">{{ row.event_name }}</span>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="step" width="70" align="center">
          <template #default="{ row }">{{ row.step ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="item_id" min-width="160" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.item_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="停留" width="90" align="center">
          <template #default="{ row }">{{ fmtDwell(row.dwell_ms) }}</template>
        </el-table-column>
        <el-table-column label="会话" width="110" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.session_id" placement="top">
              <span class="mono">{{ shortId(row.session_id) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="payload" min-width="140" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="mono">{{ fmtPayload(row.payload) }}</span>
          </template>
        </el-table-column>
        <template #empty>
          <span>{{ loading ? '加载中…' : '暂无数据' }}</span>
        </template>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.size"
          :total="pagination.total"
          layout="total, prev, pager, next"
          small
          @current-change="loadTable"
        />
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getLpEvents, getLpEventDict } from '@/services/main/ef-tracker'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  lid: { type: Number, required: true },
  landerName: { type: String, default: '' },
  isExternal: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const TZ = 8 // 与 ef-tracker 各页面一致, 按 +8 呈现/按 +8 墙钟取日期窗

// 谷歌色系(与 efbox 各面板一致)
const C = { blue: '#1a73e8', green: '#34a853', yellow: '#fbbc04', red: '#ea4335', gray: '#dadce0', text: '#5f6368' }

const dateRange = ref([]) // [开始, 结束] YYYY-MM-DD; 查 Go 时 end 要 +1 天(end 语义是排他 00:00)
const eventName = ref('')
const viewMode = ref('chart') // chart=图表视图(默认) / table=明细视图
const dictList = ref([]) // 本 LP 可用字典: 全局(lid=0) + 本 lid 专属
const loading = ref(false)
const statsLoading = ref(false)
const tableData = ref([])
const pagination = reactive({ page: 1, size: 20, total: 0 })

// ===== 图表数据 =====
const statCounts = reactive({ page_view: 0, page_bottom: 0 }) // 完读率
const depthSteps = reactive({ 1: 0, 2: 0, 3: 0 })             // 阅读深度 step=1/2/3 → 25/50/75%
const eventDist = ref([])                                     // 行为构成 [{name, value}]
const productTop = ref([])                                    // 产品点击 [{name, value}] 已按次数倒序

// 对话型 LP(v84杀毒等): 类型检测 + 对话专属数据
const lpType = ref('ecom')                                     // 'ecom'(滚动电商) | 'dialog'(对话切屏)
const dialogFunnel = reactive({ enter: 0, done: 0, jump: 0, jumpCta: 0, jumpAuto: 0 })  // 进入/扫完/跳出(=点击+重定向)
const avgDwellSec = ref(null)   // 平均停留秒数(仅计有进入+跳出的完整会话)
const dialogAnswers = ref([])                                  // 对话选择分布 [{name: 问题→答案, value}]

// 对话气泡: 按问题分组, 每个问题一行(问题气泡 + Yes/No 两个回答气泡带数量)
// note 格式 = "问题前30字 → 是/否", 按 " → " 拆分; 同题的是/否合并到一行
const dialogBubbles = computed(() => {
  const byQ = new Map()
  for (const d of dialogAnswers.value) {
    const sep = d.name.lastIndexOf(' → ')
    const q = sep > 0 ? d.name.slice(0, sep) : d.name
    const a = sep > 0 ? d.name.slice(sep + 3) : ''
    if (!byQ.has(q)) byQ.set(q, { question: q, yes: 0, no: 0 })
    const item = byQ.get(q)
    if (a.includes('是') || a.toLowerCase().includes('yes')) item.yes += d.value
    else item.no += d.value
  }
  return [...byQ.values()]
})

// 漏斗垂直柱(柱高以进入为基准100%, 跳出拆点击/重定向两条路径; share=占进入的百分比)
const funnelCols = computed(() => {
  const e = dialogFunnel.enter || 1
  const h = (v) => (v > 0 ? Math.max(Math.round((v / e) * 100), 4) : 0) // 有值最小露 4% 柱
  const share = (v) => Math.round((v / e) * 100)
  return [
    { label: '进入', value: dialogFunnel.enter, pct: 100, share: 100, color: '#1a73e8' },
    { label: '扫完', value: dialogFunnel.done, pct: h(dialogFunnel.done), share: share(dialogFunnel.done), color: '#fbbc04' },
    { label: '点击跳出', value: dialogFunnel.jumpCta, pct: h(dialogFunnel.jumpCta), share: share(dialogFunnel.jumpCta), color: '#34a853' },
    { label: '重定向跳出', value: dialogFunnel.jumpAuto, pct: h(dialogFunnel.jumpAuto), share: share(dialogFunnel.jumpAuto), color: '#00acc1' }
  ]
})

const noData = computed(() => !statsLoading.value && !statCounts.page_view && !eventDist.value.length && !productTop.value.length && !dialogAnswers.value.length)
// 深度图 100% 档用 page_bottom 充当: 没接 scroll_depth 但有读完数据时也出图
const hasDepth = computed(() => depthSteps[1] + depthSteps[2] + depthSteps[3] > 0 || statCounts.page_bottom > 0)
const hasEventDist = computed(() => eventDist.value.length > 0)
const hasProduct = computed(() => productTop.value.length > 0)

// ===== echarts 实例管理(destroy-on-close: 每次打开重建) =====
const readRateRef = ref(null)
const depthRef = ref(null)
const distRef = ref(null)
const productRef = ref(null)
const charts = {} // key → echarts instance

function renderChart(key, el, option) {
  if (!el) return
  // 卡片是 v-if 渲染: 换日期从有数据→无数据→有数据时 DOM 已重建,
  // 旧实例绑的是被移除的节点, 必须 dispose 重 init
  if (charts[key] && charts[key].getDom() !== el) {
    charts[key].dispose()
    delete charts[key]
  }
  if (!charts[key]) charts[key] = echarts.init(el)
  charts[key].setOption(option, true)
}

function disposeCharts() {
  for (const k of Object.keys(charts)) {
    charts[k].dispose()
    delete charts[k]
  }
}

function handleResize() {
  for (const k of Object.keys(charts)) charts[k].resize()
}

onMounted(() => window.addEventListener('resize', handleResize))
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})

function renderAllCharts() {
  const isDialog = lpType.value === 'dialog'

  if (isDialog) {
    // ===== 对话型: 只画两个 echarts(漏斗改为 HTML/CSS, 不用 echarts) =====

    // ① 跳转率环图(右窄卡)
    const pv = statCounts.page_view
    const jump = dialogFunnel.jump
    const rate = pv ? ((jump / pv) * 100).toFixed(1) : '0.0'
    renderChart('readRate', readRateRef.value, {
      title: {
        text: rate + '%',
        subtext: `访问 ${pv} · 跳出 ${jump}`,
        left: 'center',
        top: '34%',
        textStyle: { fontSize: 24, fontWeight: 600, color: '#202124' },
        subtextStyle: { fontSize: 11, color: C.text }
      },
      series: [{
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: [
          { name: '跳出', value: jump, itemStyle: { color: C.blue } },
          { name: '未跳出', value: Math.max(pv - jump, 0), itemStyle: { color: C.gray } }
        ]
      }]
    })

    // ② 对话选择 = HTML气泡(不走echarts, 见模板 dialogBubbles)

    return
  }

  // ===== 电商型: 原有四卡 =====

  // ① 完读率环图
  const pv = statCounts.page_view
  const pb = statCounts.page_bottom
  const rate = pv ? ((pb / pv) * 100).toFixed(1) : '0.0'
  renderChart('readRate', readRateRef.value, {
    title: {
      text: rate + '%',
      subtext: `访问 ${pv} · 读完 ${pb}`,
      left: 'center',
      top: '34%',
      textStyle: { fontSize: 26, fontWeight: 600, color: '#202124' },
      subtextStyle: { fontSize: 11, color: C.text }
    },
    series: [{
      type: 'pie',
      radius: ['58%', '78%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      data: [
        { name: '读完', value: pb, itemStyle: { color: C.green } },
        { name: '未读完', value: Math.max(pv - pb, 0), itemStyle: { color: C.gray } }
      ]
    }]
  })

  // ② 阅读深度柱图
  renderChart('depth', depthRef.value, {
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: ['25%', '50%', '75%', '100%'], axisLine: { lineStyle: { color: C.gray } } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f1f3f4' } } },
    series: [{
      type: 'bar',
      barWidth: '46%',
      data: [
        { value: depthSteps[1], itemStyle: { color: C.blue } },
        { value: depthSteps[2], itemStyle: { color: C.blue } },
        { value: depthSteps[3], itemStyle: { color: C.blue } },
        { value: statCounts.page_bottom, itemStyle: { color: C.green } }
      ],
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', color: C.text, fontSize: 11 }
    }]
  })

  // ③ 行为构成饼图
  renderChart('dist', distRef.value, {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: C.text } },
    series: [{
      type: 'pie',
      radius: ['30%', '62%'],
      center: ['50%', '44%'],
      label: { show: false },
      data: eventDist.value.map((d, i) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: [C.blue, C.yellow, C.red, C.green, '#9334e6', '#00acc1'][i % 6] }
      }))
    }]
  })

  // ④ 产品点击 Top5 横条
  renderChart('product', productRef.value, {
    grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f1f3f4' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: productTop.value.map((d) => d.name),
      axisLabel: { width: 110, overflow: 'truncate', fontSize: 11, color: C.text }
    },
    series: [{
      type: 'bar',
      barWidth: '52%',
      data: productTop.value.map((d) => d.value),
      itemStyle: { color: C.yellow, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: C.text, fontSize: 11 }
    }]
  })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayAfter(s) {
  const d = new Date(s + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 保留 31 天: 未来与 31 天前禁选
function disabledDate(d) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const oldest = new Date(today.getTime() - 30 * 86400000)
  return d > today || d < oldest
}

async function handleOpen() {
  const t = todayStr()
  dateRange.value = [t, t]
  eventName.value = ''
  viewMode.value = 'chart'
  pagination.page = 1
  await loadDict()
  loadAll()
}

// 切回图表视图: DOM 刚重建(v-if), 等就绪后用已有数据重画(在明细视图换日期时图表区没渲染)
function handleViewModeChange(mode) {
  if (mode !== 'chart') return
  nextTick(() => {
    if (!noData.value) renderAllCharts()
  })
}

// 换日期=图表+明细都重拉; 换事件过滤=只影响明细表
function handleDateChange(val) {
  // 跨度最多 31 天(保留期上限), 超了拒绝并回退到结束日当天
  if (val && val.length === 2) {
    const span = (new Date(val[1]) - new Date(val[0])) / 86400000 + 1
    if (span > 31) {
      ElMessage.warning('最多一次查 31 天(数据保留期上限)')
      dateRange.value = [val[1], val[1]]
      return
    }
  }
  pagination.page = 1
  loadAll()
}
function handleEventChange() {
  pagination.page = 1
  loadTable()
}

// 字典全量拉回前端过滤(量小几十行): 全局 lid=0 + 本 lid; 同 event_name 时本 lid 覆盖全局
async function loadDict() {
  try {
    const res = await getLpEventDict()
    const rows = res?.list || []
    const map = new Map()
    for (const r of rows) {
      if (r.lid !== 0 && r.lid !== props.lid) continue
      map.set(r.event_name, r) // 后写覆盖: rows 按 lid,event_name 排序, 全局(0)在前本 lid 在后
    }
    dictList.value = [...map.values()]
  } catch {
    dictList.value = []
  }
}

function loadAll() {
  loadStats()
  loadTable()
}

function baseParams() {
  // Go /query 时间语义: start/end 按 tz 墙钟解析, end 排他(created_at < end)——
  // 查整天范围要把结束日 +1 天传进去
  return { lid: props.lid, tz: TZ, start: dateRange.value[0], end: dayAfter(dateRange.value[1]) }
}

// 统计: 各事件计数走 size=1 只读 total(索引 COUNT, 便宜);
// scroll_depth/product_click 有量再拉当日明细(≤100 条)做聚合
async function loadStats() {
  statsLoading.value = true
  statCounts.page_view = 0
  statCounts.page_bottom = 0
  depthSteps[1] = depthSteps[2] = depthSteps[3] = 0
  eventDist.value = []
  productTop.value = []
  dialogAnswers.value = []
  dialogFunnel.enter = dialogFunnel.done = dialogFunnel.jump = dialogFunnel.jumpCta = dialogFunnel.jumpAuto = 0
  try {
    const countOf = async (name) => {
      const res = await getLpEvents({ ...baseParams(), event_name: name, size: 1 })
      return res?.total ?? 0
    }
    const dictEvents = dictList.value.map((d) => d.event_name)
    const names = [...new Set(['page_view', 'page_bottom', ...dictEvents])]
    const counts = await Promise.all(names.map((n) => countOf(n).catch(() => 0)))
    const countMap = Object.fromEntries(names.map((n, i) => [n, counts[i]]))

    statCounts.page_view = countMap.page_view || 0
    statCounts.page_bottom = countMap.page_bottom || 0

    // LP 类型自动检测: 有对话/扫描事件=对话型, 有深度/产品点击=电商型
    const hasDialogEvents = (countMap.dialog_answer || 0) > 0 || (countMap.scan_done || 0) > 0
    const hasEcomEvents = (countMap.scroll_depth || 0) > 0 || (countMap.product_click || 0) > 0
    lpType.value = hasDialogEvents ? 'dialog' : 'ecom'

    // 行为构成: 字典事件除访问/读完, 只保留有量的
    eventDist.value = dictList.value
      .filter((d) => d.event_name !== 'page_view' && d.event_name !== 'page_bottom' && (countMap[d.event_name] || 0) > 0)
      .map((d) => ({ name: d.display_name || d.event_name, value: countMap[d.event_name] }))
      .sort((a, b) => b.value - a.value)

    if (lpType.value === 'dialog') {
      // 对话型: 漏斗(进入/扫完/跳出) + 对话选择分布 + 平均停留
      dialogFunnel.enter = statCounts.page_view
      dialogFunnel.done = countMap.scan_done || 0
      dialogFunnel.jumpCta = countMap.cta_click || 0       // 点击按钮跳出
      dialogFunnel.jumpAuto = countMap.auto_redirect || 0  // 倒计时重定向跳出
      dialogFunnel.jump = dialogFunnel.jumpCta + dialogFunnel.jumpAuto
      avgDwellSec.value = null

      // 平均停留: 按 session 逐次配对(进入→紧跟的跳出), 而非取最早/最晚
      // 同一标签页多次测试 session_id 不变, 最早进入配最晚跳出会把间隔算成小时——必须逐次配
      if (dialogFunnel.jump > 0 && statCounts.page_view > 0) {
        const [pvRes, jumpRes, arRes] = await Promise.all([
          getLpEvents({ ...baseParams(), event_name: 'page_view', size: 200 }).catch(() => null),
          getLpEvents({ ...baseParams(), event_name: 'cta_click', size: 200 }).catch(() => null),
          getLpEvents({ ...baseParams(), event_name: 'auto_redirect', size: 200 }).catch(() => null)
        ])

        // 合并所有事件按时间排序, walk-through 配对: 每次 enter 配它后面第一次 jump, 配完消耗
        const all = [
          ...(pvRes?.list || []).map((r) => ({ sid: r.session_id, t: new Date(r.created_at).getTime(), enter: true })),
          ...(jumpRes?.list || []).map((r) => ({ sid: r.session_id, t: new Date(r.created_at).getTime(), enter: false })),
          ...(arRes?.list || []).map((r) => ({ sid: r.session_id, t: new Date(r.created_at).getTime(), enter: false }))
        ].sort((a, b) => a.t - b.t)

        let total = 0, n = 0
        const pending = new Map() // sid → 最近一次未配对的进入时间
        for (const ev of all) {
          if (ev.enter) {
            pending.set(ev.sid, ev.t)
          } else {
            const eTime = pending.get(ev.sid)
            if (eTime != null && ev.t > eTime) {
              total += (ev.t - eTime)
              n++
              pending.delete(ev.sid) // 消耗掉这次进入, 下次进入重新配
            }
          }
        }
        avgDwellSec.value = n > 0 ? Math.round(total / n / 1000) : null
      }

      if (countMap.dialog_answer) {
        const res = await getLpEvents({ ...baseParams(), event_name: 'dialog_answer', size: 100 }).catch(() => null)
        const byNote = {}
        for (const r of res?.list || []) {
          const note = (r.payload?.note || r.event_name || '').toString().slice(0, 40)
          byNote[note] = (byNote[note] || 0) + 1
        }
        dialogAnswers.value = Object.entries(byNote)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      }
    } else {
      // 电商型: 阅读深度 + 产品点击
      if (countMap.scroll_depth) {
        const res = await getLpEvents({ ...baseParams(), event_name: 'scroll_depth', size: 100 }).catch(() => null)
        for (const r of res?.list || []) {
          if (depthSteps[r.step] !== undefined) depthSteps[r.step]++
        }
      }

      if (countMap.product_click) {
        const res = await getLpEvents({ ...baseParams(), event_name: 'product_click', size: 100 }).catch(() => null)
        const byItem = {}
        for (const r of res?.list || []) {
          const k = r.item_id || '(无item_id)'
          byItem[k] = (byItem[k] || 0) + 1
        }
        productTop.value = Object.entries(byItem)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      }
    }
  } finally {
    statsLoading.value = false
    await nextTick()
    if (!noData.value) renderAllCharts()
  }
}

async function loadTable() {
  loading.value = true
  try {
    const params = { ...baseParams(), page: pagination.page, size: pagination.size }
    if (eventName.value) params.event_name = eventName.value
    const res = await getLpEvents(params)
    tableData.value = res?.list || []
    pagination.total = res?.total ?? 0
  } catch {
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// ===== 展示辅助 =====
function displayName(name) {
  return dictList.value.find((d) => d.event_name === name)?.display_name || name
}
function dictTooltip(name) {
  return dictList.value.find((d) => d.event_name === name)?.description || ''
}
function fmtTime(s) {
  if (!s) return '-'
  return String(s)
    .replace('T', ' ')
    .replace(/\.\d+/, '')
    .replace(/([+-])(\d{2}):(\d{2})$/, (_m, sign, h, min) => ' ' + sign + parseInt(h, 10) + (parseInt(min, 10) ? ':' + min : ''))
    .replace(/Z$/, ' +0')
}
function fmtDwell(ms) {
  if (ms == null) return '-'
  return (ms / 1000).toFixed(1) + 's'
}
function shortId(s) {
  return s ? s.slice(0, 8) : '-'
}
function fmtPayload(p) {
  if (p == null || p === '') return '-'
  if (typeof p === 'string') return p
  try {
    return JSON.stringify(p)
  } catch {
    return '-'
  }
}
</script>

<style lang="less" scoped>
.lp-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .lp-name {
    font-size: 14px;
    font-weight: 600;
    color: #202124;
    max-width: 700px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  .retention-hint {
    margin-left: auto;
    font-size: 12px;
    color: #9aa0a6;
  }
}

.empty-hint {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #9aa0a6;
}

.table-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.charts-row {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;

  .chart-card {
    flex: 1;
    min-width: 0;
    border: 1px solid #e8eaed;
    border-radius: 10px;
    padding: 10px 12px 6px;
    background: #fff;

    .chart-title {
      font-size: 12px;
      font-weight: 600;
      color: #202124;
      margin-bottom: 2px;
      display: flex;
      align-items: center;

      .chart-sub {
        font-weight: 400;
        color: #9aa0a6;
        margin-left: 4px;
      }
    }

    .chart-box {
      height: 170px;
    }

    .chart-box.tall {
      height: 280px;
    }

    .chart-empty {
      height: 170px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #9aa0a6;
    }

    &.funnel-card { flex: 0 0 260px; } /* 核心漏斗: 垂直柱, 窄卡固定宽 */
    &.wide { flex: 3; }
    &.narrow { flex: 2; }
  }
}

/* ===== 对话型: 核心漏斗垂直柱(纯 HTML/CSS, 不用 echarts) ===== */
.vcols {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding-top: 8px;
}

.vcol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 56px;

  .vcol-count {
    font-size: 14px;
    font-weight: 700;
    color: #202124;
  }

  .vcol-track {
    height: 130px;
    width: 34px;
    display: flex;
    align-items: flex-end;
    background: #f1f3f4;
    border-radius: 6px;
    overflow: hidden;

    .vcol-bar {
      width: 100%;
      border-radius: 6px 6px 0 0;
      transition: height 0.3s ease;
    }
  }

  .vcol-label {
    font-size: 11px;
    color: #3c4043;
    text-align: center;
    line-height: 1.2;
  }

  .vcol-pct {
    font-size: 10px;
    color: #9aa0a6;
  }
}

/* 平均停留胶囊(核心漏斗卡标题右侧) */
.dwell-badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  border-radius: 12px;
  background: #e8f0fe;
  color: #174ea6;
  font-size: 11px;
  font-weight: 400;
  cursor: default;

  b {
    font-size: 13px;
    font-weight: 700;
    color: #1a73e8;
  }
}

/* ===== 对话气泡列表(替代echarts横条) ===== */
.chat-list {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.chat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-q {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.chat-q-avatar {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1a73e8;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-q-text {
  background: #f1f3f4;
  color: #202124;
  font-size: 12px;
  line-height: 1.5;
  padding: 6px 12px;
  border-radius: 2px 12px 12px 12px;
  max-width: 90%;
  word-break: break-word;
}

.chat-a-row {
  display: flex;
  gap: 8px;
  padding-left: 30px;
}

.chat-a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.chat-a.yes {
  background: #e6f4ea;
  color: #137333;
  border: 1px solid #ceead6;
}

.chat-a.no {
  background: #fce8e6;
  color: #c5221f;
  border: 1px solid #f6d5d3;
}

.chat-a-count {
  font-size: 13px;
  font-weight: 700;
}

/* 对话型一行三卡: 漏斗窄(固定) | 对话选择宽 | 跳转率窄 */
.dialog-row {
  .chart-card.funnel-card { flex: 0 0 260px; }
  .chart-card.wide { flex: 3; }
  .chart-card.narrow { flex: 2; }
}

.events-table {
  .time-text {
    font-size: 12px;
    color: #5f6368;
  }
  .event-cell {
    display: flex;
    flex-direction: column;
    line-height: 1.3;

    .event-display {
      font-weight: 500;
      color: #202124;
    }
    .event-raw {
      font-size: 11px;
      color: #9aa0a6;
    }
  }
  .mono {
    font-family: monospace;
    font-size: 12px;
    color: #5f6368;
  }
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>

<!-- 弹窗固定高度规则单独走非 scoped: el-dialog 内容 teleport 到 body,
     scoped 依赖 data-v 链, 这里类名唯一直接全局写死更稳。
     固定高+内部滚动: 图表/明细切换或数据变多都不会把页面撑出滚动条 -->
<style lang="less">
/* 全屏弹窗(2026-11-16): body 占满剩余高度内部滚动; 内容限宽 1280 居中防超宽屏拉伸 */
.lp-events-dialog {
  .el-dialog__body {
    height: calc(100vh - 110px);
    overflow-y: auto;
    padding-top: 4px;
  }

  /* 内容区限宽居中 */
  .lp-info,
  .controls-row,
  .charts-row,
  .dialog-funnel-card,
  .table-filter-row,
  .events-table,
  .pager {
    max-width: 1280px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
