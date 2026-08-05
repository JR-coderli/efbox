<template>
  <div class="landers-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-row">
        <div class="search-inputs">
          <div class="search-item">
            <label>关键词</label>
            <el-input
              v-model="filters.keyword"
              placeholder="name/url"
              clearable
              class="search-input"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="search-item">
            <label>时区</label>
            <el-select v-model="tz" class="search-input" style="width: 130px" @change="handleSearch">
              <el-option v-for="o in tzOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
          <div class="search-item">
            <label>创建日期</label>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              clearable
              class="search-input"
              style="width: 240px"
            />
          </div>
          <div class="search-actions">
            <el-button @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
        </div>
        <div class="toolbar-actions">
          <el-button class="icon-btn" :icon="Edit" circle title="批量替换域名" @click="openReplaceDialog" />
          <el-button class="icon-btn" circle :title="refreshCountdown > 0 ? `${refreshCountdown}s 后可刷新` : '刷新'" :disabled="loading || refreshCountdown > 0" @click="handleRefresh">
            <span v-if="refreshCountdown > 0">{{ refreshCountdown }}</span>
            <el-icon v-else><Refresh /></el-icon>
          </el-button>
          <!-- 列设置 -->
          <el-dropdown trigger="click" :hide-on-click="false">
            <el-button class="icon-btn" :icon="Setting" circle title="列设置" />
            <template #dropdown>
              <el-dropdown-menu class="column-setting-menu">
                <div class="column-setting-header">
                  <span>列设置</span>
                  <el-button link type="primary" size="small" @click="resetColumns">重置</el-button>
                </div>
                <el-scrollbar max-height="350px">
                  <div
                    v-for="(col, index) in columns"
                    :key="col.key"
                    class="column-item"
                    :class="{ 'column-required': col.required, 'dragging': draggingIndex === index }"
                    draggable="true"
                    @dragstart="handleDragStart(index)"
                    @dragover.prevent="handleDragOver(index)"
                    @dragend="handleDragEnd"
                  >
                    <div class="column-drag-handle">
                      <svg viewBox="0 0 24 24">
                        <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </div>
                    <el-checkbox :model-value="col.visible" :disabled="col.required" @change="(val) => toggleColumn(col, val)">
                      {{ col.label }}
                    </el-checkbox>
                  </div>
                </el-scrollbar>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" class="google-table" stripe border style="width: 100%">
        <template v-for="col in columns" :key="col.key">
          <el-table-column
            v-if="col.visible"
            :label="col.label"
            :prop="col.prop"
            :width="col.width"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip"
            :class-name="col.className"
          >
            <!-- 截图列 -->
            <template v-if="col.key === 'screenshot'" #default="{ row }">
              <div class="shot-wrap">
                <el-image
                  v-if="row.screenshot_url && row.screenshot_status === 'success'"
                  :src="getFullImageUrl(row.screenshot_url)"
                  :preview-src-list="[getFullImageUrl(row.screenshot_url)]"
                  fit="cover"
                  preview-teleported
                  hide-on-click-modal
                  class="shot-img"
                />
                <div v-else class="shot-empty">
                  <el-button
                    link
                    type="primary"
                    size="small"
                    :loading="!!shotLoading[row.id]"
                    @click="handleScreenshot(row)"
                  >
                    {{ row.screenshot_status === 'failed' ? '重试截图' : '截图' }}
                  </el-button>
                </div>
                <button
                  v-if="row.screenshot_url && row.screenshot_status === 'success'"
                  class="shot-upload-btn"
                  :disabled="!!uploadLoading[row.id]"
                  :title="uploadLoading[row.id] ? '上传中...' : '手动上传截图'"
                  @click.stop="triggerUpload(row)"
                >
                  <svg v-if="!uploadLoading[row.id]" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
                  </svg>
                  <svg v-else class="shot-spin" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                  </svg>
                </button>
              </div>
            </template>
            <!-- 落地页url -->
            <template v-else-if="col.key === 'url'" #default="{ row }">
              <span v-if="row.url" class="url-link">
                <span class="url-text">{{ row.url }}</span>
                <a class="external-link-btn" title="打开落地页" @click="handleOpenUrl(row.url)">
                  <svg viewBox="0 0 24 24" class="external-icon">
                    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                  </svg>
                </a>
              </span>
              <span v-else>-</span>
            </template>
            <!-- type_id -->
            <template v-else-if="col.key === 'type_id'" #default="{ row }">
              <span>{{ row.type_id == null ? '-' : row.type_id }}</span>
            </template>
            <!-- oid -->
            <template v-else-if="col.key === 'oid'" #default="{ row }">
              <span>{{ row.oid == null ? '-' : row.oid }}</span>
            </template>
            <!-- 创建时间 -->
            <template v-else-if="col.key === 'created_at'" #default="{ row }">
              <span class="date-text">{{ fmtTime(row.created_at) }}</span>
            </template>
            <!-- 更新时间 -->
            <template v-else-if="col.key === 'updated_at'" #default="{ row }">
              <span class="date-text">{{ fmtTime(row.updated_at) }}</span>
            </template>
          </el-table-column>
        </template>
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 批量替换域名弹窗 -->
    <el-dialog
      v-model="replaceDialogVisible"
      title="批量替换落地页域名"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form label-width="110px">
        <el-form-item label="要替换的域名">
          <el-input v-model="replaceForm.old" placeholder="例如：old.com" clearable />
        </el-form-item>
        <el-form-item label="替换后的域名">
          <el-input v-model="replaceForm.new" placeholder="例如：new.com（留空 = 删除该子串）" clearable />
        </el-form-item>
      </el-form>

      <!-- 预览结果 -->
      <div v-if="previewList !== null" class="preview-area">
        <div class="preview-summary">
          将影响 <b>{{ previewCount }}</b> 条落地页
          <span v-if="previewCount === 0" class="preview-none">（没有匹配的 url）</span>
        </div>
        <div v-if="previewList.length" class="preview-list">
          <div v-for="item in previewList" :key="item.id" class="preview-item">
            <div class="preview-id">#{{ item.id }}</div>
            <div class="preview-url">
              <div class="before">{{ item.before }}</div>
              <div class="after">→ {{ item.after }}</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="replaceDialogVisible = false">取消</el-button>
        <el-button @click="handlePreview" :loading="previewLoading">预览影响</el-button>
        <el-button type="primary" @click="handleReplace" :loading="replaceLoading" :disabled="!replaceForm.old.trim()">替换</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Setting, Edit } from '@element-plus/icons-vue'
import SparkMD5 from 'spark-md5'
import { getLanders, getEfLanderScreenshots, triggerEfLanderScreenshot, uploadEfLanderScreenshot, replaceLanderUrl } from '@/services/main/ef-tracker'
import { BASE_URL } from '@/services/request/config'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

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

const filters = reactive({
  keyword: ''
})

const dateRange = ref([])

// 截图按钮的 per-row loading 状态：{ [lander_id]: true/false }
const shotLoading = reactive({})

// 上传按钮的 per-row loading 状态
const uploadLoading = reactive({})

// ===== 列设置（参考 网页管理 > 落地页列表：可勾选显隐 + 拖拽排序 + 重置） =====
// type_id / oid / 更新时间 默认隐藏；截图为必选（required）不可关闭
const defaultColumns = [
  { key: 'screenshot', label: '预览图', width: 200, align: 'center', visible: true, required: true },
  { key: 'id', label: 'ID', prop: 'id', width: 80, align: 'center', visible: false },
  { key: 'name', label: '落地页名称', prop: 'name', minWidth: 160, align: 'center', showOverflowTooltip: false, className: 'cell-pad', visible: true },
  { key: 'url', label: '落地页url', prop: 'url', minWidth: 280, align: 'center', showOverflowTooltip: false, className: 'cell-pad', visible: true },
  { key: 'type_id', label: 'type_id', prop: 'type_id', width: 90, align: 'center', visible: false },
  { key: 'oid', label: 'oid', prop: 'oid', width: 90, align: 'center', visible: false },
  { key: 'created_at', label: '创建时间', prop: 'created_at', width: 200, visible: true },
  { key: 'updated_at', label: '更新时间', prop: 'updated_at', width: 200, visible: false }
]
const columns = ref(defaultColumns.map((c) => ({ ...c })))
const draggingIndex = ref(-1)

function toggleColumn(col, val) {
  col.visible = val
}

function resetColumns() {
  columns.value = defaultColumns.map((c) => ({ ...c }))
  draggingIndex.value = -1
}

function handleDragStart(index) {
  draggingIndex.value = index
}

function handleDragOver(index) {
  if (index === draggingIndex.value) return
  const cols = [...columns.value]
  const [moved] = cols.splice(draggingIndex.value, 1)
  cols.splice(index, 0, moved)
  columns.value = cols
  draggingIndex.value = index
}

function handleDragEnd() {
  draggingIndex.value = -1
}

// 拼接截图完整 URL（截图存在本地 domain-api 的 /uploads 下，与外部 /query 无关）
function getFullImageUrl(url) {
  if (!url) return ''
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

// 打开落地页：前端拼 eflp 访问签名（与 clickflare 同一套门禁，逻辑复制自 网页管理>落地页列表）
function handleOpenUrl(url) {
  if (!url) return
  const t = Math.floor(Date.now() / 10000)
  const n = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const raw = `eflp${t}${n}`
  const s = SparkMD5.hash(raw).substring(0, 10)
  const sep = url.includes('?') ? '&' : '?'
  window.open(`${url}${sep}go=1&t=${t}&n=${n}&s=${s}&w=1`, '_blank')
}

// 列表加载后，按当前页 lander id 批量取已缓存的截图，合并到行上
async function fetchScreenshots() {
  const ids = tableData.value.map((r) => r.id)
  if (ids.length === 0) return
  try {
    const res = await getEfLanderScreenshots(ids)
    const map = res?.data || {}
    tableData.value.forEach((r) => {
      const s = map[r.id]
      if (s) {
        r.screenshot_url = s.screenshot_url
        r.screenshot_status = s.screenshot_status
      }
    })
  } catch (e) {
    // 取截图失败不阻塞列表展示
  }
}

// 手动触发单行截图（成功后原地刷新预览图）
async function handleScreenshot(row) {
  if (!row?.url) {
    ElMessage.warning('该落地页没有 url，无法截图')
    return
  }
  shotLoading[row.id] = true
  try {
    const res = await triggerEfLanderScreenshot(row.id, row.url)
    if (res?.code === 0 && res.data?.screenshot_url) {
      row.screenshot_url = res.data.screenshot_url
      row.screenshot_status = 'success'
      ElMessage.success('截图成功')
    } else {
      row.screenshot_status = 'failed'
      ElMessage.error(res?.message || '截图失败')
    }
  } catch (error) {
    row.screenshot_status = 'failed'
    ElMessage.error('截图失败: ' + (error?.message || '网络错误'))
  } finally {
    shotLoading[row.id] = false
  }
}

// 手动上传截图（点击预览图右上角按钮，弹文件选择）
function triggerUpload(row) {
  if (!row?.id) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/gif,image/webp'
  input.onchange = async () => {
    const file = input.files && input.files[0]
    if (file) await uploadScreenshot(row, file)
  }
  input.click()
}

async function uploadScreenshot(row, file) {
  uploadLoading[row.id] = true
  try {
    const formData = new FormData()
    formData.append('screenshot', file)
    formData.append('lander_id', row.id)
    formData.append('lander_url', row.url || '')
    const res = await uploadEfLanderScreenshot(formData)
    if (res?.code === 0 && res.data?.screenshot_url) {
      row.screenshot_url = res.data.screenshot_url
      row.screenshot_status = 'success'
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(res?.message || '上传失败')
    }
  } catch (error) {
    ElMessage.error('上传失败: ' + (error?.message || '网络错误'))
  } finally {
    uploadLoading[row.id] = false
  }
}

function fmtTime(s) {
  if (!s) return '-'
  return String(s).replace('T', ' ').replace(/\.\d+/, '').replace(/([+-])(\d{2}):(\d{2})$/, (_m, sign, h, min) => ' ' + sign + parseInt(h, 10) + (parseInt(min, 10) ? ':' + parseInt(min, 10) : '')).replace(/Z$/, ' +0')
}

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
  Object.assign(p, rangeToParams(dateRange.value))
  return p
}

async function loadData() {
  loading.value = true
  try {
    const result = await getLanders(buildParams())
    tableData.value = result?.list || []
    total.value = result?.total ?? 0
    await fetchScreenshots()
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
})

// ===== 批量替换域名（POST /landers/replace-url） =====
const replaceDialogVisible = ref(false)
const replaceForm = reactive({ old: '', new: '' })
const previewLoading = ref(false)
const replaceLoading = ref(false)
const previewList = ref(null) // null = 未预览
const previewCount = ref(0)

function openReplaceDialog() {
  replaceForm.old = ''
  replaceForm.new = ''
  previewList.value = null
  previewCount.value = 0
  replaceDialogVisible.value = true
}

async function handlePreview() {
  if (!replaceForm.old.trim()) {
    ElMessage.warning('请输入要替换的域名')
    return
  }
  previewLoading.value = true
  try {
    const res = await replaceLanderUrl({ old: replaceForm.old.trim(), new: replaceForm.new.trim(), dry_run: true })
    previewList.value = res?.list || []
    previewCount.value = res?.count ?? 0
    if (previewCount.value === 0) ElMessage.info('没有匹配的落地页 url')
  } catch (e) {
    ElMessage.error('预览失败: ' + (e?.response?.data?.error || e?.message || '网络错误'))
  } finally {
    previewLoading.value = false
  }
}

async function handleReplace() {
  if (!replaceForm.old.trim()) {
    ElMessage.warning('请输入要替换的域名')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定把所有包含「${replaceForm.old.trim()}」的落地页 url 替换为「${replaceForm.new.trim() || '(空，删除该子串)'}」吗？此操作不可撤销，建议先点「预览影响」核对。`,
      '确认替换',
      { confirmButtonText: '确定替换', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  replaceLoading.value = true
  try {
    const res = await replaceLanderUrl({ old: replaceForm.old.trim(), new: replaceForm.new.trim() })
    ElMessage.success(`已替换 ${res?.affected ?? 0} 条落地页`)
    replaceDialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('替换失败: ' + (e?.response?.data?.error || e?.message || '网络错误'))
  } finally {
    replaceLoading.value = false
  }
}
</script>

<style lang="less" scoped>
/* 页面外壳：对齐 网页管理 > 落地页列表 的风格（灰底 + 白色搜索/表格卡片） */
.landers-container {
  background: #f8f9fa;
  width: 100%;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;

  .search-bar {
    padding: 12px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    margin-bottom: 12px;

    .search-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .search-inputs {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
        flex-wrap: wrap;

        .search-item {
          display: flex;
          align-items: center;
          gap: 8px;

          label {
            font-size: 13px;
            color: #202124;
            white-space: nowrap;
          }

          .search-input {
            width: 200px;

            :deep(.el-input__wrapper) {
              border-radius: 4px;
              border: 1px solid #dadce0;
              box-shadow: none;

              &:hover {
                border-color: #1a73e8;
              }

              &.is-focused {
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
              }
            }
          }
        }

        .search-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;

          .el-button {
            height: 32px;
            padding: 0 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
        }
      }

      .toolbar-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
        align-items: center;

        .icon-btn {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid #dadce0;
          background: #fff;
          color: #5f6368;

          &:hover {
            background: #fff;
            border-color: #1a73e8;
            color: #1a73e8;
          }
        }
      }
    }
  }

  .table-container {
    padding: 0;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin: 12px 12px 12px 0;
      flex-shrink: 0;
    }

    :deep(.google-table) {
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;

      .el-table__inner-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .el-table__body-wrapper {
        overflow-x: auto;
        overflow-y: auto;
        flex: 1;
      }

      thead th {
        background: #f8f9fa;
        color: #3c4043;
        font-weight: 500;
        font-size: 13px;
        border-bottom: 1px solid #e8eaed;
        padding: 0 14px;
        height: 40px;

        .cell {
          padding: 0;
          text-align: center;
        }
      }

      tbody tr {
        &:hover {
          background: #f8f9fa;

          td {
            background: #f8f9fa;
          }
        }

        td {
          color: #202124;
          font-size: 13px;
          padding: 0 14px;
          height: 230px;
          vertical-align: middle;
          border-bottom: 1px solid #e8eaed;

          .cell {
            padding: 0;
            white-space: normal;
            word-break: break-all;
            line-height: 1.5;
          }
        }

        td.cell-pad .cell {
          padding: 0 10px;
        }
      }
    }
  }
}

.date-text {
  color: #5f6368;
  font-size: 13px;
}

/* url 单元格：地址文字 + 紧跟其后的跳出图标（inline 流式，图标贴着文字） */
.url-link {
  display: inline;
  word-break: break-all;
  white-space: normal;

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
}

@keyframes btn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 截图列 */
.shot-wrap {
  position: relative;
  width: 100%;
  height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  box-sizing: border-box;
}

.shot-img {
  width: 85%;
  height: 100%;
  border-radius: 4px;
  border: 1px solid #e8eaed;
}

.shot-empty {
  width: 85%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e8eaed;
}

.shot-upload-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;

  &:hover:not(:disabled) {
    background: rgba(26, 115, 232, 0.9);
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.shot-wrap:hover .shot-upload-btn {
  opacity: 1;
}

.shot-spin {
  animation: btn-spin 0.8s linear infinite;
}

/* 批量替换域名弹窗 */
.preview-area {
  margin-top: 4px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8eaed;
}

.preview-summary {
  font-size: 13px;
  color: #3c4043;
  margin-bottom: 8px;

  b {
    color: #1a73e8;
  }
}

.preview-none {
  color: #9aa0a6;
}

.preview-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 6px;
}

.preview-id {
  color: #9aa0a6;
  font-size: 12px;
  flex-shrink: 0;
  padding-top: 2px;
}

.preview-url {
  flex: 1;
  min-width: 0;
  font-size: 12px;

  .before {
    color: #9aa0a6;
    text-decoration: line-through;
    word-break: break-all;
  }

  .after {
    color: #1e8e3e;
    word-break: break-all;
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
/* 预览查看器图片尺寸（全局，因为 preview-teleported 把它挂到 body 下） */
.el-image-viewer__canvas {
  .el-image-viewer__img {
    max-width: 65vw !important;
    max-height: 75vh !important;
  }
}

/* 列设置下拉（el-dropdown 会被传送到 body 下，故放全局） */
.column-setting-menu {
  padding: 8px;
  min-width: 200px;
}

.column-setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px 8px;
  border-bottom: 1px solid #e8eaed;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #202124;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: default;

  &:hover {
    background: #f1f3f4;
  }

  &.dragging {
    opacity: 0.5;
    background: #e8f0fe;
  }

  .column-drag-handle {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: #9aa0a6;
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;

    &:active {
      cursor: grabbing;
    }

    svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
  }

  .el-checkbox {
    flex: 1;
  }
}
</style>
