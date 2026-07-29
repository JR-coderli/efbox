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
      <!-- 邮箱表格 -->
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          v-loading="loading"
          class="google-table"
          :border="false"
          :stripe="false"
        >
          <el-table-column label="序号" type="index" width="60" align="center" class-name="index-column">
            <template #default="scope">
              <span class="row-index">{{ indexMethod(scope.$index) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="邮箱" prop="email" min-width="100" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="email-text">{{ row.email || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="落地页地址" prop="lander_url" min-width="320">
            <template #default="{ row }">
              <span
                v-if="row.lander_url"
                class="url-link"
                @click="copyLanderUrl(row.lander_url)"
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
import { getEmailList } from '@/services/main/webpage/email-collect'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

// 服务端分页：page 从 1 开始，limit 为每页条数（接口上限 100）
const pagination = reactive({
  page: 1,
  pageSize: 20
})

function indexMethod(index) {
  // 序号倒序：最新一条序号最大（= 总数），向下递减到 1；邮箱数据顺序不变
  return total.value - ((pagination.page - 1) * pagination.pageSize + index)
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 点击复制落地页地址：优先用 Clipboard API，http 等非安全上下文下回退到 execCommand
async function copyLanderUrl(url) {
  if (!url) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('落地页地址已复制')
  } catch (error) {
    ElMessage.error('复制失败: ' + (error?.message || '请手动复制'))
  }
}

async function loadData() {
  loading.value = true
  try {
    const result = await getEmailList({
      page: pagination.page,
      limit: pagination.pageSize
    })
    // 接口返回结构: { count, list, page, pages, size, total }
    tableData.value = result?.list || []
    total.value = result?.total ?? 0
  } catch (error) {
    ElMessage.error('加载邮箱数据失败: ' + (error?.message || '网络错误'))
  } finally {
    loading.value = false
  }
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
  display: block;
  max-width: 100%;
  color: #1a73e8;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;

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
