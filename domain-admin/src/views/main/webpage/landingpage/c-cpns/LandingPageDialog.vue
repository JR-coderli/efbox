<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑落地页' : '新建落地页'"
    width="800px"
    style="max-width: 90vw;"
    top="8vh"
    :close-on-click-modal="false"
    class="google-dialog landing-page-dialog"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      class="landing-form"
    >
      <div class="form-row" v-if="isEdit">
        <el-form-item label="Lander名称" prop="landingname">
          <el-input
            v-model="formData.landingname"
            placeholder="请输入落地页名称"
            clearable
          />
        </el-form-item>
      </div>

      <div class="form-row">
        <el-form-item label="URL地址" prop="landing_url" class="full-width">
          <el-input
            v-model="formData.landing_url"
            placeholder="https://example.com"
            clearable
            :disabled="isBasicFieldDisabled"
          />
        </el-form-item>
      </div>

      <div class="form-row" v-if="isEdit">
        <el-form-item label="NAS文件名" class="full-width">
          <el-input
            v-model="formData.nas_filename"
            placeholder="请输入NAS文件名"
            clearable
          />
        </el-form-item>
      </div>

      <div class="form-row" v-if="isEdit">
        <el-form-item label="效果" class="full-width">
          <el-input
            v-model="formData.effect"
            placeholder="请输入效果描述"
            clearable
          />
        </el-form-item>
      </div>

      <div class="form-row" v-if="isEdit">
        <el-form-item label="备注" class="full-width">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
            clearable
          />
        </el-form-item>
      </div>

      <div class="form-row">
        <el-form-item label="分类（可选）" class="full-width">
          <div class="category-select-wrapper">
            <el-select
              v-model="formData.category_id"
              placeholder="请选择分类，可不选"
              clearable
              class="category-select"
              popper-class="landing-dialog-select-dropdown"
              :disabled="isBasicFieldDisabled"
              :popper-options="{
                strategy: 'fixed',
                placement: 'bottom-start'
              }"
            >
              <el-option
                v-for="item in categories"
                :key="item.id"
                :label="item.category_name"
                :value="item.id"
              />
            </el-select>
            <el-tooltip content='不选择分类时，落地页将显示在"全部分类"中' placement="top">
              <el-icon class="info-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </el-form-item>
      </div>

      <div class="form-row" v-if="!isVisibilityDisabled">
        <el-form-item label="可见性">
          <el-radio-group v-model="formData.visibility">
            <el-radio value="public">公共</el-radio>
            <el-radio value="private">私有</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <div class="form-row" v-if="!isEdit">
        <el-form-item label="截图类型">
          <el-radio-group v-model="formData.screenshot_type">
            <el-radio value="mobile">移动端</el-radio>
            <el-radio value="pc">PC端</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="isSubmitting">
          {{ isSubmitting ? '提交中...' : '确定' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { createLandingPage, updateLandingPage } from '@/services/main/webpage/landingpage'
import { getCategoriesList } from '@/services/main/webpage/categories'
import useLoginStore from '@/stores/login/login'

const props = defineProps({
  visible: Boolean,
  data: Object
})

const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const isEdit = computed(() => !!props.data?.id)

const formRef = ref()
const isSubmitting = ref(false)
const categories = ref([])


const loginStore = useLoginStore()
const currentUserId = computed(() => loginStore.userInfo?.id || null)


const isVisibilityDisabled = computed(() => {
  return isEdit.value &&
    props.data?.visibility === 'public' &&
    props.data?.user_id !== currentUserId.value
})


const isBasicFieldDisabled = computed(() => {
  return isEdit.value &&
    props.data?.visibility === 'public' &&
    props.data?.user_id !== currentUserId.value
})

const formData = reactive({
  landingname: '',
  landing_url: '',
  category_id: null,
  visibility: 'public',
  screenshot_type: 'mobile', // 默认移动端截图
  nas_filename: '',
  effect: '',
  remark: ''
})

const rules = computed(() => {

  if (isBasicFieldDisabled.value) {
    return {}
  }
  return {
    landing_url: [
      { required: true, message: '请输入URL地址', trigger: 'blur' },
      { pattern: /^https?:\/\//, message: '请输入有效的URL（以 http:// 或 https:// 开头）', trigger: 'blur' }
    ]
  }
})


const fetchCategories = async () => {
  try {
    const res = await getCategoriesList()
    if (res.code === 0) {
      categories.value = res.data || []
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
  }
}


watch(() => props.visible, (val) => {
  if (val) {
    fetchCategories()
    if (props.data) {

      formData.landingname = props.data.landingname || ''
      formData.landing_url = props.data.landing_url || ''
      formData.category_id = props.data.category_id || null
      formData.visibility = props.data.visibility || 'public'
      formData.screenshot_type = props.data.screenshot_type || 'mobile'
      formData.nas_filename = props.data.nas_filename || ''
      formData.effect = props.data.effect || ''
      formData.remark = props.data.remark || ''
    } else {

      formData.landingname = ''
      formData.landing_url = ''
      formData.category_id = null
      formData.visibility = 'public'
      formData.screenshot_type = 'mobile' // 默认移动端
      formData.nas_filename = ''
      formData.effect = ''
      formData.remark = ''
    }
    formRef.value?.clearValidate()
  }
})


const handleConfirm = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  isSubmitting.value = true

  try {
    const submitData = {
      landingname: formData.landingname,
      landing_url: formData.landing_url,
      visibility: formData.visibility,
      screenshot_type: formData.screenshot_type,
      nas_filename: formData.nas_filename,
      effect: formData.effect,
      remark: formData.remark
    }


    if (formData.category_id) {
      submitData.category_id = formData.category_id
    }

    if (isEdit.value) {
      await updateLandingPage(props.data.id, submitData)
      ElMessage.success('更新成功')
      emit('success', null, 'update')
    } else {
      const result = await createLandingPage(submitData)
      ElMessage.success('创建成功，预览图生成中...')
      emit('success', result?.data, 'create')
    }

    handleClose()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    isSubmitting.value = false
  }
}


const handleClose = () => {
  dialogVisible.value = false
}

onMounted(() => {
  fetchCategories()
})
</script>

<style lang="less" scoped>
.landing-form {

  .form-row {
    display: flex;
    gap: 16px;

    :deep(.el-form-item) {
      flex: 1;
      margin-bottom: 16px;
    }

    :deep(.el-form-item.full-width) {
      flex: none;
      width: 100%;
    }
  }

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #3c4043;
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

  .category-select-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;

    .category-select {
      flex: 1;
      min-width: 0;
    }

    .info-icon {
      flex-shrink: 0;
      color: #9aa0a6;
      cursor: help;

      &:hover {
        color: #5f6368;
      }
    }
  }


  :deep(.el-select) {
    width: 100%;

    .el-select__wrapper {
      min-width: 0;
    }

    .el-select__selected-item {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  .el-button {
    border-radius: 8px;
    padding: 0 20px;
    height: 36px;
    font-weight: 500;
  }
}


:deep(.landing-page-dialog) {
  .el-dialog__body {
    max-height: 60vh;
    overflow-y: auto;
    padding: 16px 20px;
  }
}
</style>

<style lang="less">

.landing-page-dialog.el-dialog {
  z-index: 3000 !important;

  .el-dialog__body {
    max-height: 60vh;
    overflow-y: auto;
    padding: 16px 20px;
  }
}


.landing-dialog-select-dropdown {
  z-index: 9999 !important;
}


.el-select__popper.landing-dialog-select-dropdown {
  z-index: 9999 !important;
}
</style>
