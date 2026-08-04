<template>
  <div class="google-content">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">落地页</h1>
        <p class="page-subtitle">ab_landers · 落地页 LP</p>
      </div>
      <div class="header-actions">
        <button class="google-btn google-btn-secondary" @click="loadData" :disabled="loading">
          <svg class="btn-icon" :class="{ 'is-loading': loading }" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>刷新</span>
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
                  placeholder="name / url"
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
              <el-form-item label="类型ID">
                <el-input v-model="filters.type_id" placeholder="type_id" clearable style="width: 120px" @keyup.enter="handleSearch" />
              </el-form-item>
              <el-form-item label="Offer">
                <el-input v-model="filters.oid" placeholder="oid" clearable style="width: 120px" @keyup.enter="handleSearch" />
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
        <el-table :data="tableData" v-loading="loading" class="google-table" :border="false">
          <el-table-column label="截图" width="200" align="center">
            <template #default="{ row }">
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
          </el-table-column>
          <el-table-column label="ID" prop="id" width="80" align="center" />
          <el-table-column label="name" prop="name" min-width="160" show-overflow-tooltip />
          <el-table-column label="url" prop="url" min-width="280" show-overflow-tooltip />
          <el-table-column label="type_id" prop="type_id" width="90" align="center">
            <template #default="{ row }">
              <span>{{ row.type_id == null ? '-' : row.type_id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="oid" prop="oid" width="90" align="center">
            <template #default="{ row }">
              <span>{{ row.oid == null ? '-' : row.oid }}</span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" prop="created_at" width="200">
            <template #default="{ row }">
              <span class="date-text">{{ fmtTime(row.created_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" prop="updated_at" width="200">
            <template #default="{ row }">
              <span class="date-text">{{ fmtTime(row.updated_at) }}</span>
            </template>
          </el-table-column>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getLanders, getEfLanderScreenshots, triggerEfLanderScreenshot, uploadEfLanderScreenshot } from '@/services/main/ef-tracker'
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
  keyword: '',
  type_id: '',
  oid: ''
})

const dateRange = ref([])

// 截图按钮的 per-row loading 状态：{ [lander_id]: true/false }
const shotLoading = reactive({})

// 上传按钮的 per-row loading 状态
const uploadLoading = reactive({})

// 拼接截图完整 URL（截图存在本地 domain-api 的 /uploads 下，与外部 /query 无关）
function getFullImageUrl(url) {
  if (!url) return ''
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
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
  return String(s).replace('T', ' ')
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
  if (filters.type_id) p.type_id = filters.type_id
  if (filters.oid) p.oid = filters.oid
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
  filters.type_id = ''
  filters.oid = ''
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
        padding: 0 14px;
        vertical-align: middle;

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
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: rgba(26, 115, 232, 0.9);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.shot-spin {
  animation: btn-spin 0.8s linear infinite;
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
.el-image-viewer__canvas {
  .el-image-viewer__img {
    max-width: 65vw !important;
    max-height: 75vh !important;
  }
}
</style>