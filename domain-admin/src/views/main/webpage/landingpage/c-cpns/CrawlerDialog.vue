<template>
  <el-dialog
    v-model="dialogVisible"
    title=""
    width="500px"
    class="crawler-dialog"
    @close="handleClose"
  >
    <!-- 标题 -->
    <div class="dialog-header">
      <span class="dialog-title">网页爬虫工具</span>
      <span class="dialog-subtitle">将网页下载为本地静态文件</span>
    </div>

    <!-- URL 输入 -->
    <div class="input-section">
      <label class="input-label">要爬取的网址</label>
      <el-input
        v-model="form.source_url"
        placeholder="https://example.com"
        size="large"
        clearable
      >
        <template #prefix>
          <el-icon><Link /></el-icon>
        </template>
      </el-input>
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
        :disabled="isTaskRunning || !form.source_url"
      >
        {{ isTaskRunning ? '任务进行中...' : '开始爬取' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { throttle } from 'lodash'
import { Link, View, Download, CircleCheck, CircleClose, Loading, Clock } from '@element-plus/icons-vue'
import { createCrawlerTask, getCrawlerTaskStatus, getCrawlerTaskList, getDownloadUrl } from '@/services/main/webpage/crawler'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN } from '@/global/constants'

const CRAWLER_TASK_KEY = 'crawler_current_task'

const props = defineProps({
  visible: Boolean,
  landingPage: Object
})

const emit = defineEmits(['update:visible', 'success', 'taskUpdate'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const form = ref({
  source_url: ''
})

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
      sourceUrl: task.source_url
    }))
  } else {
    localStorage.removeItem(CRAWLER_TASK_KEY)
  }
}


const restoreTaskFromStorage = async () => {
  const savedTask = localStorage.getItem(CRAWLER_TASK_KEY)
  if (savedTask) {
    try {
      const { taskId } = JSON.parse(savedTask)
      const res = await getCrawlerTaskStatus(taskId)
      if (res.code === 0 && res.data) {
        currentTask.value = res.data

        if (res.data.status === 'running' || res.data.status === 'pending') {
          console.log('[CrawlerDialog] 恢复运行中的任务:', taskId)
          startPolling(taskId)
          isTaskRunning.value = true
        } else {

          localStorage.removeItem(CRAWLER_TASK_KEY)
          isTaskRunning.value = false
          console.log('[CrawlerDialog] 恢复的任务已结束，已清理 localStorage')
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
    running: '正在爬取',
    completed: '爬取完成',
    failed: '爬取失败'
  }
  return labels[status] || '未知状态'
})


watch(() => props.visible, async (val) => {
  if (val) {

    if (props.landingPage?.landing_url) {
      form.value.source_url = props.landingPage.landing_url
    } else {

      form.value.source_url = ''
    }

    await restoreTaskFromStorage()
  } else {

    currentTask.value = null
    stopPolling()
    console.log('[CrawlerDialog] 对话框隐藏，已停止轮询')
  }
})


watch(currentTask, (newTask) => {
  if (newTask) {
    saveTaskToStorage(newTask)

    emit('taskUpdate', newTask)
  }
}, { deep: true })


const isValidUrl = (urlStr) => {
  return urlStr && (urlStr.startsWith('https://') || urlStr.startsWith('http://'))
}


const handleStart = throttle(async () => {

  if (isTaskRunning.value) {
    ElMessage.warning('任务正在进行中，请稍候...')
    return
  }

  if (!form.value.source_url) {
    ElMessage.warning('请输入要爬取的 URL')
    return
  }


  if (!isValidUrl(form.value.source_url)) {
    ElMessage.warning('请输入有效的 URL（如 https://example.com）')
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
      source_url: form.value.source_url,
      landingpage_id: props.landingPage?.id || null,
      created_by: userId
    })

    console.log('创建爬虫任务响应:', res)

    if (res.code === 0) {
      currentTask.value = res.data
      saveTaskToStorage(res.data)

      startTimer()
      ElMessage.success('任务创建成功，开始爬取...')
      emit('success')

      window.dispatchEvent(new CustomEvent('crawler-task-created'))
      window.dispatchEvent(new CustomEvent('crawler-task-update'))
      startPolling(res.data.task_id)
    } else {
      ElMessage.error(res.message || '创建任务失败')
      isTaskRunning.value = false
    }
  } catch (error) {
    console.error('创建任务错误:', error)
    const errorMsg = error.message || error || '创建任务失败，请检查网络连接'
    ElMessage.error(typeof errorMsg === 'string' ? errorMsg : '创建任务失败')
    isTaskRunning.value = false
  } finally {
    isStarting.value = false
  }
}, 5000, { leading: true, trailing: false })


const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
    console.log('[CrawlerDialog] 轮询已停止')
  }
}


const startPolling = (taskId) => {

  stopPolling()

  console.log('[CrawlerDialog] 开始轮询任务:', taskId)

  pollingTimer.value = setInterval(async () => {
    try {
      const res = await getCrawlerTaskStatus(taskId)
      if (res.code === 0) {
        currentTask.value = res.data
        emit('taskUpdate', res.data)

        if (res.data.status === 'completed' || res.data.status === 'failed') {
          stopPolling()
          localStorage.removeItem(CRAWLER_TASK_KEY)
          console.log('[CrawlerDialog] 任务结束，已清理 localStorage')


          isTaskRunning.value = false


          stopTimer()


          form.value.source_url = ''


          window.dispatchEvent(new CustomEvent('crawler-task-update'))

          if (res.data.status === 'completed') {
            ElMessage.success('爬取完成！')
          } else {
            ElMessage.error('爬取失败：' + res.data.error_message)
          }
        }
      }
    } catch (error) {

      console.error('[CrawlerDialog] 轮询错误，停止轮询:', error)
      stopPolling()
      isTaskRunning.value = false
    }
  }, 2000)
}


const handlePreview = () => {
  if (currentTask.value?.preview_url) {
    window.open(currentTask.value.preview_url, '_blank')
  } else {
    ElMessage.warning('暂无预览地址')
  }
}


const handleDownload = () => {
  if (currentTask.value?.task_folder) {

    const url = getDownloadUrl(currentTask.value.task_folder)
    const link = document.createElement('a')
    link.href = url
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

  stopPolling()
  console.log('[CrawlerDialog] 对话框关闭，已停止轮询')
}







onUnmounted(() => {
  stopPolling()
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  console.log('[CrawlerDialog] 组件卸载，已清理所有定时器')
})


defineExpose({
  getCurrentTask: () => currentTask.value,
  restoreTask: restoreTaskFromStorage
})
</script>

<style lang="less" scoped>
.crawler-dialog {
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
    margin-bottom: 24px;

    .dialog-title {
      display: block;
      font-size: 22px;
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

  .input-section {
    margin-bottom: 20px;

    .input-label {
      display: block;
      font-size: 14px;
      color: #5f6368;
      margin-bottom: 8px;
    }

    :deep(.el-input__wrapper) {
      border-radius: 8px;
      box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
      border: 1px solid transparent;

      &:hover {
        box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
      }

      &.is-focus {
        box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
      }
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
