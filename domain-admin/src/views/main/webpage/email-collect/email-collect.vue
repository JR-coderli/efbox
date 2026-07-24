<template>
  <div class="google-content">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">邮箱收集</h1>
        <p class="page-subtitle">查看落地页收集到的邮箱数据</p>
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
      <!-- 筛选条件 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-items">
            <el-form :inline="false" class="filter-form">
              <el-form-item label="关键字">
                <el-input
                  v-model="keyword"
                  placeholder="搜索邮箱 / 落地页地址"
                  clearable
                  class="google-input"
                  style="width: 280px"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-form>
          </div>
          <div class="filter-actions">
            <button class="google-btn google-btn-primary" @click="handleSearch">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <span>查询</span>
            </button>
            <button class="google-btn google-btn-secondary" @click="handleReset">
              <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
              <span>重置</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 邮箱表格 -->
      <div class="table-wrapper">
        <el-table
          :data="pagedData"
          v-loading="loading"
          class="google-table"
          :border="false"
          :stripe="false"
        >
          <el-table-column label="#" type="index" width="60" align="center" class-name="index-column">
            <template #default="scope">
              <span class="row-index">{{ indexMethod(scope.$index) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="邮箱" prop="email" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="email-text">{{ row.email || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="落地页地址" prop="lander_url" min-width="320" show-overflow-tooltip>
            <template #default="{ row }">
              <span
                v-if="row.lander_url"
                rel="noopener noreferrer"
              >
                {{ row.lander_url }}
              </span>
              <span v-else class="empty-text">-</span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" prop="created_at" width="190">
            <template #default="{ row }">
              <span class="date-text">{{ formatDateTime(row.created_at) }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无邮箱数据" />
          </template>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="filteredTotal"
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getEmailList } from '@/services/main/webpage/email-collect'

const loading = ref(false)
const tableData = ref([])
const keyword = ref('')

// 接口返回全量数据，前端做关键字过滤 + 分页
const pagination = reactive({
  page: 1,
  pageSize: 20
})

// 按关键字过滤后的数据
const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tableData.value
  return tableData.value.filter((item) => {
    const email = (item.email || '').toLowerCase()
    const url = (item.lander_url || '').toLowerCase()
    return email.includes(kw) || url.includes(kw)
  })
})

// 过滤后的总条数，驱动分页器
const filteredTotal = computed(() => filteredData.value.length)

// 当前分页展示的数据
const pagedData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredData.value.slice(start, start + pagination.pageSize)
})

// 关键字变化时回到第一页，避免停留在空页
watch(keyword, () => {
  pagination.page = 1
})

function indexMethod(index) {
  return (pagination.page - 1) * pagination.pageSize + index + 1
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function loadData() {
  loading.value = true
  try {
    const result = await getEmailList()
    // 接口返回结构: { count, list: [...], total }
    const list = result?.list || []
    tableData.value = list
    pagination.page = 1
  } catch (error) {
    ElMessage.error('加载邮箱数据失败: ' + (error?.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
}

function handleReset() {
  keyword.value = ''
  pagination.page = 1
}

function handleSizeChange() {
  pagination.page = 1
}

function handleCurrentChange() {
  // 翻页由 pagedData 自动计算
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
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
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
  padding-top: 30px; // 与表单项 label 对齐
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


:deep(.google-input) {
  .el-input__wrapper {
    border-radius: 4px;
    border: 1px solid #dadce0;
    box-shadow: none;
    height: 32px;

    &:hover {
      border-color: #1a73e8;
    }

    &.is-focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    }
  }

  .el-input__inner {
    font-size: 13px;
    color: #202124;
  }

  .el-input__prefix {
    color: #5f6368;
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

  &:active:not(:disabled) {
    background-color: #174ea6;
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
        display: flex;
        align-items: center;
        justify-content: flex-start;
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


.row-index {
  color: #9aa0a6;
  font-size: 13px;
  font-weight: 500;
}


.email-text {
  color: #202124;
  font-size: 13px;
  font-weight: 500;
  word-break: break-all;
}


.url-link {
  color: #1a73e8;
  font-size: 13px;
  text-decoration: none;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
}


.empty-text {
  color: #9aa0a6;
  font-size: 13px;
}


.date-text {
  color: #5f6368;
  font-size: 13px;
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

  .el-pagination__sizes {
    .el-select {
      .el-input__wrapper {
        border-radius: 4px;
        border: 1px solid #dadce0;

        &:hover {
          border-color: #1a73e8;
        }
      }
    }
  }

  .btn-prev,
  .btn-next {
    border-radius: 4px;
    border: 1px solid #dadce0;
    color: #5f6368;

    &:hover:not:disabled {
      background-color: #f1f3f4;
      color: #1a73e8;
    }

    &:disabled {
      opacity: 0.4;
    }
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
