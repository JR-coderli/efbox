<template>
  <div class="clickflare-container">
    <div class="content-card">
      <!-- 页面标题和操作栏（谷歌风格） -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">域名替换</h1>
          <span class="page-subtitle">域名自动检测与 Lander 批量替换记录（Clickflare / ef-tracker）</span>
        </div>
        <div class="header-actions">
          <el-button
            v-if="hasBatchReplacePermission"
            class="google-btn google-btn-primary"
            @click="openBatchReplaceDialog"
          >
            <el-icon class="btn-icon"><Edit /></el-icon>
            <span>批量修改 Lander</span>
          </el-button>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-container">
      <el-table
        :data="tableData"
        v-loading="loading"
        class="google-table"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="80" align="center" />

        <el-table-column prop="dangerous_domain" label="被替换域名" min-width="190">
          <template #default="{ row }">
            <el-tooltip placement="top" :show-after="200">
              <template #content>
                <span class="tooltip-content">{{ row.dangerous_domain }}</span>
              </template>
              <span class="domain-text">{{ row.dangerous_domain }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column prop="replacement_domain" label="替换域名" min-width="210">
          <template #default="{ row }">
            <el-tooltip placement="top" :show-after="200">
              <template #content>
                <span class="tooltip-content">{{ row.replacement_domain }}</span>
              </template>
              <span class="domain-text replacement">{{ row.replacement_domain }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 目标系统：clickflare / eftracker -->
        <el-table-column label="目标系统" width="130" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.target_system === 'eftracker'" type="warning" size="small" effect="plain">eftracker</el-tag>
            <el-tag v-else type="primary" size="small" effect="plain">clickflare</el-tag>
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
            <span class="label">被替换域名：</span>
            <span class="value danger">{{ currentRecord.dangerous_domain }}</span>
          </div>
          <div class="info-row">
            <span class="label">替换域名：</span>
            <span class="value replacement">{{ currentRecord.replacement_domain }}</span>
          </div>
          <div class="info-row">
            <span class="label">目标系统：</span>
            <span class="value">
              <el-tag v-if="currentRecord.target_system === 'eftracker'" type="warning" size="small" effect="plain">eftracker</el-tag>
              <el-tag v-else type="primary" size="small" effect="plain">clickflare</el-tag>
            </span>
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

    <!-- 批量修改URL对话框（谷歌风格） -->
    <el-dialog
      v-model="batchReplaceDialogVisible"
      title="批量修改 Lander URL"
      width="1000px"
      :close-on-click-modal="false"
      class="google-dialog"
      destroy-on-close
    >
      <el-form :model="batchReplaceForm" :rules="batchReplaceRules" ref="batchReplaceFormRef" label-width="140px" class="google-form">
        <el-form-item label="要替换的域名" prop="domain">
          <el-input
            v-model="batchReplaceForm.domain"
            placeholder="如: bad-domain.com"
            clearable
            size="large"
          />
        </el-form-item>
        <el-form-item label="替换为域名" prop="replacementDomain">
          <el-input
            v-model="batchReplaceForm.replacementDomain"
            placeholder="如: new-domain.com"
            clearable
            size="large"
          />
        </el-form-item>
        <el-form-item label="Lander 类型" prop="landerType">
          <el-radio-group v-model="batchReplaceForm.landerType" size="large">
            <el-radio value="all">all</el-radio>
            <el-radio value="public">public</el-radio>
            <el-radio value="private">private</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-alert
          v-if="batchPreviewCount > 0"
          :title="`当前有 ${batchPreviewCount} 条 ${batchReplaceForm.landerType === 'public' ? 'Public' : batchReplaceForm.landerType === 'private' ? 'Private' : ''} Lander 的 URL 包含该域名`"
          type="info"
          :closable="false"
          class="preview-alert"
        />
        <el-alert
          v-if="batchPreviewCount === 0 && batchPreviewSearched"
          title="未找到包含该域名的 Lander"
          type="warning"
          :closable="false"
          class="preview-alert"
        />
        <el-alert
          v-if="batchPreviewCount === -1"
          title="请重新预览影响范围"
          type="info"
          :closable="false"
          class="preview-alert"
        />
      </el-form>

      <!-- 预览表格 -->
      <div v-if="batchPreviewList.length > 0" class="batch-preview-table-wrapper">
        <el-table
          :data="batchPreviewList"
          max-height="200"
          border
          size="small"
          class="batch-preview-table"
        >
          <el-table-column label="Lander 名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="preview-lander-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="原始 URL" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="preview-url-old">{{ row.oldUrl }}</span>
            </template>
          </el-table-column>
          <el-table-column label="替换后 URL" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="preview-url-new">{{ row.newUrl }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <div class="google-dialog-footer">
          <el-button @click="batchReplaceDialogVisible = false" size="large" class="google-btn google-btn-secondary" :disabled="batchReplaceLoading">
            取消
          </el-button>
          <el-button @click="handlePreviewBatchReplace" size="large" class="google-btn" :disabled="batchReplaceLoading" :loading="batchPreviewLoading">
            预览影响范围
          </el-button>
          <el-tooltip :content="getBatchReplaceTooltip()" placement="top" :disabled="canStartReplace()">
            <el-button type="primary" @click="handleBatchReplace" :loading="batchReplaceLoading" size="large" class="google-btn google-btn-primary" :disabled="!canStartReplace()">
              开始替换
            </el-button>
          </el-tooltip>
        </div>
      </template>
    </el-dialog>

    <!-- 批量替换进度对话框 -->
    <el-dialog
      v-model="progressDialogVisible"
      :title="getProgressDialogTitle()"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="['success', 'partial', 'failed'].includes(progressData.status)"
      @close="closeProgressDialog"
      class="google-dialog progress-dialog"
    >
      <div class="progress-content">
        <!-- 域名信息 -->
        <div class="progress-info">
          <div class="info-item">
            <span class="label">被替换域名：</span>
            <span class="value danger">{{ progressData.dangerousDomain }}</span>
          </div>
          <div class="info-item">
            <span class="label">替换域名：</span>
            <span class="value success">{{ progressData.replacementDomain }}</span>
          </div>
          <div class="info-item">
            <span class="label">影响数量：</span>
            <span class="value">{{ progressData.affectedCount }} 条</span>
          </div>
        </div>

        <!-- 进度条 -->
        <div v-if="['queued', 'processing', 'retrying', 'syncing', 'checking'].includes(progressData.status)" class="progress-bar-wrapper">
          <el-progress
            :percentage="progressData.percent"
            :status="getProgressStatus()"
            :stroke-width="20"
          />
          <div class="progress-text">
            {{ progressData.message }}
          </div>
        </div>

        <!-- 完成状态 -->
        <div v-else class="progress-result">
          <div class="result-icon" :class="progressData.status">
            <el-icon v-if="progressData.status === 'success'"><CircleCheck /></el-icon>
            <el-icon v-else-if="progressData.status === 'partial'"><Warning /></el-icon>
            <el-icon v-else><CircleClose /></el-icon>
          </div>
          <div class="result-message">{{ progressData.message }}</div>

          <!-- 统计信息 -->
          <div class="result-stats">
            <div class="stat-item success">
              <span class="stat-value">{{ progressData.successCount }}</span>
              <span class="stat-label">成功</span>
            </div>
            <div class="stat-item failed">
              <span class="stat-value">{{ progressData.failedCount }}</span>
              <span class="stat-label">失败</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer v-if="['success', 'partial', 'failed'].includes(progressData.status)">
        <el-button @click="closeProgressDialog" size="large" class="google-btn">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning, Edit, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { getReplacementList, getReplacementDetail } from '@/services/main/timer/clickflare'
import { batchReplaceLanderUrl, previewBatchReplace, getBatchReplaceProgress } from '@/services/main/webpage/landers'
import { createOperationLog } from '@/services/main/system/operation-log'
import useLoginStore from '@/stores/login/login'


const loginStore = useLoginStore()
const userPermissions = computed(() => loginStore.permissions || [])
const hasBatchReplacePermission = computed(() => userPermissions.value.includes('system:webpage:batch'))


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


// ============ 批量修改 Lander URL（与落地页列表功能一致） ============

const batchReplaceDialogVisible = ref(false)
const batchReplaceLoading = ref(false)
const batchPreviewLoading = ref(false)
const batchPreviewCount = ref(0)
const batchPreviewSearched = ref(false)
const batchReplaceFormRef = ref(null)
const batchPreviewList = ref([])
// 标记当前预览窗口会话是否已同步过 Clickflare 数据
// 仅在打开窗口后首次点击「预览影响范围」时触发同步，避免每次重新搜索都重复同步
const batchPreviewSynced = ref(false)

const batchReplaceForm = reactive({
  domain: '',
  replacementDomain: '',
  landerType: 'private' // all, public, private
})

const batchReplaceRules = {
  domain: [{ required: true, message: '请输入要替换的域名', trigger: 'blur' }],
  replacementDomain: [{ required: true, message: '请输入替换后的域名', trigger: 'blur' }]
}


const progressDialogVisible = ref(false)
const progressData = reactive({
  recordId: null,
  dangerousDomain: '',
  replacementDomain: '',
  affectedCount: 0,
  current: 0,
  total: 0,
  percent: 0,
  status: 'processing', // processing, retrying, success, partial, failed
  step: 'processing', // processing, retrying, syncing, completed
  message: '',
  successCount: 0,
  failedCount: 0,
  needSync: false
})
let progressTimer = null


const openBatchReplaceDialog = () => {
  batchReplaceDialogVisible.value = true
  batchPreviewCount.value = 0
  batchPreviewSearched.value = false
  batchPreviewList.value = []
  batchPreviewSynced.value = false  // 重置同步标志：新窗口会话的首次预览会触发同步
  batchReplaceForm.domain = ''
  batchReplaceForm.replacementDomain = ''
  batchReplaceForm.landerType = 'private'
  batchReplaceFormRef.value?.clearValidate()
}

const canStartReplace = () => {
  return batchPreviewSearched.value && batchPreviewCount.value > 0 && !batchReplaceLoading.value
}


const getBatchReplaceTooltip = () => {
  if (!batchPreviewSearched.value) {
    return '请先点击「预览影响范围」'
  }
  if (batchPreviewCount.value === 0) {
    return '未找到可替换的 Lander'
  }
  return ''
}


const getProgressDialogTitle = () => {
  if (progressData.step === 'retrying') return '正在重试...'
  if (progressData.step === 'queued') return '队列中...'
  if (progressData.step === 'syncing') return '正在同步...'
  if (progressData.step === 'checking') return '正在二次检查...'
  return '批量替换进度'
}


const getProgressStatus = () => {
  if (progressData.step === 'retrying') return 'warning'
  if (progressData.step === 'queued') return 'info'
  if (progressData.step === 'syncing') return undefined
  if (progressData.step === 'checking') return undefined
  return undefined
}


watch(() => batchReplaceForm.landerType, () => {

  batchPreviewSearched.value = false
  batchPreviewCount.value = -1 // 使用 -1 表示需要重新预览
  batchPreviewList.value = []
})


const cleanDomain = (domain) => {
  if (!domain) return ''
  let cleaned = domain.trim()

  cleaned = cleaned.replace(/^https?:\/\//i, '')

  const slashIndex = cleaned.indexOf('/')
  if (slashIndex !== -1) {
    cleaned = cleaned.substring(0, slashIndex)
  }
  return cleaned
}


const handlePreviewBatchReplace = async () => {

  const valid = await batchReplaceFormRef.value?.validate().catch(() => false)
  if (!valid) return

  // 仅在窗口会话首次预览时触发同步（force_sync=true）
  // 同步失败后端会返回 code !== 0，synced 不会被置 true，用户再次点击可继续重试
  const forceSync = !batchPreviewSynced.value

  batchPreviewLoading.value = true
  try {
    const res = await previewBatchReplace(
      cleanDomain(batchReplaceForm.domain),
      cleanDomain(batchReplaceForm.replacementDomain),
      batchReplaceForm.landerType,
      undefined,
      undefined,
      forceSync
    )
    if (res.code === 0) {
      batchPreviewSynced.value = true  // 标记本次窗口会话已同步，后续点击不再同步
      batchPreviewCount.value = res.data.total || 0
      batchPreviewList.value = res.data.list || []
      batchPreviewSearched.value = true
    } else {
      ElMessage.error(res.message || '查询失败')
    }
  } catch (error) {
    ElMessage.error('查询失败')
  } finally {
    batchPreviewLoading.value = false
  }
}


const handleBatchReplace = async () => {

  const valid = await batchReplaceFormRef.value?.validate().catch(() => false)
  if (!valid) return


  if (!batchPreviewSearched.value) {
    ElMessage.warning('请先点击"预览影响范围"查看受影响的 Lander 数量')
    return
  }

  if (batchPreviewCount.value === 0) {
    ElMessage.warning('没有找到包含该域名的 Lander')
    return
  }

  batchReplaceLoading.value = true
  try {
    const res = await batchReplaceLanderUrl(
      cleanDomain(batchReplaceForm.domain),
      cleanDomain(batchReplaceForm.replacementDomain),
      batchReplaceForm.landerType
    )
    if (res.code === 0) {
      const { recordId, affectedCount } = res.data
      const typeText = batchReplaceForm.landerType === 'public' ? 'Public' : batchReplaceForm.landerType === 'private' ? 'Private' : ''


      progressData.recordId = recordId
      progressData.dangerousDomain = batchReplaceForm.domain
      progressData.replacementDomain = batchReplaceForm.replacementDomain
      progressData.affectedCount = affectedCount
      progressData.current = 0
      progressData.total = affectedCount
      progressData.percent = 0
      progressData.status = 'processing'
      progressData.step = 'processing'
      progressData.message = '正在启动任务...'
      progressData.successCount = 0
      progressData.failedCount = 0
      progressData.needSync = false


      batchReplaceDialogVisible.value = false
      progressDialogVisible.value = true


      startProgressPolling()
    } else {
      ElMessage.error(res.message || '批量替换任务启动失败')
    }
  } catch (error) {
    ElMessage.error('批量替换任务启动失败')
  } finally {
    batchReplaceLoading.value = false
  }
}


const startProgressPolling = () => {

  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }


  fetchProgress()


  progressTimer = setInterval(() => {
    fetchProgress()
  }, 1000)
}


const fetchProgress = async () => {
  try {
    const res = await getBatchReplaceProgress(progressData.recordId)
    if (res.code === 0) {
      const data = res.data


      progressData.status = data.status
      progressData.successCount = data.success_count || 0
      progressData.failedCount = data.failed_count || 0
      progressData.needSync = data.need_sync || false


      if (data.progress) {
        progressData.step = data.progress.step
        progressData.current = data.progress.current
        progressData.total = data.progress.total
        progressData.percent = data.progress.percent
        progressData.message = data.progress.message
      }


      const isFinished = ['success', 'partial', 'failed'].includes(data.status)

      if (isFinished) {

        if (progressTimer) {
          clearInterval(progressTimer)
          progressTimer = null
        }


        const typeText = batchReplaceForm.landerType === 'public' ? 'Public' : batchReplaceForm.landerType === 'private' ? 'Private' : ''
        const statusText = {
          'success': '成功',
          'partial': '部分成功',
          'failed': '失败'
        }[data.status] || ''

        progressData.message = `处理完成：成功 ${progressData.successCount} 条，失败 ${progressData.failedCount} 条`


        createOperationLog({
          module: 'lander',
          operation: 'batch_replace_url',
          description: `批量替换 URL 域名：${progressData.dangerousDomain} → ${progressData.replacementDomain} (${typeText || '全部'}) - ${statusText}`,
          details: {
            from_domain: progressData.dangerousDomain,
            to_domain: progressData.replacementDomain,
            workspace_type: batchReplaceForm.landerType,
            affectedCount: progressData.affectedCount,
            successCount: progressData.successCount,
            failedCount: progressData.failedCount
          }
        }).catch(err => console.error('记录日志失败:', err))


        if (progressData.needSync) {
          progressData.message = '正在同步数据...'

          setTimeout(() => {
            // 同步完成后刷新替换记录列表，使新记录展示出来
            fetchData()
            progressData.message = `处理完成：成功 ${progressData.successCount} 条，失败 ${progressData.failedCount} 条`
          }, 2000)
        } else {
          // 刷新替换记录列表，使新记录展示出来
          fetchData()
        }
      }
    }
  } catch (error) {
    console.error('查询进度失败:', error)
  }
}


const closeProgressDialog = () => {
  progressDialogVisible.value = false

  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}


onBeforeUnmount(() => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
})


onMounted(() => {
  fetchData()
})
</script>

<style lang="less" scoped>
.clickflare-container {
  padding: 16px;
  background: #f8f9fa;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', 'Google Sans', 'Helvetica Neue', Arial, 'Microsoft YaHei', sans-serif;

  .content-card {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3),
      0 1px 3px 1px rgba(60, 64, 67, 0.15);
    overflow: hidden;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e8eaed;
    gap: 16px;
    flex-shrink: 0;

    .header-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .page-title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
      margin: 0;
      line-height: 24px;
    }

    .page-subtitle {
      font-size: 12px;
      color: #5f6368;
      line-height: 16px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
  }

  .table-container {
    padding: 0;
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
        color: #5f6368;
        font-weight: 500;
        font-size: 13px;
        border-bottom: 1px solid #e8eaed;
        padding: 0 16px;
        height: 48px;
      }

      tbody tr {
        height: 48px;

        &:hover > td {
          background: #f1f3f4 !important;
        }

        td {
          border-bottom: 1px solid #e8eaed;
          color: #202124;
          font-size: 13px;
          padding: 0 16px;
          vertical-align: middle;
        }

        &:last-child td {
          border-bottom: none;
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


:deep(.google-dialog) {
  .el-dialog__header {
    padding: 20px 24px 16px;
    margin: 0;
    border-bottom: 1px solid #e8eaed;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
      line-height: 24px;
    }

    .el-dialog__headerbtn {
      top: 20px;
      right: 20px;
      width: 32px;
      height: 32px;

      .el-dialog__close {
        color: #5f6368;
        font-size: 20px;

        &:hover {
          color: #202124;
        }
      }
    }
  }

  .el-dialog__body {
    padding: 20px 24px;
  }
}


.google-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;

    .el-form-item__label {
      font-size: 13px;
      color: #5f6368;
      font-weight: 500;
      padding-right: 16px;
    }

    .el-form-item__error {
      font-size: 12px;
      color: #c5221f;
      padding-top: 4px;
    }
  }

  :deep(.el-input) {
    .el-input__wrapper {
      border-radius: 4px;
      border: 1px solid #dadce0;
      box-shadow: none;
      background: #fff;
      padding: 8px 12px;
      transition: border-color 0.2s;

      &:hover {
        border-color: #1a73e8;
      }

      &.is-focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
      }

      .el-input__inner {
        font-size: 14px;
        color: #202124;
        &::placeholder {
          color: #9aa0a6;
        }
      }

      .el-input__clear {
        color: #9aa0a6;
        &:hover {
          color: #5f6368;
        }
      }
    }
  }
}


.google-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0;
}


.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 80px;
  height: 36px;
  padding: 0 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  transition: all 0.2s;

  .btn-icon {
    font-size: 16px;
  }

  &.google-btn-secondary {
    background: #fff;
    color: #5f6368;
    border: 1px solid #dadce0;

    &:hover {
      background: #f8f9fa;
      border-color: #dadce0;
      color: #202124;
    }
  }

  &.google-btn-primary {
    background: #1a73e8;
    color: #fff;

    &:hover {
      background: #1557b0;
    }

    &:disabled {
      background: #a8c7fa;
      cursor: not-allowed;
    }
  }
}


.preview-alert {
  margin-top: 12px;
}


.batch-preview-table-wrapper {
  margin-top: 16px;
  border-top: 1px solid #e8eaed;
  padding-top: 16px;

  .batch-preview-table {
    :deep(th) {
      background: #f8f9fa;
      color: #3c4043;
      font-weight: 500;
      font-size: 12px;
      padding: 8px 12px;
    }

    :deep(td) {
      padding: 8px 12px;
      font-size: 12px;
    }

    .preview-lander-name {
      color: #202124;
      font-weight: 500;
    }

    .preview-url-old {
      color: #c5221f;
      word-break: break-all;
      font-size: 12px;
    }

    .preview-url-new {
      color: #137333;
      word-break: break-all;
      font-size: 12px;
    }
  }
}


.progress-dialog {
  .progress-content {
    padding: 20px 0;

    .progress-info {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;

      .info-item {
        display: flex;
        align-items: center;
        font-size: 14px;

        .label {
          color: #5f6368;
          margin-right: 8px;
        }

        .value {
          color: #202124;
          font-weight: 500;

          &.danger {
            color: #c5221f;
          }

          &.success {
            color: #137333;
          }
        }
      }
    }

    .progress-bar-wrapper {
      padding: 0 20px;

      .progress-text {
        text-align: center;
        margin-top: 16px;
        color: #5f6368;
        font-size: 14px;
      }
    }

    .progress-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;

      .result-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;

        .el-icon {
          font-size: 32px;
        }

        &.success {
          background: #e6f4ea;
          color: #137333;
        }

        &.partial {
          background: #fef7e0;
          color: #b06000;
        }

        &.failed {
          background: #fce8e6;
          color: #c5221f;
        }
      }

      .result-message {
        font-size: 16px;
        color: #202124;
        margin-bottom: 24px;
        text-align: center;
      }

      .result-stats {
        display: flex;
        gap: 32px;

        .stat-item {
          text-align: center;

          .stat-value {
            display: block;
            font-size: 28px;
            font-weight: 500;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 12px;
            color: #5f6368;
          }

          &.success .stat-value {
            color: #137333;
          }

          &.failed .stat-value {
            color: #c5221f;
          }
        }
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
