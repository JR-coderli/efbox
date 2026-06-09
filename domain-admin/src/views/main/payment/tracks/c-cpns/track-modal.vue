<template>
  <div class="modal">
    <el-dialog
      class="cus-dialog"
      v-model="dialogVisible"
      :title="mode === 'new' ? modalConfig.header.newTitle : modalConfig.header.editTitle"
      width="600"
      style="max-width: 90vw;"
      center
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

              <!-- 数字输入框 -->
              <template v-if="item.type === 'number'">
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  type="number"
                  clearable
                />
              </template>

              <!-- 文本域 -->
              <template v-if="item.type === 'textarea'">
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 6 }"
                  clearable
                />
              </template>

              <!-- 日期范围选择器 -->
              <template v-if="item.type === 'daterange'">
                <el-date-picker
                  v-model="formData[item.prop]"
                  type="daterange"
                  range-separator="-"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  clearable
                />
              </template>

              <!-- 下拉框（客户选择） -->
              <template v-if="item.type === 'select'">
                <el-select
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  filterable
                  style="width: 100%"
                >
                  <template v-for="option in customerOptions" :key="option.value">
                    <el-option :label="option.label" :value="option.value" />
                  </template>
                </el-select>
              </template>

              <!-- 可搜索+可新建下拉框 -->
              <template v-if="item.type === 'select-create'">
                <el-select
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <template v-for="option in dynamicOptions[item.prop]" :key="option">
                    <el-option :label="option" :value="option" />
                  </template>
                </el-select>
              </template>
            </el-form-item>
          </template>

          <!-- 应付日期（自动计算，只读显示） -->
          <el-form-item v-if="mode === 'new' && computedPayableDate" label="应付日期">
            <span class="payable-date-text">{{ computedPayableDate }}</span>
          </el-form-item>

          <!-- 编辑模式下：已付金额 -->
          <el-form-item v-if="mode === 'edit'" label="已付金额" prop="amount_paid">
            <el-input
              v-model="formData.amount_paid"
              placeholder="请输入已付金额"
              clearable
            />
          </el-form-item>

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
import { reactive, ref, computed } from 'vue'

const emit = defineEmits(['created'])

const props = defineProps({
  modalConfig: {
    type: Object,
    default: () => ({})
  }
})

const formRef = ref(null)
const dialogVisible = ref(false)
const mode = ref('new')
const editData = ref(null)
const customerOptions = ref([])
const dynamicOptions = reactive({
  payment_entity: [],
  currency: []
})


const formData = reactive({
  customer_id: '',
  payment_entity: '',
  currency: '',
  amount: '',
  period: [],
  payable_date: '',
  remark: '',
  amount_paid: '',
  payment_status: '',
  confirmed_date: ''
})


function parsePeriod(periodStr) {
  if (Array.isArray(periodStr)) return periodStr
  if (!periodStr || typeof periodStr !== 'string') return []
  const parts = periodStr.split(' - ')
  if (parts.length === 2) return [parts[0].trim(), parts[1].trim()]
  return []
}

function formatPeriod(periodVal) {
  if (Array.isArray(periodVal) && periodVal.length === 2) {
    return `${periodVal[0]} - ${periodVal[1]}`
  }
  return periodVal || ''
}


async function loadCustomers() {
  const systemStore = useSystemStore()
  const list = await systemStore.getPaymentTrackCustomersAction()
  customerOptions.value = (list || []).map(c => ({
    label: c.short_name || c.full_name,
    value: c.id,
    payment_cycle_days: c.payment_cycle_days || 0
  }))
}


const computedPayableDate = computed(() => {
  const selected = customerOptions.value.find(c => c.value === formData.customer_id)
  if (!selected) return ''
  const days = Number(selected.payment_cycle_days) || 0
  const date = new Date()
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})


async function loadDynamicOptions() {
  const systemStore = useSystemStore()
  const [entities, currencies] = await Promise.all([
    systemStore.getPaymentTrackEntityOptionsAction(),
    systemStore.getPaymentTrackCurrencyOptionsAction()
  ])


  const entityDefaults = ['Eflow', 'Terra']
  const entityMerged = [...entityDefaults]
  ;(entities || []).forEach(s => { if (!entityMerged.includes(s)) entityMerged.push(s) })
  dynamicOptions.payment_entity = entityMerged


  const currencyDefaults = ['CNY', 'USD', 'HKD']
  const currencyMerged = [...currencyDefaults]
  ;(currencies || []).forEach(s => { if (!currencyMerged.includes(s)) currencyMerged.push(s) })
  dynamicOptions.currency = currencyMerged
}


function setModalVisible(newMode = 'new', rowData) {
  dialogVisible.value = true
  mode.value = newMode
  loadCustomers()
  loadDynamicOptions()

  if (newMode === 'edit' && rowData) {
    formData.customer_id = rowData.customer_id || ''
    formData.payment_entity = rowData.payment_entity || ''
    formData.currency = rowData.currency || ''
    formData.amount = rowData.amount || ''
    formData.period = parsePeriod(rowData.period)
    formData.payable_date = rowData.payable_date || ''
    formData.remark = rowData.remark || ''
    formData.amount_paid = rowData.amount_paid || ''
    formData.payment_status = rowData.payment_status || ''
    formData.confirmed_date = rowData.confirmed_date || ''
    editData.value = rowData
  } else {
    formData.customer_id = ''
    formData.payment_entity = ''
    formData.currency = ''
    formData.amount = ''
    formData.period = []
    formData.payable_date = ''
    formData.remark = ''
    formData.amount_paid = ''
    formData.payment_status = ''
    formData.confirmed_date = ''
    editData.value = null
  }
}


const systemStore = useSystemStore()
function handleConfirmClick() {
  formRef.value.validate(valid => {
    if (!valid) {
      ElMessage({ message: '表单填写有误，请检查', type: 'warning', plain: true, duration: 750 })
      return
    }

    dialogVisible.value = false

    if (mode.value === 'edit' && editData.value) {

      const result = {
        customer_id: formData.customer_id,
        payment_entity: formData.payment_entity,
        currency: formData.currency,
        amount: formData.amount,
        period: formatPeriod(formData.period),
        remark: formData.remark,
        amount_paid: formData.amount_paid,
        payment_status: formData.payment_status,
        confirmed_date: formData.confirmed_date
      }
      systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, result, null, 'list')
    } else {

      const pageInfo = {
        customer_id: formData.customer_id,
        payment_entity: formData.payment_entity,
        currency: formData.currency,
        amount: formData.amount,
        period: formatPeriod(formData.period),
        remark: formData.remark
      }
      systemStore.justCreated = true
      systemStore.newPageDataAction(props.modalConfig.pageName, pageInfo, 'list').then(() => {
        emit('created')
      })
    }
  })
}


const rules = {
  customer_id: [
    { required: true, message: '请选择客户', trigger: 'change' }
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

.payable-date-text {
  color: #606266;
  font-size: 14px;
}
</style>
