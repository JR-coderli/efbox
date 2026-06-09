<template>
  <div class="user-page">
    <!-- 表格列表 -->
    <user-content
      :content-config="contentConfig"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
    >
      <!-- 头像自定义插槽 -->
      <template #avatar_url="scope">
        <div class="avatar-cell" @click="handlePreviewAvatar(getAvatarUrl(scope.avatar_url, scope.name))">
          <el-image
            :src="getAvatarUrl(scope.avatar_url, scope.name)"
            fit="cover"
            class="user-avatar"
          >
            <template #error>
              <div class="avatar-error">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.13 2.76-4.05 4.92-7.82 5.42.76.09 1.51.14 2.3.14 3.52 0 1.22-.05 2.44-.14 3.52 3.77-.5 7.69-2.66 7.82-5.42-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
            </template>
          </el-image>
        </div>
      </template>
    </user-content>

    <!-- 头像预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      title=""
      width="400"
      :append-to-body="true"
      class="avatar-preview-dialog"
      destroy-on-close
    >
      <div class="preview-content">
        <div class="preview-image-wrapper">
          <img
            :src="previewUrl"
            class="preview-image"
            @error="handleImageError"
            alt="头像预览"
          />
        </div>
      </div>
      <template #footer>
        <div class="preview-footer">
          <button class="google-btn google-btn-text" @click="previewVisible = false">
            关闭
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 弹窗 -->
    <user-modal
      ref="modalRef"
      :modal-config="modalConfig"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import UserContent from './c-cpns/user-content.vue'
import UserModal from './c-cpns/user-modal.vue'
import contentConfig from './config/content.config.ts'
import modalConfig from './config/modal.config.ts'
import useMainStore from '@/stores/main/main'
import { storeToRefs } from 'pinia'


const DEFAULT_AVATAR = modalConfig.DEFAULT_AVATAR


const mainStore = useMainStore()
const { entireRoles } = storeToRefs(mainStore)

const contentRef = ref()
const modalRef = ref()


const previewVisible = ref(false)
const previewUrl = ref('')


function getAvatarUrl(avatarUrl, name) {
  if (avatarUrl) {
    return avatarUrl
  }
  return DEFAULT_AVATAR + (name || 'default')
}

function handlePreviewAvatar(url) {
  if (url) {
    previewUrl.value = url
    previewVisible.value = true
  }
}


function handleImageError(event) {
  console.error('头像预览加载失败:', previewUrl.value)


}

function handleNewClick() {
  modalRef.value?.setModalVisible('new')
}

function handleEditClick(rowData) {
  modalRef.value?.setModalVisible('edit', rowData)
}


onMounted(() => {
  if (entireRoles.value.length === 0) {
    mainStore.fetchEntireDataAction()
  }
})
</script>

<style lang="less" scoped>
.user-page {

  .avatar-cell {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      transition: transform 0.2s ease;

      :deep(.el-image__inner) {
        border-radius: 50%;
      }
    }

    .avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #e8eaed;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 24px;
        height: 24px;
        fill: #5f6368;
      }
    }

    .avatar-error {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #f1f3f4;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 20px;
        height: 20px;
        fill: #9aa0a6;
      }
    }

    &:hover {
      .user-avatar {
        transform: scale(1.1);
      }

      .avatar-placeholder {
        background-color: #dadce0;
      }
    }
  }
}


:deep(.avatar-preview-dialog) {
  .el-dialog {
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    overflow: hidden;
  }

  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 0;
  }

  .el-dialog__footer {
    padding: 0;
    border-top: none;
  }
}

.preview-content {
  .preview-image-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f8f9fa;
    min-height: 300px;
    max-height: 500px;
    padding: 20px;
  }

  .preview-image {
    max-width: 100%;
    max-height: 500px;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 8px;
  }
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
}

.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  height: 36px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

.google-btn-text {
  background-color: transparent;
  color: #1a73e8;

  &:hover {
    background-color: #f1f3f4;
  }

  &:active {
    background-color: #e8eaed;
  }
}


@media (max-width: 768px) {
  .avatar-cell {
    .user-avatar,
    .avatar-placeholder,
    .avatar-error {
      width: 32px;
      height: 32px;
    }

    .avatar-placeholder svg,
    .avatar-error svg {
      width: 18px;
      height: 18px;
    }
  }

  :deep(.avatar-preview-dialog) {
    width: 95% !important;
    margin: 0 auto;
  }

  .preview-content {
    .preview-image-wrapper {
      min-height: 200px;
      max-height: 350px;
    }

    .preview-image {
      max-height: 350px;
    }
  }
}

@media (max-width: 480px) {
  :deep(.avatar-preview-dialog) {
    width: 100% !important;
    border-radius: 12px 12px 0 0;
    margin: 0;
  }
}
</style>
