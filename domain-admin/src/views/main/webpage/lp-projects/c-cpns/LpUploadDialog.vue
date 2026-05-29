<template>
  <el-dialog
    v-model="dialogVisible"
    width="580px"
    style="max-width: 90vw;"
    :close-on-click-modal="false"
    @close="handleClose"
    class="lp-upload-dialog"
    :show-close="false"
  >
    <!-- 自定义头部 -->
    <div class="dialog-header">
      <div class="header-icon">
        <img :src="fileImage" alt="">
      </div>
      <div class="header-content">
        <h2 class="header-title">上传LP项目</h2>
        <p class="header-desc">选择项目类型并上传文件</p>
      </div>
      <button class="close-btn" @click="handleClose">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="#5f6368"/>
        </svg>
      </button>
    </div>

    <!-- 项目信息卡片 -->
    <div class="info-card">
      <div class="info-row">
        <label>项目类型</label>
        <div class="select-wrapper" :class="{ 'has-value': form.type }">
          <select v-model="form.type" class="custom-select">
            <option value="">选择类型</option>
            <option v-for="type in types" :key="type.key" :value="type.key">
              {{ type.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="info-row">
        <label>主题名称</label>
        <div class="select-wrapper" :class="{ 'has-value': form.theme }">
          <select v-model="form.theme" class="custom-select">
            <option value="">选择主题</option>
            <option v-for="theme in themes" :key="theme.name" :value="theme.name">
              {{ theme.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="info-row">
        <label>版本号</label>
        <div class="input-wrapper" :class="{ 'has-value': form.version }">
          <input
            v-model="form.version"
            type="text"
            class="custom-input"
            placeholder="例如：v1.0, 2024-01-15"
          >
        </div>
      </div>
    </div>

    <!-- 上传区域 -->
    <div
      class="upload-zone"
      :class="{ 'has-files': fileList.length > 0, 'drag-over': isDragOver }"
      @click="handleSelectFolder"
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @dragend.prevent="isDragOver = false"
    >
      <input
        ref="folderInputRef"
        type="file"
        webkitdirectory
        directory
        multiple
        style="display: none"
        @change="handleFolderSelect"
      />

      <div v-if="fileList.length === 0" class="upload-empty">
        <div class="upload-cloud">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 6.44 5.35 9.04C2.34 9.36 0 11.91 0 15c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" fill="#1a73e8" opacity="0.2"/>
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 6.44 5.35 9.04C2.34 9.36 0 11.91 0 15c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" fill="#1a73e8"/>
          </svg>
        </div>
        <p class="upload-title">点击选择文件夹或拖拽文件</p>
        <p class="upload-hint">支持整个文件夹或多个文件</p>
      </div>

      <div v-else class="upload-files">
        <div class="files-header">
          <div class="files-count">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M20 6H12L10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V8H20V18Z" fill="#5f6368"/>
            </svg>
            <span>已选择 {{ fileList.length }} 个文件</span>
          </div>
          <button class="clear-btn" @click.stop="clearFiles">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="#c5221f"/>
            </svg>
            清空
          </button>
        </div>
        <div class="files-list">
          <div v-for="(file, index) in fileList.slice(0, 20)" :key="index" class="file-row">
            <svg class="file-icon" viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="#5f6368"/>
            </svg>
            <span class="file-name" :title="file.name">{{ file.name }}</span>
            <span class="file-size">{{ formatSize(file.size) }}</span>
          </div>
          <div v-if="fileList.length > 20" class="more-files">
            还有 {{ fileList.length - 20 }} 个文件...
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-message">
      <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#c5221f"/>
      </svg>
      {{ errorMessage }}
    </div>

    <!-- 底部按钮 -->
    <div class="dialog-footer">
      <button class="btn btn-cancel" @click="handleClose">取消</button>
      <button class="btn btn-primary" @click="handleUpload()" :disabled="uploading">
        <span v-if="!uploading">开始上传</span>
        <span v-else class="loading">
          <svg class="spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="4" stroke-opacity="0.3"/>
            <path d="M12 2C6.48 2 2 6.48 2 12" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
          </svg>
          上传中...
        </span>
      </button>
    </div>
  </el-dialog>

  <!-- 冲突确认对话框 -->
  <el-dialog
    v-model="conflictVisible"
    width="480px"
    :close-on-click-modal="false"
    class="conflict-dialog"
    :show-close="false"
  >
    <div class="conflict-body">
      <!-- <div class="conflict-icon">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="#f9ab00"/>
        </svg>
      </div> -->
      <h3 class="conflict-title">文件冲突</h3>
      <p class="conflict-desc">检测到 {{ conflictData?.conflicts?.length || 0 }} 个文件已存在</p>

      <div v-if="conflictData" class="conflict-stats">
        <div class="stat-box new">
          <span class="stat-value">{{ conflictData.newFiles?.length || 0 }}</span>
          <span class="stat-label">新文件</span>
        </div>
        <div class="stat-box exist">
          <span class="stat-value">{{ conflictData.conflicts?.length || 0 }}</span>
          <span class="stat-label">已存在</span>
        </div>
      </div>

      <div v-if="conflictData?.conflicts" class="conflict-files">
        <div v-for="(file, index) in conflictData.conflicts.slice(0, 8)" :key="index" class="conflict-file">
          {{ file.path }}
        </div>
        <div v-if="conflictData.conflicts.length > 8" class="conflict-more">
          还有 {{ conflictData.conflicts.length - 8 }} 个文件...
        </div>
      </div>
    </div>

    <div class="conflict-footer">
      <button class="btn btn-cancel" @click="conflictVisible = false">取消</button>
      <button class="btn btn-secondary" @click="handleConflictChoice('skip')">跳过已存在</button>
      <button class="btn btn-primary" @click="handleConflictChoice('overwrite')">覆盖已存在</button>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadLpProject } from '@/services/main/webpage/lp-projects'
import fileImage from "@/assets/img/sub_1.png"

const props = defineProps({
  visible: Boolean,
  types: {
    type: Array,
    default: () => []
  },
  type: String,
  themes: {
    type: Array,
    default: () => []
  },
  theme: String
})

const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const folderInputRef = ref(null)
const uploading = ref(false)
const fileList = ref([])
const isDragOver = ref(false)
const errorMessage = ref('')

const form = ref({
  type: props.type || 's2-1',
  theme: props.theme || '',
  version: ''
})


watch(() => props.type, (newVal) => {
  if (newVal) {
    form.value.type = newVal
  }
})

watch(() => props.theme, (newVal) => {
  if (newVal) {
    form.value.theme = newVal
  }
})


const handleSelectFolder = () => {
  folderInputRef.value?.click()
}


const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  const processedFiles = files.map(file => {
    if (file.webkitRelativePath) {
      const pathParts = file.webkitRelativePath.split('/')
      const relativePath = pathParts.slice(1).join('/') || file.name
      return new File([file], relativePath, {
        type: file.type,
        lastModified: file.lastModified
      })
    }
    return file
  })

  fileList.value = processedFiles
  errorMessage.value = ''
}


const handleDrop = (event) => {
  event.preventDefault()
  isDragOver.value = false

  const files = Array.from(event.dataTransfer.files)
  if (files.length === 0) return

  const processedFiles = files.map(file => {
    if (file.webkitRelativePath) {
      const pathParts = file.webkitRelativePath.split('/')
      const relativePath = pathParts.slice(1).join('/') || file.name
      return new File([file], relativePath, {
        type: file.type,
        lastModified: file.lastModified
      })
    }
    return file
  })

  fileList.value = processedFiles
  ElMessage.success(`已选择 ${processedFiles.length} 个文件`)
  errorMessage.value = ''
}


const clearFiles = () => {
  fileList.value = []
  if (folderInputRef.value) {
    folderInputRef.value.value = ''
  }
}


const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(i > 1 ? 2 : 0) + ' ' + sizes[i]
}


const conflictVisible = ref(false)
const conflictData = ref(null)


const handleUpload = async (onConflict = 'check') => {
  errorMessage.value = ''


  if (!form.value.type) {
    errorMessage.value = '请选择项目类型'
    return
  }
  if (!form.value.theme) {
    errorMessage.value = '请输入主题名称'
    return
  }
  if (!form.value.version) {
    errorMessage.value = '请输入版本号'
    return
  }


  if (fileList.value.length === 0) {
    errorMessage.value = '请选择要上传的文件'
    return
  }


  if (onConflict === 'check') {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('type', form.value.type)
      formData.append('theme', form.value.theme)
      formData.append('version', form.value.version)
      formData.append('uploadType', 'files')
      formData.append('onConflict', 'check')

      fileList.value.forEach((file) => {
        formData.append('files', file)
      })

      const res = await uploadLpProject(formData)

      if (res.code === 0 && res.needConfirm && res.data?.conflicts?.length > 0) {
        conflictData.value = res.data
        conflictVisible.value = true
        uploading.value = false
        return
      }

      await doUpload('overwrite')
    } catch (error) {
      console.error('检查冲突失败:', error)
      errorMessage.value = '检查冲突失败，请重试'
      uploading.value = false
    }
  } else {
    await doUpload(onConflict)
  }
}


const doUpload = async (onConflict) => {
  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('type', form.value.type)
    formData.append('theme', form.value.theme)
    formData.append('version', form.value.version)
    formData.append('uploadType', 'files')
    formData.append('onConflict', onConflict)

    fileList.value.forEach((file) => {
      formData.append('files', file)
    })

    const res = await uploadLpProject(formData)

    if (res.code === 0) {
      const data = res.data || {}
      let msg = '上传成功'
      if (data.newFileCount || data.overwrittenCount || data.skippedCount) {
        const parts = []
        if (data.newFileCount) parts.push(`${data.newFileCount}个新文件`)
        if (data.overwrittenCount) parts.push(`${data.overwrittenCount}个覆盖`)
        if (data.skippedCount) parts.push(`${data.skippedCount}个跳过`)
        msg += ` (${parts.join(', ')})`
      }
      ElMessage.success(msg)
      emit('success')
      handleClose()
      conflictVisible.value = false
    } else {
      errorMessage.value = res.message || '上传失败'
    }
  } catch (error) {
    console.error('上传失败:', error)
    errorMessage.value = '上传失败，请重试'
  } finally {
    uploading.value = false
  }
}


const handleConflictChoice = async (choice) => {
  conflictVisible.value = false
  await doUpload(choice)
}


const handleClose = () => {
  form.value = {
    type: props.type || 's2-1',
    theme: props.theme || '',
    version: ''
  }
  fileList.value = []
  errorMessage.value = ''
  if (folderInputRef.value) {
    folderInputRef.value.value = ''
  }
  dialogVisible.value = false
}
</script>

<style lang="less" scoped>

.lp-upload-dialog {
  :deep(.el-dialog) {
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(60, 64, 67, 0.16);
    background: #fff;
  }

  :deep(.el-dialog__header) {
    display: none;
  }

  :deep(.el-dialog__body) {
    padding: 0;
    background: #fff;
  }

  :deep(.el-dialog__footer) {
    display: none;
  }
}


.dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;

  border-bottom: 1px solid #e8eaed;

  .header-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    svg {
      width: 28px;
      height: 28px;
    }
  }

  .header-content {
    flex: 1;

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 2px 0;
    }

    .header-desc {
      font-size: 13px;
      color: #5f6368;
      margin: 0;
    }
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    svg {
      width: 18px;
      height: 18px;
    }
  }
}


.info-card {
  padding: 20px 24px;

  .info-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    label {
      width: 70px;
      font-size: 13px;
      font-weight: 500;
      color: #5f6368;
    }

    .select-wrapper,
    .input-wrapper {
      flex: 1;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 8px;
        height: 8px;
        pointer-events: none;
      }
    }

    .select-wrapper::after {
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z' fill='%235f6368'/%3E%3C/svg%3E") no-repeat right center;
      background-size: contain;
    }
  }

  .custom-select,
  .custom-input {
    box-sizing: border-box;
    width: 100%;
    padding: 10px 32px 10px 12px;
    border: 1px solid #dadce0;
    border-radius: 8px;
    font-size: 14px;
    color: #202124;
    background: #fff;
    transition: all 0.2s;
    appearance: none;
    -webkit-appearance: none;

    &:hover {
      border-color: #5f6368;
    }

    &:focus {
      outline: none;
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    }

    &::placeholder {
      color: #9aa0a6;
    }
  }

  .select-wrapper.has-value .custom-select,
  .input-wrapper.has-value .custom-input {
    background: #f8f9fa;
  }
}


.upload-zone {
  margin: 0 24px 16px;
  padding: 24px;
  border: 2px dashed #dadce0;
  border-radius: 16px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: #1a73e8;
    background: #e8f0fe;
  }

  &.drag-over {
    border-color: #1a73e8;
    background: #e8f0fe;
    transform: scale(1.01);
  }

  &.has-files {
    border-style: solid;
    border-color: #e8eaed;
    background: #fff;
    padding: 0;
    cursor: default;

    &:hover {
      border-color: #e8eaed;
      background: #fff;
      transform: none;
    }
  }
}


.upload-empty {
  text-align: center;

  .upload-cloud {
    width: 64px;
    height: 64px;
    margin: 0 auto 12px;
  }

  .upload-title {
    font-size: 15px;
    font-weight: 500;
    color: #202124;
    margin: 0 0 4px 0;
  }

  .upload-hint {
    font-size: 13px;
    color: #5f6368;
    margin: 0;
  }
}


.upload-files {
  .files-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 12px 8px;
    border-bottom: 1px solid #f1f3f4;

    .files-count {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #202124;

      svg {
        flex-shrink: 0;
      }
    }

    .clear-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border: none;
      background: transparent;
      border-radius: 16px;
      font-size: 12px;
      color: #c5221f;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #fce8e6;
      }
    }
  }

  .files-list {
    max-height: 180px;
    overflow-y: auto;
    padding: 4px 0;

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
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    font-size: 13px;

    &:hover {
      background: #f1f3f4;
    }

    .file-icon {
      flex-shrink: 0;
      color: #5f6368;
    }

    .file-name {
      flex: 1;
      color: #202124;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      flex-shrink: 0;
      color: #9aa0a6;
      font-size: 11px;
    }
  }

  .more-files {
    text-align: center;
    padding: 8px;
    font-size: 12px;
    color: #5f6368;
  }
}


.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 24px 16px;
  padding: 10px 12px;
  background: #fce8e6;
  border-radius: 8px;
  font-size: 13px;
  color: #c5221f;
}


.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px 20px;
  border-top: 1px solid #e8eaed;

  .btn {
    padding: 8px 20px;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &.btn-cancel {
      background: transparent;
      color: #5f6368;

      &:hover {
        background: #f1f3f4;
      }
    }

    &.btn-primary {
      background: #1a73e8;
      color: #fff;

      &:hover:not(:disabled) {
        background: #1557b0;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;

      .spinner {
        animation: spin 1s linear infinite;
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


.conflict-dialog {
  :deep(.el-dialog) {
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(60, 64, 67, 0.16);
  }

  :deep(.el-dialog__header) {
    display: none;
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }

  :deep(.el-dialog__footer) {
    display: none;
  }
}

.conflict-body {
  padding: 24px;
  text-align: center;

  .conflict-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 12px;

    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 32px;
      height: 32px;
    }
  }

  .conflict-title {
    font-size: 18px;
    font-weight: 500;
    color: #202124;
    margin: 0 0 4px 0;
  }

  .conflict-desc {
    font-size: 14px;
    color: #5f6368;
    margin: 0 0 20px 0;
  }

  .conflict-stats {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 20px;

    .stat-box {
      padding: 16px 24px;
      border-radius: 12px;
      min-width: 80px;









      .stat-value {
        display: block;
        font-size: 24px;
        font-weight: 500;
      }

      &.new .stat-value {
        color: #137333;
      }

      &.exist .stat-value {
        color: #b06000;
      }

      .stat-label {
        font-size: 12px;
        color: #5f6368;
      }
    }
  }

  .conflict-files {
    max-height: 160px;
    overflow-y: auto;
    text-align: left;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 8px;

    .conflict-file {
      padding: 6px 10px;
      font-size: 12px;
      color: #5f6368;
      font-family: monospace;

      &:hover {
        background: #fff;
        border-radius: 4px;
      }
    }

    .conflict-more {
      text-align: center;
      padding: 6px;
      font-size: 12px;
      color: #5f6368;
    }
  }
}

.conflict-footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px 20px;
  border-top: 1px solid #e8eaed;

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;

    &.btn-cancel {
      background: transparent;
      color: #5f6368;

      &:hover {
        background: #f1f3f4;
      }
    }

    &.btn-secondary {
      background: #f1f3f4;
      color: #202124;

      &:hover {
        background: #e8eaed;
      }
    }

    &.btn-primary {
      background: #1a73e8;
      color: #fff;

      &:hover {
        background: #1557b0;
      }
    }
  }
}


@media (max-width: 768px) {
  .lp-upload-dialog {
    :deep(.el-dialog) {
      width: 95vw !important;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    :deep(.el-dialog__body) {
      max-height: 90vh;
      overflow-y: auto;
    }

    .dialog-header {
      padding: 12px 16px;
      flex-shrink: 0;

      .header-icon {
        width: 36px;
        height: 36px;

        svg {
          width: 20px;
          height: 20px;
        }
      }

      .header-content {
        flex: 1;
        min-width: 0;

        .header-title {
          font-size: 16px;
        }

        .header-desc {
          font-size: 12px;
        }
      }

      .close-btn {
        width: 28px;
        height: 28px;

        svg {
          width: 16px;
          height: 16px;
        }
      }
    }
  }

  .info-card {
    padding: 12px 16px;

    .info-row {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
      margin-bottom: 10px;

      label {
        width: auto;
        font-size: 12px;
      }

      .select-wrapper,
      .input-wrapper {
        min-width: 0;
      }

      .custom-select,
      .custom-input {
        padding: 8px 28px 8px 10px;
        font-size: 13px;
        min-width: 0;
      }
    }
  }

  .upload-zone {
    margin: 0 16px 12px;
    padding: 16px 12px;

    .upload-cloud {
      width: 40px;
      height: 40px;
    }

    .upload-title {
      font-size: 14px;
    }

    .upload-hint {
      font-size: 12px;
    }
  }

  .upload-files {
    .files-header {
      padding: 8px 8px 6px;

      .files-count {
        font-size: 12px;

        svg {
          width: 16px;
          height: 16px;
        }
      }

      .clear-btn {
        font-size: 11px;
        padding: 3px 6px;
      }
    }

    .files-list {
      max-height: 120px;
    }

    .file-row {
      padding: 6px 8px;
      font-size: 12px;
    }
  }

  .error-message {
    margin: 0 16px 12px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .dialog-footer {
    padding: 12px 16px 16px;
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    background: #fff;

    .btn {
      padding: 8px 16px;
      font-size: 13px;
    }
  }


  .conflict-dialog {
    :deep(.el-dialog) {
      width: 95vw !important;
      max-height: 85vh;
    }

    :deep(.el-dialog__body) {
      max-height: 85vh;
      overflow-y: auto;
    }
  }

  .conflict-body {
    padding: 16px;

    .conflict-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 8px;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .conflict-title {
      font-size: 16px;
    }

    .conflict-desc {
      font-size: 13px;
      margin-bottom: 16px;
    }

    .conflict-stats {
      gap: 12px;
      margin-bottom: 16px;

      .stat-box {
        padding: 10px 16px;
        min-width: 50px;

        .stat-value {
          font-size: 18px;
        }

        .stat-label {
          font-size: 11px;
        }
      }
    }

    .conflict-files {
      max-height: 120px;

      .conflict-file {
        font-size: 11px;
        padding: 4px 8px;
      }
    }
  }

  .conflict-footer {
    padding: 12px 16px;
    flex-wrap: wrap;
    flex-shrink: 0;

    .btn {
      padding: 8px 12px;
      font-size: 12px;
    }
  }
}
</style>
