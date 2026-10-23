<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="dialogVisible" class="google-modal-overlay" @click.self="handleCancel">
        <div class="google-modal">
          <!-- 弹窗头部 -->
          <div class="modal-header">
            <h2 class="modal-title">
              {{ mode === 'new' ? modalConfig.header.newTitle : modalConfig.header.editTitle }}
            </h2>
            <button class="modal-close-btn" @click="handleCancel">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- 弹窗内容 -->
          <div class="modal-content">
            <el-form
              :model="formData"
              ref="formRef"
              class="google-form"
              :rules="rules"
              label-position="top"
            >
              <div class="form-grid">
                <template v-for="item in modalConfig.formItems" :key="item.prop">
                  <el-form-item
                    :prop="item.prop"
                    :label="item.label"
                    class="form-item"
                    :class="{ 'full-width': item.type === 'textarea' }"
                  >
                    <!-- 输入框 -->
                    <el-input
                      v-if="item.type === 'input'"
                      v-model="formData[item.prop]"
                      :placeholder="item.placeholder"
                      class="google-input"
                      clearable
                    />
                    <!-- 文本域 -->
                    <el-input
                      v-else-if="item.type === 'textarea'"
                      v-model="formData[item.prop]"
                      :placeholder="item.placeholder"
                      type="textarea"
                      :autosize="{ minRows: 2, maxRows: 3 }"
                      class="google-textarea"
                      clearable
                    />
                    <!-- 下拉框 -->
                    <el-select
                      v-else-if="item.type === 'select'"
                      v-model="formData[item.prop]"
                      :placeholder="item.placeholder"
                      :clearable="item.clearable"
                      :filterable="item.filterable"
                      class="google-select"
                    >
                      <el-option
                        v-for="option in getSelectOptions(item)"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </el-form-item>
                </template>
              </div>
            </el-form>
          </div>

          <!-- 弹窗底部 -->
          <div class="modal-footer">
            <button class="google-btn google-btn-secondary" @click="handleCancel">
              取消
            </button>
            <button class="google-btn google-btn-primary" @click="handleConfirmClick">
              确定
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import useSystemStore from '@/stores/main/system/system'
import { getInvoiceTemplates } from '@/services/main/system/system'
import { reactive, ref, onMounted } from 'vue'


const props = defineProps({
  modalConfig: {
    type: Object,
    default: () => ({})
  }
})


const formRef = ref(null)
const dialogVisible = ref(false)
const mode = ref('add')
const initialData = {}
const editData = ref()
for (const item of props.modalConfig.formItems) {
  initialData[item.prop] = item.initialValue ?? ''
}
const formData = reactive({ ...initialData })


function setModalVisible(newMode = 'new', rowData) {
  dialogVisible.value = true
  mode.value = newMode

  if (mode.value === 'edit' && rowData) {

    for (const key in formData) {
      formData[key] = rowData[key] ?? ''
    }
    editData.value = rowData

  } else {

    for (const key in formData) {
      formData[key] = initialData[key]
    }
    editData.value = null
  }


  setTimeout(() => {
    formRef.value?.clearValidate()
  }, 50)
}


function handleCancel() {
  dialogVisible.value = false
  formRef.value?.clearValidate()
}


const systemStore = useSystemStore()


// 发票模板下拉选项（从后端 template 目录动态拉取，新增模板文件后下拉自动出现）
const invoiceTemplateOptions = ref([])
onMounted(async () => {
  try {
    const res = await getInvoiceTemplates()
    invoiceTemplateOptions.value = (res?.data?.list || []).map(name => ({ label: name, value: name }))
  } catch {
    invoiceTemplateOptions.value = []
  }
})

// select 选项来源：配置了 optionsSource 的走动态数据，否则用静态 options
function getSelectOptions(item) {
  if (item.optionsSource === 'invoice_templates') return invoiceTemplateOptions.value
  return item.options || []
}
function handleConfirmClick() {

  formRef.value.validate(valid => {
    if (!valid) {
      return
    }


    dialogVisible.value = false


    if (mode.value === 'edit' && editData.value) {

      systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, formData)
    } else {

      systemStore.newPageDataAction(props.modalConfig.pageName, formData)
    }
  })
}


// 按配置生成校验规则: required 的表单项必填(输入框 blur 触发, 下拉框 change 触发)
const rules = {}
for (const item of props.modalConfig.formItems) {
  if (item.required) {
    rules[item.prop] = [
      { required: true, message: `${item.label}不能为空`, trigger: item.type === 'select' ? 'change' : 'blur' }
    ]
  }
}


defineExpose({ setModalVisible })
</script>

<style lang="less" scoped>

.google-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}


.google-modal {
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}


.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e8eaed;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #202124;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
    fill: #5f6368;
  }

  &:hover {
    background: #f1f3f4;

    svg {
      fill: #202124;
    }
  }
}


.modal-content {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}


.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.full-width {
    grid-column: 1 / -1;
  }
}

/* el-form-item(label-position=top)接管 label 渲染：去掉默认边距，间距由 .form-item 的 gap 控制 */
:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-form-item__label) {
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #3c4043;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  line-height: 1.4;
}


:deep(.google-input),
:deep(.google-textarea) {
  .el-input__wrapper {
    border-radius: 6px;
    border: 1px solid #dadce0;
    box-shadow: none;
    padding: 8px 12px;
    background-color: #fff;
    transition: all 0.2s ease;

    &:hover {
      border-color: #5f6368;
    }

    &.is-focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }

    &.is-error {
      border-color: #d93025;

      &:hover,
      &.is-focus {
        border-color: #d93025;
      }
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

:deep(.google-textarea) {
  .el-textarea__inner {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #dadce0;
    box-shadow: none;
    font-family: inherit;
    font-size: 14px;

    &:hover {
      border-color: #5f6368;
    }

    &:focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }

    &::placeholder {
      color: #9aa0a6;
    }
  }
}


:deep(.el-form-item__error) {
  font-size: 12px;
  color: #d93025;
  margin-top: 4px;
}


:deep(.google-select) {
  width: 100%;

  /* 兼容 Element Plus 新旧两种 select 结构 */
  .el-select__wrapper,
  .el-input__wrapper {
    border-radius: 6px;
    border: 1px solid #dadce0;
    box-shadow: none;
    padding: 8px 12px;
    background-color: #fff;
    transition: all 0.2s ease;

    &:hover {
      border-color: #5f6368;
    }

    &.is-focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }

    &.is-error,
    &.is-error:hover {
      border-color: #d93025;
    }
  }
}


.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e8eaed;
}


.google-btn {
  padding: 0 20px;
  height: 36px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  transition: all 0.2s ease;
}

.google-btn-secondary {
  background: transparent;
  color: #1a73e8;

  &:hover {
    background: #f1f3f4;
  }
}

.google-btn-primary {
  background: #1a73e8;
  color: #fff;

  &:hover {
    background: #1557b0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
}


.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.2s ease;
}

.modal-fade-enter-active .google-modal,
.modal-fade-leave-active .google-modal {
  transition: all 0.2s ease;
}

.modal-fade-enter-from .google-modal {
  opacity: 0;
  transform: scale(0.95);
}

.modal-fade-leave-to .google-modal {
  opacity: 0;
  transform: scale(0.95);
}


@media (max-width: 768px) {
  .google-modal-overlay {
    padding: 12px;
  }

  .google-modal {
    max-width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .modal-header,
  .modal-content,
  .modal-footer {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>

<style lang="less">
/* select 下拉面板 teleport 到 body，需高于弹窗遮罩(9999)才不会被盖住 */
.el-select__popper {
  z-index: 10001 !important;
}
</style>
