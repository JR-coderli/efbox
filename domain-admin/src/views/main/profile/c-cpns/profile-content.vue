<template>
  <div class="profile-content">
    <div class="profile-container">
      <!-- 左侧：头像区域 -->
      <div class="profile-sidebar">
        <div class="avatar-card">
          <div class="avatar-wrapper" @click="handleAvatarClick">
            <el-avatar :size="120" :src="displayAvatarUrl" class="profile-avatar" />
            <div class="avatar-overlay">
              <el-icon><Camera /></el-icon>
              <span>更换</span>
            </div>
          </div>
          <input
            ref="avatarInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleAvatarChange"
          />
          <p class="avatar-hint">点击头像更换图片</p>
          <p class="avatar-subhint">支持 JPG、PNG，最大 2MB</p>
        </div>
      </div>

      <!-- 右侧：表单区域 -->
      <div class="profile-main">
        <div class="form-card">
          <div class="form-header">
            <h2 class="form-title">个人信息</h2>
            <p class="form-subtitle">管理您的个人信息和偏好设置</p>
          </div>

          <el-form
            ref="formRef"
            :model="formData"
            :rules="rules"
            label-position="top"
            class="profile-form"
          >
            <!-- 用户名（只读） -->
            <div class="form-group">
              <label class="form-label">用户名</label>
              <el-input
                v-model="formData.name"
                disabled
                class="google-input"
              />
            </div>

            <!-- 昵称 -->
            <div class="form-group">
              <label class="form-label">昵称</label>
              <el-input
                v-model="formData.nickname"
                placeholder="设置昵称后，系统将显示昵称而非用户名"
                class="google-input"
                maxlength="20"
                show-word-limit
              />
            </div>

            <!-- 角色信息（只读） -->
            <div class="form-group">
              <label class="form-label">角色</label>
              <el-input
                :model-value="roleName"
                disabled
                class="google-input"
              />
            </div>

            <!-- 按钮组 -->
            <div class="form-actions">
              <button class="google-btn google-btn-text" @click="handleCancel">
                取消
              </button>
              <button class="google-btn google-btn-primary" @click="handleSave" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存更改' }}
              </button>
            </div>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import useLoginStore from '@/stores/login/login'
import { localCache } from '@/utils/cache'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import hyRequest from '@/services/request'
import { LOGIN_TOKEN, USER_INFO } from '@/global/constants'
import { BASE_URL } from '@/services/request/config'

const loginStore = useLoginStore()
const formRef = ref()
const avatarInputRef = ref()
const isSaving = ref(false)


const formData = reactive({
  name: '',
  nickname: '',
  avatar_url: '',
  role_id: null
})


const roleName = computed(() => {
  return loginStore.userInfo?.role?.name || ''
})


const DEFAULT_AVATAR = 'https://api.dicebear.com/9.x/avataaars/svg?seed='


const displayAvatarUrl = computed(() => {
  const url = formData.avatar_url || ''


  if (!url) {
    return DEFAULT_AVATAR + (formData.name || 'default')
  }


  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }


  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
})


const rules = {
  nickname: [
    { max: 20, message: '昵称长度不能超过20个字符', trigger: 'blur' }
  ]
}


function initFormData() {
  const userInfo = loginStore.userInfo
  formData.name = userInfo.name || ''
  formData.nickname = userInfo.nickname || ''
  formData.avatar_url = userInfo.avatar_url || ''
  formData.role_id = userInfo.role_id || null
}


function handleAvatarClick() {
  avatarInputRef.value?.click()
}


async function handleAvatarChange(event) {
  const file = event.target.files?.[0]
  if (!file) return


  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }


  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过2MB')
    return
  }


  const uploadFormData = new FormData()
  uploadFormData.append('cms_user_avatar', file)

  try {
    isSaving.value = true
    const result = await hyRequest.upload({
      url: '/file/avatar',
      data: uploadFormData
    })

    if (result.code === 0) {
      formData.avatar_url = result.data

      const updatedUserInfo = {
        ...loginStore.userInfo,
        avatar_url: result.data
      }
      loginStore.userInfo = updatedUserInfo
      localCache.setCache(USER_INFO, updatedUserInfo)
      ElMessage.success('头像上传成功')
    } else {
      ElMessage.error(result.message || '头像上传失败')
    }
  } catch (error) {
    console.error('上传头像失败:', error)
    ElMessage.error('头像上传失败')
  } finally {
    isSaving.value = false

    event.target.value = ''
  }
}


function handleCancel() {
  initFormData()
}


async function handleSave() {
  try {
    isSaving.value = true

    const updateData = {
      nickname: formData.nickname || null
    }

    const result = await hyRequest.patch({
      url: `/cms_users/${loginStore.userInfo.id}`,
      data: updateData
    })

    if (result.code === 0 || result.message === '修改用户成功~') {

      const updatedUserInfo = {
        ...loginStore.userInfo,
        nickname: formData.nickname
      }
      loginStore.userInfo = updatedUserInfo
      localCache.setCache(USER_INFO, updatedUserInfo)
      ElMessage.success('保存成功')
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  initFormData()
})
</script>

<style lang="less" scoped>
.profile-content {
  min-height: 100%;
  padding: 24px;
  background-color: #f8f9fa;
}

.profile-container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
  align-items: flex-start;
}


.profile-sidebar {
  flex-shrink: 0;
  width: 280px;

  .avatar-card {
    background: #fff;
    border-radius: 16px;
    padding: 40px 24px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .avatar-wrapper {
    position: relative;
    cursor: pointer;
    margin-bottom: 20px;

    .profile-avatar {
      transition: all 0.3s ease;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

      :deep(.el-avatar__icon) {
        svg {
          width: 60px;
          height: 60px;
          fill: #5f6368;
        }
      }
    }

    .avatar-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      color: #fff;
      font-size: 12px;

      .el-icon {
        font-size: 28px;
        margin-bottom: 4px;
      }

      span {
        font-size: 12px;
      }
    }

    &:hover {
      .profile-avatar {
        transform: scale(1.05);
      }

      .avatar-overlay {
        opacity: 1;
      }
    }
  }

  .avatar-hint {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: #202124;
    font-weight: 500;
  }

  .avatar-subhint {
    margin: 0;
    font-size: 12px;
    color: #5f6368;
  }
}


.profile-main {
  flex: 1;
  min-width: 0;

  .form-card {
    background: #fff;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .form-header {
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e8eaed;

    .form-title {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 500;
      color: #202124;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
    }

    .form-subtitle {
      margin: 0;
      font-size: 14px;
      color: #5f6368;
    }
  }

  .profile-form {
    .form-group {
      margin-bottom: 24px;

      &:last-of-type {
        margin-bottom: 0;
      }
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #3c4043;
      margin-bottom: 8px;

      .optional {
        color: #9aa0a6;
        font-weight: normal;
      }
    }

    :deep(.google-input) {
      .el-input__wrapper {
        border-radius: 8px;
        border: 1px solid #dadce0;
        box-shadow: none;
        padding: 10px 14px;
        transition: all 0.2s ease;
        background-color: #f8f9fa;

        &:hover {
          border-color: #1a73e8;
          background-color: #fff;
        }

        &.is-focus {
          border-color: #1a73e8;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
        }

        &.is-disabled {
          background-color: #f1f3f4;
          border-color: #dadce0;

          .el-input__inner {
            color: #5f6368;
          }
        }

        .el-input__inner {
          color: #202124;
          font-size: 14px;

          &::placeholder {
            color: #9aa0a6;
          }
        }
      }

      .el-input__count {
        color: #9aa0a6;
        font-size: 12px;
        background: none;
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e8eaed;
    }
  }
}

.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 24px;
  height: 38px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  min-width: 80px;
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;

  &:hover:not(:disabled) {
    background-color: #1557b0;
    box-shadow: 0 2px 8px rgba(26, 115, 232, 0.3);
  }

  &:active:not(:disabled) {
    background-color: #174ea6;
  }

  &:disabled {
    background-color: #dadce0;
    color: #9aa0a6;
    cursor: not-allowed;
  }
}

.google-btn-text {
  background-color: transparent;
  color: #5f6368;

  &:hover {
    background-color: #f1f3f4;
    color: #202124;
  }

  &:active {
    background-color: #e8eaed;
  }
}


@media (max-width: 900px) {
  .profile-container {
    flex-direction: column;
  }

  .profile-sidebar {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;

    .avatar-card {
      padding: 32px 24px;
    }
  }

  .profile-main {
    width: 100%;

    .form-card {
      padding: 24px;
    }
  }
}


@media (max-width: 768px) {
  .profile-content {
    padding: 16px;
  }

  .profile-container {
    gap: 16px;
  }

  .profile-sidebar {
    .avatar-card {
      padding: 24px 20px;

      .avatar-wrapper {
        .profile-avatar {
          width: 80px !important;
          height: 80px !important;
        }
      }
    }

    .avatar-hint {
      font-size: 13px;
    }

    .avatar-subhint {
      font-size: 11px;
    }
  }

  .profile-main {
    .form-card {
      padding: 20px;
      border-radius: 12px;
    }

    .form-header {
      margin-bottom: 24px;
      padding-bottom: 16px;

      .form-title {
        font-size: 20px;
      }

      .form-subtitle {
        font-size: 13px;
      }
    }

    .profile-form {
      .form-group {
        margin-bottom: 20px;
      }

      .form-actions {
        flex-direction: column-reverse;
        gap: 8px;
        margin-top: 24px;
        padding-top: 20px;

        .google-btn {
          width: 100%;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .profile-content {
    padding: 12px;
  }

  .profile-main {
    .form-card {
      padding: 16px;
    }

    .form-header {
      .form-title {
        font-size: 18px;
      }
    }

    .google-btn {
      height: 36px;
    }
  }
}
</style>
