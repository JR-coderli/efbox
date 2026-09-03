<template>
  <div class="bt-page" v-loading="loading">
    <!-- 顶部栏 -->
    <div class="bt-header">
      <div class="header-left">
        <h1 class="bt-title">
          双机状态监控
          <span class="health-pill" :class="localHealthy.level">
            <span class="health-dot"></span>{{ localHealthy.text }}
          </span>
        </h1>
        <p class="bt-subtitle">/query/status · A/B 双机全景 · 更新于 {{ lastUpdate }}</p>
      </div>
      <div class="header-actions">
        <div class="auto-refresh" title="status 是重型请求（约 10 条 SQL + 内网探测），非必要时建议保持关闭">
          <span class="auto-refresh-label">自动刷新</span>
          <el-switch v-model="autoRefresh" @change="onAutoRefreshChange" />
          <span v-if="autoRefresh" class="auto-refresh-count">10s</span>
        </div>
        <button class="bt-btn bt-btn-green" @click="handleRefresh" :disabled="refreshCountdown > 0">
          <svg class="btn-icon" :class="{ 'is-loading': loading }" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>{{ refreshCountdown > 0 ? `${refreshCountdown}s` : '刷新' }}</span>
        </button>
      </div>
    </div>

    <template v-if="data">
      <!-- ===== 状态卡片行 ===== -->
      <div class="stat-cards">
        <!-- 本机角色 -->
        <div class="stat-card">
          <div class="stat-icon" :class="dbRole === 'primary' ? 'green' : 'blue'">
            <svg viewBox="0 0 24 24"><path d="M4 3h16a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm0 10h16a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6a1 1 0 011-1zm2-6.5A1.5 1.5 0 107.5 8 1.5 1.5 0 006 6.5zm0 10A1.5 1.5 0 107.5 18 1.5 1.5 0 006 16.5zM10 7h6v2h-6z"/></svg>
          </div>
          <div class="stat-main">
            <div class="stat-name">本机角色</div>
            <div class="stat-num">{{ data.local?.server?.hostname || '-' }}</div>
            <div class="stat-sub">
              <span class="role-tag" :class="dbRole === 'primary' ? 'green' : 'blue'">
                {{ dbRole === 'primary' ? 'PRIMARY 主库' : dbRole === 'standby' ? 'STANDBY 从库' : 'UNKNOWN' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 负载 -->
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg viewBox="0 0 24 24"><path d="M3 13h4l3-8 4 14 3-9h4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="stat-main">
            <div class="stat-name">负载状态</div>
            <div class="stat-num">{{ fmtLoad(data.local?.server?.load1) }}</div>
            <div class="stat-sub">5m {{ fmtLoad(data.local?.server?.load5) }} · 15m {{ fmtLoad(data.local?.server?.load15) }}</div>
          </div>
        </div>

        <!-- 内存 -->
        <div class="stat-card">
          <div class="stat-icon" :class="memPct <= 20 ? 'red' : memPct <= 40 ? 'orange' : 'green'">
            <svg viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 011 1v8a1 1 0 01-1 1h-2v2h2v2H4v-2h2v-2H4a1 1 0 01-1-1V6a1 1 0 011-1zm3 3v4h2V8H7zm4 0v4h2V8h-2zm4 0v4h2V8h-2z"/></svg>
          </div>
          <div class="stat-main">
            <div class="stat-name">内存可用</div>
            <div class="stat-num">{{ memPct }}<span class="unit">%</span></div>
            <div class="stat-bar">
              <div class="bar-track"><div class="bar-fill" :class="memPct <= 20 ? 'red' : memPct <= 40 ? 'orange' : 'green'" :style="{ width: memPct + '%' }"></div></div>
              <span class="bar-text">{{ Math.round(data.local?.server?.mem_avail_mb || 0) }} / {{ Math.round(data.local?.server?.mem_total_mb || 0) }} MB</span>
            </div>
          </div>
        </div>

        <!-- 磁盘 -->
        <div class="stat-card">
          <div class="stat-icon" :class="maxDisk.used_pct >= 90 ? 'red' : maxDisk.used_pct >= 80 ? 'orange' : 'green'">
            <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 019 9H3a9 9 0 019-9zm-9 11h18v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zm9 3.5A1.5 1.5 0 1013.5 19 1.5 1.5 0 0012 17.5z"/></svg>
          </div>
          <div class="stat-main">
            <div class="stat-name">磁盘峰值（{{ maxDisk.mount || '-' }}）</div>
            <div class="stat-num">{{ Math.round(maxDisk.used_pct ?? 0) }}<span class="unit">%</span></div>
            <div class="stat-bar">
              <div class="bar-track"><div class="bar-fill" :class="barClass(maxDisk.used_pct)" :style="{ width: Math.min(100, maxDisk.used_pct ?? 0) + '%' }"></div></div>
              <span class="bar-text">剩余 {{ maxDisk.free_gb ?? '-' }} GB / 共 {{ maxDisk.total_gb ?? '-' }} GB</span>
            </div>
          </div>
        </div>

        <!-- DB 连接 -->
        <div class="stat-card">
          <div class="stat-icon" :class="connPct >= 80 ? 'red' : connPct >= 60 ? 'orange' : 'green'">
            <svg viewBox="0 0 24 24"><path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zm8 6.5V12c0 1.7-3.6 3-8 3s-8-1.3-8-3V9.5C5.6 10.5 8.6 11 12 11s6.4-.5 8-1.5zm0 6V18c0 1.7-3.6 3-8 3s-8-1.3-8-3v-2.5C5.6 16.5 8.6 17 12 17s6.4-.5 8-1.5z"/></svg>
          </div>
          <div class="stat-main">
            <div class="stat-name">数据库连接</div>
            <div class="stat-num">{{ connPct }}<span class="unit">%</span></div>
            <div class="stat-bar">
              <div class="bar-track"><div class="bar-fill" :class="connPct >= 80 ? 'red' : connPct >= 60 ? 'orange' : 'green'" :style="{ width: Math.min(100, connPct) + '%' }"></div></div>
              <span class="bar-text">{{ data.local?.db?.connections ?? '-' }} / {{ data.local?.db?.max_connections ?? '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 主从复制 -->
        <div class="stat-card">
          <div class="stat-icon" :class="replState === 'streaming' ? 'green' : replState ? 'red' : 'blue'">
            <svg viewBox="0 0 24 24"><path d="M12 4V1L7 6l5 5V7a5 5 0 11-5 5H5a7 7 0 107-8zm0 14v3l5-5-5-5v3a5 5 0 105-5h2a7 7 0 11-7 9z" transform="scale(0.9) translate(1.3 1.3)"/></svg>
          </div>
          <div class="stat-main">
            <div class="stat-name">主从复制</div>
            <div class="stat-num" :class="replState === 'streaming' ? 'text-green' : replState ? 'text-red' : ''">{{ replText }}</div>
            <div class="stat-sub">{{ replLag }}</div>
          </div>
        </div>

        <!-- 对端 -->
        <div class="stat-card">
          <div class="stat-icon" :class="peerOk ? 'green' : 'red'">
            <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-7.1 17l-1.4 1.4a1 1 0 101.4 1.4L6.3 20.5A10 10 0 1012 2zm5.5 11h-3a1.5 1.5 0 01-3 0h-3A1.5 1.5 0 019 11.5v-3A1.5 1.5 0 0110.5 7h3A1.5 1.5 0 0115 8.5v3a1.5 1.5 0 01-.5 1.5h3a1.5 1.5 0 010 3z"/></svg>
          </div>
          <div class="stat-main">
            <div class="stat-name">对端探测</div>
            <div class="stat-num" :class="peerOk ? 'text-green' : 'text-red'">{{ peerOk ? '可达' : '不可达' }}</div>
            <div class="stat-sub">{{ peerFoot }}</div>
          </div>
        </div>
      </div>

      <!-- ===== 详情面板 ===== -->
      <div class="bt-panels">
        <!-- 服务器 -->
        <div class="bt-panel">
          <div class="bt-panel-title"><span class="title-dot" :class="localHealthy.level"></span>服务器信息</div>
          <div class="bt-panel-body">
            <div class="kv-row"><span>主机名</span><b>{{ data.local?.server?.hostname || '-' }}</b></div>
            <div class="kv-row"><span>负载 1 / 5 / 15 分钟</span><b>{{ fmtLoad(data.local?.server?.load1) }} / {{ fmtLoad(data.local?.server?.load5) }} / {{ fmtLoad(data.local?.server?.load15) }}</b></div>
            <div class="kv-row"><span>内存</span><b>{{ Math.round(data.local?.server?.mem_avail_mb || 0) }} 可用 / 共 {{ Math.round(data.local?.server?.mem_total_mb || 0) }} MB</b></div>
            <div class="kv-row"><span>服务器时间</span><b>{{ fmtTime(data.local?.server?.now) }}</b></div>
            <div class="disk-list" v-if="data.local?.server?.disks?.length">
              <div class="disk-item" v-for="d in data.local.server.disks" :key="d.mount">
                <div class="disk-top">
                  <span class="disk-mount">{{ d.mount }}</span>
                  <span class="disk-pct">{{ Math.round(d.used_pct ?? 0) }}%</span>
                </div>
                <div class="bar-track"><div class="bar-fill" :class="barClass(d.used_pct)" :style="{ width: Math.min(100, d.used_pct ?? 0) + '%' }"></div></div>
                <div class="disk-bottom">{{ d.free_gb ?? '-' }} GB 可用 / 共 {{ d.total_gb ?? '-' }} GB</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 数据库 -->
        <div class="bt-panel">
          <div class="bt-panel-title"><span class="title-dot" :class="localHealthy.level"></span>数据库（PostgreSQL）</div>
          <div class="bt-panel-body">
            <div class="kv-row"><span>版本</span><b>{{ data.local?.db?.version || '-' }}</b></div>
            <div class="kv-row"><span>角色</span><b>{{ data.local?.db?.role || '-' }}<i v-if="data.local?.db?.in_recovery" class="text-orange">（recovery）</i></b></div>
            <div class="kv-row"><span>库大小</span><b>{{ data.local?.db?.database_size || '-' }}</b></div>
            <div class="kv-row"><span>当前连接</span><b>{{ data.local?.db?.connections ?? '-' }} / {{ data.local?.db?.max_connections ?? '-' }}</b></div>
            <div class="conn-bar">
              <div class="bar-track"><div class="bar-fill" :class="connPct >= 80 ? 'red' : connPct >= 60 ? 'orange' : 'green'" :style="{ width: Math.min(100, connPct) + '%' }"></div></div>
            </div>
            <div class="repl-block" v-if="data.local?.db?.replication?.length">
              <div class="repl-title">从库复制状态</div>
              <div class="repl-item" v-for="(r, i) in data.local.db.replication" :key="i">
                <span class="status-dot" :class="r.state === 'streaming' ? 'green' : 'red'"></span>
                <b>{{ r.client_addr || '-' }}</b>
                <span class="dim">{{ r.state || 'unknown' }}</span>
                <span class="dim">lag {{ fmtLag(r.replay_lag_ms) }}</span>
              </div>
            </div>
            <div class="kv-row" v-else-if="data.local?.db?.replay_delay_ms !== undefined">
              <span>重放延迟</span><b>{{ data.local.db.replay_delay_ms }} ms <i class="dim-inline">（低流量时虚高属正常）</i></b>
            </div>
          </div>
        </div>
      </div>

      <div class="bt-panels">
        <!-- 分区表 -->
        <div class="bt-panel">
          <div class="bt-panel-title"><span class="title-dot green"></span>分区表</div>
          <div class="bt-panel-body">
            <el-table :data="data.local?.partitions || []" size="small" class="bt-table">
              <el-table-column prop="table" label="表" min-width="130" show-overflow-tooltip />
              <el-table-column prop="partitions" label="分区数" width="70" align="center" />
              <el-table-column prop="latest_partition" label="最新分区" min-width="150" show-overflow-tooltip />
              <el-table-column prop="latest_partition_rows" label="行数" width="70" align="center" />
              <template #empty><span class="dim">暂无数据</span></template>
            </el-table>
          </div>
        </div>

        <!-- 归档 -->
        <div class="bt-panel">
          <div class="bt-panel-title"><span class="title-dot green"></span>归档（30 天前点击出库）</div>
          <div class="bt-panel-body" v-if="data.local?.archive">
            <div class="kv-row"><span>文件数</span><b>{{ data.local.archive.files ?? '-' }}</b></div>
            <div class="kv-row"><span>总大小</span><b>{{ data.local.archive.total_mb ?? '-' }} MB</b></div>
            <div class="kv-row"><span>目录</span><b class="mono">{{ data.local.archive.dir || '-' }}</b></div>
            <div class="kv-row"><span>最新文件</span><b class="mono">{{ data.local.archive.latest_file || '-' }}</b></div>
          </div>
          <div class="bt-panel-body" v-else><span class="dim">未配置归档目录</span></div>
        </div>
      </div>

      <!-- ===== 对端详情 ===== -->
      <template v-if="data.peer">
        <div class="peer-title">
          <span class="status-dot" :class="data.peer.reachable ? 'green' : 'red'"></span>
          对端详情（{{ data.peer.addr || '内网探测' }}）
        </div>
        <div v-if="!data.peer.reachable" class="bt-panel peer-error">
          <b class="text-red">探测失败：{{ data.peer.error || '未知错误' }}</b>
          <span class="dim">（A/B 的 Go 应用均常驻，不可达通常意味着对端宕机或应用未启动）</span>
        </div>
        <div v-else class="bt-panels">
          <div class="bt-panel">
            <div class="bt-panel-title">
              <span class="title-dot" :class="data.peer.status?.db?.role === 'primary' ? 'green' : 'blue'"></span>
              对端服务器 · {{ data.peer.status?.server?.hostname || '-' }}
            </div>
            <div class="bt-panel-body">
              <div class="kv-row">
                <span>角色</span>
                <b>
                  <span class="role-tag" :class="data.peer.status?.db?.role === 'primary' ? 'green' : 'blue'">
                    {{ data.peer.status?.db?.role === 'primary' ? 'PRIMARY 主库' : data.peer.status?.db?.role === 'standby' ? 'STANDBY 从库' : (data.peer.status?.db?.role || '-') }}
                  </span>
                </b>
              </div>
              <div class="kv-row"><span>负载 1 / 5 / 15 分钟</span><b>{{ fmtLoad(data.peer.status?.server?.load1) }} / {{ fmtLoad(data.peer.status?.server?.load5) }} / {{ fmtLoad(data.peer.status?.server?.load15) }}</b></div>
              <div class="kv-row"><span>内存</span><b>{{ Math.round(data.peer.status?.server?.mem_avail_mb || 0) }} 可用 / 共 {{ Math.round(data.peer.status?.server?.mem_total_mb || 0) }} MB</b></div>
              <div class="disk-list" v-if="data.peer.status?.server?.disks?.length">
                <div class="disk-item" v-for="d in data.peer.status.server.disks" :key="d.mount">
                  <div class="disk-top">
                    <span class="disk-mount">{{ d.mount }}</span>
                    <span class="disk-pct">{{ Math.round(d.used_pct ?? 0) }}%</span>
                  </div>
                  <div class="bar-track"><div class="bar-fill" :class="barClass(d.used_pct)" :style="{ width: Math.min(100, d.used_pct ?? 0) + '%' }"></div></div>
                </div>
              </div>
            </div>
          </div>
          <div class="bt-panel">
            <div class="bt-panel-title"><span class="title-dot green"></span>对端数据库</div>
            <div class="bt-panel-body">
              <div class="kv-row"><span>版本</span><b>{{ data.peer.status?.db?.version || '-' }}</b></div>
              <div class="kv-row"><span>库大小</span><b>{{ data.peer.status?.db?.database_size || '-' }}</b></div>
              <div class="kv-row"><span>当前连接</span><b>{{ data.peer.status?.db?.connections ?? '-' }} / {{ data.peer.status?.db?.max_connections ?? '-' }}</b></div>
              <div class="repl-block" v-if="data.peer.status?.db?.replication?.length">
                <div class="repl-title">从库复制状态</div>
                <div class="repl-item" v-for="(r, i) in data.peer.status.db.replication" :key="i">
                  <span class="status-dot" :class="r.state === 'streaming' ? 'green' : 'red'"></span>
                  <b>{{ r.client_addr || '-' }}</b>
                  <span class="dim">{{ r.state || 'unknown' }}</span>
                  <span class="dim">lag {{ fmtLag(r.replay_lag_ms) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="peer-not-configured dim">未配置 peer 内网探测，仅展示本机状态</div>
    </template>

    <!-- 加载失败 -->
    <div v-else-if="!loading && loadFailed" class="bt-panel load-failed">
      <b class="text-red">状态接口加载失败</b>
      <span class="dim">请确认 services/main/ef-tracker/index.js 中 QUERY_STATUS_TOKEN 已填写，且与对端 conf/app.ini [status] token 一致（不匹配会返回 404）</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getStatus } from '@/services/main/ef-tracker'

const loading = ref(false)
const data = ref(null)
const loadFailed = ref(false)
const lastUpdate = ref('-')

// ===== 刷新按钮 5 秒倒计时（status 是重型请求，防连点）=====
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

// ===== 自动刷新（默认关；status 重型请求，固定 10s 一档）=====
const autoRefresh = ref(false)
let autoTimer = null

function onAutoRefreshChange(on) {
  clearInterval(autoTimer)
  autoTimer = null
  if (on) {
    autoTimer = setInterval(() => loadData({ silent: true }), 10000)
  }
}

// 标签页切到后台时暂停自动刷新（看不见的时候刷是白消耗对端资源），回前台恢复
function onVisibilityChange() {
  if (!autoRefresh.value) return
  if (document.hidden) {
    clearInterval(autoTimer)
    autoTimer = null
  } else if (!autoTimer) {
    autoTimer = setInterval(() => loadData({ silent: true }), 10000)
  }
}
document.addEventListener('visibilitychange', onVisibilityChange)

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearInterval(autoTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// ===== 数据加载 =====
// inFlight 防堆积：上一次请求还没返回就跳过本次（重型请求 + 定时轮询下，慢响应会导致并发叠加打满对端）
let inFlight = false

async function loadData({ silent = false } = {}) {
  if (inFlight) return
  inFlight = true
  if (!silent) loading.value = true
  try {
    data.value = await getStatus()
    loadFailed.value = false
    lastUpdate.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch (error) {
    loadFailed.value = true
    if (!silent) {
      const status = error?.response?.status
      ElMessage.error(
        status === 404
          ? '状态接口 404：token 无效或未配置'
          : '加载失败: ' + (error?.response?.data?.error || error?.message || '网络错误')
      )
    }
  } finally {
    loading.value = false
    inFlight = false
  }
}

onMounted(() => {
  loadData()
})

// ===== 展示辅助 =====
const dbRole = computed(() => data.value?.local?.db?.role || '')

// 磁盘峰值（最高的那个挂载点）
const maxDisk = computed(() => {
  const disks = data.value?.local?.server?.disks || []
  if (!disks.length) return { mount: '', used_pct: 0 }
  return disks.reduce((a, b) => ((b.used_pct ?? 0) > (a.used_pct ?? 0) ? b : a), disks[0])
})

// 内存可用百分比
const memPct = computed(() => {
  const s = data.value?.local?.server
  if (!s?.mem_total_mb) return 0
  return Math.round(((s.mem_avail_mb || 0) / s.mem_total_mb) * 100)
})

const connPct = computed(() => {
  const db = data.value?.local?.db
  if (!db?.max_connections) return 0
  return Math.round((db.connections / db.max_connections) * 100)
})

// 复制状态汇总
const replState = computed(() => {
  const repl = data.value?.local?.db?.replication || []
  if (!repl.length) return ''
  return repl.every((r) => r.state === 'streaming') ? 'streaming' : 'broken'
})
const replText = computed(() => {
  const repl = data.value?.local?.db?.replication || []
  if (!repl.length) return data.value?.local?.db?.replay_delay_ms !== undefined ? 'STANDBY' : '无从库'
  return replState.value === 'streaming' ? 'STREAMING' : '异常'
})
const replLag = computed(() => {
  const repl = data.value?.local?.db?.replication || []
  if (!repl.length) return data.value?.local?.db?.role === 'standby' ? '从库视角' : '-'
  const max = Math.max(...repl.map((r) => r.replay_lag_ms ?? 0))
  return `lag ${fmtLag(max)}`
})

// 对端
const peerOk = computed(() => !!data.value?.peer?.reachable)
const peerFoot = computed(() => {
  const peer = data.value?.peer
  if (!peer) return '未配置'
  if (!peer.reachable) return peer.error || '探测失败'
  return peer.status?.server?.hostname || peer.addr || '-'
})

// 整体健康判定：磁盘/复制触红 → 严重；触黄 → 警告；否则正常
const localHealthy = computed(() => {
  const disks = data.value?.local?.server?.disks || []
  const repl = data.value?.local?.db?.replication || []
  if (disks.some((d) => (d.used_pct ?? 0) >= 90) || repl.some((r) => r.state !== 'streaming')) {
    return { level: 'bad', text: '严重' }
  }
  if (disks.some((d) => (d.used_pct ?? 0) >= 80) || connPct.value >= 60) {
    return { level: 'warn', text: '警告' }
  }
  return { level: 'ok', text: '正常' }
})

// 磁盘使用率配色：>90% 红，>80% 黄，其余绿
function barClass(p) {
  if (p === undefined || p === null) return ''
  if (p >= 90) return 'red'
  if (p >= 80) return 'orange'
  return 'green'
}

// Windows 本地开发 load/mem 读不到（为 0），显示 '-'
function fmtLoad(v) {
  return v ? Number(v).toFixed(2) : '-'
}

function fmtLag(ms) {
  if (ms === undefined || ms === null) return '-'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function fmtTime(s) {
  if (!s) return '-'
  return String(s).replace('T', ' ').replace(/\.\d+/, '')
}
</script>

<style lang="less" scoped>
// ===== 宝塔面板风格：浅灰底 + 白色圆角卡片 + 绿色主色调 + 彩色图标块 =====
.bt-page {
  padding: 12px;
  margin: 0 auto;
  background: #f0f2f5;
  min-height: 100%;
}

.bt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 12px;
}

.bt-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.bt-subtitle {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
  font-family: Consolas, Monaco, monospace;
}

// 整体健康 pill（绿/黄/红）
.health-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &.ok { background: #e8f6ec; color: #20a53a; }
  &.warn { background: #fdf3e3; color: #f0ad4e; }
  &.bad { background: #fdecea; color: #ef4444; }

  .health-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 6px;
}

.auto-refresh-label {
  font-size: 13px;
  color: #666;
}

.auto-refresh-count {
  font-size: 12px;
  color: #20a53a;
  font-family: Consolas, Monaco, monospace;
}

.bt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 32px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.bt-btn-green {
  background: #20a53a;
  color: #fff;
}

.btn-icon {
  width: 15px;
  height: 15px;
  fill: currentColor;

  &.is-loading {
    animation: btn-spin 0.8s linear infinite;
  }
}

@keyframes btn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// ===== 状态卡片行 =====
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

// 彩色图标块
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 24px;
    height: 24px;
    fill: #fff;
  }

  &.green { background: #20a53a; }
  &.blue { background: #2196f3; }
  &.orange { background: #f0ad4e; }
  &.red { background: #ef4444; }
}

.stat-main {
  flex: 1;
  min-width: 0;
}

.stat-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-num {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  font-family: Consolas, Monaco, monospace;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .unit {
    font-size: 12px;
    font-weight: 400;
    color: #999;
    margin-left: 1px;
  }

  &.text-green { color: #20a53a; }
  &.text-red { color: #ef4444; }
}

.stat-sub {
  margin-top: 3px;
  font-size: 12px;
  color: #999;
  font-family: Consolas, Monaco, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 卡片内进度条
.stat-bar {
  margin-top: 6px;
}

.bar-track {
  height: 6px;
  border-radius: 3px;
  background: #f0f2f5;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;

  &.green { background: #20a53a; }
  &.orange { background: #f0ad4e; }
  &.red { background: #ef4444; }
}

.bar-text {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #999;
  font-family: Consolas, Monaco, monospace;
}

// 角色标签
.role-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-family: Consolas, Monaco, monospace;

  &.green { background: #e8f6ec; color: #20a53a; }
  &.blue { background: #e8f3fd; color: #2196f3; }
}

// ===== 详情面板 =====
.bt-panels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  gap: 12px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.bt-panel {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.bt-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f2f5;
}

.title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.green { background: #20a53a; }
  &.blue { background: #2196f3; }
  &.orange, &.warn { background: #f0ad4e; }
  &.red, &.bad { background: #ef4444; }
  &.ok { background: #20a53a; }
}

.bt-panel-body {
  padding: 10px 16px 14px;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 4px 0;
  font-size: 13px;

  span {
    color: #999;
    white-space: nowrap;
  }

  b {
    color: #333;
    font-weight: 500;
    text-align: right;
    word-break: break-all;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
  }

  .mono {
    font-size: 11px;
  }
}

.text-orange {
  color: #f0ad4e;
  font-style: normal;
}

.text-red {
  color: #ef4444;
}

.dim-inline {
  color: #bbb;
  font-style: normal;
  font-size: 11px;
}

.dim {
  color: #999;
  font-size: 12px;
}

// 磁盘列表
.disk-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.disk-top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}

.disk-mount {
  color: #666;
  font-family: Consolas, Monaco, monospace;
}

.disk-pct {
  color: #333;
  font-weight: 600;
  font-family: Consolas, Monaco, monospace;
}

.disk-bottom {
  margin-top: 3px;
  font-size: 11px;
  color: #999;
  font-family: Consolas, Monaco, monospace;
}

.conn-bar {
  margin: 6px 0 2px;
}

// 复制块
.repl-block {
  margin-top: 10px;
  border-top: 1px dashed #f0f2f5;
  padding-top: 8px;
}

.repl-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.repl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 12px;

  b {
    color: #333;
    font-family: Consolas, Monaco, monospace;
  }
}

// 状态圆点
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.green { background: #20a53a; }
  &.red { background: #ef4444; }
  &.orange { background: #f0ad4e; }
}

// ===== 对端 =====
.peer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 4px 0 10px;
}

.peer-error {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
}

.peer-not-configured {
  margin-top: 10px;
  text-align: center;
}

.load-failed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 32px;
  text-align: center;
  font-size: 14px;
}

// ===== Element Plus 微调 =====
:deep(.bt-table) {
  .el-table__header th {
    background: #fafafa;
    color: #999;
    font-weight: 500;
    font-size: 12px;
    padding: 6px 0;
    font-family: Consolas, Monaco, monospace;
  }

  .el-table__row td {
    font-size: 12px;
    padding: 6px 0;
    font-family: Consolas, Monaco, monospace;
  }
}

:deep(.el-switch) {
  --el-switch-on-color: #20a53a;
}

:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 1 !important;

  .el-loading-spinner .circular {
    stroke: #20a53a;
  }

  .el-loading-text {
    color: #999;
    font-size: 13px;
  }
}
</style>
