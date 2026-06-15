<template>
  <div class="google-content">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">操作日志</h1>
        <p class="page-subtitle">查看系统操作记录</p>
      </div>
      <div class="header-actions">
        <button
          v-if="selectedIds.length > 0"
          class="google-btn google-btn-danger"
          @click="handleBatchDelete"
        >
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          <span>删除选中 ({{ selectedIds.length }})</span>
        </button>
      </div>
    </div>

    <!-- 内容卡片 -->
    <div class="content-card">
      <!-- 筛选条件 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-items">
            <el-form :inline="false" :model="filterForm" class="filter-form">
              <el-form-item label="模块">
                <el-select v-model="filterForm.module" placeholder="全部模块" clearable class="google-select" style="width: 140px">
                  <el-option label="全部模块" value="" />
                  <el-option label="用户管理" value="user" />
                  <el-option label="角色管理" value="role" />
                  <el-option label="客户管理" value="customer" />
                  <el-option label="发票管理" value="invoice" />
                  <el-option label="落地页" value="lander" />
                  <el-option label="系统设置" value="system" />
                </el-select>
              </el-form-item>
              <el-form-item label="操作人">
                <el-input v-model="filterForm.userName" placeholder="输入操作人" clearable class="google-input" style="width: 140px" />
              </el-form-item>
              <el-form-item label="操作时间">
                <el-date-picker
                  v-model="filterForm.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  class="google-date-picker"
                />
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
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <span>重置</span>
            </button>
            <el-dropdown trigger="click" @command="handleMoreDelete">
              <button class="google-btn google-btn-secondary">
                <span>更多删除</span>
                <svg class="btn-icon" style="width: 12px; height: 12px;" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="clearAll">清空所有日志</el-dropdown-item>
                  <el-dropdown-item command="deleteByRange">按时间范围删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- 日志表格 -->
      <div class="table-wrapper">
        <el-table
          :data="logList"
          v-loading="loading"
          class="google-table"
          :border="false"
          :stripe="false"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column label="#" type="index" width="60" align="center" class-name="index-column">
            <template #default="scope">
              <span class="row-index">{{ scope.$index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作人" prop="user_name" width="120">
            <template #default="{ row }">
              <span class="user-text">{{ row.user_name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="模块" prop="module" width="110">
            <template #default="{ row }">
              <span class="module-tag" :class="`module-${row.module}`">
                {{ getModuleName(row.module) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作类型" prop="operation" width="150">
            <template #default="{ row }">
              <span class="operation-text" :class="`operation-${row.operation}`">
                {{ getOperationName(row.operation) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作描述" prop="description" width="320" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="description-text">{{ row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作时间" prop="created_at" width="170">
            <template #default="{ row }">
              <span class="date-text">{{ row.created_at }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template #default="{ row }">
              <button
                class="icon-btn delete-btn"
                @click="handleDelete(row.id)"
                title="删除"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="pagination.total"
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
import hyRequest from '@/services/request'

const loading = ref(false)
const logList = ref([])
const selectedIds = ref([])


const filterForm = reactive({
  module: '',
  userName: '',
  dateRange: null
})


const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})


const moduleNameMap = {
  user: '用户管理',
  role: '角色管理',
  customer: '客户管理',
  invoice: '发票管理',
  lander: '落地页列表',
  system: '系统设置',
  invoice_entity: "开票主体"
}


const operationNameMap = {
  create: '新增',
  update: '修改',
  delete: '删除',
  send: '发送',
  login: '登录',
  logout: '登出',
  upload: '上传',
  export: '导出',
  assign: '分配',
  search: '搜索',
  pagination: '分页',
  open_url: '打开链接'
}


function getModuleName(module) {
  return moduleNameMap[module] || module
}


function getOperationName(operation) {
  return operationNameMap[operation] || operation
}


async function fetchLogList() {
  loading.value = true
  try {
    const [startTime, endTime] = filterForm.dateRange || [null, null]

    const res = await hyRequest.post({
      url: '/operation-log/list',
      data: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        module: filterForm.module || undefined,
        userName: filterForm.userName || undefined,
        startTime,
        endTime
      }
    })

    if (res.code === 0) {
      logList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取日志列表失败:', error)
  } finally {
    loading.value = false
  }
}


function handleSearch() {
  pagination.page = 1
  fetchLogList()
}


function handleReset() {
  filterForm.module = ''
  filterForm.userName = ''
  filterForm.dateRange = null
  pagination.page = 1
  fetchLogList()
}


function handleSizeChange() {
  pagination.page = 1
  fetchLogList()
}


function handleCurrentChange() {
  fetchLogList()
}


function handleSelectionChange(selection) {
  selectedIds.value = selection.map(item => item.id)
}


function handleDelete(id) {
  ElMessageBox.confirm(
    '删除后无法恢复，是否确定删除这条日志？',
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await hyRequest.post({
        url: '/operation-log/delete',
        data: { ids: [id] }
      })
      if (res.code === 0) {
        ElMessage.success('删除成功')
        fetchLogList()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}


function handleBatchDelete() {
  ElMessageBox.confirm(
    `确定删除选中的 ${selectedIds.value.length} 条日志吗？删除后无法恢复。`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await hyRequest.post({
        url: '/operation-log/delete',
        data: { ids: selectedIds.value }
      })
      if (res.code === 0) {
        ElMessage.success('删除成功')
        selectedIds.value = []
        fetchLogList()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}


function handleMoreDelete(command) {
  if (command === 'clearAll') {
    ElMessageBox.confirm(
      '确定要清空所有日志吗？此操作不可恢复！',
      '清空日志',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    ).then(async () => {
      try {
        const res = await hyRequest.post({
          url: '/operation-log/delete-by-range',
          data: {}
        })
        if (res.code === 0) {
          ElMessage.success('清空成功')
          fetchLogList()
        }
      } catch (error) {
        ElMessage.error('操作失败')
      }
    }).catch(() => {})
  } else if (command === 'deleteByRange') {
    if (!filterForm.dateRange || filterForm.dateRange.length !== 2) {
      ElMessage.warning('请先选择时间范围')
      return
    }
    ElMessageBox.confirm(
      `确定删除 ${filterForm.dateRange[0]} 至 ${filterForm.dateRange[1]} 期间的日志吗？`,
      '按时间范围删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(async () => {
      try {
        const res = await hyRequest.post({
          url: '/operation-log/delete-by-range',
          data: {
            startTime: filterForm.dateRange[0],
            endTime: filterForm.dateRange[1]
          }
        })
        if (res.code === 0) {
          ElMessage.success('删除成功')
          fetchLogList()
        }
      } catch (error) {
        ElMessage.error('操作失败')
      }
    }).catch(() => {})
  }
}

onMounted(() => {
  fetchLogList()
})
</script>

<style lang="less" scoped>

.google-content {
  padding: 8px;
  // max-width: 1600px;
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
  padding-top: 30px; // 与表单项label对齐
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
}


:deep(.google-select) {
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
}


:deep(.google-date-picker) {
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
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;

  &:hover {
    background-color: #1557b0;
  }

  &:active {
    background-color: #174ea6;
  }
}

.google-btn-secondary {
  background-color: #fff;
  color: #5f6368;
  border: 1px solid #dadce0;

  &:hover {
    background-color: #f1f3f4;
    color: #202124;
  }
}

.google-btn-danger {
  background-color: #c5221f;
  color: #fff;

  &:hover {
    background-color: #a31e1c;
  }
}

.btn-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
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


.user-text {
  color: #202124;
  font-size: 13px;
  font-weight: 500;
}


.module-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;

  &.module-user {
    background-color: #e8f0fe;
    color: #1967d2;
  }

  &.module-role {
    background-color: #e6f4ea;
    color: #137333;
  }

  &.module-customer {
    background-color: #fef7e0;
    color: #b06000;
  }

  &.module-invoice {
    background-color: #fce8e6;
    color: #c5221f;
  }

  &.module-system {
    background-color: #f1f3f4;
    color: #5f6368;
  }

  &.module-invoice_entity {
    background-color: #e8f0fe;
    color: #1967d2;
  }

  &.module-lander {
    background-color: #e6f4ea;
    color: #137333;
  }

  &.module-pushnami {
    background-color: #f3e8fd;
    color: #7b1fa2;
  }
}


.operation-text {
  font-size: 13px;
  font-weight: 500;

  &.operation-create {
    color: #137333;
  }

  &.operation-update {
    color: #1a73e8;
  }

  &.operation-delete {
    color: #c5221f;
  }

  &.operation-send {
    color: #b06000;
  }

  &.operation-login,
  &.operation-logout {
    color: #5f6368;
  }

  &.operation-assign {
    color: #9334e6;
  }
}


.description-text {
  color: #5f6368;
  font-size: 13px;
}


.date-text {
  color: #5f6368;
  font-size: 13px;
}


.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
  }

  &:hover {
    background-color: #f1f3f4;

    svg {
      fill: #202124;
    }
  }

  &.delete-btn:hover {
    background-color: #fce8e6;

    svg {
      fill: #c5221f;
    }
  }
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


:deep(.el-dropdown-menu__item) {
  font-size: 13px;
  padding: 8px 16px;

  &:hover {
    background-color: #f1f3f4;
    color: #c5221f;
  }
}
</style>
