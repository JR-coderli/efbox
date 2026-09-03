<template>
  <div class="google-page" v-loading="loading">
    <!-- 页面标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">双机状态监控</h1>
        <p class="page-subtitle">/query/status · A/B 双机全景 · 更新于 {{ lastUpdate }}</p>
      </div>
      <div class="header-actions">
        <div class="auto-refresh" title="status 是重型请求（约 10 条 SQL + 内网探测），非必要时建议保持关闭">
          <span class="auto-refresh-label">自动刷新</span>
          <el-switch v-model="autoRefresh" @change="onAutoRefreshChange" />
          <span v-if="autoRefresh" class="auto-refresh-count">10s</span>
        </div>
        <button class="google-btn google-btn-primary" @click="handleRefresh" :disabled="refreshCountdown > 0">
          <svg class="btn-icon" :class="{ 'is-loading': loading }" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>{{ refreshCountdown > 0 ? `刷新中 ${refreshCountdown}s` : '刷新' }}</span>
        </button>
      </div>
    </div>

    <template v-if="data">
      <!-- ===== 健康总览横幅：一眼看全局 ===== -->
      <div class="hero-banner" :class="overall.level">
        <div class="hero-main">
          <span class="hero-icon">
            <svg v-if="overall.level === 'ok'" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.7 14.3L6.4 12.4l1.4-1.4 2.5 2.5 6.3-6.3 1.4 1.4-7.7 7.7z"/></svg>
            <svg v-else-if="overall.level === 'warn'" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 6l7.5 13h-15L12 8zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm5 13.6L15.6 17 12 13.4 8.4 17 7 15.6l3.6-3.6L7 8.4 8.4 7l3.6 3.6L15.6 7 17 8.4 13.4 12l3.6 3.6z"/></svg>
          </span>
          <div class="hero-text">
            <div class="hero-status">{{ overall.text }}</div>
            <div class="hero-detail" v-if="overall.issues.length">
              {{ overall.issues.join('；') }}
            </div>
            <div class="hero-detail ok" v-else>服务器 · 数据库 · 磁盘 · 主从复制 · 对端，全部正常</div>
          </div>
        </div>
        <div class="hero-side">
          <div class="hero-host">{{ data.local?.server?.hostname || '-' }}</div>
          <span class="role-tag" :class="dbRole === 'primary' ? 'green' : 'blue'">
            {{ dbRole === 'primary' ? 'PRIMARY 主库' : dbRole === 'standby' ? 'STANDBY 从库' : 'UNKNOWN' }}
          </span>
        </div>
      </div>

      <!-- ===== 关键检查项：只有状态 + 一行详情 ===== -->
      <div class="content-card check-card">
        <div class="check-row" v-for="c in checks" :key="c.name" :class="c.level">
          <span class="check-dot"></span>
          <span class="check-name">{{ c.name }}</span>
          <span class="check-detail">{{ c.detail }}</span>
          <span class="check-status">{{ c.statusText }}</span>
        </div>
      </div>

      <!-- ===== 详细信息（弱化展示，需要时再看） ===== -->
      <div class="detail-title">详细信息</div>
      <div class="panel-grid">
        <!-- 服务器 -->
        <div class="content-card">
          <div class="card-title"><span class="title-dot" :class="overall.level"></span>服务器信息</div>
          <div class="card-body">
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
        <div class="content-card">
          <div class="card-title"><span class="title-dot" :class="overall.level"></span>数据库（PostgreSQL）</div>
          <div class="card-body">
            <div class="kv-row"><span>版本</span><b>{{ data.local?.db?.version || '-' }}</b></div>
            <div class="kv-row"><span>角色</span><b>{{ data.local?.db?.role || '-' }}<i v-if="data.local?.db?.in_recovery" class="text-warn">（recovery）</i></b></div>
            <div class="kv-row"><span>库大小</span><b>{{ data.local?.db?.database_size || '-' }}</b></div>
            <div class="kv-row"><span>当前连接</span><b>{{ data.local?.db?.connections ?? '-' }} / {{ data.local?.db?.max_connections ?? '-' }}</b></div>
            <div class="conn-bar">
              <div class="bar-track"><div class="bar-fill" :class="connPct >= 80 ? 'bad' : connPct >= 60 ? 'warn' : 'ok'" :style="{ width: Math.min(100, connPct) + '%' }"></div></div>
            </div>
            <div class="repl-block" v-if="data.local?.db?.replication?.length">
              <div class="repl-title">从库复制状态</div>
              <div class="repl-item" v-for="(r, i) in data.local.db.replication" :key="i">
                <span class="status-dot" :class="r.state === 'streaming' ? 'ok' : 'bad'"></span>
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

        <!-- 分区表 -->
        <div class="content-card">
          <div class="card-title"><span class="title-dot ok"></span>分区表</div>
          <div class="card-body">
            <el-table :data="data.local?.partitions || []" size="small" class="google-table">
              <el-table-column prop="table" label="表" min-width="130" show-overflow-tooltip />
              <el-table-column prop="partitions" label="分区数" width="70" align="center" />
              <el-table-column prop="latest_partition" label="最新分区" min-width="150" show-overflow-tooltip />
              <el-table-column prop="latest_partition_rows" label="行数" width="70" align="center" />
              <template #empty><span class="dim">暂无数据</span></template>
            </el-table>
          </div>
        </div>

        <!-- 归档 -->
        <div class="content-card">
          <div class="card-title"><span class="title-dot ok"></span>归档（30 天前点击出库）</div>
          <div class="card-body" v-if="data.local?.archive">
            <div class="kv-row"><span>文件数</span><b>{{ data.local.archive.files ?? '-' }}</b></div>
            <div class="kv-row"><span>总大小</span><b>{{ data.local.archive.total_mb ?? '-' }} MB</b></div>
            <div class="kv-row"><span>目录</span><b class="mono">{{ data.local.archive.dir || '-' }}</b></div>
            <div class="kv-row"><span>最新文件</span><b class="mono">{{ data.local.archive.latest_file || '-' }}</b></div>
          </div>
          <div class="card-body" v-else><span class="dim">未配置归档目录</span></div>
        </div>
      </div>

      <!-- ===== 对端详情 ===== -->
      <template v-if="data.peer">
        <div class="peer-title">
          <span class="status-dot" :class="data.peer.reachable ? 'ok' : 'bad'"></span>
          对端详情（{{ data.peer.addr || '内网探测' }}）
        </div>
        <div v-if="!data.peer.reachable" class="content-card peer-error">
          <b class="text-bad">探测失败：{{ data.peer.error || '未知错误' }}</b>
          <span class="dim">（A/B 的 Go 应用均常驻，不可达通常意味着对端宕机或应用未启动）</span>
        </div>
        <div v-else class="panel-grid">
          <div class="content-card">
            <div class="card-title">
              <span class="title-dot" :class="data.peer.status?.db?.role === 'primary' ? 'ok' : 'blue'"></span>
              对端服务器 · {{ data.peer.status?.server?.hostname || '-' }}
            </div>
            <div class="card-body">
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
          <div class="content-card">
            <div class="card-title"><span class="title-dot ok"></span>对端数据库</div>
            <div class="card-body">
              <div class="kv-row"><span>版本</span><b>{{ data.peer.status?.db?.version || '-' }}</b></div>
              <div class="kv-row"><span>库大小</span><b>{{ data.peer.status?.db?.database_size || '-' }}</b></div>
              <div class="kv-row"><span>当前连接</span><b>{{ data.peer.status?.db?.connections ?? '-' }} / {{ data.peer.status?.db?.max_connections ?? '-' }}</b></div>
              <div class="repl-block" v-if="data.peer.status?.db?.replication?.length">
                <div class="repl-title">从库复制状态</div>
                <div class="repl-item" v-for="(r, i) in data.peer.status.db.replication" :key="i">
                  <span class="status-dot" :class="r.state === 'streaming' ? 'ok' : 'bad'"></span>
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
    <div v-else-if="!loading && loadFailed" class="content-card load-failed">
      <b class="text-bad">状态接口加载失败</b>
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

// ===== 关键检查项（一眼看问题的核心）=====
// level: ok 正常 / warn 警告 / bad 严重
const checks = computed(() => {
  const list = []
  if (!data.value) return list
  const s = data.value.local?.server || {}
  const db = data.value.local?.db || {}
  const repl = db.replication || []
  const peer = data.value.peer

  // 负载（4 核机 <4 健康；无核数信息，按经验值 ≥8 严重 / ≥4 警告）
  const load1 = s.load1 || 0
  list.push({
    name: '系统负载',
    level: load1 >= 8 ? 'bad' : load1 >= 4 ? 'warn' : 'ok',
    detail: `1m ${fmtLoad(s.load1)} · 5m ${fmtLoad(s.load5)} · 15m ${fmtLoad(s.load15)}`
  })

  // 内存
  list.push({
    name: '内存',
    level: memPct.value <= 20 ? 'bad' : memPct.value <= 40 ? 'warn' : 'ok',
    detail: `可用 ${Math.round(s.mem_avail_mb || 0)} / 共 ${Math.round(s.mem_total_mb || 0)} MB（${memPct.value}%）`
  })

  // 磁盘（每个挂载点一行）
  for (const d of s.disks || []) {
    const p = d.used_pct ?? 0
    list.push({
      name: `磁盘 ${d.mount}`,
      level: p >= 90 ? 'bad' : p >= 80 ? 'warn' : 'ok',
      detail: `已用 ${Math.round(p)}%，剩余 ${d.free_gb ?? '-'} GB / 共 ${d.total_gb ?? '-'} GB`
    })
  }

  // 数据库连接
  list.push({
    name: '数据库连接',
    level: connPct.value >= 80 ? 'bad' : connPct.value >= 60 ? 'warn' : 'ok',
    detail: `${db.connections ?? '-'} / ${db.max_connections ?? '-'}（${connPct.value}%）`
  })

  // 主从复制
  if (repl.length) {
    const lagMax = Math.max(...repl.map((r) => r.replay_lag_ms ?? 0))
    const allStreaming = repl.every((r) => r.state === 'streaming')
    list.push({
      name: '主从复制',
      level: !allStreaming ? 'bad' : lagMax > 5000 ? 'warn' : 'ok',
      detail: `${repl.map((r) => `${r.client_addr}(${r.state})`).join('，')} · lag ${fmtLag(lagMax)}`
    })
  }

  // 对端
  if (peer) {
    list.push({
      name: '对端探测',
      level: peer.reachable ? 'ok' : 'bad',
      detail: peer.reachable
        ? `${peer.addr || ''} ${peer.status?.server?.hostname || ''} · ${peer.status?.db?.role === 'primary' ? '主库' : '从库'}`.trim()
        : `${peer.addr || ''} ${peer.error || '探测失败'}`.trim()
    })
  }

  return list.map((c) => ({
    ...c,
    statusText: c.level === 'ok' ? '正常' : c.level === 'warn' ? '警告' : '严重'
  }))
})

// 整体健康度 = 检查项里最差的一级
const overall = computed(() => {
  const list = checks.value
  let level = 'ok'
  if (list.some((c) => c.level === 'bad')) level = 'bad'
  else if (list.some((c) => c.level === 'warn')) level = 'warn'

  const text = level === 'ok' ? '系统运行正常' : level === 'warn' ? '存在警告' : '发现异常'
  const issues = list
    .filter((c) => c.level !== 'ok')
    .map((c) => `${c.name}（${c.level === 'bad' ? '严重' : '警告'}）${c.detail ? '：' + c.detail : ''}`)
  return { level, text, issues }
})

// 磁盘使用率配色：>90% 红，>80% 黄，其余绿
function barClass(p) {
  if (p === undefined || p === null) return ''
  if (p >= 90) return 'bad'
  if (p >= 80) return 'warn'
  return 'ok'
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
// ===== Google 风格：白底、蓝色主色、12px 圆角卡片，与系统其它页面一致 =====
.google-page {
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
  font-family: Consolas, Monaco, monospace;
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
  color: #5f6368;
}

.auto-refresh-count {
  font-size: 12px;
  color: #1a73e8;
  font-family: Consolas, Monaco, monospace;
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

// ===== 健康总览横幅 =====
.hero-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  padding: 18px 20px;
  margin-bottom: 16px;
  border-left: 4px solid #1e8e3e;

  &.ok { border-left-color: #1e8e3e; }
  &.warn { border-left-color: #f9ab00; }
  &.bad { border-left-color: #d93025; }
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e6f4ea;

  svg {
    width: 26px;
    height: 26px;
    fill: #1e8e3e;
  }

  .hero-banner.warn & {
    background: #fef7e0;

    svg { fill: #f9ab00; }
  }

  .hero-banner.bad & {
    background: #fce8e6;

    svg { fill: #d93025; }
  }
}

.hero-status {
  font-size: 20px;
  font-weight: 500;
  color: #202124;
  line-height: 1.3;
}

.hero-detail {
  margin-top: 4px;
  font-size: 13px;
  color: #d93025;
  word-break: break-all;

  &.ok {
    color: #5f6368;
  }
}

.hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.hero-host {
  font-size: 15px;
  font-weight: 500;
  color: #202124;
  font-family: Consolas, Monaco, monospace;
}

.role-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-family: Consolas, Monaco, monospace;

  &.green { background: #e6f4ea; color: #1e8e3e; }
  &.blue { background: #e8f0fe; color: #1a73e8; }
}

// ===== 卡片通用 =====
.content-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

// ===== 关键检查项列表 =====
.check-card {
  margin-bottom: 16px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid #f1f3f4;
  font-size: 13px;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;

  &:last-child {
    border-bottom: none;
  }

  // 异常行：浅黄/浅红底 + 左侧色条，优先抢占视线
  &.warn {
    background: #fef7e0;
    box-shadow: inset 3px 0 0 #f9ab00;
  }

  &.bad {
    background: #fce8e6;
    box-shadow: inset 3px 0 0 #d93025;
  }

  .check-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #1e8e3e;

    .check-row.warn & { background: #f9ab00; }
    .check-row.bad & { background: #d93025; }
  }

  .check-name {
    width: 130px;
    flex-shrink: 0;
    color: #202124;
    font-weight: 500;
  }

  .check-detail {
    flex: 1;
    min-width: 0;
    color: #5f6368;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .check-status {
    flex-shrink: 0;
    font-weight: 500;

    .check-row.ok & { color: #1e8e3e; }
    .check-row.warn & { color: #f9ab00; }
    .check-row.bad & { color: #d93025; }
  }
}

// ===== 详细信息 =====
.detail-title {
  font-size: 13px;
  color: #5f6368;
  margin: 18px 4px 10px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  gap: 16px;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  border-bottom: 1px solid #e8eaed;
}

.title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.ok { background: #1e8e3e; }
  &.blue { background: #1a73e8; }
  &.warn { background: #f9ab00; }
  &.bad { background: #d93025; }
}

.card-body {
  padding: 10px 20px 16px;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 4px 0;
  font-size: 13px;

  span {
    color: #5f6368;
    white-space: nowrap;
  }

  b {
    color: #202124;
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

.text-warn {
  color: #f9ab00;
  font-style: normal;
}

.text-bad {
  color: #d93025;
}

.dim-inline {
  color: #9aa0a6;
  font-style: normal;
  font-size: 11px;
}

.dim {
  color: #9aa0a6;
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
  color: #5f6368;
  font-family: Consolas, Monaco, monospace;
}

.disk-pct {
  color: #202124;
  font-weight: 600;
  font-family: Consolas, Monaco, monospace;
}

.bar-track {
  height: 6px;
  border-radius: 3px;
  background: #f1f3f4;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;

  &.ok { background: #1e8e3e; }
  &.warn { background: #f9ab00; }
  &.bad { background: #d93025; }
}

.disk-bottom {
  margin-top: 3px;
  font-size: 11px;
  color: #9aa0a6;
  font-family: Consolas, Monaco, monospace;
}

.conn-bar {
  margin: 6px 0 2px;
}

// 复制块
.repl-block {
  margin-top: 10px;
  border-top: 1px dashed #e8eaed;
  padding-top: 8px;
}

.repl-title {
  font-size: 12px;
  color: #5f6368;
  margin-bottom: 6px;
}

.repl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 12px;

  b {
    color: #202124;
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

  &.ok { background: #1e8e3e; }
  &.bad { background: #d93025; }
  &.warn { background: #f9ab00; }
  &.blue { background: #1a73e8; }
}

// ===== 对端 =====
.peer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  margin: 4px 4px 10px;
}

.peer-error {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
}

.peer-not-configured {
  margin-top: 10px;
  text-align: center;
}

.load-failed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 40px;
  text-align: center;
  font-size: 14px;
}

// ===== Element Plus 微调 =====
:deep(.google-table) {
  border: none;

  .el-table__header-wrapper th {
    background-color: #f8f9fa;
    border-bottom: 1px solid #e8eaed;
    color: #5f6368;
    font-weight: 500;
    font-size: 12px;
    padding: 6px 0;
    font-family: Consolas, Monaco, monospace;

    .cell {
      padding: 0 14px;
    }
  }

  .el-table__row td {
    color: #202124;
    font-size: 12px;
    padding: 6px 0;
    font-family: Consolas, Monaco, monospace;
    border-bottom: 1px solid #f1f3f4;

    .cell {
      padding: 0 14px;
    }
  }

  &::before,
  &::after {
    display: none;
  }
}

:deep(.el-switch) {
  --el-switch-on-color: #1a73e8;
}

:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1 !important;

  .el-loading-spinner .circular {
    stroke: #1a73e8;
  }

  .el-loading-text {
    color: #5f6368;
    font-size: 13px;
  }
}
</style>
