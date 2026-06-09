<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isPublic ? '新建公共分类（所有人可见）' : '新建私有分类（仅自己可见）'"
    width="400px"
    :close-on-click-modal="false"
    class="google-dialog"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      class="category-form"
    >
      <el-form-item label="分类名称" prop="category_name">
        <el-input
          v-model="formData.category_name"
          placeholder="请输入分类名称（1-50个字符）"
          clearable
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const dialogVisible = ref(false)
const formRef = ref(null)

const formData = reactive({
  category_name: ''
})

const rules = {
  category_name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 50, message: '分类名称长度为1-50个字符', trigger: 'blur' }
  ]
}

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    formData.category_name = ''
  }
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

const handleClose = () => {
  dialogVisible.value = false
  formRef.value?.resetFields()
}

const handleConfirm = async () => {
  try {
    await formRef.value.validate()
    emit('confirm', formData.category_name)
    handleClose()
  } catch (error) {

  }
}
</script>

<style lang="less" scoped>
.category-form {
  :deep(.el-form-item__label) {
    color: #5f6368;
    font-size: 14px;
    font-weight: 500;
  }

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    border: 1px solid #dadce0;
    box-shadow: none;
    transition: all 0.2s;

    &:hover {
      border-color: #1a73e8;
    }

    &.is-focused {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }
  }

  :deep(.el-input__inner) {
    color: #202124;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  .el-button {
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    font-size: 14px;

    &:not(.el-button--primary) {
      background: #fff;
      border: 1px solid #dadce0;
      color: #5f6368;

      &:hover {
        background: #f1f3f4;
        border-color: #dadce0;
      }
    }

    &.el-button--primary {
      background: #1a73e8;
      border-color: #1a73e8;
      color: #fff;

      &:hover {
        background: #1557b0;
        border-color: #1557b0;
      }
    }
  }
}
</style>
