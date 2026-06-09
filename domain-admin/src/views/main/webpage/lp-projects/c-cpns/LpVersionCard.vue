<template>
  <div class="version-card" :class="[`view-${viewMode}`]">
    <!-- 列表视图：文件管理器样式 -->
    <template v-if="viewMode === 'list'">
      <div class="list-item-row" @click="handleRowClick">
        <!-- 文件夹图标 -->
        <div class="folder-icon">
          <img :src="fileImage" alt="">
        </div>

        <!-- 版本名称 -->
        <div class="version-name-col">
          <span class="folder-name">{{ version.name }}</span>
          <div class="status-badges">
            <div class="status-badge" :class="{ normal: version.hasIndex }">
              <span class="status-dot"></span>
              <span class="status-text">{{ version.hasIndex ? '正常' : '缺少index.html' }}</span>
            </div>
            <div class="status-badge cloak" :class="{ 'has-cloak': hasCloak, 'no-cloak': !hasCloak }">
              <span class="status-dot"></span>
              <span class="status-text">{{ hasCloak ? 'cloak' : '无cloak' }}</span>
            </div>
          </div>
        </div>

        <!-- 文件信息 -->
        <div class="file-info-col">
          <span class="info-text">{{ version.fileCount || 0 }} 个文件</span>
          <span class="info-text">{{ formatSize(version.totalSize || 0) }}</span>
        </div>

        <!-- 访问链接 -->
        <div class="url-col">
          <a :href="version.accessUrl" target="_blank" class="url-link" @click.stop>
            {{ version.accessUrl }}
          </a>
        </div>

        <!-- 操作按钮 -->
        <div class="actions-col" @click.stop>
          <a class="action-btn visit" :href="version.accessUrl + '?w=1'" target="_blank" title="访问">
            <el-icon><View /></el-icon>
          </a>
          <button class="action-btn download" @click="handleDownload" title="下载">
            <el-icon><Download /></el-icon>
          </button>
          <button class="action-btn upload" @click="handleCommand('upload')" title="更新">
            <el-icon><Upload /></el-icon>
          </button>
          <button class="action-btn cloak" @click="handleInsertCloak" title="插入 Cloak">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-8 0-2.53 2.07-5.59 5-5.59 1.24 0 2.25.26 2.25.58 0 .15.11.22.25.22.33 0 .31-.14.5-.37.5-.29 0-.56.13-.79.26-.22.13-.48.32-.71.32-.25 0-.46.15-.63.42-.15-.27.35-.43.59-.43.18 0 .34.05.49.15.14.09.27.14.44.14.69 0 .26-.11.51-.3.71-.4-.49-.94-.49-1.73 0-.66.21-1.25.61-1.75.33-.4.73-.61-1.07-.61-.43 0-.8.21-1.07.54-.26.32-.38.74-.38 1.41 0 2.19.82 2.19 2.19 0 .28-.06.53-.16.74-.11.2-.06.48.03.73.17.25.16.5.42.77.42.34 0 .63-.13.85-.38.22-.25.32-.65.32-1.19 0-.49.2-.93.57-1.29.36-.36.84-.57 1.36-.57.55 0 1.01.19 1.35.55.35.36.53.83.53 1.43 0 .29-.07.55-.19.76-.13.2-.07.48.03.72.17.24.16.49.43.77.43.35 0 .64-.14.86-.39.21-.25.31-.65.31-1.19z"/>
            </svg>
          </button>
          <button class="action-btn delete" @click="handleDelete()" title="删除">
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </div>

      <!-- 可展开的文件列表 -->
      <div v-if="filesVisible" class="list-files-panel">
        <div class="files-header">
          <span>文件列表</span>
          <el-button link type="primary" size="small" @click="filesVisible = false">
            收起
          </el-button>
        </div>
        <!-- 加载中 -->
        <div v-if="filesLoading" class="no-files-hint">
          <el-icon class="is-loading empty-icon"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <!-- 有文件时显示文件列表 -->
        <div v-else-if="versionFiles && versionFiles.length > 0" class="file-items">
          <FileTreeItem
            v-for="item in fileTree"
            :key="item.path"
            :item="item"
            :format-size="formatSize"
            :expanded-folders="expandedFolders"
            :toggle-folder="toggleFolder"
          />
          <div v-if="hasMoreFiles" class="show-more" @click="showAllFiles = !showAllFiles">
            {{ showAllFiles ? '收起' : `显示全部 ${versionFiles?.length || 0} 个文件` }}
          </div>
        </div>
        <!-- 没有文件时显示提示 -->
        <div v-else class="no-files-hint">
          <el-icon class="empty-icon"><FolderOpened /></el-icon>
          <span>此项目暂无文件</span>
        </div>
      </div>
    </template>

    <!-- 卡片视图：原有卡片样式 -->
    <template v-else>
      <!-- 卡片头部 -->
      <div class="card-header">
        <div class="version-info">
          <span class="version-name">{{ version.name }}</span>
          <el-tag v-if="version.hasIndex" type="success" size="small">正常</el-tag>
          <el-tag v-else type="warning" size="small">缺少index.html</el-tag>
          <el-tag v-if="hasCloak" type="success" size="small" class="cloak-tag">cloak</el-tag>
          <el-tag v-else type="danger" size="small" class="cloak-tag">无cloak</el-tag>
        </div>
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button class="more-btn" :icon="MoreFilled" circle />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="upload">
                <el-icon><Upload /></el-icon>
                更新
              </el-dropdown-item>
              <el-dropdown-item command="insertCloak">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px; margin-right: 10px;">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-8 0-2.53 2.07-5.59 5-5.59 1.24 0 2.25.26 2.25.58 0 .15.11.22.25.22.33 0 .31-.14.5-.37.5-.29 0-.56.13-.79.26-.22.13-.48.32-.71.32-.25 0-.46.15-.63.42-.15-.27.35-.43.59-.43.18 0 .34.05.49.15.14.09.27.14.44.14.69 0 .26-.11.51-.3.71-.4-.49-.94-.49-1.73 0-.66.21-1.25.61-1.75.33-.4.73-.61-1.07-.61-.43 0-.8.21-1.07.54-.26.32-.38.74-.38 1.41 0 2.19.82 2.19 2.19 0 .28-.06.53-.16.74-.11.2-.06.48.03.73.17.25.16.5.42.77.42.34 0 .63-.13.85-.38.22-.25.32-.65.32-1.19 0-.49.2-.93.57-1.29.36-.36.84-.57 1.36-.57.55 0 1.01.19 1.35.55.35.36.53.83.53 1.43 0 .29-.07.55-.19.76-.13.2-.07.48.03.72.17.24.16.49.43.77.43.35 0 .64-.14.86-.39.21-.25.31-.65.31-1.19z"/>
                </svg>
                插入 Cloak
              </el-dropdown-item>
              <el-dropdown-item command="delete">
                <el-icon><Delete /></el-icon>
                删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

    <!-- 卡片内容 -->
    <div class="card-content">
      <div class="info-item">
        <el-icon class="info-icon"><Folder /></el-icon>
        <span class="info-label">文件数量:</span>
        <span class="info-value">{{ version.fileCount || 0 }}</span>
      </div>
      <div class="info-item">
        <el-icon class="info-icon"><Document /></el-icon>
        <span class="info-label">总大小:</span>
        <span class="info-value">{{ formatSize(version.totalSize || 0) }}</span>
      </div>
      <div class="info-item">
        <el-icon class="info-icon"><Link /></el-icon>
        <span class="info-label">访问地址:</span>
      </div>
      <div class="url-preview">
        <a :href="version.accessUrl" target="_blank" class="url-link" :title="version.accessUrl">
          {{ version.accessUrl }}
        </a>
      </div>
    </div>

    <!-- 文件列表（预留空间，待添加图片预览功能） -->
    <div class="files-list">
      <div class="files-placeholder">
        <el-icon class="placeholder-icon"><Picture /></el-icon>
        <span>预览图片</span>
      </div>
    </div>

    <!-- 卡片底部 -->
    <div class="card-footer">
      <a class="access-btn" :href="version.accessUrl + '?w=1'" target="_blank" rel="noopener">
        <el-icon><View /></el-icon>
        访问
      </a>
      <el-button link type="primary" @click="handleDownload">
        <el-icon><Download /></el-icon>
        下载
      </el-button>
    </div>
    </template>
  </div>

  <!-- Cloak 抽屉 -->
  <el-drawer
    v-model="cloakDrawerVisible"
    title="Cloak 管理"
    direction="rtl"
    size="400px"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="cloak-drawer-header">
        <span class="drawer-title">Cloak 管理</span>
      </div>
    </template>

    <div class="cloak-drawer-content">
      <!-- 上传区域 -->
      <div class="cloak-upload-section">
        <input
          :ref="(el) => { cloakFolderInput = el }"
          type="file"
          webkitdirectory
          directory
          multiple
          style="display: none"
          @change="handleCloakFolderSelect($event)"
        />
        <div class="upload-area" @click="triggerFolderUpload">
          <el-icon class="upload-icon"><Upload /></el-icon>
          <div class="upload-text">点击上传 Cloak 文件夹</div>
          <div class="upload-hint">选择包含 index.php 和 safe.html 的文件夹</div>
        </div>
      </div>

      <!-- Cloak 列表 -->
      <div class="cloak-list-section">
        <div class="section-title">
          <span>可用 Cloak</span>
          <el-button link type="primary" size="small" @click="loadCloakList">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <div v-if="cloakLoading" class="cloak-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>

        <div v-else-if="cloakList.length === 0" class="cloak-empty">
          <el-icon><FolderOpened /></el-icon>
          <p>暂无 Cloak</p>
        </div>

        <div v-else class="cloak-list">
          <div
            v-for="cloak in cloakList"
            :key="cloak.name"
            class="cloak-item"
            :class="{ selected: selectedCloak === cloak.name }"
            @click="selectedCloak = cloak.name"
          >
            <div class="cloak-info">
              <div class="cloak-name">{{ cloak.name }}</div>
              <div class="cloak-meta">
                <span v-if="cloak.hasIndexPhp" class="file-tag">index.php</span>
                <span v-if="cloak.hasSafeHtml" class="file-tag">safe.html</span>
                <span class="file-count">{{ cloak.fileCount }} 个文件</span>
              </div>
            </div>
            <el-button
              link
              type="danger"
              size="small"
              @click.stop="handleDeleteCloak(cloak.name)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 插入提示 -->
      <div v-if="cloakConflictFiles.length > 0" class="cloak-conflict-hint">
        <el-icon class="warning-icon"><Warning /></el-icon>
        <div class="conflict-text">
          <div class="conflict-title">项目中已存在以下文件：</div>
          <div class="conflict-files">{{ cloakConflictFiles.join(', ') }}</div>
          <el-radio-group v-model="cloakConflictAction" size="small">
            <el-radio value="overwrite">覆盖</el-radio>
            <el-radio value="skip">跳过</el-radio>
          </el-radio-group>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="cloak-drawer-footer">
        <el-button @click="cloakDrawerVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirmInsertCloak"
          :disabled="!selectedCloak || cloakLoading"
        >
          插入 Cloak
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  MoreFilled, Upload, Delete, Folder, Document, Link, View, Download, Loading, FolderOpened, Warning, Refresh, Picture
} from '@element-plus/icons-vue'
import { downloadLpProject, getLpVersionFiles } from '@/services/main/webpage/lp-projects'
import { LP_API_URL } from '@/services/request/config'
import fileImage from "@/assets/img/folder.png"

const props = defineProps({
  type: String,  // 项目类型
  theme: String,
  version: {
    type: Object,
    required: true
  },
  viewMode: {
    type: String,
    default: 'grid' // 'grid' 或 'list'
  }
})

const emit = defineEmits(['delete', 'upload', 'refresh'])


const cloakDrawerVisible = ref(false)
const cloakLoading = ref(false)
const cloakList = ref([])
const selectedCloak = ref('')
let cloakFolderInput = null  // 直接由模板 ref 回调设置
const cloakUploading = ref(false)
const cloakConflictFiles = ref([])
const cloakConflictAction = ref('overwrite')


const filesLoading = ref(false)
const versionFiles = ref([])


const triggerFolderUpload = () => {
  cloakFolderInput?.click()
}

const filesVisible = ref(false)
const showAllFiles = ref(false)
const expandedFolders = ref(new Set())
const cardRef = ref(null)


const toggleFiles = () => {
  filesVisible.value = !filesVisible.value
}


const handleRowClick = async () => {

  if (!filesVisible.value && versionFiles.value.length === 0) {
    await loadVersionFiles()
  }
  filesVisible.value = !filesVisible.value
}


const loadVersionFiles = async () => {
  filesLoading.value = true
  try {
    const res = await getLpVersionFiles(props.type, props.theme, props.version.name)
    if (res.code === 0) {
      versionFiles.value = res.data.files || []
    }
  } catch (error) {
    console.error('获取文件列表失败:', error)
  } finally {
    filesLoading.value = false
  }
}


const toggleFolder = (path) => {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path)
  } else {
    expandedFolders.value.add(path)
  }
}


const fileTree = computed(() => {
  const files = versionFiles.value || []
  const limit = showAllFiles.value ? files.length : 10
  const limitedFiles = files.slice(0, limit)


  const tree = {}

  limitedFiles.forEach(file => {

    const path = (file.path || file.name).replace(/\\/g, '/')
    const parts = path.split('/').filter(p => p) // 过滤空字符串

    let current = tree
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1
      if (!current[part]) {
        current[part] = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          isFile: isLast,
          children: {},
          size: isLast ? file.size : undefined
        }
      }
      current = current[part].children
    })
  })


  const buildTreeArray = (node, depth = 0) => {
    return Object.values(node).map(item => ({
      ...item,
      depth,
      children: item.isFile ? null : buildTreeArray(item.children, depth + 1)
    }))
  }

  return buildTreeArray(tree)
})


const displayedFiles = computed(() => {
  const files = versionFiles.value || []
  if (showAllFiles.value) {
    return files
  }
  return files.slice(0, 10)
})


const hasMoreFiles = computed(() => {
  return (versionFiles.value?.length || 0) > 10
})


const hasCloak = computed(() => {

  return props.version.hasCloak || false
})


const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(i > 1 ? 2 : 0) + ' ' + sizes[i]
}


const handleCommand = (command) => {
  switch (command) {
    case 'upload':
      emit('upload', props.theme, props.version.name)
      break
    case 'insertCloak':
      handleInsertCloak()
      break
    case 'delete':
      handleDelete()
      break
  }
}


const handleDownload = () => {
  const url = downloadLpProject(props.type, props.theme, props.version.name)

  const link = document.createElement('a')
  link.href = url
  link.download = `${props.theme}-${props.version.name}.zip`
  link.click()
}


const handleDelete = () => {
  emit('delete', props.type, props.theme, props.version.name)
}




const handleInsertCloak = async () => {
  cloakDrawerVisible.value = true
  await loadCloakList()
}


const loadCloakList = async () => {
  cloakLoading.value = true
  try {
    const res = await fetch(`${LP_API_URL}/api/projects/cloak/list`)
    const data = await res.json()
    cloakList.value = data.data || []
  } catch (error) {
    console.error('获取 Cloak 列表失败:', error)
    ElMessage.error('获取 Cloak 列表失败')
  } finally {
    cloakLoading.value = false
  }
}


const handleDeleteCloak = async (cloakName) => {
  ElMessageBox.confirm(`确定要删除 Cloak "${cloakName}" 吗？`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await fetch(`${LP_API_URL}/api/projects/cloak/${cloakName}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.code === 0) {
        ElMessage.success('删除成功')
        await loadCloakList()
        if (selectedCloak.value === cloakName) {
          selectedCloak.value = ''
        }
      } else {
        ElMessage.error(data.message || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}


const handleCloakFolderSelect = async (event) => {
  const files = event.target.files
  if (!files || files.length === 0) {
    return
  }


  const filesArray = Array.from(files)


  const firstFile = filesArray[0]
  const folderName = firstFile.webkitRelativePath?.split('/')[0] || 'new-cloak'


  ElMessageBox.prompt('请输入 Cloak 名称', '上传 Cloak', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: folderName,
    inputPattern: /^[a-zA-Z0-9_-]+$/,
    inputErrorMessage: '名称只能包含字母、数字、下划线和连字符'
  }).then(async ({ value: cloakName }) => {
    await uploadCloakFolder(cloakName, filesArray)

    event.target.value = ''
  }).catch(() => {

    event.target.value = ''
  })
}


const uploadCloakFolder = async (cloakName, files) => {
  console.log('[Cloak Upload] 文件数量:', files.length)
  console.log('[Cloak Upload] 第一个文件:', files[0])

  cloakUploading.value = true

  try {

    const formData = new FormData()
    formData.append('name', cloakName)


    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      const relativePath = file.webkitRelativePath?.substring(file.webkitRelativePath.indexOf('/') + 1) || file.name
      console.log(`[Cloak Upload] 添加文件 ${i + 1}:`, relativePath)
      formData.append('files', file, relativePath)
    }

    console.log('[Cloak Upload] FormData entries:', formData.getAll('files').length)

    const res = await fetch(`${LP_API_URL}/api/projects/cloak/upload-folder`, {
      method: 'POST',
      body: formData
    })

    console.log('[Cloak Upload] 响应状态:', res.status)
    const data = await res.json()
    console.log('[Cloak Upload] 响应数据:', data)

    if (data.code === 0) {
      ElMessage.success('上传成功')
      await loadCloakList()
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败')
  } finally {
    cloakUploading.value = false
  }
}


const handleConfirmInsertCloak = async () => {
  if (!selectedCloak.value) {
    ElMessage.warning('请选择一个 Cloak')
    return
  }

  cloakLoading.value = true

  try {
    const res = await fetch(`${LP_API_URL}/api/projects/cloak/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloakName: selectedCloak.value,
        targetType: props.type,
        targetTheme: props.theme,
        targetVersion: props.version.name,
        onConflict: cloakConflictAction.value
      })
    })
    const data = await res.json()

    if (data.code === 0) {
      ElMessage.success('Cloak 插入成功')
      cloakDrawerVisible.value = false
      emit('refresh')
    } else if (data.code === 2 && data.conflicts) {

      cloakConflictFiles.value = data.conflicts
    } else {
      ElMessage.error(data.message || '插入失败')
    }
  } catch (error) {
    console.error('插入 Cloak 失败:', error)
    ElMessage.error('插入 Cloak 失败')
  } finally {
    cloakLoading.value = false
  }
}


const FileTreeItem = {
  name: 'FileTreeItem',
  props: {
    item: Object,
    formatSize: Function,
    expandedFolders: Object,
    toggleFolder: Function,
    depth: { type: Number, default: 0 }
  },
  setup(props) {
    const isExpanded = computed(() => {
      return props.item.isFile || props.expandedFolders.has(props.item.path)
    })

    const hasChildren = computed(() => {
      return props.item.children && props.item.children.length > 0
    })

    const onClick = (e) => {

      e.stopPropagation()
      if (!props.item.isFile && hasChildren.value) {
        props.toggleFolder(props.item.path)
      }
    }


    const ChevronIcon = h('svg', {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      style: {
        width: '16px',
        height: '16px',
        transition: 'transform 0.2s ease',
        transform: isExpanded.value ? 'rotate(90deg)' : 'rotate(0deg)'
      }
    }, [
      h('path', {
        d: 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'
      })
    ])


    const FolderIcon = h('i', {
      class: 'file-icon-sprite folder-icon',
      style: {
        backgroundPosition: '0px -400px'
      }
    })


    const FolderOpenIcon = h('i', {
      class: 'file-icon-sprite folder-icon',
      style: {
        backgroundPosition: '0px -400px'
      }
    })


    const getFileIconPosition = () => {
      const fileName = props.item.name.toLowerCase()
      if (fileName.endsWith('.js')) {
        return '-0px -525px'
      } else if (fileName.endsWith('.css')) {
        return '-0px -325px'
      } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        return '-0px -450px'
      } else if (fileName.endsWith('.php')) {
        return '0px -850px'
      } else if (fileName.endsWith('.json')) {
        return '0px -625px'
      }

      return '-0px -375px'
    }


    const FileIcon = h('i', {
      class: 'file-icon-sprite',
      style: {
        backgroundPosition: getFileIconPosition(),
      }
    })

    return () => h('div', { class: 'file-tree-item' }, [

      h('div', {
        class: [
          'file-item',
          { 'is-folder': !props.item.isFile, 'is-file': props.item.isFile }
        ],
        style: { paddingLeft: `${props.depth * 20}px` },
        onClick
      }, [

        !props.item.isFile && hasChildren.value
          ? h('span', { class: 'folder-toggle', onClick: onClick }, ChevronIcon)
          : h('span', { class: 'folder-toggle spacer' }),

        !props.item.isFile
          ? (isExpanded.value ? FolderOpenIcon : FolderIcon)
          : FileIcon,

        h('span', { class: 'file-name' }, props.item.name),

        props.item.isFile && props.item.size !== undefined
          ? h('span', { class: 'file-size' }, props.formatSize(props.item.size))
          : null
      ]),

      isExpanded.value && hasChildren.value
        ? h('div', { class: 'file-children' },
            props.item.children.map((child) =>
              h(FileTreeItem, {
                key: child.path,
                item: child,
                formatSize: props.formatSize,
                expandedFolders: props.expandedFolders,
                toggleFolder: props.toggleFolder,
                depth: props.depth + 1
              })
            )
          )
        : null
    ])
  }
}
</script>

<style lang="less" scoped>

.version-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  min-height: 360px;
  max-height: 500px;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3);
  }


  &.view-list {
    flex-direction: column;
    min-height: auto;
    max-height: none;
    height: auto;
    padding: 0;
    border-radius: 0;
    border: none;
    background: transparent;

    &:hover {
      box-shadow: none;
    }

    .list-item-row {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid #e8eaed;
      cursor: pointer;
      transition: background-color 0.15s ease;
      gap: 16px;

      &:hover {
        background: #f1f3f4;

        .actions-col {
          opacity: 1;
        }
      }

      &:active {
        background: #e8eaed;
      }

      .folder-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }
      }

      .version-name-col {
        flex: 0 0 180px;
        min-width: 180px;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .folder-name {
          font-size: 14px;
          font-weight: 500;
          color: #202124;
        }


        .status-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;

          .status-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #f28b82;
          }

          .status-text {
            color: #9aa0a6;
          }

          &.normal {
            .status-dot {
              background: #34a853;
            }

            .status-text {
              color: #34a853;
            }
          }


          &.cloak {
            &.has-cloak {
              .status-dot {
                background: #34a853;
              }

              .status-text {
                color: #34a853;
              }
            }

            &.no-cloak {
              .status-dot {
                background: #f28b82;
              }

              .status-text {
                color: #f28b82;
              }
            }
          }
        }
      }

      .file-info-col {
        flex: 0 0 140px;
        min-width: 140px;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .info-text {
          font-size: 12px;
          color: #5f6368;
        }
      }

      .url-col {
        flex: 1;
        min-width: 0;
        margin-right: 16px;

        .url-link {
          display: inline-block;
          font-size: 13px;
          color: #1a73e8;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .actions-col {
        flex-shrink: 0;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s ease;

        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #5f6368;
          transition: all 0.15s ease;
          text-decoration: none;

          .el-icon {
            font-size: 16px;
          }

          &:hover {
            background: rgba(60, 64, 67, 0.08);
            color: #202124;
          }

          &.visit:hover {
            background: #e8f0fe;
            color: #1a73e8;
          }

          &.download:hover {
            background: #e8f0fe;
            color: #1a73e8;
          }

          &.upload:hover {
            background: #e8f0fe;
            color: #1a73e8;
          }

          &.delete:hover {
            background: #fce8e6;
            color: #c5221f;
          }
        }
      }
    }
  }


  .list-files-panel {
    background: #f8f9fa;
    border-top: 1px solid #e8eaed;
    border-bottom: 1px solid #e8eaed;


    overflow: hidden;

    .files-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 500;
      color: #5f6368;
      background: #f1f3f4;
      border-bottom: 1px solid #e8eaed;

      .el-button {
        font-size: 12px;
      }
    }

    .file-items {
      padding: 8px 12px;
      max-height: 240px;
      overflow-y: auto;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: #dadce0;
        border-radius: 3px;

        &:hover {
          background: #bdc1c6;
        }
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }
    }

    .show-more {
      text-align: center;
      padding: 8px;
      font-size: 12px;
      color: #1a73e8;
      cursor: pointer;
      user-select: none;

      &:hover {
        background: #e8f0fe;
        border-radius: 4px;
      }
    }

    .no-files-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      color: #9aa0a6;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      span {
        font-size: 14px;
      }
    }
  }
}


.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f4;
  flex-shrink: 0;

  .version-info {
    display: flex;
    align-items: center;
    gap: 8px;


    :deep(.el-tag) {
      border-radius: 12px;
      border: none;
      font-size: 11px;
      padding: 2px 8px;
      height: 20px;
      font-weight: 500;

      &.el-tag--success {
        background: #e6f4ea;
        color: #137333;
      }

      &.el-tag--warning {
        background: #fef7e0;
        color: #b06000;
      }

      &.el-tag--danger {
        background: #fad2cf;
        color: #c5221f;
      }


      &.cloak-tag {
        &.el-tag--success {
          background: #e6f4ea;
          color: #137333;
        }

        &.el-tag--danger {
          background: #fad2cf;
          color: #c5221f;
        }
      }
    }
  }

  .version-name {
    font-size: 15px;
    font-weight: 500;
    color: #202124;
  }

  .more-btn {
    border: none;
    background: transparent;
    color: #5f6368;
    border-radius: 50%;

    &:hover {
      background: #f1f3f4;
      color: #1a73e8;
    }
  }
}


.card-content {
  padding: 12px 16px;
  flex-shrink: 0;
  overflow-y: auto;
  max-height: 100px;
  flex: 0 0 auto;

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

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;

    .info-icon {
      font-size: 16px;
      color: #5f6368;
    }

    .info-label {
      font-size: 13px;
      color: #5f6368;
    }

    .info-value {
      font-size: 13px;
      color: #202124;
      font-weight: 500;
    }
  }

  .url-preview {
    margin-top: 6px;
  }

  .url-link {
    display: block;
    font-size: 12px;
    color: #1a73e8;
    text-decoration: none;
    word-break: break-all;
    line-height: 1.4;

    &:hover {
      text-decoration: underline;
    }
  }
}


.files-list {
  border-top: 1px solid #f1f3f4;
  background: #fafafa;
  flex: 1;
  max-height: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;


  .files-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #9aa0a6;
    gap: 12px;

    .placeholder-icon {
      font-size: 48px;
      opacity: 0.5;
    }

    span {
      font-size: 13px;
    }
  }

  .files-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #5f6368;
    flex-shrink: 0;
    background: #f1f3f4;
  }

  .file-items {
    padding: 4px 12px 8px;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;

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


  .file-tree-item {
    .file-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      font-size: 13px;
      cursor: default;
      border-radius: 4px;
      transition: background-color 0.15s ease;

      &:hover {
        background: rgba(26, 115, 232, 0.08);
      }

      &.is-folder {
        cursor: pointer;

        .file-name {
          font-weight: 500;
          color: #202124;
        }

        &:hover {
          background: rgba(26, 115, 232, 0.12);
        }
      }

      &.is-file {
        .file-name {
          color: #5f6368;
        }
      }

      .folder-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        color: #5f6368;
        border-radius: 50%;
        cursor: pointer;
        flex-shrink: 0;

        &:hover {
          background: rgba(0, 0, 0, 0.06);
        }

        &.spacer {
          cursor: default;
        }
      }

      .file-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .file-size {
        color: #9aa0a6;
        flex-shrink: 0;
        font-size: 11px;
        margin-left: auto;
        padding-left: 12px;
      }
    }
  }

  .show-more {
    text-align: center;
    padding: 6px;
    font-size: 12px;
    color: #1a73e8;
    cursor: pointer;
    user-select: none;

    &:hover {
      background: #e8f0fe;
      border-radius: 4px;
    }
  }
}


.card-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
  border-top: 1px solid #f1f3f4;
  background: #fff;
  flex-shrink: 0;
  min-height: 48px;
  gap: 4px;


  :deep(.el-button) {
    border: none;
    border-radius: 18px;
    font-weight: 500;
    font-size: 13px;
    height: 32px;
    padding: 0 12px;
    color: #5f6368;
    background: transparent;

    .el-icon {
      margin-right: 4px;
      font-size: 16px;
    }

    &:hover {
      background: #f1f3f4;
      color: #1a73e8;
    }
  }

  .access-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 32px;
    padding: 0 12px;
    color: #1a73e8;
    text-decoration: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    border-radius: 18px;
    transition: background 0.2s;
    box-sizing: border-box;

    .el-icon {
      font-size: 16px;
    }

    &:hover {
      background: #f1f3f4;
    }
  }

}


:deep(.el-dropdown-menu) {
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 4px;

  .el-dropdown-menu__item {
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 13px;
    color: #3c4043;

    .el-icon {
      margin-right: 10px;
      font-size: 18px;
      color: #5f6368;
    }

    &:hover {
      background: #f1f3f4;

      .el-icon {
        color: #1a73e8;
      }
    }

    &.is-divided {
      border-top: 1px solid #e8eaed;
      margin-top: 4px;
      padding-top: 8px;
    }
  }
}


@media (max-width: 768px) {
  .version-card.view-list {
    .list-item-row {
      padding: 12px;
      gap: 12px;

      .version-name-col {
        flex: 1;
        min-width: 0;
      }

      .file-info-col {
        display: none;
      }

      .url-col {
        display: none;
      }

      .actions-col {
        opacity: 1;
      }
    }
  }
}


:deep(.el-dialog) {
  .cloak-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    gap: 12px;
    color: #5f6368;

    .el-icon {
      font-size: 32px;
      color: #1a73e8;
    }
  }

  .cloak-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #5f6368;

    .el-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    p {
      margin: 4px 0;
      font-size: 14px;
    }

    .hint-text {
      font-size: 12px;
      color: #9aa0a6;
    }
  }

  .cloak-list {
    max-height: 320px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: #dadce0;
      border-radius: 3px;

      &:hover {
        background: #bdc1c6;
      }
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }
  }

  .cloak-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    border: 1px solid transparent;
    margin-bottom: 8px;

    &:hover {
      background: #f1f3f4;
    }

    &.selected {
      background: #e8f0fe;
      border-color: #1a73e8;
    }

    .cloak-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f3f4;
      border-radius: 8px;
      margin-right: 12px;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .cloak-info {
      flex: 1;
      min-width: 0;

      .cloak-name {
        font-size: 14px;
        font-weight: 500;
        color: #202124;
        margin-bottom: 4px;
      }

      .cloak-files {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;

        .file-tag {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;

          &.success {
            background: #e6f4ea;
            color: #137333;
          }
        }

        .file-count {
          font-size: 11px;
          color: #9aa0a6;
        }
      }
    }

    .cloak-check {
      flex-shrink: 0;
      width: 20px;
      height: 20px;

      svg {
        width: 20px;
        height: 20px;
      }
    }
  }
}


.action-btn.cloak {
  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: #e8f0fe !important;
    color: #1a73e8 !important;
  }
}


:deep(.el-drawer) {
  .cloak-drawer-header {
    .drawer-title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
    }
  }

  .cloak-drawer-content {
    padding: 0 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .cloak-drawer-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e8eaed;
  }
}


.cloak-upload-section {
  .upload-area {
    border: 2px dashed #dadce0;
    border-radius: 8px;
    padding: 32px 16px;
    text-align: center;
    background: #f8f9fa;
    transition: all 0.2s;

    &:hover {
      border-color: #1a73e8;
      background: #e8f0fe;
    }

    .upload-icon {
      font-size: 48px;
      color: #5f6368;
      margin-bottom: 12px;
    }

    .upload-text {
      font-size: 14px;
      color: #202124;
      margin-bottom: 4px;
    }

    .upload-hint {
      font-size: 12px;
      color: #5f6368;
    }
  }
}


.cloak-list-section {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 500;
    color: #5f6368;
  }

  .cloak-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #5f6368;
    gap: 12px;

    .el-icon {
      font-size: 32px;
      color: #1a73e8;
    }
  }

  .cloak-empty {
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
      font-size: 14px;
      margin: 0;
    }
  }

  .cloak-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cloak-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
    background: #fff;

    &:hover {
      background: #f1f3f4;
    }

    &.selected {
      background: #e8f0fe;
      border-color: #d2e3fc;
    }

    .cloak-info {
      flex: 1;

      .cloak-name {
        font-size: 14px;
        font-weight: 500;
        color: #202124;
        margin-bottom: 4px;
      }

      .cloak-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;

        .file-tag {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #e6f4ea;
          color: #137333;
          font-weight: 500;
        }

        .file-count {
          font-size: 11px;
          color: #9aa0a6;
        }
      }
    }
  }
}


.cloak-conflict-hint {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fef7e0;
  border-radius: 8px;
  border: 1px solid #fdd835;

  .warning-icon {
    font-size: 20px;
    color: #f9ab00;
    flex-shrink: 0;
  }

  .conflict-text {
    flex: 1;

    .conflict-title {
      font-size: 13px;
      font-weight: 500;
      color: #b06000;
      margin-bottom: 4px;
    }

    .conflict-files {
      font-size: 12px;
      color: #b06000;
      margin-bottom: 8px;
      word-break: break-all;
    }

    :deep(.el-radio-group) {
      .el-radio {
        margin-right: 16px;

        .el-radio__label {
          font-size: 12px;
        }
      }
    }
  }
}


:deep(.file-icon-sprite) {
  background-repeat: no-repeat;
  background-size: 25px auto;
  width: 25px;
  height: 25px;
  display: inline-block;
  flex-shrink: 0;

  background-image: url('@/assets/img/css_sprites.png');
}
</style>
