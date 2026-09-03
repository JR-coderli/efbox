<template>
  <div class="google-content" v-loading="loading">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">双机状态</h1>
        <p class="page-subtitle">/query/status · A/B 双机全景（本机服务器 / DB / 分区 / 归档 + 内网探测对端）</p>
      </div>
      <div class="header-actions">
        <div class="auto-refresh" title="status 是重型请求（约 10 条 SQL + 内网探测），非必要时建议保持关闭">
          <span class="auto-refresh-label">自动刷新</span>
          <el-switch v-model="autoRefresh" @change="onAutoRefreshChange" />
          <span v-if="autoRefresh" class="auto-refresh-count">（每 10s）</span>
        </div>
        <button class="google-btn google-btn-secondary" @click="handleRefresh" :disabled="refreshCountdown > 0">
          <svg class="btn-icon" :class="{ 'is-loading': loading }" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>{{ refreshCountdown > 0 ? `刷新中 ${refreshCountdown}s` : '刷新' }}</span>
        </button>
      </div>
    </div>

    <!-- 数据区域 -->
    <template v-if="data">
      <!-- 本机 -->
      <div class="panel-title">
        <span class="panel-title-dot" :class="localHealthy ? 'dot-ok' : 'dot-warn'"></span>
        本机（{{ localHostname }}）
        <el-tag v-if="dbRole" :type="dbRole === 'primary' ? 'success' : 'info'" size="small" effect="light" class="role-tag">
          {{ dbRole === 'primary' ? '主库 Primary' : '从库 Standby' }}
        </el-tag>
      </div>
      <div class="card-grid">
        <!-- 服务器 -->
        <div class="stat-card">
          <div class="stat-card-title">服务器</div>
          <div class="stat-row">
            <span class="stat-label">主机名</span>
            <span class="stat-value">{{ data.local?.server?.hostname || '-' }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">负载 (1/5/15)</span>
            <span class="stat-value">{{ fmtLoad(data.local?.server?.load1) }} / {{ fmtLoad(data.local?.server?.load5) }} / {{ fmtLoad(data.local?.server?.load15) }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">内存可用</span>
            <span class="stat-value">{{ fmtMem(data.local?.server?.mem_avail_mb, data.local?.server?.mem_total_mb) }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">服务器时间</span>
            <span class="stat-value">{{ fmtTime(data.local?.server?.now) }}</span>
          </div>
          <div class="disk-list" v-if="data.local?.server?.disks?.length">
            <div class="disk-item" v-for="d in data.local.server.disks" :key="d.mount">
              <div class="disk-info">
                <span class="disk-mount">{{ d.mount }}</span>
                <span class="disk-usage">{{ d.free_gb ?? '-' }} GB 可用 / 共 {{ d.total_gb ?? '-' }} GB</span>
              </div>
              <el-progress
                :percentage="Math.min(100, Math.round(d.used_pct ?? 0))"
                :color="pctColor(d.used_pct)"
                :stroke-width="8"
              />
            </div>
          </div>
        </div>

        <!-- 数据库 -->
        <div class="stat-card">
          <div class="stat-card-title">数据库（PostgreSQL）</div>
          <div class="stat-row">
            <span class="stat-label">版本</span>
            <span class="stat-value">{{ data.local?.db?.version || '-' }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">角色 / 恢复中</span>
            <span class="stat-value">
              {{ data.local?.db?.role || '-' }}
              <span v-if="data.local?.db?.in_recovery" class="warn-text">（recovery）</span>
            </span>
          </div>
          <div class="stat-row">
            <span class="stat-label">库大小</span>
            <span class="stat-value">{{ data.local?.db?.database_size || '-' }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">连接数</span>
            <span class="stat-value">{{ data.local?.db?.connections ?? '-' }} / {{ data.local?.db?.max_connections ?? '-' }}</span>
          </div>
          <div class="conn-bar" v-if="data.local?.db?.max_connections">
            <el-progress
              :percentage="Math.min(100, Math.round((data.local.db.connections / data.local.db.max_connections) * 100))"
              :color="connPct >= 80 ? '#d93025' : connPct >= 60 ? '#f9ab00' : '#1e8e3e'"
              :stroke-width="8"
            />
          </div>
          <!-- 主库：从库复制状态 -->
          <div class="repl-list" v-if="data.local?.db?.replication?.length">
            <div class="repl-title">从库复制</div>
            <div class="repl-item" v-for="(r, i) in data.local.db.replication" :key="i">
              <span class="stat-value">{{ r.client_addr || '-' }}</span>
              <el-tag :type="r.state === 'streaming' ? 'success' : 'danger'" size="small" effect="light">{{ r.state || 'unknown' }}</el-tag>
              <span class="stat-label">lag {{ fmtLag(r.replay_lag_ms) }}</span>
            </div>
          </div>
          <!-- 从库视角：重放延迟 -->
          <div class="stat-row" v-else-if="data.local?.db?.replay_delay_ms !== undefined">
            <span class="stat-label">重放延迟</span>
            <span class="stat-value">{{ data.local.db.replay_delay_ms }} ms<span class="hint-text">（低流量时虚高属正常）</span></span>
          </div>
        </div>

        <!-- 分区表 -->
        <div class="stat-card">
          <div class="stat-card-title">分区表</div>
          <el-table :data="data.local?.partitions || []" size="small" class="mini-table">
            <el-table-column prop="table" label="表" min-width="140" show-overflow-tooltip />
            <el-table-column prop="partitions" label="分区数" width="70" align="center" />
            <el-table-column prop="latest_partition" label="最新分区" min-width="150" show-overflow-tooltip />
            <el-table-column prop="latest_partition_rows" label="行数" width="80" align="center" />
            <template #empty><span class="empty-text">暂无数据</span></template>
          </el-table>
        </div>

        <!-- 归档 -->
        <div class="stat-card">
          <div class="stat-card-title">归档（30 天前点击出库）</div>
          <template v-if="data.local?.archive">
            <div class="stat-row">
              <span class="stat-label">目录</span>
              <span class="stat-value mono">{{ data.local.archive.dir || '-' }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">文件数</span>
              <span class="stat-value">{{ data.local.archive.files ?? '-' }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">总大小</span>
              <span class="stat-value">{{ data.local.archive.total_mb ?? '-' }} MB</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">最新文件</span>
              <span class="stat-value mono">{{ data.local.archive.latest_file || '-' }}</span>
            </div>
          </template>
          <div v-else class="empty-text">未配置归档目录</div>
        </div>
      </div>

      <!-- 对端 -->
      <template v-if="data.peer">
        <div class="panel-title" style="margin-top: 24px">
          <span class="panel-title-dot" :class="data.peer.reachable ? 'dot-ok' : 'dot-bad'"></span>
          对端（{{ data.peer.addr || '内网探测' }}）
          <el-tag v-if="data.peer.reachable" type="success" size="small" effect="light" class="role-tag">可达</el-tag>
          <el-tag v-else type="danger" size="small" effect="light" class="role-tag">不可达</el-tag>
        </div>
        <div v-if="!data.peer.reachable" class="stat-card peer-error-card">
          <span class="warn-text">对端探测失败：{{ data.peer.error || '未知错误' }}</span>
          <span class="hint-text">（A/B 的 Go 应用均常驻，不可达通常意味着对端宕机或应用未启动）</span>
        </div>
        <div v-else class="card-grid">
          <div class="stat-card">
            <div class="stat-card-title">服务器</div>
            <div class="stat-row">
              <span class="stat-label">主机名</span>
              <span class="stat-value">{{ data.peer.status?.server?.hostname || '-' }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">负载 (1/5/15)</span>
              <span class="stat-value">{{ fmtLoad(data.peer.status?.server?.load1) }} / {{ fmtLoad(data.peer.status?.server?.load5) }} / {{ fmtLoad(data.peer.status?.server?.load15) }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">内存可用</span>
              <span class="stat-value">{{ fmtMem(data.peer.status?.server?.mem_avail_mb, data.peer.status?.server?.mem_total_mb) }}</span>
            </div>
            <div class="disk-list" v-if="data.peer.status?.server?.disks?.length">
              <div class="disk-item" v-for="d in data.peer.status.server.disks" :key="d.mount">
                <div class="disk-info">
                  <span class="disk-mount">{{ d.mount }}</span>
                  <span class="disk-usage">{{ d.free_gb ?? '-' }} GB 可用 / 共 {{ d.total_gb ?? '-' }} GB</span>
                </div>
                <el-progress
                  :percentage="Math.min(100, Math.round(d.used_pct ?? 0))"
                  :color="pctColor(d.used_pct)"
                  :stroke-width="8"
                />
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">数据库（PostgreSQL）</div>
            <div class="stat-row">
              <span class="stat-label">版本</span>
              <span class="stat-value">{{ data.peer.status?.db?.version || '-' }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">角色</span>
              <span class="stat-value">{{ data.peer.status?.db?.role || '-' }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">库大小</span>
              <span class="stat-value">{{ data.peer.status?.db?.database_size || '-' }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">连接数</span>
              <span class="stat-value">{{ data.peer.status?.db?.connections ?? '-' }} / {{ data.peer.status?.db?.max_connections ?? '-' }}</span>
            </div>
            <div class="repl-list" v-if="data.peer.status?.db?.replication?.length">
              <div class="repl-title">从库复制</div>
              <div class="repl-item" v-for="(r, i) in data.peer.status.db.replication" :key="i">
                <span class="stat-value">{{ r.client_addr || '-' }}</span>
                <el-tag :type="r.state === 'streaming' ? 'success' : 'danger'" size="small" effect="light">{{ r.state || 'unknown' }}</el-tag>
                <span class="stat-label">lag {{ fmtLag(r.replay_lag_ms) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="peer-not-configured">未配置 peer 内网探测，仅展示本机状态</div>
    </template>

    <!-- 首次加载失败 -->
    <div v-else-if="!loading && loadFailed" class="load-failed">
      <p>状态接口加载失败</p>
      <p class="hint-text">请确认 services/main/ef-tracker/index.js 中 QUERY_STATUS_TOKEN 已填写，且与对端 conf/app.ini [status] token 一致（不匹配会返回 404）</p>
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
const localHostname = computed(() => data.value?.local?.server?.hostname || '本机')

// 简单健康判定：磁盘任一触红 / 复制断开 → 黄点提示
const localHealthy = computed(() => {
  const disks = data.value?.local?.server?.disks || []
  if (disks.some((d) => (d.used_pct ?? 0) >= 90)) return false
  const repl = data.value?.local?.db?.replication || []
  if (repl.some((r) => r.state !== 'streaming')) return false
  return true
})

const connPct = computed(() => {
  const db = data.value?.local?.db
  if (!db?.max_connections) return 0
  return Math.round((db.connections / db.max_connections) * 100)
})

// 磁盘使用率配色：>90% 红，>80% 黄，其余绿
function pctColor(p) {
  if (p === undefined || p === null) return '#80868b'
  if (p >= 90) return '#d93025'
  if (p >= 80) return '#f9ab00'
  return '#1e8e3e'
}

// Windows 本地开发 load/mem 读不到（为 0），显示 '-'
function fmtLoad(v) {
  return v ? Number(v).toFixed(2) : '-'
}

function fmtMem(availMb, totalMb) {
  if (!availMb && !totalMb) return '-'
  if (!totalMb) return `${availMb} MB`
  return `${Math.round(availMb)} / ${Math.round(totalMb)} MB（${Math.round((availMb / totalMb) * 100)}%）`
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
  color: #9aa0a6;
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

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #202124;
  margin-bottom: 12px;
}

.panel-title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-ok {
  background: #1e8e3e;
}

.dot-warn {
  background: #f9ab00;
}

.dot-bad {
  background: #d93025;
}

.role-tag {
  margin-left: 4px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  padding: 16px 20px;
}

.stat-card-title {
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eaed;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 4px 0;
  font-size: 13px;
}

.stat-label {
  color: #5f6368;
  white-space: nowrap;
}

.stat-value {
  color: #202124;
  text-align: right;
  word-break: break-all;
}

.stat-value.mono {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.warn-text {
  color: #d93025;
}

.hint-text {
  color: #9aa0a6;
  font-size: 12px;
}

.disk-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.disk-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #5f6368;
  margin-bottom: 2px;
}

.disk-mount {
  font-weight: 500;
  color: #3c4043;
}

.conn-bar {
  margin-top: 6px;
}

.repl-list {
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
  font-size: 13px;
}

:deep(.mini-table) {
  .el-table__header th {
    background-color: #f8f9fa;
    color: #5f6368;
    font-weight: 500;
    font-size: 12px;
    padding: 6px 0;
  }

  .el-table__row td {
    font-size: 12px;
    padding: 6px 0;
  }
}

.empty-text {
  color: #9aa0a6;
  font-size: 13px;
}

.peer-error-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.peer-not-configured {
  margin-top: 16px;
  color: #9aa0a6;
  font-size: 13px;
}

.load-failed {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  padding: 40px;
  text-align: center;
  color: #5f6368;
  font-size: 14px;
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
