<template>
  <el-dialog
    v-model="dialogVisible"
    :title="mode === 'new' ? '新建用户' : '编辑用户'"
    width="500"
    style="max-width: 90vw; max-height: 90vh; overflow-y: auto;"
    :close-on-click-modal="false"
    class="google-dialog"
    destroy-on-close
    center
    align-center
  >
    <div class="dialog-content">
      <div class="form-info" v-if="mode === 'edit' && editData">
        <span class="info-label">编辑用户</span>
        <span class="info-value">{{ editData.name }}</span>
      </div>

      <el-form
        :model="formData"
        ref="formRef"
        label-position="left"
        label-width="70px"
        :rules="rules"
        class="google-form form-row-layout"
      >
        <div class="form-main">
          <!-- 用户名 -->
          <el-form-item prop="name" label="用户名" class="form-item-custom">
            <el-input
              v-model="formData.name"
              placeholder="请输入用户名"
              :disabled="mode === 'edit'"
              class="google-input"
            />
          </el-form-item>

          <!-- 密码 -->
          <el-form-item v-if="mode === 'new'" prop="password" label="密码" class="form-item-custom">
            <el-input
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              show-password
              class="google-input"
            />
          </el-form-item>

          <el-form-item v-else prop="password" label="密码" class="form-item-custom">
            <el-input
              v-model="formData.password"
              type="password"
              placeholder="留空则不修改密码"
              show-password
              class="google-input"
            />
          </el-form-item>

          <!-- 角色 -->
          <el-form-item prop="role_id" label="角色" class="form-item-custom">
            <el-select
              v-model="formData.role_id"
              placeholder="请选择角色"
              :disabled="isRoleDisabled"
              class="google-select"
              :class="{ 'is-disabled': isRoleDisabled }"
              popper-class="user-modal-select-dropdown"
            >
              <el-option
                v-for="role in filteredRoles"
                :key="role.id"
                :label="role.name"
                :value="role.id"
              />
            </el-select>
          </el-form-item>
        </div>

        <!-- 头像上传区域 -->
        <div class="form-side">
          <div class="avatar-section">
            <span class="avatar-label">头像</span>
            <div class="avatar-upload">
            <div class="avatar-preview" @click="handleAvatarClick">
              <el-avatar :size="60" :src="displayAvatarUrl" class="preview-avatar">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.13 2.76-4.05 4.92-7.82 5.42.76.09 1.51.14 2.3.14 3.52 0 1.22-.05 2.44-.14 3.52 3.77-.5 7.69-2.66 7.82-5.42-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </el-avatar>
              <div class="avatar-overlay">
                <el-icon><Camera /></el-icon>
              </div>
            </div>
            <div class="avatar-actions">
              <button class="google-btn google-btn-text" @click="handleAvatarClick" type="button">
                选择图片
              </button>
              <button
                v-if="formData.avatar_url"
                class="google-btn google-btn-text"
                @click="handleClearAvatar"
                type="button"
              >
                清除
              </button>
            </div>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleAvatarChange"
            />
            <span class="form-hint">建议尺寸 200x200</span>
          </div>
          </div>
        </div>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <button class="google-btn google-btn-text" @click="dialogVisible = false">
          取消
        </button>
        <button class="google-btn google-btn-primary" @click="handleConfirmClick" :disabled="isSubmitDisabled">
          {{ mode === 'new' ? '创建' : '保存' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import useSystemStore from '@/stores/main/system/system'
import useLoginStore from '@/stores/login/login'
import { reactive, ref, computed } from 'vue'
import useMainStore from '@/stores/main/main'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import hyRequest from '@/services/request'
import modalConfig from '../config/modal.config.ts'
import { localCache } from '@/utils/cache'
import { USER_INFO } from '@/global/constants'


const DEFAULT_AVATAR = modalConfig.DEFAULT_AVATAR

const props = defineProps({
  modalConfig: {
    type: Object,
    default: () => ({})
  }
})


const mainStore = useMainStore()
const loginStore = useLoginStore()
const { entireRoles } = storeToRefs(mainStore)

const currentUser = loginStore.userInfo
const TECHNICIAN_ROLE_ID = 1


const isTechnician = computed(() => {
  return currentUser?.role?.id === TECHNICIAN_ROLE_ID
})


const filteredRoles = computed(() => {
  if (isTechnician.value) {
    return entireRoles.value
  } else {
    return entireRoles.value.filter(role => role.id !== TECHNICIAN_ROLE_ID)
  }
})


const isRoleDisabled = computed(() => {
  return false
})


const isSubmitDisabled = computed(() => {
  if (isTechnician.value) return false
  return mode.value === 'edit' && editData.value?.role_id === TECHNICIAN_ROLE_ID
})


const displayAvatarUrl = computed(() => {
  if (!formData.avatar_url) {
    return DEFAULT_AVATAR + (formData.name || 'default')
  }
  return formData.avatar_url
})

const formRef = ref(null)
const dialogVisible = ref(false)
const mode = ref('new')
const initialData = {}
const editData = ref()

for (const item of props.modalConfig.formItems) {
  initialData[item.prop] = item.initialValue || ''
}
const formData = reactive({ ...initialData })


const rules = computed(() => {
  const baseRules = {
    name: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 20, message: '用户名长度为2-20个字符', trigger: 'blur' }
    ],
    role_id: [
      { required: true, message: '请选择角色', trigger: 'change' }
    ]
  }

  if (mode.value === 'new') {
    baseRules.password = [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, max: 20, message: '密码长度为6-20个字符', trigger: 'blur' }
    ]
  }

  return baseRules
})

function setModalVisible(newMode = 'new', rowData) {
  dialogVisible.value = true
  mode.value = newMode

  if (mode.value === 'edit' && rowData) {
    for (const key in formData) {
      formData[key] = rowData[key] || ''
    }
    editData.value = rowData

    if (!isTechnician.value && rowData.role_id === TECHNICIAN_ROLE_ID) {
      ElMessage.warning('您无权编辑技术员账号')
      dialogVisible.value = false
      return
    }
  } else {
    for (const key in formData) {
      formData[key] = initialData[key]
    }
    editData.value = null
  }


  formRef.value?.clearValidate()
}

const systemStore = useSystemStore()
function handleConfirmClick() {
  formRef.value?.validate(valid => {
    if (!valid) {
      return
    }

    dialogVisible.value = false

    if (mode.value === 'edit' && editData.value) {
      const updateData = { ...formData }
      if (!updateData.password) {
        delete updateData.password
      }

      if (updateData.avatar_url === '') {
        updateData.avatar_url = null
      }

      if (!isTechnician.value && updateData.role_id === TECHNICIAN_ROLE_ID) {
        ElMessage.error('您无权将用户设为技术员角色')
        return
      }

      systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, updateData)


      if (currentUser && editData.value.id === currentUser.id) {
        const updatedUserInfo = {
          ...currentUser,
          ...updateData
        }
        loginStore.userInfo = updatedUserInfo
        localCache.setCache(USER_INFO, updatedUserInfo)
      }
    } else {
      if (!isTechnician.value && formData.role_id === TECHNICIAN_ROLE_ID) {
        ElMessage.error('您无权创建技术员账号')
        return
      }


      const createData = { ...formData }
      if (!createData.avatar_url) {
        delete createData.avatar_url
      }

      systemStore.newPageDataAction(props.modalConfig.pageName, createData)
    }
  })
}


const avatarInputRef = ref(null)
const isUploadingAvatar = ref(false)


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


  if (mode.value === 'new') {
    ElMessage.warning('请先保存用户信息后再上传头像')
    return
  }


  const uploadFormData = new FormData()
  uploadFormData.append('cms_user_avatar', file)

  try {
    isUploadingAvatar.value = true

    const result = await hyRequest.upload({
      url: `/file/user-avatar/${editData.value.id}`,
      data: uploadFormData
    })

    if (result.code === 0) {
      formData.avatar_url = result.data
      ElMessage.success('头像上传成功')
    } else {
      ElMessage.error(result.message || '头像上传失败')
    }
  } catch (error) {
    console.error('上传头像失败:', error)
    ElMessage.error('头像上传失败')
  } finally {
    isUploadingAvatar.value = false

    event.target.value = ''
  }
}


function handleClearAvatar() {
  formData.avatar_url = ''
}

defineExpose({ setModalVisible })
</script>

<style lang="less" scoped>


:deep(.google-dialog) {
  .el-dialog {
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .el-dialog__header {
    padding: 24px 24px 16px;
    border-bottom: 1px solid #e8eaed;
  }

  .el-dialog__title {
    font-size: 20px;
    font-weight: 500;
    color: #202124;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
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

  .el-dialog__body {
    padding: 20px 24px;
    max-height: 70vh;
    overflow-y: auto;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid #e8eaed;
  }
}

.dialog-content {
  .form-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
    background-color: #f8f9fa;
    border-radius: 8px;

    .info-label {
      font-size: 13px;
      color: #5f6368;
    }

    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: #202124;
    }
  }
}


.google-form {

  &.form-row-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;

    .form-main {
      flex: 1;
      min-width: 0;
    }

    .form-side {
      flex-shrink: 0;
      width: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 4px;
    }
  }

  :deep(.form-item-custom) {
    margin-bottom: 14px;

    &:last-child {
      margin-bottom: 0;
    }

    .el-form-item__label {
      height: 36px;
      line-height: 36px;
      padding-right: 12px;
      padding-top: 20px; // 与输入框对齐
      font-size: 14px;
      font-weight: 500;
      color: #3c4043;

      &::before {
        content: '*';
        color: #c5221f;
        margin-right: 4px;
      }
    }

    &:not(.is-required) .el-form-item__label::before {
      content: '';
      margin-right: 0;
    }

    .el-form-item__content {
      line-height: normal;
      position: relative;
      padding-top: 20px; // 给上方错误提示预留空间
    }


    .el-form-item__error {
      position: absolute;
      left: 0;
      top: 4px; // 紧贴输入框上边框
      background: #fff;
      padding: 2px 6px;
      color: #ef4444;
      font-size: 12px;
      line-height: 14px;
      z-index: 10;
    }
  }


  .form-main > .el-form-item:first-child {
    margin-top: 12px;
  }

  .form-label {
    display: none;
  }

  .required {
    color: #c5221f;
    margin-left: 2px;
  }

  .form-hint {
    display: block;
    font-size: 12px;
    color: #5f6368;
    margin-top: 4px;
  }

  .form-error {
    display: block;
    font-size: 12px;
    color: #c5221f;
    margin-top: 4px;
  }

  :deep(.google-input) {
    .el-input__wrapper {
      border-radius: 4px;
      border: 1px solid #dadce0;
      box-shadow: none;
      padding: 7px 12px;
      transition: all 0.2s ease;

      &:hover {
        border-color: #1a73e8;
      }

      &.is-focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
      }

      .el-input__inner {
        color: #202124;
        font-size: 14px;

        &::placeholder {
          color: #9aa0a6;
        }
      }
    }
  }

  :deep(.google-select) {
    width: 100%;

    &.is-disabled {
      .el-input__wrapper {
        background-color: #f1f3f4;
        border-color: #dadce0;
      }
    }

    .el-input__wrapper {
      border-radius: 4px;
      border: 1px solid #dadce0;
      box-shadow: none;
      padding: 7px 12px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: #1a73e8;
      }

      &.is-focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
      }

      .el-input__inner {
        color: #202124;
        font-size: 14px;
        cursor: pointer;
      }
    }
  }
}


:deep(.el-form-item) {
  margin-bottom: 0;

  .el-form-item__error {
    font-size: 12px;
    color: #c5221f;
    margin-top: 4px;
    position: static;
  }

  &.is-error {
    :deep(.google-input),
    :deep(.google-select) {
      .el-input__wrapper {
        border-color: #c5221f;

        &:hover {
          border-color: #c5221f;
        }
      }
    }
  }
}


.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
  min-width: 64px;
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;

  &:hover:not(:disabled) {
    background-color: #1557b0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
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
  color: #1a73e8;

  &:hover {
    background-color: #f1f3f4;
  }

  &:active {
    background-color: #e8eaed;
  }
}


.google-form {
  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .avatar-label {
    font-size: 14px;
    font-weight: 500;
    color: #3c4043;
  }

  .avatar-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .avatar-preview {
      position: relative;
      width: fit-content;
      cursor: pointer;

      .preview-avatar {
        transition: all 0.2s ease;

        :deep(.el-avatar__icon) {
          svg {
            width: 30px;
            height: 30px;
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
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;

        .el-icon {
          color: #fff;
          font-size: 24px;
        }
      }

      &:hover {
        .avatar-overlay {
          opacity: 1;
        }
      }
    }

    .avatar-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;

      .google-btn {
        padding: 0 12px;
        height: 28px;
        font-size: 12px;
        width: 100%;
      }
    }

    .form-hint {
      text-align: center;
      font-size: 11px;
    }
  }
}


@media (max-width: 768px) {
  :deep(.google-dialog) {
    width: 95% !important;
    margin: 0 auto;

    .el-dialog__header {
      padding: 16px;
    }

    .el-dialog__body {
      padding: 16px;
    }

    .el-dialog__footer {
      padding: 12px 16px;
    }

    .el-dialog__title {
      font-size: 18px;
    }
  }

  .dialog-content {
    .form-info {
      padding: 10px 12px;
      margin-bottom: 16px;
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .google-form {
    &.form-row-layout {
      flex-direction: column-reverse;

      .form-side {
        width: 100%;
        flex-direction: row;
        justify-content: center;
        gap: 16px;
        padding: 12px 0;
        border-top: 1px solid #e8eaed;
        border-bottom: 1px solid #e8eaed;
        margin-bottom: 16px;
      }

      .avatar-upload {
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;

        .avatar-actions {
          flex-direction: row;
        }
      }
    }

    :deep(.form-item-custom) {
      margin-bottom: 16px;
    }

    :deep(.google-input),
    :deep(.google-select) {
      .el-input__wrapper {
        padding: 8px 10px;
      }
    }
  }

  .dialog-footer {
    flex-direction: column-reverse;

    .google-btn {
      width: 100%;
    }
  }
}


@media (max-width: 480px) {
  :deep(.google-dialog) {
    width: 100% !important;
    border-radius: 12px 12px 0 0;
    margin: 0;
  }
}
</style>

<style lang="less">

.user-modal-select-dropdown {
  z-index: 2100 !important;
}
</style>
