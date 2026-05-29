<template>
  <div class="lp-projects-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2 class="page-title">LP项目管理</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索主题..."
          clearable
          class="search-input"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleUpload">
          <el-icon><Upload /></el-icon>
          上传项目
        </el-button>
        <el-button @click="loadProjects">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>

        <!-- 类型选择 -->
        <div class="type-selector">
          <button class="type-trigger" @click="showTypeMenu = !showTypeMenu">
            <!-- <svg class="type-icon" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="#5f6368"/>
            </svg> -->
            <img :src="fileImage" alt="">
            <span class="current-type">{{ currentTypeName }}</span>
            <svg class="dropdown-arrow" :class="{ rotate: showTypeMenu }" viewBox="0 0 24 24" fill="none">
              <path d="M7 10l5 5 5-5z" fill="#5f6368"/>
            </svg>
          </button>

          <!-- 弹出菜单 -->
          <div v-if="showTypeMenu" class="type-menu" @click.stop>
            <div class="menu-items">
              <div
                v-for="type in lpTypes"
                :key="type.key"
                class="menu-item"
                :class="{ active: selectedType === type.key }"
                @click="handleTypeChange(type.key)"
              >
                <span class="item-path">{{ type.path }}</span>
                <svg v-if="selectedType === type.key" class="check-icon" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- 点击外部关闭菜单 -->
          <div v-if="showTypeMenu" class="menu-overlay" @click="showTypeMenu = false"></div>
        </div>

        <!-- 视图切换按钮 -->
        <div class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="卡片视图"
          >
            <el-icon><Grid /></el-icon>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="列表视图"
          >
            <el-icon><List /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- 主题标签栏 -->
    <div class="theme-tabs-wrapper">
      <div class="theme-tabs">
        <div
          v-for="theme in filteredThemes"
          :key="theme.name"
          class="theme-tab"
          :class="{ active: activeTheme === theme.name }"
          @click="activeTheme = theme.name"
        >
          <span class="theme-name">{{ theme.name }}</span>
          <span class="theme-count">({{ theme.versions.length }})</span>
        </div>
        <div class="theme-tab add-theme" @click="handleCreateTheme">
          <el-icon><Plus /></el-icon>
          <span>新建主题</span>
        </div>
      </div>
    </div>

    <!-- 版本列表 -->
    <div class="versions-container">
      <div v-if="activeThemeData" class="versions-header">
        <h3 class="versions-title">
          {{ activeThemeData.name }}
          <span class="version-count">{{ activeThemeData.versions.length }} 个版本</span>
        </h3>
        <el-button size="small" type="primary" link @click="handleCreateVersion">
          <el-icon><Plus /></el-icon>
          新建版本
        </el-button>
      </div>

      <div v-if="activeThemeData" class="versions-list" :class="[`view-${viewMode}`]">
        <LpVersionCard
          v-for="version in activeThemeData.versions"
          :key="version.name"
          :type="selectedType"
          :theme="activeThemeData.name"
          :version="version"
          :view-mode="viewMode"
          @delete="handleDeleteVersion"
          @upload="handleUploadUpdate"
          @refresh="loadProjects"
        />
      </div>

      <div v-else class="empty-state">
        <el-icon class="empty-icon"><FolderOpened /></el-icon>
        <p>选择一个主题查看版本</p>
      </div>
    </div>

    <!-- 上传对话框 -->
    <LpUploadDialog
      v-model:visible="uploadDialogVisible"
      :types="lpTypes"
      :type="selectedType"
      :themes="projects"
      :theme="activeTheme"
      @success="handleUploadSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Refresh, Upload, Plus, FolderOpened, Grid, List
} from '@element-plus/icons-vue'
import {
  getLpTypes,
  getLpProjectsList,
  createLpTheme,
  createLpVersion,
  deleteLpVersion
} from '@/services/main/webpage/lp-projects'
import LpUploadDialog from './c-cpns/LpUploadDialog.vue'
import LpVersionCard from './c-cpns/LpVersionCard.vue'
import fileImage from "@/assets/img/sub_1.png"


const STORAGE_KEY = 'lp_projects_last_selection'


const saveSelection = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    type: selectedType.value,
    theme: activeTheme.value,
    viewMode: viewMode.value
  }))
}


const getLastSelection = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}


const lpTypes = ref([])
const selectedType = ref('s2-1')
const projects = ref([])
const searchKeyword = ref('')
const activeTheme = ref('')
const uploadDialogVisible = ref(false)
const loading = ref(false)
const viewMode = ref('grid') // 'grid' 或 'list'
const showTypeMenu = ref(false)


const currentTypeName = computed(() => {
  const type = lpTypes.value.find(t => t.key === selectedType.value)
  return type ? type.name : '选择类型'
})


const filteredThemes = computed(() => {
  if (!searchKeyword.value) {
    return projects.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return projects.value.filter(theme =>
    theme.name.toLowerCase().includes(keyword)
  )
})


const activeThemeData = computed(() => {
  if (!activeTheme.value) return null
  return projects.value.find(t => t.name === activeTheme.value)
})


const loadTypes = async () => {
  try {
    const res = await getLpTypes()
    if (res.code === 0) {
      lpTypes.value = res.data || []
    }
  } catch (error) {
    console.error('获取类型列表失败:', error)
  }
}


const loadProjects = async (savedTheme = null) => {
  loading.value = true
  try {
    const res = await getLpProjectsList(selectedType.value)
    if (res.code === 0) {
      projects.value = res.data || []

      if (savedTheme) {

        const themeExists = projects.value.some(t => t.name === savedTheme)
        if (themeExists) {
          activeTheme.value = savedTheme
          saveSelection()
        } else if (projects.value.length > 0) {

          activeTheme.value = projects.value[0].name
          saveSelection()
        }
      } else {

        if (!activeTheme.value && projects.value.length > 0) {
          activeTheme.value = projects.value[0].name
          saveSelection()
        }
      }
    } else {
      ElMessage.error(res.message || '获取项目列表失败')
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  } finally {
    loading.value = false
  }
}


const handleTypeChange = (type) => {
  selectedType.value = type
  activeTheme.value = ''
  showTypeMenu.value = false
  loadProjects() // 切换类型时，不传入 savedTheme，会使用第一个主题
}


const handleSearch = () => {

}


const handleCreateTheme = async () => {
  ElMessageBox.prompt('请输入主题名称（只能包含字母、数字、下划线和连字符）', '新建主题', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^[a-zA-Z0-9_-]+$/,
    inputErrorMessage: '主题名称只能包含字母、数字、下划线和连字符'
  }).then(async ({ value }) => {
    try {
      const res = await createLpTheme({ type: selectedType.value, name: value })
      if (res.code === 0) {
        ElMessage.success('主题创建成功')
        await loadProjects()
        activeTheme.value = value
      } else {
        ElMessage.error(res.message || '创建失败')
      }
    } catch (error) {
      console.error('创建主题失败:', error)
      ElMessage.error('创建主题失败')
    }
  }).catch(() => {

  })
}


const handleCreateVersion = async () => {
  if (!activeTheme.value) {
    ElMessage.warning('请先选择一个主题')
    return
  }

  ElMessageBox.prompt('请输入版本名称（只能包含字母、数字、下划线和连字符）', '新建版本', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^[a-zA-Z0-9_-]+$/,
    inputErrorMessage: '版本名称只能包含字母、数字、下划线和连字符'
  }).then(async ({ value }) => {
    try {
      const res = await createLpVersion({
        type: selectedType.value,
        theme: activeTheme.value,
        version: value
      })
      if (res.code === 0) {
        ElMessage.success('版本创建成功')
        await loadProjects()
      } else {
        ElMessage.error(res.message || '创建失败')
      }
    } catch (error) {
      console.error('创建版本失败:', error)
      ElMessage.error('创建版本失败')
    }
  }).catch(() => {

  })
}


const handleUpload = () => {
  uploadDialogVisible.value = true
}


const handleUploadUpdate = (theme, version) => {
  uploadDialogVisible.value = true
}


const handleUploadSuccess = () => {
  loadProjects()
}


const handleDeleteVersion = async (type, theme, version) => {
  ElMessageBox.confirm(
    `确定要删除主题 "${theme}" 的版本 "${version}" 吗？此操作不可恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await deleteLpVersion(type, theme, version)
      if (res.code === 0) {
        ElMessage.success('删除成功')
        await loadProjects()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {

  })
}


onMounted(async () => {

  const lastSelection = getLastSelection()

  await loadTypes()


  if (lastSelection && lastSelection.viewMode) {
    viewMode.value = lastSelection.viewMode
  }


  if (lastSelection && lastSelection.type) {
    const typeExists = lpTypes.value.some(t => t.key === lastSelection.type)
    if (typeExists) {
      selectedType.value = lastSelection.type

      await loadProjects(lastSelection.theme)
    } else {

      if (lpTypes.value.length > 0) {
        selectedType.value = lpTypes.value[0].key
      }
      await loadProjects()
    }
  } else {

    if (lpTypes.value.length > 0) {
      selectedType.value = lpTypes.value[0].key
    }
    await loadProjects()
  }
})


watch(activeTheme, () => {
  if (activeTheme.value) {
    saveSelection()
  }
})


watch(viewMode, () => {
  saveSelection()
})
</script>

<style lang="less" scoped>

.lp-projects-container {
  background: #fff;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  box-sizing: border-box;
}


.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;

  .page-title {
    font-size: 22px;
    font-weight: 400;
    color: #202124;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;


    :deep(.search-input) {
      width: 240px;

      .el-input__wrapper {
        border-radius: 24px;
        border: 1px solid #dadce0;
        box-shadow: none;
        padding: 4px 12px 4px 4px;
        background: #f1f3f4;

        &:hover {
          background: #e8eaed;
        }

        &.is-focus {
          background: #fff;
          border-color: #1a73e8;
          box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
        }
      }

      .el-input__prefix {
        margin-right: 8px;
        margin-left: 8px;
      }
    }


    :deep(.el-button) {
      border-radius: 24px;
      border: none;
      font-weight: 500;
      padding: 8px 16px;
      height: 36px;

      .el-icon {
        margin-right: 6px;
      }

      &.el-button--primary {
        background: #1a73e8;
        color: #fff;

        &:hover {
          background: #1557b0;
        }

        &:active {
          background: #174ea6;
        }
      }

      &:not(.el-button--primary) {
        background: transparent;
        color: #5f6368;

        &:hover {
          background: #f1f3f4;
        }
      }
    }


    .view-toggle {
      display: flex;
      align-items: center;
      background: #f1f3f4;
      border-radius: 24px;
      padding: 2px;

      .toggle-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        background: transparent;
        border-radius: 50%;
        cursor: pointer;
        color: #5f6368;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        .el-icon {
          font-size: 18px;
        }

        &:hover {
          background: rgba(26, 115, 232, 0.08);
          color: #1a73e8;
        }

        &.active {
          background: #fff;
          color: #1a73e8;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }
      }
    }
  }
}


.type-selector {
  position: relative;

  .type-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid #dadce0;
    border-radius: 20px;
    background: #fff;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    color: #202124;

    &:hover {
      background: #f1f3f4;
      border-color: #dadce0;
    }

    &:active {
      background: #e8eaed;
    }

    img {
      width: 20px;
      height: 20px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .current-type {
      font-size: 14px;
      font-weight: 400;
      color: #202124;
    }

    .dropdown-arrow {
      width: 16px;
      height: 16px;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
      color: #5f6368;

      &.rotate {
        transform: rotate(180deg);
      }
    }
  }

  .type-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 240px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1);
    z-index: 100;
    overflow: hidden;
    animation: menuFadeIn 0.15s ease-out;

    @keyframes menuFadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .menu-items {
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;

      &::-webkit-scrollbar {
        width: 8px;
      }

      &::-webkit-scrollbar-thumb {
        background: #dadce0;
        border-radius: 4px;

        &:hover {
          background: #bdc1c6;
        }
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      border-radius: 6px;
      position: relative;
      gap: 8px;

      .item-path {
        font-size: 14px;
        font-family: 'Roboto Mono', monospace;
        color: #202124;
        flex: 1;
        font-weight: 400;
      }

      .check-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        color: #1a73e8;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.15s ease;
      }

      &:hover {
        background: #f1f3f4;
      }

      &:active {
        background: #e8eaed;
      }

      &.active {
        background: #e8f0fe;

        .item-path {
          color: #1a73e8;
          font-weight: 500;
        }

        .check-icon {
          opacity: 1;
          transform: scale(1);
        }
      }
    }
  }

  .menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99;
  }
}


.theme-tabs-wrapper {
  margin-bottom: 16px;
  padding: 0;

  .theme-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px 0;
  }

  .theme-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    background: #f1f3f4;
    border: 1px solid transparent;

    .theme-name {
      font-size: 13px;
      color: #5f6368;
      font-weight: 500;
    }

    .theme-count {
      font-size: 12px;
      color: #5f6368;
    }

    &:hover {
      background: #e8eaed;

      .theme-name,
      .theme-count {
        color: #202124;
      }
    }

    &.active {
      background: #e8f0fe;
      border-color: #d2e3fc;

      .theme-name,
      .theme-count {
        color: #1a73e8;
      }
    }

    &.add-theme {
      background: transparent;
      border: 1px dashed #dadce0;
      color: #5f6368;
      display: flex;
      align-items: center;
      gap: 4px;

      .el-icon {
        font-size: 16px;
      }

      span {
        font-size: 13px;
        font-weight: 500;
      }

      &:hover {
        background: #f1f3f4;
        border-color: #5f6368;
      }
    }
  }
}


.versions-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .versions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    margin-bottom: 8px;

    .versions-title {
      font-size: 14px;
      font-weight: 500;
      color: #5f6368;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;

      .version-count {
        font-size: 13px;
        color: #5f6368;
        font-weight: 400;
      }
    }

    :deep(.el-button) {
      border-radius: 18px;
      font-weight: 500;
    }
  }

  .versions-list {
    overflow-y: auto;
    flex: 1;


    &.view-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      padding: 4px;
    }


    &.view-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0;
      background: #fff;
      border-radius: 8px;
      border: 1px solid #e8eaed;
      overflow: hidden;
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    flex: 1;

    .empty-icon {
      font-size: 64px;
      color: #dadce0;
      margin-bottom: 16px;
    }

    p {
      font-size: 14px;
      color: #5f6368;
      margin: 0;
    }
  }
}


@media (max-width: 768px) {
  .lp-projects-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;

    .page-title {
      font-size: 20px;
      text-align: center;
    }

    .header-actions {
      flex-direction: column;
      width: 100%;

      :deep(.search-input) {
        width: 100%;
      }

      :deep(.el-button) {
        width: 100%;
      }

      .view-toggle {
        align-self: center;
      }
    }
  }


  .type-selector {
    .type-trigger {
      padding: 6px 12px;
      font-size: 13px;
    }

    .type-menu {
      min-width: 200px;
      left: 0;

      .menu-header {
        padding: 10px 12px;
        font-size: 11px;
      }

      .menu-items {
        max-height: 200px;
      }

      .menu-item {
        padding: 10px 12px;

        .item-name {
          font-size: 13px;
        }

        .item-path {
          font-size: 10px;
        }
      }
    }
  }
}
</style>

<style lang="less">

.lp-projects-container + .el-overlay,
.el-overlay.is-message-box {
  .el-message-box {
    border-radius: 24px;
    box-shadow: 0 8px 40px rgba(60, 64, 67, 0.16);
    border: none;
    padding: 0;

    .el-message-box__header {
      padding: 20px 24px 12px;

      .el-message-box__title {
        font-size: 20px;
        font-weight: 400;
        color: #202124;
      }

      .el-message-box__headerbtn {
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;

        .el-message-box__close {
          color: #5f6368;
          font-size: 20px;

          &:hover {
            color: #202124;
          }
        }
      }
    }

    .el-message-box__content {
      padding: 8px 24px 20px;

      .el-message-box__message {
        font-size: 14px;
        color: #3c4043;
        line-height: 1.6;
      }

      .el-message-box__input {
        padding-top: 16px;

        .el-input__wrapper {
          border-radius: 8px;
          border: 1px solid #dadce0;
          box-shadow: none;
          padding: 8px 12px;

          &:hover {
            border-color: #5f6368;
          }

          &.is-focus {
            border-color: #1a73e8;
            box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
          }
        }
      }
    }

    .el-message-box__btns {
      padding: 8px 24px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;

      .el-button {
        border-radius: 20px;
        border: none;
        font-weight: 500;
        padding: 8px 20px;
        height: 36px;

        &.el-button--primary {
          background: #1a73e8;
          color: #fff;

          &:hover {
            background: #1557b0;
          }
        }

        &:not(.el-button--primary) {
          color: #5f6368;
          background: transparent;

          &:hover {
            background: #f1f3f4;
          }
        }
      }
    }
  }
}
</style>
