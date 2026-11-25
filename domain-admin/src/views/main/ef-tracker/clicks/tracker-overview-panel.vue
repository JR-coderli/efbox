<template>
  <div class="google-content">
    <div class="content-card">
      <!-- 搜索栏：code(autocomplete 复用最近 code 面板) + 日期范围(默认近三天) + 查询 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-items">
            <el-form :inline="true" class="filter-form" @submit.prevent>
              <el-form-item label="code">
                <el-autocomplete
                  v-model="code"
                  :fetch-suggestions="fetchCodeSuggest"
                  placeholder="投放 code(/r/:code)"
                  clearable
                  style="width: 220px"
                  value-key="value"
                  @select="load"
                  @keydown.enter="load"
                />
              </el-form-item>
              <el-form-item label="日期">
                <!-- 固定 5 个预设范围单选(今天/昨天/前天/近3天/近7天), 谷歌风格按钮; 切换即重新查询 -->
                <div class="date-presets">
                  <button
                    v-for="p in DATE_PRESETS"
                    :key="p.key"
                    type="button"
                    class="date-preset-btn"
                    :class="{ active: dateKey === p.key }"
                    @click="selectDatePreset(p.key)"
                  >{{ p.label }}</button>
                </div>
              </el-form-item>
            </el-form>
          </div>
          <div class="filter-actions">
            <button class="google-btn" :disabled="loading || !code" @click="load">
              <span>{{ loading ? '查询中...' : '查询' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 空态引导 -->
      <div v-if="!data && !errMsg" class="empty-hint">输入投放 code 查询该 tracker 的全部信息：路径分流工作流、每条线路的用户数、错误日志分布、转化回传汇总</div>
      <div v-if="errMsg" class="empty-hint err">{{ errMsg }}</div>

      <template v-if="data">
        <!-- 总览条 -->
        <div class="ov-strip">
          <span class="ov-chip"><b>{{ data.tracker_name || ('tid ' + data.tid) }}</b></span>
          <span class="ov-chip">{{ data.media_name || ('mid ' + data.mid) }}</span>
          <span class="ov-chip">code {{ data.code }}</span>
          <span class="ov-chip">{{ winLabel }}</span>
          <span class="ov-chip total">总点击 {{ totalClicks }}</span>
        </div>

        <!--
          路径工作流(2026-11-20 二版, 用户拍板: 线路图形态 + LP 预览图):
          [媒体点击根节点] ──干线──▶ 每条线路一行:
            组节点(条件摘要/兜底) ──n人──▶ [LP节点: 预览图+到达/CTA] ──CTA n──▶ Offer节点(各带人数)
          直跳形态无 LP 节点, 组 ──n人──▶ Offer; 条件组之间以「↓ 不匹配」串行(评估顺序)。
        -->
        <div class="paths-head">
          <span>路径工作流</span>
          <span class="paths-sub">每条线路的用户数为所选时间段数据; 点击数字可跳明细</span>
        </div>
        <div class="flow">
          <div class="flow-root">
            <div class="root-node">
              <span class="root-label">媒体点击</span>
              <span class="root-num">{{ totalClicks }}</span>
            </div>
          </div>
          <div class="flow-branches">
            <template v-for="(p, i) in data.paths" :key="p.group">
              <div v-if="i > 0 && !p.is_fallback" class="branch-sep">↓ 不匹配</div>
              <div v-if="p.is_fallback" class="branch-sep fb">↓ 全不匹配(兜底)</div>
              <div class="branch">
                <!-- 干线 → 组: 本线路承接人数 -->
                <div class="b-count" @click="goTab('clicks')">
                  <b>{{ p.counts.clicks }}</b>
                  <span>人 · {{ pct(p.counts.clicks) }}%</span>
                </div>
                <!-- 组节点 -->
                <div class="node group-node">
                  <span class="badge" :class="p.is_fallback ? 'badge-fb' : 'badge-cond'">
                    {{ p.is_fallback ? '兜底组' : '条件组 ' + p.group }}
                  </span>
                  <span v-if="p.conditional" class="cond-summary" :title="condTitle(p.conditional)">{{ condSummary(p.conditional) }}</span>
                </div>
                <!-- 组 → LP(经LP形态) -->
                <template v-if="p.path_destination !== 1">
                  <div class="flow-line"><span class="fl-text">{{ p.counts.clicks }} 人</span></div>
                  <div class="node lp-node">
                    <div class="lp-img-wrap">
                      <el-image
                        v-if="p.lander_preview"
                        :src="p.lander_preview"
                        :preview-src-list="[p.lander_preview]"
                        fit="cover"
                        preview-teleported
                        hide-on-click-modal
                        class="lp-img"
                      />
                      <div v-else class="lp-img lp-img-empty">无预览图</div>
                    </div>
                    <div class="lp-meta">
                      <div class="lp-name" :title="p.lander_name">LP #{{ p.lid }} {{ p.lander_name }}</div>
                      <div class="lp-nums">
                        <span @click="goTab('clicks')">到LP <b :class="{ zero: !p.counts.reached_lp }">{{ p.counts.reached_lp }}</b></span>
                        <span @click="goTab('clicks')">点CTA <b :class="{ zero: !p.counts.lp_click }">{{ p.counts.lp_click }}</b></span>
                        <a v-if="p.lander_url" class="lp-open" title="新窗口打开落地页" @click="openLp(p.lander_url)">打开↗</a>
                      </div>
                    </div>
                  </div>
                  <!-- LP → Offer -->
                  <div class="flow-line"><span class="fl-text">CTA {{ p.counts.lp_click }}</span></div>
                </template>
                <!-- 直跳形态: 组 → Offer -->
                <div v-else class="flow-line"><span class="fl-text">{{ p.counts.clicks }} 人</span></div>
                <!-- Offer 节点: 单 offer 直接展示; 多 offer(多按钮)默认折叠成一个汇总节点, 点击展开/收起,
                     避免每条线路把全部 offer 铺开把页面撑出长滚动条 -->
                <div class="offers-col">
                  <div
                    v-if="p.offers.length > 1"
                    class="offer-toggle"
                    :title="expandedOffers[p.group] ? '收起 Offer 列表' : '展开 Offer 列表'"
                    @click="toggleOffers(p.group)"
                  >
                    <span class="ot-arrow" :class="{ open: expandedOffers[p.group] }">▸</span>
                    <span>{{ p.offers.length }} 个 Offer</span>
                    <span class="ot-sum">共 <b :class="{ zero: !offerSum(p) }">{{ offerSum(p) }}</b> 人</span>
                  </div>
                  <!-- offer 列表: 多 offer 展开后限高 + 自身垂直滚动(滚动不链到页面), 不把页面撑出长滚动条 -->
                  <div
                    class="offer-list"
                    :class="{ 'is-scroll': p.offers.length > 1 }"
                    v-show="p.offers.length === 1 || expandedOffers[p.group]"
                  >
                    <div v-for="o in p.offers" :key="o.oid" class="offer-node">
                      <span class="offer-pct" v-if="p.offers.length > 1">{{ o.offer_percentage }}%</span>
                      <span class="offer-name" :title="o.offer_name">#{{ o.oid }} {{ o.offer_name }}</span>
                      <span class="offer-btn" v-if="p.offers.length > 1 && o.button_id">btn{{ o.button_id }}</span>
                      <span class="offer-clicks" @click="goTab('clicks')"><b :class="{ zero: !o.clicks }">{{ o.clicks }}</b> 人</span>
                    </div>
                  </div>
                  <div v-if="p.returning && p.returning.enabled" class="offer-node node-returning" title="老用户(同tracker二次点击)固定跳此Offer, 不参与轮转">
                    <span class="offer-name">老用户 → #{{ p.returning.offer_id }} {{ p.returning.offer_name }}</span>
                  </div>
                </div>
                <!-- 线路末端统计 -->
                <div class="branch-stats">
                  <span @click="goTab('conversions')">转化 <b :class="{ zero: !p.counts.converted }">{{ p.counts.converted }}</b></span>
                  <span @click="goTab('conversions')">下发 <b :class="{ zero: !p.counts.sent }">{{ p.counts.sent }}</b></span>
                  <span>扣量 <b :class="{ zero: !p.counts.deducted }">{{ p.counts.deducted }}</b></span>
                  <span>Lead <b :class="{ zero: !p.counts.lead_sent }">{{ p.counts.lead_sent }}</b></span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 错误日志 + 转化回传 两卡并排 -->
        <div class="bottom-grid">
          <div class="b-card">
            <div class="b-head">
              <span>错误日志</span>
              <a class="b-link" @click="goTab('errors')">查看明细 →</a>
            </div>
            <div class="b-total">共 <b>{{ data.errors.total }}</b> 条</div>
            <div v-if="!data.errors.by_code || !data.errors.by_code.length" class="b-empty">该时间段无错误日志</div>
            <div v-for="e in data.errors.by_code" :key="e.error_code" class="err-row" @click="goTab('errors')">
              <span class="err-code">{{ e.error_code }}</span>
              <span class="err-bar"><span class="err-bar-in" :style="{ width: errBarWidth(e.count) }"></span></span>
              <span class="err-count">{{ e.count }}</span>
              <span class="err-time">{{ fmtTime(e.latest_at) }}</span>
            </div>
          </div>
          <div class="b-card">
            <div class="b-head">
              <span>转化回传</span>
              <a class="b-link" @click="goTab('conversions')">查看明细 →</a>
            </div>
            <div class="conv-stats">
              <span class="cs">转化 <b>{{ data.conversions.total }}</b></span>
              <span class="cs ok">下发 <b>{{ data.conversions.sent }}</b></span>
              <span class="cs bad">扣量 <b>{{ data.conversions.deducted }}</b></span>
              <span class="cs wait">待发 <b>{{ data.conversions.pending }}</b></span>
              <span class="cs money">收入 $<b>{{ data.conversions.revenue }}</b></span>
            </div>
            <div class="b-sub">按 Offer</div>
            <div v-if="!data.conversions.by_offer || !data.conversions.by_offer.length" class="b-empty">该时间段无转化</div>
            <div v-for="o in data.conversions.by_offer" :key="o.oid" class="off-row" @click="goTab('conversions')">
              <span class="off-name">#{{ o.oid }} {{ o.offer_name }}</span>
              <span class="off-num">{{ o.count }} 笔 · ${{ o.revenue }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SparkMD5 from 'spark-md5'
import { getTrackerOverview, getRecentPathCodes } from '@/services/main/ef-tracker'

const route = useRoute()
const router = useRouter()

const code = ref('')
const dateKey = ref('3d') // 选中的日期预设 key, 默认近 3 天
const dateRange = computed(() => DATE_PRESETS.find((p) => p.key === dateKey.value)?.range() || [])
const loading = ref(false)
const data = ref(null)
const errMsg = ref('')

const totalClicks = computed(() => (data.value?.paths || []).reduce((s, p) => s + (p.counts?.clicks || 0), 0))

// 多 Offer(多按钮)线路的展开状态: key=p.group("fallback"/条件组 id), 默认全部折叠, 重新查询时重置
const expandedOffers = ref({})
function toggleOffers(group) {
  expandedOffers.value[group] = !expandedOffers.value[group]
}
// 折叠汇总节点上的总人数 = 该线路各 offer 人数之和
function offerSum(p) {
  return (p.offers || []).reduce((s, o) => s + (o.clicks || 0), 0)
}
const winLabel = computed(() => {
  const p = rangeToParams(dateRange.value)
  return p.start && p.end ? `${String(p.start).slice(0, 10)} ~ ${String(p.end).slice(0, 10)}` : '全部时间'
})

function pct(n) {
  if (!totalClicks.value) return 0
  return Math.round((n / totalClicks.value) * 1000) / 10
}

function daysAgo(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

// 日期范围固定为 5 个预设(今天/昨天/前天/近3天/近7天), 页面上单选按钮直接切换, 不提供日历组件——
// 既避免大范围查询拖慢总览接口, 也不需要再做范围校验。range 每次取值时现算, 跨天也不会停留在旧日期上。
const DATE_PRESETS = [
  { key: 'today', label: '今天', range: () => [daysAgo(0), daysAgo(0)] },
  { key: 'yesterday', label: '昨天', range: () => [daysAgo(1), daysAgo(1)] },
  { key: 'day2', label: '前天', range: () => [daysAgo(2), daysAgo(2)] },
  { key: '3d', label: '近 3 天', range: () => [daysAgo(2), daysAgo(0)] },
  { key: '7d', label: '近 7 天', range: () => [daysAgo(6), daysAgo(0)] }
]
function rangeToParams(range) {
  if (!range || range.length !== 2) return {}
  const [d1, d2] = range
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} 00:00:00`
  const end = new Date(d2.getTime())
  end.setDate(end.getDate() + 1)
  return { start: fmt(d1), end: fmt(end) }
}
function fmtTime(s) {
  if (!s) return '-'
  return String(s).replace('T', ' ').replace(/\.\d+/, '').replace(/([+-])(\d{2}):(\d{2})$/, (_m, sign, h, min) => ' ' + sign + parseInt(h, 10) + (parseInt(min, 10) ? ':' + parseInt(min, 10) : '')).replace(/Z$/, ' +0')
}

// code 联想: 空=最近code, 键入=全量模糊(复用 /query/path-codes, 同媒体点击页 code 框)
function fetchCodeSuggest(qs, cb) {
  const kw = String(qs || '').trim()
  getRecentPathCodes({ kw, limit: 20, tz: 8 })
    .then((res) => cb((res?.list || []).map((r) => ({ value: r.code }))))
    .catch(() => cb([]))
}

// 切换日期预设 = 重新查询(无需再点「查询」); 点当前已选项不重复请求; 未填 code 时 load 内部直接返回
function selectDatePreset(key) {
  if (key === dateKey.value) return
  dateKey.value = key
  load()
}

async function load() {
  if (!code.value) return
  loading.value = true
  errMsg.value = ''
  try {
    const res = await getTrackerOverview({ code: code.value.trim(), tz: 8, ...rangeToParams(dateRange.value) })
    data.value = res
    expandedOffers.value = {} // 新数据: 多 Offer 线路回到默认折叠
  } catch (e) {
    data.value = null
    errMsg.value = e?.response?.status === 404
      ? `code 不存在: ${code.value}`
      : `查询失败: ${e?.message || e}`
  } finally {
    loading.value = false
  }
}

// 条件摘要: "{s1} 包含 a/b 且 {adset_name} 不包含 c" (logic 0=and 1=or)
const OP_NAME = { 1: '=', 2: '≠', 3: '包含', 4: '不包含' }
function oneCond(c) {
  const v = Array.isArray(c.value) ? c.value.join('/') : c.value
  return `${c.placeholder || c.placeholder_id} ${OP_NAME[c.operator_id] || '?'} ${v}`
}
function condSummary(cond) {
  if (!cond?.conditions?.length) return cond?.name || ''
  return cond.conditions.map(oneCond).join(cond.logic === 1 ? ' 或 ' : ' 且 ')
}
function condTitle(cond) {
  return `${cond.name || ''}(logic=${cond.logic === 1 ? 'OR' : 'AND'})`
}

// "打开"LP: 拼 eflp 访问签名(与落地页列表/行为弹窗同一套门禁, lp-events-dialog 同款)
function openLp(url) {
  if (!url) return
  const t = Math.floor(Date.now() / 10000)
  const n = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const s = SparkMD5.hash(`eflp${t}${n}`).substring(0, 10)
  const sep = url.includes('?') ? '&' : '?'
  window.open(`${url}${sep}go=1&t=${t}&n=${n}&s=${s}&w=1`, '_blank')
}

// 错误分布条宽(相对最大值)
const maxErrCount = computed(() => Math.max(1, ...(data.value?.errors?.by_code || []).map((e) => e.count)))
function errBarWidth(n) {
  return Math.max(4, Math.round((n / maxErrCount.value) * 100)) + '%'
}

// 明细联动: 跳对应 tab 并带 path_code+日期(各面板读 route.query 接管过滤)
function goTab(tab) {
  router.push({
    path: route.path,
    query: { tab, path_code: code.value, ...rangeToParams(dateRange.value) }
  })
}
</script>

<style lang="less" scoped>
.google-content {
  padding: 8px;
}
.content-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  padding: 12px 16px 20px;
}
.filter-section {
  border-bottom: 1px solid #e8eaed;
  padding-bottom: 8px;
}
.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.google-btn {
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  background: #1a73e8;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  &:disabled { background: #9aa8b5; cursor: default; }
}
/* 日期预设单选(谷歌风格, 与媒体点击页时间线的范围按钮同一套配色): 白底灰字, 选中态浅蓝底+蓝框蓝字 */
.date-presets {
  display: flex;
  gap: 4px;
}
.date-preset-btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: #fff;
  color: #5f6368;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;

  &:hover { background: #f1f3f4; }

  &.active {
    background: #e8f0fe;
    border-color: #1a73e8;
    color: #1a73e8;
    font-weight: 500;
  }
}
.empty-hint {
  padding: 48px 0;
  text-align: center;
  color: #80868b;
  font-size: 13px;
  &.err { color: #d93025; }
}
.ov-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0;
}
.ov-chip {
  background: #f1f3f4;
  border-radius: 14px;
  padding: 3px 12px;
  font-size: 12px;
  color: #3c4043;
  b { color: #202124; }
  &.total { background: #e8f0fe; color: #1a73e8; b { color: #1a73e8; } }
}
.paths-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 4px 0 10px;
  font-size: 15px;
  font-weight: 500;
  color: #202124;
  .paths-sub { font-size: 12px; font-weight: 400; color: #80868b; }
}

/* ===== 工作流布局: 左根节点 + 右线路列表, 干线=branches 左边框 ===== */
.flow {
  display: flex;
  align-items: stretch;
  gap: 0;
}
.flow-root {
  display: flex;
  align-items: center;
  padding-right: 14px;
}
.root-node {
  width: 96px;
  text-align: center;
  border: 2px solid #1a73e8;
  border-radius: 10px;
  padding: 10px 6px;
  background: #e8f0fe;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.root-label { font-size: 12px; color: #174ea6; }
.root-num { font-size: 20px; font-weight: 600; color: #1a73e8; }
.flow-branches {
  flex: 1;
  border-left: 2px solid #dadce0;
  padding-left: 0;
  min-width: 0;
}
.branch-sep {
  padding: 2px 0 2px 18px;
  font-size: 11px;
  color: #9aa0a6;
  &.fb { color: #137333; }
}
.branch {
  display: flex;
  align-items: center;
  padding: 8px 0 8px 0;
  position: relative;
  flex-wrap: wrap;
  gap: 0;
  /* 干线 → 本线路的水平引线 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 14px;
    height: 2px;
    background: #dadce0;
  }
}
.b-count {
  margin-left: 14px;
  min-width: 64px;
  text-align: center;
  cursor: pointer;
  b { display: block; font-size: 16px; color: #1a73e8; }
  span { font-size: 11px; color: #5f6368; }
  &:hover b { text-decoration: underline; }
}
.node {
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 8px;
}
.group-node {
  padding: 6px 10px;
  max-width: 250px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.badge {
  align-self: flex-start;
  border-radius: 4px;
  font-size: 11px;
  padding: 1px 7px;
}
.badge-fb { background: #e6f4ea; color: #137333; }
.badge-cond { background: #fef7e0; color: #b06000; }
.cond-summary {
  font-size: 11px;
  color: #b06000;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 节点间连线: 中线 + 箭头 + 流量文字 */
.flow-line {
  position: relative;
  flex: 1;
  min-width: 56px;
  max-width: 150px;
  height: 2px;
  background: #dadce0;
  margin: 0 6px;
  &::after {
    content: '';
    position: absolute;
    right: -1px;
    top: -3.5px;
    border-left: 7px solid #dadce0;
    border-top: 4.5px solid transparent;
    border-bottom: 4.5px solid transparent;
  }
  .fl-text {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    padding: 0 6px;
    font-size: 11px;
    color: #5f6368;
    white-space: nowrap;
  }
}
.lp-node {
  display: flex;
  gap: 8px;
  padding: 6px;
  width: 240px;
}
.lp-img-wrap { flex-shrink: 0; }
.lp-img {
  width: 72px;
  height: 54px;
  border-radius: 4px;
  border: 1px solid #e8eaed;
  cursor: zoom-in;
}
.lp-img-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #bdc1c6;
  background: #f8f9fa;
}
.lp-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.lp-name {
  font-size: 12px;
  color: #202124;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lp-nums {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #5f6368;
  b { color: #1a73e8; }
  b.zero { color: #9aa0a6; }
  span { cursor: pointer; &:hover { text-decoration: underline; } }
}
.lp-open { color: #1a73e8; cursor: pointer; }
.offers-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
/* offer 列表容器: 单 offer 时只是普通竖排; 多 offer 展开后限高 + 自身垂直滚动条 */
.offer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  &.is-scroll {
    max-height: 180px; // 约 6 行 offer
    overflow-y: auto;
    overscroll-behavior: contain; // 列表滚到底/顶不链到页面滚动
    scrollbar-width: thin;
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 3px; }
    &::-webkit-scrollbar-thumb:hover { background: #bdc1c6; }
  }
}
.offer-node {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 12px;
  max-width: 330px;
}
.offer-pct { color: #1a73e8; font-weight: 500; }
/* 多 Offer 折叠汇总节点: 整行可点击, 箭头随展开旋转, 展开后 offer 列表排在其下 */
.offer-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed #bdc1c6;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: #3c4043;
  max-width: 330px;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  &:hover { border-color: #1a73e8; background: #f8faff; color: #1a73e8; }
  .ot-arrow {
    display: inline-block;
    font-size: 11px;
    color: #9aa0a6;
    transition: transform 0.15s;
    &.open { transform: rotate(90deg); }
  }
  .ot-sum {
    margin-left: auto;
    color: #5f6368;
    b { color: #1a73e8; }
    b.zero { color: #9aa0a6; }
  }
}
.offer-name {
  color: #202124;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.offer-btn { color: #9aa0a6; font-size: 11px; }
.offer-clicks {
  margin-left: auto;
  color: #5f6368;
  white-space: nowrap;
  cursor: pointer;
  b { color: #1a73e8; }
  b.zero { color: #9aa0a6; }
  &:hover b { text-decoration: underline; }
}
.node-returning { border-color: #f3e8fd; background: #fdf7ff; .offer-name { color: #7627bb; } }
.branch-stats {
  margin-left: auto;
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #80868b;
  padding-right: 4px;
  b { color: #202124; }
  b.zero { color: #bdc1c6; }
  span { cursor: pointer; &:hover b { text-decoration: underline; } }
}
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
}
.b-card {
  border: 1px solid #e8eaed;
  border-radius: 8px;
  padding: 10px 14px;
}
.b-head {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 500;
  color: #202124;
}
.b-link { font-size: 12px; color: #1a73e8; cursor: pointer; }
.b-total { font-size: 13px; color: #3c4043; padding: 6px 0; }
.b-sub { font-size: 12px; color: #80868b; margin: 8px 0 4px; }
.b-empty { font-size: 13px; color: #9aa0a6; padding: 10px 0; }
.err-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  cursor: pointer;
  &:hover { background: #f8f9fa; }
}
.err-code { width: 190px; font-size: 12px; color: #d93025; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.err-bar { flex: 1; background: #f1f3f4; border-radius: 3px; height: 8px; overflow: hidden; }
.err-bar-in { display: block; height: 100%; background: #d93025; opacity: 0.65; }
.err-count { width: 60px; text-align: right; font-size: 12px; color: #3c4043; }
.err-time { font-size: 11px; color: #9aa0a6; }
.conv-stats { display: flex; gap: 8px; flex-wrap: wrap; padding: 6px 0; }
.cs {
  background: #f1f3f4;
  border-radius: 4px;
  font-size: 12px;
  padding: 3px 10px;
  color: #3c4043;
  b { color: #202124; }
  &.ok b { color: #137333; }
  &.bad b { color: #d93025; }
  &.wait b { color: #b06000; }
  &.money { background: #e6f4ea; }
  &.money b { color: #137333; }
}
.off-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 0;
  font-size: 12px;
  cursor: pointer;
  &:hover { background: #f8f9fa; }
}
.off-name { color: #3c4043; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.off-num { color: #137333; white-space: nowrap; }
</style>
