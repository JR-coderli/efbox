<template>
  <div class="header-info">
    <!-- 1、操作的小图标 -->
    <div class="operation">
      <!-- 爬虫任务通知 -->
      <el-dropdown trigger="click" @command="handleTaskCommand" :hide-on-click="false" @visible-change="handlePanelVisibleChange">
        <span class="bell-icon" @click="handleBellClick">
          <span v-if="runningTaskCount > 0" class="badge">{{ runningTaskCount > 99 ? '99+' : runningTaskCount }}</span>
          <el-icon><Bell /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="task-dropdown">
            <div class="task-dropdown-header">
              <span>爬虫任务</span>
              <div class="header-tabs">
                <span
                  :class="{ active: taskTab === 'running' }"
                  @click="taskTab = 'running'"
                >运行中 ({{ runningTaskCount }})</span>
                <span
                  :class="{ active: taskTab === 'completed' }"
                  @click="taskTab = 'completed'"
                >最近完成 ({{ completedTaskCount }})</span>
              </div>
            </div>
            <el-scrollbar max-height="350px">
              <div v-if="taskTab === 'running'">
                <div v-if="runningTasks.length === 0" class="no-tasks">
                  <el-icon><Loading /></el-icon>
                  <span>暂无运行中的任务</span>
                </div>
                <div v-else class="task-list">
                  <div
                    v-for="task in runningTasks"
                    :key="task.id"
                    class="task-item"
                  >
                    <div class="task-info">
                      <div class="task-url">{{ getShortUrl(task.source_url) }}</div>
                      <div class="task-progress">
                        <div class="progress-bar">
                          <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
                        </div>
                        <span class="progress-text">{{ task.progress }}%</span>
                      </div>
                    </div>
                    <el-icon class="loading-icon"><Loading /></el-icon>
                  </div>
                </div>
              </div>
              <div v-else>
                <div v-if="completedTasks.length === 0" class="no-tasks">
                  <el-icon><Document /></el-icon>
                  <span>暂无已完成的任务</span>
                </div>
                <div v-else class="task-list completed-list">
                  <div
                    v-for="task in completedTasks"
                    :key="task.id"
                    class="task-item completed-item"
                  >
                    <div class="task-info">
                      <div class="task-url">{{ getShortUrl(task.source_url) }}</div>
                      <div class="task-meta">
                        <span>{{ task.file_count || 0 }} 个文件</span>
                        <span>{{ formatTime(task.createAt) }}</span>
                      </div>
                    </div>
                    <div class="task-actions">
                      <el-button link type="primary" @click="handlePreview(task)">
                        <el-icon><View /></el-icon>
                        预览
                      </el-button>
                      <el-button link type="primary" @click="handleDownload(task)">
                        <el-icon><Download /></el-icon>
                        下载
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </el-scrollbar>
            <div class="task-dropdown-footer">
              <span @click="handleRefreshTasks">
                <el-icon><Refresh /></el-icon>
                刷新
              </span>
            </div>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span @click="handlePositionClick">
        <el-icon><Position /></el-icon>
      </span>
    </div>

    <!-- 2、个人信息 -->
    <div class="info">
      <el-dropdown>
        <span class="user-info">
          <el-avatar
            :src="avatar_url"
            :alt="userName || 'User'"
            @error="handleAvatarError"
          >
            <el-icon><User /></el-icon>
          </el-avatar>
          <span class="name">{{ userName }}</span>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleExitClick">
              <el-icon><CircleClose /></el-icon>
              <span>退出系统</span>
            </el-dropdown-item>
            <el-dropdown-item divided @click="handleProfileClick">
              <el-icon><InfoFilled /></el-icon>
              <span>个人信息</span>
            </el-dropdown-item>
            <el-dropdown-item>
              <el-icon><Unlock /></el-icon>
              <span>修改密码</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 爬虫任务对话框（全局，用于显示任务详情） -->
    <CrawlerTaskDialog ref="crawlerDialogRef" @taskUpdate="handleTaskUpdate" @update:visible="handleDialogVisibleChange" />
  </div>
</template>

<script setup>
import useLoginStore from '@/stores/login/login'
import { localCache } from '@/utils/cache'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { throttle } from 'lodash'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { BASE_URL } from '@/services/request/config'
import { getCrawlerTaskList } from '@/services/main/webpage/crawler'
import { getDownloadUrl, getPreviewUrl } from '@/services/main/webpage/crawler'
import CrawlerTaskDialog from '@/views/main/webpage/landingpage/c-cpns/CrawlerDialog.vue'
import {
  Bell,
  Position,
  CircleClose,
  InfoFilled,
  Unlock,
  Loading,
  Document,
  View,
  Download,
  Refresh,
  Check,
  User
} from '@element-plus/icons-vue'


const runningTasks = ref([])
const completedTasks = ref([])
const runningTaskCount = computed(() => runningTasks.value.length)
const completedTaskCount = computed(() => completedTasks.value.length)
const taskTab = ref('running')
const crawlerDialogRef = ref(null)


const fetchRunningTasks = async () => {
  try {
    const res = await getCrawlerTaskList({ status: 'running', page: 1, size: 5, created_by: loginStore.userInfo?.id })
    if (res.code === 0) {
      runningTasks.value = res.data.list || []
    } else {
      console.error('fetchRunningTasks 失败:', res.message)
    }
  } catch (e) {
    console.error('fetchRunningTasks 错误:', e)
  }
}


const fetchCompletedTasks = async () => {
  try {
    const res = await getCrawlerTaskList({ status: 'completed', page: 1, size: 5, created_by: loginStore.userInfo?.id })
    if (res.code === 0) {
      completedTasks.value = res.data.list || []
    }
  } catch (e) {

  }
}


const handleRefreshTasks = throttle(() => {
  console.log('handleRefreshTasks 被调用')
  fetchRunningTasks()
  fetchCompletedTasks()
}, 2000, { leading: true, trailing: false })


const handleBellClick = () => {
  handleRefreshTasks()
}


let panelPollingTimer = null


const handlePanelVisibleChange = (visible) => {
  if (visible) {

    handleRefreshTasks()

    if (!panelPollingTimer) {
      panelPollingTimer = setInterval(() => {
        fetchRunningTasks()
        fetchCompletedTasks()
      }, 2500)
      console.log('[header-info] 面板轮询已启动')
    }
  } else {

    if (panelPollingTimer) {
      clearInterval(panelPollingTimer)
      panelPollingTimer = null
      console.log('[header-info] 面板轮询已停止')
    }
  }
}


const handleTaskUpdate = (task) => {
  console.log('任务更新:', task)

  fetchRunningTasks()
  fetchCompletedTasks()
}


const handleDialogVisibleChange = (visible) => {
  if (!visible) {

    console.log('对话框关闭，刷新任务列表')
    fetchRunningTasks()
    fetchCompletedTasks()
  }
}


const getShortUrl = (url) => {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    return urlObj.hostname + (urlObj.pathname.length > 1 ? urlObj.pathname : '')
  } catch {
    return url.length > 30 ? url.substring(0, 30) + '...' : url
  }
}


const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}


const handlePreview = (task) => {
  if (task.task_folder) {
    const url = getPreviewUrl(task.task_folder)
    window.open(url, '_blank')
  }
}


const handleDownload = (task) => {
  if (task.task_folder) {
    const url = getDownloadUrl(task.task_folder)
    const link = document.createElement('a')
    link.href = url
    link.download = `${task.task_folder}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('开始下载...')
  }
}


const handleTaskClick = (task) => {

  if (crawlerDialogRef.value) {
    crawlerDialogRef.value.currentTask = task
    if (task.status === 'running') {
      crawlerDialogRef.value.startPolling(task.id)
    }
  }
}


const handleTaskCommand = (command) => {
  console.log('Task command:', command)
}


const startTaskRefresh = () => {
  fetchRunningTasks()
  fetchCompletedTasks()
}


onMounted(() => {
  startTaskRefresh()

  window.addEventListener('crawler-task-created', handleRefreshTasks)
  window.addEventListener('crawler-task-update', handleRefreshTasks)
})


onUnmounted(() => {

  window.removeEventListener('crawler-task-created', handleRefreshTasks)
  window.removeEventListener('crawler-task-update', handleRefreshTasks)

  if (panelPollingTimer) {
    clearInterval(panelPollingTimer)
    panelPollingTimer = null
  }
})


const router = useRouter()
const isLoggingOut = ref(false)

const handleExitClick = throttle(() => {

  if (isLoggingOut.value) return
  isLoggingOut.value = true


  ElMessage({
    showClose: true,
    message: '退出成功',
    type: 'success',
    duration: 1000
  })


  localCache.removeCache('login/token')


  setTimeout(() => {

    router.push('/login').then(() => {

      localCache.removeCache('userInfo')
      localCache.removeCache('userMenus')
      loginStore.logoutAction()
      isLoggingOut.value = false
    }).catch(() => {

      isLoggingOut.value = false
    })
  }, 800)
}, 2000, { trailing: false }); // 每隔 2000ms 执行一次, 最后一次不执行



function handlePositionClick() {


}


function handleProfileClick() {
  router.push('/main/profile')
}


const loginStore = useLoginStore()
const userName = computed(() => loginStore.userInfo?.nickname || loginStore.userInfo?.name || '')


const DEFAULT_AVATAR = 'https://api.dicebear.com/9.x/avataaars/svg?seed='


const fallbackAvatar = ref('')


const handleAvatarError = () => {
  const nameSeed = loginStore.userInfo?.name || loginStore.userInfo?.nickname || 'User'
  fallbackAvatar.value = DEFAULT_AVATAR + nameSeed + Date.now()
}


const avatar_url = computed(() => {

  if (fallbackAvatar.value) {
    return fallbackAvatar.value
  }

  const url = loginStore.userInfo?.avatar_url || loginStore.userInfo?.cms_user_avatar || ''
  const nameSeed = loginStore.userInfo?.name || loginStore.userInfo?.nickname || 'User'


  if (!url) {
    return DEFAULT_AVATAR + nameSeed
  }


  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }


  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
})
</script>

<style lang="less" scoped>
.header-info {
  display: flex;
  align-items: center;
}

.operation {
  display: inline-flex;
  margin-right: 12px;
  gap: 8px;

  .bell-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s ease;
    color: #5f6368;

    &:hover {
      background: #f1f3f4;
    }

    .el-icon {
      font-size: 20px;
    }

    .badge {
      position: absolute;
      top: -2px;
      right: -2px;
      z-index: 10;
      width: 10px;
      height: 16px;
      padding: 0 5px;
      background: #ea4335;
      border: 2px solid #fff;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
  }

  span:not(.bell-icon) {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s ease;
    color: #5f6368;

    &:hover {
      background: #f1f3f4;
    }

    .el-icon {
      font-size: 20px;
    }
  }
}

.info {
  .user-info {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 20px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #f1f3f4;
    }

    .name {
      margin-left: 8px;
      font-size: 14px;
      color: #202124;
      font-weight: 500;
    }

    :deep(.el-avatar) {
      width: 32px;
      height: 32px;
    }
  }

  :deep(.el-tooltip__trigger:focus-visible) {
    outline: unset;
  }
}

.info {
  :deep(.el-dropdown-menu) {
    padding: 8px 0;
    border: 1px solid #e8eaed;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  :deep(.el-dropdown-menu__item) {
    padding: 8px 16px;
    min-height: 36px;
    line-height: 20px;
    font-size: 14px;
    color: #202124;

    &:hover {
      background-color: #f1f3f4;
    }

    .el-icon {
      margin-right: 12px;
      color: #5f6368;
    }
  }
}


@media (max-width: 768px) {
  .header-info {
    .operation {
      display: none; // 移动端隐藏操作图标，节省空间
    }

    .info {
      .user-info {
        padding: 4px;

        .name {
          display: none; // 移动端隐藏用户名，只显示头像
        }

        :deep(.el-avatar) {
          width: 32px;
          height: 32px;
        }
      }
    }
  }
}


@media (max-width: 480px) {
  .header-info {
    .operation {
      display: none;
    }
  }
}
</style>

<!-- 全局样式：下拉菜单通过 Teleport 挂载到 body，需要全局样式 -->
<style lang="less">
.task-dropdown.el-dropdown-menu {
  width: 360px;
  padding: 0;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  overflow: hidden;

  .task-dropdown-header {
    padding: 0;
    border-bottom: 1px solid #e8eaed;

    > span:first-child {
      display: block;
      padding: 12px 16px 8px;
      font-size: 14px;
      font-weight: 500;
      color: #202124;
    }

    .header-tabs {
      display: flex;
      padding: 0 16px 8px;
      gap: 5px;

      span {
        padding: 6px 12px;
        font-size: 13px;
        color: #5f6368;
        cursor: pointer;
        border-radius: 16px;
        transition: all 0.2s ease;

        &:hover {
          background: #f1f3f4;
        }

        &.active {
          background: #e8f0fe;
          color: #1a73e8;
          font-weight: 500;
        }
      }
    }
  }

  .no-tasks {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #5f6368;

    .el-icon {
      font-size: 40px;
      color: #5f6368;
      margin-bottom: 12px;
    }

    span {
      font-size: 14px;
    }
  }

  .task-list {
    padding: 8px 0;

    .task-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      transition: background-color 0.2s ease;

      &:hover {
        background: #f1f3f4;
      }

      .task-info {
        flex: 1;
        min-width: 0;

        .task-url {
          font-size: 13px;
          color: #202124;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 8px;
        }

        .task-progress {
          display: flex;
          align-items: center;
          gap: 8px;

          .progress-bar {
            flex: 1;
            height: 4px;
            background: #e8eaed;
            border-radius: 2px;
            overflow: hidden;

            .progress-fill {
              height: 100%;
              background: #1a73e8;
              border-radius: 2px;
              transition: width 0.3s ease;
            }
          }

          .progress-text {
            font-size: 12px;
            color: #5f6368;
            min-width: 35px;
            text-align: right;
          }
        }

        .task-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #5f6368;
        }
      }

      .loading-icon {
        font-size: 16px;
        color: #1a73e8;
        animation: task-spin 1s linear infinite;
      }

      .task-actions {
        display: flex;
        gap: 4px;

        .el-button {
          padding: 4px 8px;
          font-size: 12px;

          .el-icon {
            margin-right: 2px;
          }
        }
      }
    }

    .completed-item {
      .task-url {
        margin-bottom: 4px;
      }

      .task-meta {
        margin-bottom: 8px;
      }
    }
  }

  .task-dropdown-footer {
    padding: 8px 16px;
    border-top: 1px solid #e8eaed;
    text-align: center;

    span {
      font-size: 13px;
      color: #1a73e8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

@keyframes task-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
