<template>
  <div class="monetstatus-container">
    <div class="g-card">
      <div class="g-card-header">
        <div class="g-card-title">
          <el-icon :size="20"><Bell /></el-icon>
          <span>变现通知</span>
        </div>
        <div class="g-header-actions">
          <span class="g-total-count">共 {{ total }} 条</span>
          <el-button type="primary" :icon="Refresh" @click="loadData" :loading="loading">
            刷新
          </el-button>
        </div>
      </div>

      <div class="g-table-wrapper" v-loading="loading">
        <el-table :data="tableData" style="width: 100%" stripe>
          <el-table-column type="index" label="序号" width="70" align="center"
            :index="indexMethod" />
          <el-table-column prop="payload" label="Payload" min-width="300">
            <template #default="{ row }">
              <pre class="payload-json">{{ formatPayload(row.payload) }}</pre>
            </template>
          </el-table-column>
          <el-table-column prop="received_at" label="接收时间" width="200" align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.received_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="danger" link size="small" @click="handleDelete(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无通知数据" />
          </template>
        </el-table>
      </div>

      <div class="g-pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Refresh } from '@element-plus/icons-vue'
import { getNoticeList, deleteNotice } from '@/services/main/webpage/monetstatus-notice'

const tableData = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

function indexMethod(index) {
  return (page.value - 1) * pageSize.value + index + 1
}

function formatPayload(payload) {
  if (!payload) return '-'
  try {
    const obj = typeof payload === 'string' ? JSON.parse(payload) : payload
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(payload)
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

async function loadData() {
  loading.value = true
  try {
    const offset = (page.value - 1) * pageSize.value
    const result = await getNoticeList({ offset, size: pageSize.value })
    if (result.code === 0) {
      tableData.value = result.data.list
      total.value = result.data.total
    } else {
      ElMessage.error(result.message || '加载失败')
    }
  } catch (error) {
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除 ID ${row.id} 的通知记录吗？`,
      '确认删除',
      { type: 'warning' }
    )
    const result = await deleteNotice(row.id)
    if (result.code === 0) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch {
    // 取消
  }
}

function handleSizeChange() {
  page.value = 1
  loadData()
}

function handlePageChange() {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="less" scoped>
.monetstatus-container {
  padding: 20px;

  .g-card {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  .g-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #ebeef5;
  }

  .g-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 500;
    color: #303133;
  }

  .g-header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .g-total-count {
    font-size: 13px;
    color: #909399;
  }

  .g-table-wrapper {
    padding: 0;
  }

  .payload-json {
    margin: 0;
    padding: 4px 8px;
    font-size: 12px;
    line-height: 1.5;
    background: #f5f7fa;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 120px;
    overflow-y: auto;
  }

  .g-pagination {
    display: flex;
    justify-content: flex-end;
    padding: 16px 20px;
  }
}
</style>
