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
      <div ref="chartRef" class="chart"></div>
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
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
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
  const Y = 50 // 节点所在 y

  // 节点：媒体点击 → LP访问 → LP点击进Offer → 转化 → 媒体回传
  const nodes = [
    { name: '媒体点击',     coord: [9, Y],  color: BLUE,   value: counts.clicks,     route: '/main/ef-tracker/clicks' },
    { name: 'LP访问',       coord: [29, Y], color: BLUE,   value: counts.lpVisit,    route: '/main/ef-tracker/lp-visit-logs' },
    { name: 'LP点击进Offer', coord: [50, Y], color: BLUE,   value: counts.lpClick,    route: '/main/ef-tracker/lp-clicks' },
    { name: '转化',         coord: [71, Y], color: GREEN,  value: counts.conversion, route: '/main/ef-tracker/conversions' },
    { name: '媒体回传',     coord: [91, Y], color: ORANGE, value: counts.postback,   route: '/main/ef-tracker/conversions' }
  ]

  // 连线：4 条正向 + 1 条回传回路（下方弧线）
  const edges = [
    { coords: [[9, Y], [29, Y]] },
    { coords: [[29, Y], [50, Y]] },
    { coords: [[50, Y], [71, Y]] },
    { coords: [[71, Y], [91, Y]] },
    { coords: [[91, Y - 6], [91, 26], [50, 12], [9, 26], [9, Y - 6]] }
  ]

  const option = {
    grid: { top: 10, bottom: 10, left: 10, right: 10, containLabel: false },
    xAxis: { type: 'value', min: 0, max: 100, show: false },
    yAxis: { type: 'value', min: 0, max: 65, show: false },
    tooltip: {
      trigger: 'item',
      formatter: (p) =>
        p.seriesType === 'scatter' && p.data ? `${p.data.name}：${fmtNum(p.data.value[2])}` : ''
    },
    series: [
      {
        name: 'flow',
        type: 'lines',
        coordinateSystem: 'cartesian2d',
        polyline: true,
        symbol: ['none', 'arrow'],
        symbolSize: 9,
        data: edges,
        lineStyle: { color: '#bdc1c6', width: 2, opacity: 0.9 },
        effect: {
          show: true,
          period: 5,
          trailLength: 0.4,
          symbol: 'circle',
          symbolSize: 7,
          color: '#1a73e8'
        },
        zlevel: 1
      },
      {
        name: 'nodes',
        type: 'scatter',
        coordinateSystem: 'cartesian2d',
        symbol: 'roundRect',
        symbolSize: [124, 64],
        cursor: 'pointer',
        data: nodes.map((n) => ({
          name: n.name,
          value: [n.coord[0], n.coord[1], n.value],
          route: n.route,
          itemStyle: {
            color: '#fff',
            borderColor: n.color,
            borderWidth: 2,
            shadowColor: 'rgba(0,0,0,0.08)',
            shadowBlur: 6
          },
          emphasis: {
            itemStyle: {
              color: n.color,
              borderColor: n.color,
              shadowBlur: 12
            },
            label: {
              rich: {
                name: { color: '#fff' },
                val: { color: '#fff' }
              }
            }
          },
          label: {
            show: true,
            position: 'inside',
            formatter: `{name|${n.name}}\n{val|${fmtNum(n.value)}}`,
            rich: {
              name: { color: '#5f6368', fontSize: 12, fontWeight: 500, lineHeight: 20 },
              val: { color: n.color, fontSize: 20, fontWeight: 700 }
            }
          }
        })),
        zlevel: 2
      }
    ]
  }
  chart.setOption(option, true)
}

function onResize() {
  if (chart) chart.resize()
}

onMounted(async () => {
  await nextTick()
  chart = echarts.init(chartRef.value)
  chart.on('click', (params) => {
    if (params.seriesType === 'scatter' && params.data?.route) {
      router.push(params.data.route)
    }
  })
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

.chart {
  flex: 1;
  min-height: 360px;
  width: 100%;
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
