<template>
  <div class="clickflare-container">
    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        :data="tableData"
        v-loading="loading"
        class="google-table"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="80" align="center" />

        <el-table-column prop="dangerous_domain" label="危险域名" width="180" align="center">
          <template #default="{ row }">
            <el-tooltip placement="top" :show-after="200">
              <template #content>
                <span class="tooltip-content">{{ row.dangerous_domain }}</span>
              </template>
              <span class="domain-text">{{ row.dangerous_domain }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column prop="replacement_domain" label="替换域名" width="210" align="center">
          <template #default="{ row }">
            <el-tooltip placement="top" :show-after="200">
              <template #content>
                <span class="tooltip-content">{{ row.replacement_domain }}</span>
              </template>
              <span class="domain-text replacement">{{ row.replacement_domain }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column prop="affected_count" label="影响数量" width="110" align="center">
          <template #default="{ row }">
            <span class="count-text">{{ row.affected_count }}</span>
          </template>
        </el-table-column>

        <el-table-column label="处理结果" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'success'" type="success" size="small">成功</el-tag>
            <el-tag v-else-if="row.status === 'partial'" type="warning" size="small">部分成功</el-tag>
            <el-tag v-else-if="row.status === 'failed'" type="danger" size="small">失败</el-tag>
            <el-tag v-else type="info" size="small">处理中</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="成功/失败" width="120" align="center">
          <template #default="{ row }">
            <span class="result-text">
              <span class="success">{{ row.success_count }}</span> / <span class="failed">{{ row.failed_count }}</span>
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="检测时间" width="180" align="center" />

        <el-table-column prop="synced_at" label="同步时间" width="180" align="center">
          <template #default="{ row }">
            <span v-if="row.synced_at" class="sync-time">{{ row.synced_at }}</span>
            <span v-else class="no-sync">未同步</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="showDetail(row)"
              title="查看详情"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="pagination.total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          class="google-pagination"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- 空状态 -->
      <!-- <div v-if="!loading && tableData.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Warning /></el-icon>
        <p class="empty-text">暂无域名替换记录</p>
        <p class="empty-hint">当检测到危险域名时，系统会自动替换 Lander 中的域名并在此处显示</p>
      </div> -->
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="替换详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentRecord" class="detail-content">
        <div class="detail-info">
          <div class="info-row">
            <span class="label">危险域名：</span>
            <span class="value danger">{{ currentRecord.dangerous_domain }}</span>
          </div>
          <div class="info-row">
            <span class="label">替换域名：</span>
            <span class="value replacement">{{ currentRecord.replacement_domain }}</span>
          </div>
          <div class="info-row">
            <span class="label">影响数量：</span>
            <span class="value">{{ currentRecord.affected_count }}</span>
          </div>
          <div class="info-row">
            <span class="label">处理结果：</span>
            <span class="value">
              <el-tag v-if="currentRecord.status === 'success'" type="success" size="small">成功</el-tag>
              <el-tag v-else-if="currentRecord.status === 'partial'" type="warning" size="small">部分成功</el-tag>
              <el-tag v-else-if="currentRecord.status === 'failed'" type="danger" size="small">失败</el-tag>
              <el-tag v-else type="info" size="small">处理中</el-tag>
            </span>
          </div>
          <div class="info-row">
            <span class="label">检测时间：</span>
            <span class="value">{{ currentRecord.created_at }}</span>
          </div>
          <div class="info-row" v-if="currentRecord.synced_at">
            <span class="label">同步时间：</span>
            <span class="value">{{ currentRecord.synced_at }}</span>
          </div>
        </div>

        <!-- 替换详情列表 -->
        <div v-if="replacementDetails.length > 0" class="replacement-details">
          <div class="details-header">
            <h4>替换详情</h4>
            <span class="details-count">共 {{ replacementDetails.length }} 条记录</span>
          </div>
          <el-table :data="replacementDetails" border size="small" max-height="400" class="details-table">
            <el-table-column type="index" label="#" width="50" align="center" />
            <el-table-column prop="name" label="Lander 名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="oldUrl" label="原URL" min-width="250">
              <template #default="{ row }">
                <span class="url-text old-url">{{ row.oldUrl }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="newUrl" label="新URL" min-width="250">
              <template #default="{ row }">
                <span class="url-text new-url">{{ row.newUrl }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'success'" type="success" size="small">成功</el-tag>
                <el-tag v-else type="danger" size="small">失败</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="error" label="错误信息" min-width="200">
              <template #default="{ row }">
                <span v-if="row.error" class="error-text">{{ row.error }}</span>
                <span v-else class="no-error">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="lander_key" label="Lander ID" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="lander-key">{{ row.lander_key }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-else class="no-details">
          <el-icon><Warning /></el-icon>
          <p>暂无替换详情</p>
        </div>

        <div v-if="currentRecord.error_message && !isProgressJson(currentRecord.error_message)" class="error-summary">
          <h4>错误信息</h4>
          <p>{{ currentRecord.error_message }}</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { getReplacementList, getReplacementDetail } from '@/services/main/timer/clickflare'


const tableData = ref([])
const loading = ref(false)


const pagination = ref({
  page: 1,
  size: 20,
  total: 0
})


const detailVisible = ref(false)
const currentRecord = ref(null)
const replacementDetails = ref([])


/**
 * 判断 error_message 字段是否是进度对象 JSON（而非真正的错误信息）
 * 后端在任务正常完成时会将最终进度对象序列化后写入 error_message 字段，
 * 需要排除这种情况，避免把进度对象当作错误信息展示。
 */
const isProgressJson = (val) => {
  if (typeof val !== 'string' || !val.trim().startsWith('{')) return false
  try {
    const obj = JSON.parse(val)
    return obj !== null && typeof obj === 'object' && 'phase' in obj
  } catch (e) {
    return false
  }
}


const fetchData = async () => {
  loading.value = true

  try {
    const offset = (pagination.value.page - 1) * pagination.value.size
    const res = await getReplacementList(offset, pagination.value.size)

    if (res.code === 0) {
      tableData.value = res.data.list || []
      pagination.value.total = res.data.total || 0
    } else {
      ElMessage.error(res.message || '获取数据失败')
      tableData.value = []
      pagination.value.total = 0
    }
  } catch (error) {
    console.error('查询失败:', error)
    ElMessage.error('查询失败，请重试')
    tableData.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}


const handleSizeChange = (val) => {
  pagination.value.size = val
  pagination.value.page = 1
  fetchData()
}


const handleCurrentChange = (val) => {
  pagination.value.page = val
  fetchData()
}


const showDetail = async (row) => {
  try {
    const res = await getReplacementDetail(row.id)
    if (res.code === 0) {
      currentRecord.value = res.data

      if (res.data.replacement_details) {

        if (typeof res.data.replacement_details === 'string') {
          try {
            replacementDetails.value = JSON.parse(res.data.replacement_details)
          } catch (e) {
            console.error('解析 replacement_details 失败:', e)
            replacementDetails.value = []
          }
        } else if (Array.isArray(res.data.replacement_details)) {

          replacementDetails.value = res.data.replacement_details
        } else {
          replacementDetails.value = []
        }
      } else {
        replacementDetails.value = []
      }
      detailVisible.value = true
    } else {
      ElMessage.error(res.message || '获取详情失败')
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}


onMounted(() => {
  fetchData()
})
</script>

<style lang="less" scoped>
.clickflare-container {
  padding: 12px;
  background: #f8f9fa;
  height: 100%;
  display: flex;
  flex-direction: column;

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

    :deep(.el-table) {
      border: none;
      flex: 1;
      display: flex;
      flex-direction: column;

      .el-table__inner-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .el-table__body-wrapper {
        overflow-x: auto !important;
        overflow-y: auto !important;
        flex: 1;
      }

      .el-table__header,
      .el-table__body {
        width: 100% !important;
        table-layout: fixed;
      }

      thead th {
        background: #f8f9fa;
        color: #3c4043;
        font-weight: 500;
        font-size: 13px;
        border-bottom: 1px solid #e8eaed;
        padding: 0 14px;
        height: 40px;
      }

      tbody tr {
        &:hover {
          background: #f8f9fa !important;
        }

        td {
          border-bottom: 1px solid #e8eaed;
          color: #202124;
          font-size: 13px;
          padding: 0 14px;
          vertical-align: middle;
        }
      }

      .domain-text {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        color: #5f6368;
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.replacement {
          color: #188038;
        }
      }

      .count-text {
        font-weight: 500;
        color: #202124;
      }

      .result-text {
        .success {
          color: #137333;
          font-weight: 500;
        }

        .failed {
          color: #c5221f;
          font-weight: 500;
        }
      }

      .sync-time {
        color: #137333;
        font-size: 12px;
      }

      .no-sync {
        color: #9aa0a6;
        font-size: 12px;
      }

      &::before {
        display: none;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #5f6368;

    .empty-icon {
      font-size: 64px;
      color: #dadce0;
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 16px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 8px 0;
    }

    .empty-hint {
      font-size: 13px;
      color: #5f6368;
      margin: 0;
    }
  }

  .detail-content {
    .detail-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;

      .info-row {
        display: flex;
        align-items: center;
        font-size: 14px;

        .label {
          color: #5f6368;
          margin-right: 8px;
          min-width: 80px;
        }

        .value {
          color: #202124;
          font-weight: 500;

          &.danger {
            color: #c5221f;
          }

          &.replacement {
            color: #137333;
          }
        }
      }
    }

    .replacement-details {
      margin-top: 20px;

      .details-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        h4 {
          font-size: 14px;
          font-weight: 500;
          color: #202124;
          margin: 0;
        }

        .details-count {
          font-size: 12px;
          color: #5f6368;
        }
      }

      :deep(.details-table) {
        .el-table__header th {
          background: #f8f9fa;
          color: #3c4043;
          font-weight: 500;
          font-size: 12px;
        }

        .el-table__body td {
          font-size: 12px;
          color: #202124;
        }

        .lander-key {
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 11px;
          color: #5f6368;
        }

        .url-text {
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 11px;
          word-break: break-all;
          display: block;

          &.old-url {
            color: #c5221f;
          }

          &.new-url {
            color: #137333;
            font-weight: 500;
          }
        }
      }

      .error-text {
        color: #c5221f;
        font-size: 12px;
      }

      .no-error {
        color: #9aa0a6;
        font-size: 12px;
      }
    }

    .no-details {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #9aa0a6;

      .el-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .error-summary {
      margin-top: 16px;
      padding: 12px;
      background: #fce8e6;
      border-radius: 4px;

      h4 {
        font-size: 14px;
        font-weight: 500;
        color: #c5221f;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 13px;
        color: #5f6368;
        margin: 0;
        white-space: pre-wrap;
      }
    }
  }
}


:deep(.google-pagination) {
  flex-wrap: wrap;

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
    background: #fff;

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
    line-height: 32px;

    &:hover {
      background-color: #f1f3f4;
    }

    &.is-active {
      background-color: #1a73e8;
      color: #fff;
    }
  }
}
</style>
