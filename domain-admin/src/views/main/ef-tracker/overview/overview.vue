<template>
  <div class="overview-container">
    <!-- 控制栏 -->
    <div class="ctrl-bar">
      <div class="ctrl-left">
        <span class="ctrl-label">时区</span>
        <el-select v-model="tz" style="width: 120px" @change="fetchCounts">
          <el-option v-for="o in tzOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <span class="ctrl-label">日期</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          clearable
          style="width: 240px"
        />
      </div>
      <div class="ctrl-right">
        <el-button @click="fetchCounts" :loading="loading">查询</el-button>
      </div>
    </div>

    <!-- 归因流程图 -->
    <div class="chart-card" v-loading="loading">
      <div class="chart-scroll">
        <div class="chart-wrap">
          <div ref="chartRef" class="chart"></div>
          <!-- HTML 节点卡片层（覆盖在 echarts 流线上） -->
          <div class="cards-overlay">
            <div
              v-for="(n, i) in nodes"
              :key="n.name"
              class="node-card"
              :style="cardStyle(i)"
              @click="goDetail(n)"
            >
              <div class="nc-head">
                <span class="nc-chip"><el-icon><component :is="n.icon" /></el-icon></span>
                <span class="nc-name">{{ n.name }}</span>
              </div>
              <div class="nc-value" :style="{ color: n.color }">{{ fmtNum(n.value) }}</div>
              <div class="nc-hint">{{ n.hint }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="legend">
        <span class="legend-item"><i class="dot blue"></i>点击 / 访问 / 进 Offer</span>
        <span class="legend-item"><i class="dot green"></i>转化</span>
        <span class="legend-item"><i class="dot orange"></i>回传媒体</span>
        <span class="legend-tip">流动光点表示数据流向，点击节点可查看明细</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getClicks, getLpVisitLogs, getLpClicks, getConversions } from '@/services/main/ef-tracker'

const router = useRouter()
const chartRef = ref(null)
let chart = null
const loading = ref(false)

// 时区：默认 +8
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
// 默认选「今天」
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const dateRange = ref([startOfToday(), startOfToday()])

// 各环节计数（'-' 表示未取到）
const counts = reactive({
  clicks: '-',
  lpVisit: '-',
  lpClick: '-',
  conversion: '-',
  postback: '-'
})

const Y = 50 // 节点所在 y（与 echarts 连线一致）

// 节点（HTML 卡片）：图标统一谷歌蓝，数字按阶段色
const nodes = computed(() => [
  { name: '媒体点击',      icon: 'Pointer',      color: '#1a73e8', value: counts.clicks,     hint: '广告点击进站', coord: [9, Y],  route: '/main/ef-tracker/clicks' },
  { name: 'LP访问',        icon: 'Monitor',      color: '#1a73e8', value: counts.lpVisit,    hint: '落地页访问',   coord: [29, Y], route: '/main/ef-tracker/lp-visit-logs' },
  { name: 'LP点击进Offer', icon: 'Sell',         color: '#1a73e8', value: counts.lpClick,    hint: '点击进 Offer', coord: [50, Y], route: '/main/ef-tracker/lp-clicks' },
  { name: '转化',          icon: 'ShoppingCart', color: '#1e8e3e', value: counts.conversion, hint: '购买 / 转化',  coord: [71, Y], route: '/main/ef-tracker/conversions' },
  { name: '媒体回传',      icon: 'Promotion',    color: '#e8710a', value: counts.postback,   hint: '回传媒体',     coord: [91, Y], route: '/main/ef-tracker/conversions' }
])

// 节点像素坐标（由 echarts convertToPixel 计算，resize 时重算）
const nodePos = ref([])

function layoutNodes() {
  if (!chart) return
  nodePos.value = nodes.value.map((n) => {
    const p = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [n.coord[0], n.coord[1]])
    return { left: p[0], top: p[1] }
  })
}

function cardStyle(i) {
  const p = nodePos.value[i]
  if (!p) return { visibility: 'hidden' }
  return { left: p.left + 'px', top: p.top + 'px' }
}

function goDetail(n) {
  if (n.route) router.push(n.route)
}

// daterange → start/end，end 为排除上界 +1 天
function rangeToParams(range) {
  if (!range || range.length !== 2) return {}
  const [d1, d2] = range
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} 00:00:00`
  const end = new Date(d2.getTime())
  end.setDate(end.getDate() + 1)
  return { start: fmt(d1), end: fmt(end) }
}

function fmtNum(n) {
  if (n === '-' || n == null) return '-'
  const num = Number(n)
  return isNaN(num) ? '-' : num.toLocaleString()
}

function val(r) {
  return r.status === 'fulfilled' ? (r.value?.total ?? 0) : '-'
}

// 并发取各环节 total（只读 total，size=1 减少传输）
async function fetchCounts() {
  loading.value = true
  try {
    const base = { size: 1, tz: tz.value, ...rangeToParams(dateRange.value) }
    const results = await Promise.allSettled([
      getClicks(base),
      getLpVisitLogs(base),
      getLpClicks(base),
      getConversions(base),
      getConversions({ ...base, should_postback: 'true' })
    ])
    counts.clicks = val(results[0])
    counts.lpVisit = val(results[1])
    counts.lpClick = val(results[2])
    counts.conversion = val(results[3])
    counts.postback = val(results[4])
    renderChart()
  } catch (e) {
    renderChart()
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chart) return
  const BLUE = '#1a73e8'
  const GREEN = '#1e8e3e'
  const ORANGE = '#e8710a'

  // 正向连线：前 3 段蓝、转化→回传 绿；回传回路 橙
  const blueCoords = [
    [[9, Y], [29, Y]],
    [[29, Y], [50, Y]],
    [[50, Y], [71, Y]]
  ]
  const greenCoords = [[[71, Y], [91, Y]]]
  const loopCoords = [[91, Y - 6], [91, 26], [50, 12], [9, 26], [9, Y - 6]]

  // 美化：圆角线帽 + 同色柔光阴影；流动光点带长拖尾（彗星感），颜色与线段一致
  const mkLine = (name, coords, color, period) => ({
    name,
    type: 'lines',
    coordinateSystem: 'cartesian2d',
    polyline: true,
    symbol: ['none', 'arrow'],
    symbolSize: 11,
    data: coords.map((c) => ({
      coords: c,
      lineStyle: { color, width: 2.5, opacity: 0.85, cap: 'round' }
    })),
    effect: { show: true, period, trailLength: 0.25, symbol: 'circle', symbolSize: 11, color },
    zlevel: 1
  })

  chart.setOption({
    grid: { top: 24, bottom: 24, left: 10, right: 10, containLabel: false },
    xAxis: { type: 'value', min: 0, max: 100, show: false },
    yAxis: { type: 'value', min: 0, max: 70, show: false },
    series: [
      mkLine('flow-blue', blueCoords, BLUE, 3.5),
      mkLine('flow-green', greenCoords, GREEN, 3.5),
      mkLine('loop', [loopCoords], ORANGE, 4.5)
    ]
  }, true)
  layoutNodes()
}

function onResize() {
  if (!chart) return
  chart.resize()
  layoutNodes()
}

onMounted(async () => {
  await nextTick()
  chart = echarts.init(chartRef.value)
  window.addEventListener('resize', onResize)
  fetchCounts()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style lang="less" scoped>
.overview-container {
  background: #f8f9fa;
  width: 100%;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.ctrl-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.ctrl-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.ctrl-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-label {
  font-size: 13px;
  color: #202124;
}

.chart-card {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.chart-scroll {
  flex: 1;
  min-height: 360px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.chart-wrap {
  position: relative;
  width: 100%;
  min-width: 760px;
  height: 100%;
  min-height: 360px;
}

.chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* HTML 节点卡片层，覆盖在 echarts 流线上 */
.cards-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.node-card {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 144px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  padding: 12px 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;

  &:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
    border-color: #dadce0;
    transform: translate(-50%, -50%) scale(1.05);
  }
}

.nc-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 6px;
}

.nc-chip {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e8f0fe;
  color: #1a73e8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .el-icon {
    font-size: 18px;
  }
}

.nc-name {
  font-size: 13px;
  color: #3c4043;
  font-weight: 500;
}

.nc-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

.nc-hint {
  font-size: 11px;
  color: #9aa0a6;
  margin-top: 2px;
}

.legend {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-top: 8px;
  border-top: 1px solid #e8eaed;
  font-size: 12px;
  color: #5f6368;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}

.dot.blue { background: #1a73e8; }
.dot.green { background: #1e8e3e; }
.dot.orange { background: #e8710a; }

.legend-tip {
  margin-left: auto;
  color: #9aa0a6;
}
</style>
