<template>
  <div class="domains-modal">
    <el-dialog
      v-model="dialogVisible"
      :title="isNewRef ? modalConfig.header.newTitle : modalConfig.header.editTitle"
      width="500"
      style="max-width: 90vw;"
      center
      :fullscreen="modalConfig.fullscreen"
      :close-on-click-modal="false"
    >
      <div class="form">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          :label-width="modalConfig.labelWidth ?? '100px'"
          size="large"
        >
          <template v-for="item in modalConfig.formItems" :key="item.prop">
            <el-form-item :label="item.label" :prop="item.prop">
              <!-- 输入框 -->
              <template v-if="item.type === 'input'">
                <!-- 域名输入框：聚焦时自动从落地页URL提取域名 -->
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  v-if="item.prop === 'existing_domain'"
                  @focus="handleExistingDomainFocus"
                />
                <!-- 普通输入框 -->
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  v-else
                />
              </template>

              <!-- 日期选择器 -->
              <template v-else-if="item.type === 'date-picker'">
                <el-date-picker
                  v-model="formData[item.prop]"
                  type="daterange"
                  range-separator="-"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  size="large"
                  clearable
                />
              </template>

              <!-- 下拉选择 -->
              <template v-else-if="item.type === 'select'">
                <el-select
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                >
                  <template v-for="option in item.options" :key="option.value">
                    <el-option :label="option.label" :value="option.value" />
                  </template>
                </el-select>
              </template>

              <!-- 自定义插槽（用于用途选择等） -->
              <template v-else-if="item.type === 'custom'">
                <slot :name="item.slotName"></slot>
              </template>
            </el-form-item>
          </template>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirmClick">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import useSystemStore from '@/stores/main/system/system'
import { reactive, ref, computed } from 'vue'
import { parse } from 'tldts'


const props = defineProps({
  modalConfig: {
    type: Object,
    default: () => ({})
  },
  listType: {
    type: String,
    default: 'list'
  }
})


const dialogVisible = ref(false)
const formRef = ref()
const initialData = {}

for (const item of props.modalConfig.formItems) {
  initialData[item.prop] = item.initialValue
}

const formData = reactive({ ...initialData })
const isNewRef = ref(true)
const editData = ref()


const formRules = computed(() => {
  const rules = {}
  for (const item of props.modalConfig.formItems) {
    const fieldRules = []

    if (item.required) {
      fieldRules.push({ required: true, message: `请输入${item.label}`, trigger: 'blur' })
    }

    if (item.rules && Array.isArray(item.rules)) {
      fieldRules.push(...item.rules)
    }

    if (fieldRules.length > 0) {
      rules[item.prop] = fieldRules
    }
  }
  return rules
})


function setModalVisible(isNew = true, itemData) {
  dialogVisible.value = true
  isNewRef.value = isNew

  if (!isNew && itemData) {

    for (const key in formData) {
      formData[key] = itemData[key]
    }
    editData.value = itemData
  } else {

    for (const key in formData) {
      formData[key] = initialData[key]
    }
    editData.value = null
  }
}


const systemStore = useSystemStore()
function handleConfirmClick() {
  formRef.value?.validate((valid) => {
    if (!valid) {
      return
    }

    dialogVisible.value = false

    let infoData = formData
    if (props.otherInfo) {
      infoData = { ...infoData, ...props.otherInfo }
    }

    if (!isNewRef.value && editData.value) {

      systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, infoData, null, props.listType)
    } else {

      systemStore.newPageDataAction(props.modalConfig.pageName, infoData, props.listType)
    }
  })
}


function handleExistingDomainFocus() {
  const url = formData['landing_page_url']

  if (url) {
    const parsed = parse(url)
    formData['existing_domain'] = parsed.domain
  }
}


defineExpose({ setModalVisible, formData })
</script>

<style lang="less" scoped>
.form {
  padding: 0 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 16px;
  border-bottom: 1px solid #e8eaed;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 500;
  color: #202124;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid #e8eaed;
}

:deep(.el-form-item__label) {
  color: #5f6368;
  font-weight: 400;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  border: 1px solid #dadce0;
  box-shadow: none;
  transition: all 0.2s;

  &:hover {
    border-color: #1a73e8;
  }

  &.is-focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
  }
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
  padding: 0 20px;
  height: 36px;
  font-weight: 500;
}

:deep(.el-button--primary) {
  background-color: #1a73e8;
  border-color: #1a73e8;

  &:hover {
    background-color: #1557b0;
    border-color: #1557b0;
  }
}
</style>
