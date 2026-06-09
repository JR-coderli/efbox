<template>
  <div class="modal">
    <el-dialog
      class="cus-dialog"
      v-model="dialogVisible"
      :title="mode === 'new' ? modalConfig.header.newTitle : modalConfig.header.editTitle"
      width="500"
      style="max-width: 90vw;"
      center
      :fullscreen="modalConfig.fullscreen"
      top="6vh"
    >
      <div class="form">
        <el-form
          :model="formData"
          ref="formRef"
          :label-width="modalConfig.labelWidth ?? '100px'"
          size="large"
          :rules="rules"
        >
          <template v-for="item in modalConfig.formItems" :key="item.prop">
            <el-form-item :label="item.label" :prop="item.prop">
              <!-- 输入框 -->
              <template v-if="item.type === 'input'">
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                />
              </template>
              <template v-if="item.type === 'textarea'">
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 6 }"
                  clearable
                />
              </template>

              <!-- 日期 -->
              <template v-if="item.type === 'date-picker'">
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

              <!-- 下拉框 -->
              <template v-if="item.type === 'select'">
                <el-select
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                >
                  <template v-for="option in item.options" :key="item.value">
                    <el-option :label="option.label" :value="option.value" />
                  </template>
                </el-select>
              </template>

              <!-- 自定义插槽 -->
              <template v-if="item.type === 'custom'">
                <slot :name="item.slotName" :slot-item="item"></slot>
              </template>

            </el-form-item>
          </template>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirmClick">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import useSystemStore from '@/stores/main/system/system'
import { reactive, ref } from 'vue'


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
  initialData[item.prop] = item.initialValue
}
const formData = reactive({ ...initialData })


function setModalVisible(newMode = 'new', rowData) {
  dialogVisible.value = true
  mode.value = newMode

  if (mode.value === 'edit' && rowData) {
    for (const key in formData) {
      if ((key === 'send_emails' || key === 'normal_emails') && Array.isArray(rowData[key])) {
        formData[key] = rowData[key].map(e => e.email).join('\n')
      } else {
        formData[key] = rowData[key]
      }
    }
    editData.value = rowData
  } else {
    for (const key in formData) {
      formData[key] = initialData[key]
    }
    editData.value = null
  }
}


const systemStore = useSystemStore()
function handleConfirmClick() {
  formRef.value.validate(valid => {
    if (!valid) {
      ElMessage({
        message: '表单填写有误，请检查',
        type: 'warning',
        plain: true,
        duration: 750
      })
      return
    }

    dialogVisible.value = false

    if (mode.value === 'edit' && editData.value) {

      let sendEmailsList = validateEmail(formData.send_emails)
      sendEmailsList = sendEmailsList.map((email, index) => ({ id: editData.value?.send_emails?.[index]?.id, email, type: editData.value?.send_emails?.[index]?.type || 'send' }))

      let normalEmailsList = validateEmail(formData.normal_emails)
      normalEmailsList = normalEmailsList.map((email, index) => ({ id: editData.value?.normal_emails?.[index]?.id, email, type: editData.value?.normal_emails?.[index]?.type || 'normal' }))

      const result = {
        full_name: formData.full_name,
        short_name: formData.short_name,
        company_address: formData.company_address,
        remark: formData.remark,
        emails: [
          ...(sendEmailsList || []),
          ...(normalEmailsList || [])
        ]
      }

      systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, result)
    } else {

      if (formData.normal_emails) {
        const normalEmailList = validateEmail(formData.normal_emails)
        formData.normal_emails = normalEmailList.map(email => ({ email, type: "normal" }))
      }
      if (formData.send_emails) {
        const sendEmailList = validateEmail(formData.send_emails)
        formData.send_emails = sendEmailList.map(email => ({ email, type: "send" }))
      }
      systemStore.justCreated = true
      systemStore.newPageDataAction(props.modalConfig.pageName, formData)
    }
  })
}


function validateEmail(pendingEmails) {
  if (!pendingEmails || typeof pendingEmails !== 'string') {
    return []
  }

  const rawList = pendingEmails.split(/[\s,]+/)
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  const emails = rawList
    .map(e => e.trim())
    .filter(e => e && emailRegex.test(e))

  return emails
}


const rules = {
  full_name: [
    { required: true, message: '不能为空', trigger: 'blur' }
  ],
  short_name: [
    { required: true, message: '不能为空', trigger: 'blur' }
  ]
}


defineExpose({ setModalVisible })
</script>

<style lang="less" scoped>
.cus-dialog {
  @media (max-width: 500px) {
    padding-left: 0;
  }
}

.form {
  padding: 0 20px;

  @media (max-width: 500px) {
    padding: 0;
  }
}

:deep(textarea) {
  resize: none;
}
</style>
