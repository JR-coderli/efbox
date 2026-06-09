<template>
  <el-dialog
    v-model="dialogVisible"
    title=""
    width="450px"
    class="crawler-simple-dialog"
    @close="handleClose"
  >
    <!-- 标题 -->
    <div class="dialog-header">
      <span class="dialog-title">下载落地页</span>
      <span class="dialog-subtitle">将落地页下载为本地静态文件</span>
    </div>

    <!-- 只读 URL 显示 -->
    <div class="url-display">
      <label class="url-label">目标网址</label>
      <div class="url-value">{{ targetUrl }}</div>
    </div>

    <!-- 任务状态 -->
    <div v-if="currentTask" class="task-status">
      <!-- 状态指示器 -->
      <div class="status-indicator">
        <div class="status-icon" :class="statusClass">
          <el-icon v-if="currentTask.status === 'completed'"><CircleCheck /></el-icon>
          <el-icon v-else-if="currentTask.status === 'failed'"><CircleClose /></el-icon>
          <el-icon v-else-if="currentTask.status === 'running'"><Loading /></el-icon>
          <el-icon v-else><Clock /></el-icon>
        </div>
        <div class="status-text">
          <div class="status-label">{{ statusLabel }}</div>
          <div v-if="currentTask.status === 'running'" class="status-progress">
            正在处理... {{ currentTask.progress }}%
            <span class="elapsed-time">{{ elapsedTime }}</span>
          </div>
          <div v-else-if="currentTask.status === 'completed'" class="status-success">
            成功下载 {{ currentTask.file_count || 0 }} 个文件
            <span class="elapsed-time">耗时 {{ finalElapsedTime }}</span>
          </div>
          <div v-else-if="currentTask.status === 'failed'" class="status-error">
            {{ currentTask.error_message || '下载失败' }}
          </div>
        </div>
      </div>

      <!-- 进度条 -->
      <div v-if="currentTask.status === 'running'" class="progress-bar">
        <div class="progress-fill" :style="{ width: currentTask.progress + '%' }"></div>
      </div>

      <!-- 完成后的操作按钮 -->
      <div v-if="currentTask.status === 'completed'" class="task-actions">
        <el-button class="action-btn preview-btn" @click="handlePreview">
          <el-icon><View /></el-icon>
          <span style="margin-left: 5px;">预览页面</span>
        </el-button>
        <el-button class="action-btn download-btn" @click="handleDownload">
          <el-icon><Download /></el-icon>
          <span style="margin-left: 5px;">下载 ZIP</span>
        </el-button>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <el-button
        class="confirm-btn"
        type="primary"
        @click="handleStart"
        :loading="isStarting"
        :disabled="isTaskRunning"
      >
        {{ isTaskRunning ? '下载中...' : '开始下载' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { throttle } from 'lodash'
import { View, Download, CircleCheck, CircleClose, Loading, Clock } from '@element-plus/icons-vue'
import { createCrawlerTask, getCrawlerTaskStatus } from '@/services/main/webpage/crawler'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN } from '@/global/constants'
import { BASE_URL } from '@/services/request/config'


const CRAWLER_TASK_KEY = 'crawler_simple_task'

const props = defineProps({
  visible: Boolean,
  landingPage: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:visible', 'success', 'taskUpdate'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})


const targetUrl = computed(() => props.landingPage?.landing_url || '')

const currentTask = ref(null)
const isStarting = ref(false)
const pollingTimer = ref(null)
const isTaskRunning = ref(false)


const startTime = ref(0)
const elapsedTime = ref('00:00')
const finalElapsedTime = ref('')
const timerInterval = ref(null)


const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}


const startTimer = () => {
  startTime.value = Date.now()
  elapsedTime.value = '00:00'

  timerInterval.value = setInterval(() => {
    const elapsed = Date.now() - startTime.value
    elapsedTime.value = formatTime(elapsed)
  }, 1000)
}


const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null

    const elapsed = Date.now() - startTime.value
    finalElapsedTime.value = formatTime(elapsed)
  }
}


const saveTaskToStorage = (task) => {
  if (task && (task.status === 'pending' || task.status === 'running')) {
    localStorage.setItem(CRAWLER_TASK_KEY, JSON.stringify({
      taskId: task.task_id || task.id,
      taskFolder: task.task_folder,
      sourceUrl: task.source_url,
      landingPageId: props.landingPage?.id
    }))
  } else {
    localStorage.removeItem(CRAWLER_TASK_KEY)
  }
}


const restoreTaskFromStorage = async () => {
  const savedTask = localStorage.getItem(CRAWLER_TASK_KEY)
  if (savedTask) {
    try {
      const { taskId, landingPageId } = JSON.parse(savedTask)

      if (landingPageId === props.landingPage?.id) {
        const res = await getCrawlerTaskStatus(taskId)
        if (res.code === 0 && res.data) {
          currentTask.value = res.data
          if (res.data.status === 'running' || res.data.status === 'pending') {
            console.log('[CrawlerSimpleDialog] 恢复运行中的任务:', taskId)
            startPolling(taskId)
            isTaskRunning.value = true
          } else {

            localStorage.removeItem(CRAWLER_TASK_KEY)
            isTaskRunning.value = false
            console.log('[CrawlerSimpleDialog] 恢复的任务已结束，已清理 localStorage')
          }
        } else {
          localStorage.removeItem(CRAWLER_TASK_KEY)
          isTaskRunning.value = false
        }
      } else {
        localStorage.removeItem(CRAWLER_TASK_KEY)
        isTaskRunning.value = false
      }
    } catch (e) {
      localStorage.removeItem(CRAWLER_TASK_KEY)
      isTaskRunning.value = false
    }
  } else {

    isTaskRunning.value = false
  }
}


const statusClass = computed(() => {
  const status = currentTask.value?.status
  return {
    'status-pending': status === 'pending',
    'status-running': status === 'running',
    'status-completed': status === 'completed',
    'status-failed': status === 'failed'
  }
})


const statusLabel = computed(() => {
  const status = currentTask.value?.status
  const labels = {
    pending: '等待中',
    running: '正在下载',
    completed: '下载完成',
    failed: '下载失败'
  }
  return labels[status] || '未知状态'
})


watch(() => props.visible, async (val) => {
  if (val) {

    const savedTask = localStorage.getItem(CRAWLER_TASK_KEY)
    if (savedTask) {
      try {
        const { taskId, landingPageId, sourceUrl } = JSON.parse(savedTask)

        if (landingPageId !== props.landingPage?.id) {

          try {
            const res = await getCrawlerTaskStatus(taskId)
            if (res.code === 0 && res.data && (res.data.status === 'running' || res.data.status === 'pending')) {

              emit('update:visible', false)
              ElMessage.warning('已有落地页正在下载中，请等待完成后再试')
              console.log('[CrawlerSimpleDialog] 其他落地页任务正在运行，拒绝打开')
              return
            }
          } catch (e) {

          }
        }
      } catch (e) {

      }
    }

    await restoreTaskFromStorage()
  } else {


    currentTask.value = null
    console.log('[CrawlerSimpleDialog] 对话框隐藏，轮询继续运行直到任务完成')
  }
})


watch(currentTask, (newTask) => {
  if (newTask) {
    saveTaskToStorage(newTask)
    emit('taskUpdate', newTask)
  }
}, { deep: true })


const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
    console.log('[CrawlerSimpleDialog] 轮询已停止')
  }
}


const startPolling = (taskId) => {
  stopPolling()
  console.log('[CrawlerSimpleDialog] 开始轮询任务:', taskId)

  pollingTimer.value = setInterval(async () => {
    try {
      const res = await getCrawlerTaskStatus(taskId)
      if (res.code === 0) {
        currentTask.value = res.data
        emit('taskUpdate', res.data)

        if (res.data.status === 'completed' || res.data.status === 'failed') {
          stopPolling()
          localStorage.removeItem(CRAWLER_TASK_KEY)
          console.log('[CrawlerSimpleDialog] 任务结束，已清理 localStorage')

          isTaskRunning.value = false
          stopTimer()

          window.dispatchEvent(new CustomEvent('crawler-task-update'))

          if (res.data.status === 'completed') {
            ElMessage.success('下载完成！')
            emit('success')
          } else {
            ElMessage.error('下载失败：' + res.data.error_message)
          }
        }
      }
    } catch (error) {
      console.error('[CrawlerSimpleDialog] 轮询错误，停止轮询:', error)
      stopPolling()
      isTaskRunning.value = false
    }
  }, 2000)
}


const handleStart = throttle(async () => {
  if (isTaskRunning.value) {
    ElMessage.warning('任务正在进行中，请稍候...')
    return
  }

  if (!targetUrl.value) {
    ElMessage.warning('落地页 URL 不存在')
    return
  }

  isTaskRunning.value = true
  isStarting.value = true

  try {
    let userId = null
    const token = localCache.getCache(LOGIN_TOKEN)
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.id
      } catch (e) {
        console.error('Token 解析失败:', e)
      }
    }

    const res = await createCrawlerTask({
      source_url: targetUrl.value,
      landingpage_id: props.landingPage?.id || null,
      created_by: userId
    })

    console.log('[CrawlerSimpleDialog] 创建爬虫任务响应:', res)

    if (res.code === 0) {
      currentTask.value = res.data
      saveTaskToStorage(res.data)
      startTimer()
      ElMessage.success('任务创建成功，开始下载...')
      emit('success')
      window.dispatchEvent(new CustomEvent('crawler-task-created'))
      window.dispatchEvent(new CustomEvent('crawler-task-update'))
      startPolling(res.data.task_id)
    } else {
      ElMessage.error(res.message || '创建任务失败')
      isTaskRunning.value = false
    }
  } catch (error) {
    console.error('[CrawlerSimpleDialog] 创建任务错误:', error)
    const errorMsg = error.message || error || '创建任务失败，请检查网络连接'
    ElMessage.error(typeof errorMsg === 'string' ? errorMsg : '创建任务失败')
    isTaskRunning.value = false
  } finally {
    isStarting.value = false
  }
}, 5000, { leading: true, trailing: false })


const handlePreview = () => {
  if (currentTask.value?.task_folder) {

    const previewUrl = `${BASE_URL}/crawler/preview/${currentTask.value.task_folder}/index.html`
    window.open(previewUrl, '_blank')
  } else {
    ElMessage.warning('暂无预览地址')
  }
}


const handleDownload = () => {
  if (currentTask.value?.task_folder) {


    const downloadUrl = `${BASE_URL}/crawler/download/${currentTask.value.task_folder}`

    const token = localCache.getCache(LOGIN_TOKEN)
    const urlWithToken = token ? `${downloadUrl}?token=${token}` : downloadUrl

    const link = document.createElement('a')
    link.href = urlWithToken
    link.download = `${currentTask.value.task_folder}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('开始下载...')
  } else {
    ElMessage.warning('暂无下载地址')
  }
}


const handleClose = () => {
  dialogVisible.value = false


  console.log('[CrawlerSimpleDialog] 对话框关闭，轮询继续运行直到任务完成')
}







onUnmounted(() => {
  stopPolling()
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  console.log('[CrawlerSimpleDialog] 组件卸载，已清理所有定时器')
})


defineExpose({
  getCurrentTask: () => currentTask.value,
  restoreTask: restoreTaskFromStorage
})
</script>

<style lang="less" scoped>
.crawler-simple-dialog {
  :deep(.el-dialog__header) {
    display: none;
  }

  :deep(.el-dialog__body) {
    padding: 24px;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px;
    border-top: 1px solid #e8eaed;
  }

  .dialog-header {
    margin-bottom: 20px;

    .dialog-title {
      display: block;
      font-size: 20px;
      font-weight: 400;
      color: #202124;
      margin-bottom: 8px;
    }

    .dialog-subtitle {
      display: block;
      font-size: 14px;
      color: #5f6368;
    }
  }

  .url-display {
    margin-bottom: 20px;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;

    .url-label {
      display: block;
      font-size: 12px;
      color: #5f6368;
      margin-bottom: 6px;
      font-weight: 500;
    }

    .url-value {
      font-size: 13px;
      color: #202124;
      word-break: break-all;
      font-family: 'Courier New', monospace;
    }
  }

  .task-status {
    margin-top: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 16px;

      .status-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;

        &.status-pending {
          background: #e8f0fe;
          color: #1a73e8;
        }

        &.status-running {
          background: #1a73e8;
          color: #fff;

          .el-icon {
            animation: spin 1s linear infinite;
          }
        }

        &.status-completed {

          color: #137333;
        }

        &.status-failed {
          background: #fce8e6;
          color: #c5221f;
        }
      }

      .status-text {
        flex: 1;

        .status-label {
          font-size: 16px;
          font-weight: 500;
          color: #202124;
          margin-bottom: 4px;
        }

        .status-progress {
          font-size: 14px;
          color: #5f6368;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-success {
          justify-content: space-between;
          font-size: 14px;
          color: #137333;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .elapsed-time {
          font-size: 13px;
          color: #5f6368;
          font-weight: 400;
          font-family: 'Roboto Mono', 'Consolas', monospace;
          display: inline-flex;
          align-items: center;
          gap: 4px;

          &::before {
            content: '';
            width: 14px;
            height: 14px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235f6368'%3E%3Cpath d='M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/%3E%3C/svg%3E") no-repeat center;
            background-size: contain;
          }
        }

        .status-error {
          font-size: 14px;
          color: #c5221f;
        }
      }
    }

    .progress-bar {
      height: 4px;
      background: #e8eaed;
      border-radius: 2px;
      margin-top: 16px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: #1a73e8;
        border-radius: 2px;
        transition: width 0.3s ease;
      }
    }

    .task-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;

      .action-btn {
        flex: 1;
        height: 40px;
        border-radius: 20px;
        font-weight: 500;

        &.preview-btn {
          background: #fff;
          border: 1px solid #dadce0;
          color: #3c4043;

          &:hover {
            background: #f1f3f4;
            border-color: #dadce0;
          }
        }

        &.download-btn {
          background: #1a73e8;
          border: none;
          color: #fff;

          &:hover {
            background: #1557b0;
          }
        }
      }
    }
  }

  .confirm-btn {
    border: none;
    border-radius: 20px;
    padding: 10px 24px;
    font-weight: 500;

    &:hover:not(:disabled) {
      background: #1557b0;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
