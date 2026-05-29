<template>
  <div class="modal">
    <el-dialog
      v-model="dialogVisible"
      :title="mode === 'new' ? modalConfig.header.newTitle : modalConfig.header.editTitle"
      width="800"
      style="max-width: 90vw;"
      :fullscreen="modalConfig.fullscreen"
      top="5vh"
      draggable
      class="google-dialog"
    >
      <div class="form">
        <el-form
          :model="formData"
          ref="formRef"
          label-width="60px"
          size="large"
          class="google-form"
        >
          <!-- 客户和开票主体 -->
          <el-row :gutter="10" class="entity-row">
            <el-col :span="12">
              <el-form-item label="客户" label-width="54px">
                <slot name="customer"></slot>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开票主体" label-width="90px">
                <slot name="invoice_entity"></slot>
              </el-form-item>
            </el-col>
          </el-row>

          <template v-for="item in modalConfig.formItems" :key="item.prop">
            <!-- 跳过客户和开票主体，已经单独处理 -->
            <template v-if="item.prop === 'customer' || item.prop === 'invoice_entity'"></template>

            <template v-else>
              <el-form-item :label="item.label" :prop="item.prop">
              <!-- 输入框 -->
              <template v-if="item.type === 'input'">
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  class="google-input"
                />
              </template>
              <template v-if="item.type === 'textarea'">
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 6 }"
                  class="google-input"
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
                  class="google-picker"
                />
              </template>

              <!-- 下拉框 -->
              <template v-if="item.type === 'select'">
                <el-select
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  class="google-select"
                >
                  <template v-for="option in item.options" :key="item.value">
                    <el-option :label="option.label" :value="option.value" />
                  </template>
                </el-select>
              </template>

              <!-- 表格 -->
              <template v-if="item.type === 'table'">
                <div class="table-container">
                  <el-table
                    :data="formData.table"
                    class="google-table"
                    show-summary
                    :summary-method="getSummaries"
                    style="width: 100%"
                  >
                    <!-- 描述 -->
                    <el-table-column label="Description" prop="desc" width="200">
                      <template #default="{ row }">
                        <el-input
                          v-model="row.desc"
                          placeholder="请输入描述"
                          type="textarea"
                          :rows="2"
                          class="google-input"
                        />
                      </template>
                    </el-table-column>

                    <!-- 周期 -->
                    <el-table-column label="Period" prop="period" width="240">
                      <template #default="{ row }">
                        <el-date-picker
                          v-model="row.period"
                          type="daterange"
                          range-separator="至"
                          start-placeholder="开始日期"
                          end-placeholder="结束日期"
                          format="YYYY-MM-DD"
                          value-format="YYYY-MM-DD"
                          class="google-picker"
                          popper-class="dialog-date-picker-popper"
                        />
                      </template>
                    </el-table-column>

                    <!-- 金额 -->
                    <el-table-column label="Amount(US$)" prop="amount" width="130">
                      <template #default="{ row }">
                        <el-input-number
                          v-model="row.amount"
                          :min="0"
                          placeholder="请输入金额"
                          :controls="false"
                          class="google-number"
                        />
                      </template>
                    </el-table-column>

                    <!-- 操作 -->
                    <el-table-column label="操作" width="70">
                      <template #default="{ $index }">
                        <el-button
                          class="delete-btn"
                          size="small"
                          @click="removeRow($index)"
                        >
                          删除
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>

                  <div class="add-row-container">
                    <el-button class="add-row-btn" @click="addRow">
                      <svg viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      新增一行
                    </el-button>
                  </div>
                </div>
              </template>

              <!-- 自定义 -->
              <template v-if="item.type === 'custom'">
                <slot :name="item.slotName" :slot-item="item"></slot>
              </template>
            </el-form-item>
            </template>
          </template>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button class="cancel-btn" @click="dialogVisible = false">取消</el-button>
          <el-button class="confirm-btn" @click="handleConfirmClick">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import useSystemStore from '@/stores/main/system/system'
import useLoginStore from '@/stores/login/login'
import formatDateRange from '@/utils/format-date-range'
import getTodayStr from '@/utils/get-today-str'
import { reactive, ref } from 'vue'


const props = defineProps({
  modalConfig: {
    type: Object,
    default: () => ({})
  },
  selectedCustomer: {
    type: Object,
    default: () => ({})
  },
  invoiceEntities: {
    type: Array,
    default: () => []
  },
  selectedInvoiceEntityId: {
    type: [Number, null],
    default: null
  }
})
const emit = defineEmits(['generatePdf', 'selectInvoiceEntity'])


const formRef = ref(null) // 存储el-form组件对象(用于表单校验)
const dialogVisible = ref(false) // 是否显示弹窗
const mode = ref('add') // 'add'为新增, 'edit'为编辑
const initialData = {} // 记录初始化表单数据
const editData = ref() // 记录编辑的那一行数据
for (const item of props.modalConfig.formItems) {
  initialData[item.prop] = item.initialValue // 获取到modal.config.ts配置文件中的初始化数据
}
const formData = reactive({ ...initialData }) // 表单中填写的数据
let totalAmount = '' // 表格合计总金额



function setModalVisible(newMode = 'new', rowData) {
  dialogVisible.value = true // 显示弹窗
  mode.value = newMode // 记录新增还是编辑

  if (mode.value === 'edit' && rowData) {

    for (const key in formData) {
      if (key === 'emails' && Array.isArray(rowData[key])) {

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
const loginStore = useLoginStore()
function handleConfirmClick() {


  if (!props.selectedCustomer || !props.selectedCustomer.id) {
    ElMessage({
      message: '请选择客户',
      type: 'warning',
      duration: 1200
    })
    return
  }


  if (!props.selectedInvoiceEntityId) {
    ElMessage({
      message: '请选择开票主体',
      type: 'warning',
      duration: 1200
    })
    return
  }


  if (!validateTableRows()) return


  dialogVisible.value = false 


  if (mode.value === 'edit' && editData.value) { 


    systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, formData)

  } else {



    const selectedEntity = props.invoiceEntities.find(e => e.id === props.selectedInvoiceEntityId)





    const queryInfo = {
      id: props.selectedCustomer.id, // 只传客户ID，后端通过 insertData hook 关联
      invoice_entity_id: props.selectedInvoiceEntityId, // 开票主体ID
      userinfo: {
        "role_name": loginStore.userInfo.role.name || '',
        "user_id": loginStore.userInfo.id
      },
      attachments: [
        {

          full_name: props.selectedCustomer.full_name || '',
          short_name: props.selectedCustomer.short_name || '',
          company_address: props.selectedCustomer.company_address || '',
          payment_cycle_days: props.selectedCustomer.payment_cycle_days || 30,
          date: props.selectedCustomer.date || getTodayStr(),

          invoice_entity: selectedEntity ? {
            name: selectedEntity.name || '',
            account_name: selectedEntity.account_name || '',
            account_number: selectedEntity.account_number || '',
            bank_name: selectedEntity.bank_name || '',
            swift_code: selectedEntity.swift_code || '',
            bank_address: selectedEntity.bank_address || '',
            company_address: selectedEntity.company_address || '',
            bank_code: selectedEntity.bank_code || '',
            branch_code: selectedEntity.branch_code || '',
            template_path: selectedEntity.template_path || ''  // 模板路径
          } : null,

          items: formData.table.map(item => ({
            desc: item.desc,
            dateRange: Array.isArray(item.period) ? `${formatDateRange(item.period[0], item.period[1])}` : '',
            amount: item.amount.toFixed(2)
          })),
          totalAmount: totalAmount
        }
      ]
    }
    systemStore.justCreated = true
    systemStore.generatePdfAction(props.modalConfig.pageName, queryInfo)
    emit('generatePdf')
  }
}





function getSummaries({ columns, data }) {
  const sums = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = "Total" // 第一列显示 "Total"
      return
    }

    if (column.property === "amount") {
      const total = data.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
      sums[index] = `$ ${total.toFixed(2)}`
      totalAmount = total.toFixed(2)
    } else {
      sums[index] = "" // 其他列为空
    }
  })


  return sums
}


function removeRow(index) {
  if (formData.table.length <= 1) {
    ElMessage({
      message: '至少保留一行',
      type: 'warning',
      duration: 1500
    })
    return
  }
  formData.table.splice(index, 1)
}


function addRow() {
  formData.table.push({ desc: "", period: [], amount: 0 });
}



function validateTableRows() {
  if (!Array.isArray(formData.table) || formData.table.length === 0) {
    ElMessage({ message: '表格不能为空', type: 'warning', duration: 1000 })
    return false
  }

  for (let i = 0; i < formData.table.length; i++) {
    const row = formData.table[i]

    if (!row.desc || String(row.desc).trim() === '') {
      ElMessage({ message: `第 ${i + 1} 行：描述不能为空`, type: 'warning', duration: 1200 })
      return false
    }
    if (!Array.isArray(row.period) || row.period.length === 0) {
      ElMessage({ message: `第 ${i + 1} 行：周期不能为空`, type: 'warning', duration: 1200 })
      return false
    }
    if (row.amount === null || row.amount === undefined || row.amount === '' || isNaN(Number(row.amount))) {
      ElMessage({ message: `第 ${i + 1} 行：金额不能为空且必须为数字`, type: 'warning', duration: 1200 })
      return false
    }


  }

  return true
}



defineExpose({ setModalVisible })
</script>

<style lang="less" scoped>
:deep(.el-popper) {
  z-index: 2025 !important;
}

.form {
  padding: 0 10px;
}


.entity-row {
  margin-left: 0 !important;
  margin-right: 0 !important;


  :deep(.el-col) {
    flex: 0 0 50%;
    max-width: 50%;
  }
}


:deep(.google-dialog) {
  z-index: 2000;

  .el-dialog__header {
    padding: 20px 24px 16px;
    margin: 0;
    border-bottom: 1px solid #e8eaed;
  }

  .el-dialog__title {
    font-size: 20px;
    font-weight: 500;
    color: #202124;
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
    max-height: 60vh;
    overflow-y: auto;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid #e8eaed;
  }
}


.google-form {
  :deep(.el-form-item__label) {
    color: #3c4043;
    font-weight: 500;
    font-size: 14px;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }
}


:deep(.google-input) {
  .el-input__wrapper {
    border-radius: 4px;
    border: 1px solid #dadce0;
    box-shadow: none;
    transition: border-color 0.2s;

    &:hover {
      border-color: #1a73e8;
    }

    &.is-focus {
      border-color: #1a73e8;
    }
  }

  .el-input__inner {
    color: #202124;
  }
}

:deep(.google-input textarea) {
  resize: none;
}


:deep(.google-picker) {
  .el-input__wrapper {
    border-radius: 4px;
    border: 1px solid #dadce0;
    box-shadow: none;

    &:hover {
      border-color: #1a73e8;
    }

    &.is-focus {
      border-color: #1a73e8;
    }
  }
}


:deep(.google-select) {
  .el-input__wrapper {
    border-radius: 4px;
    border: 1px solid #dadce0;
    box-shadow: none;

    &:hover {
      border-color: #1a73e8;
    }

    &.is-focus {
      border-color: #1a73e8;
    }
  }
}


:deep(.google-number) {
  width: 100%;

  .el-input__wrapper {
    border-radius: 4px;
    border: 1px solid #dadce0;
    box-shadow: none;

    &:hover {
      border-color: #1a73e8;
    }

    &.is-focus {
      border-color: #1a73e8;
    }
  }
}


.table-container {
  :deep(.google-table) {
    border: 1px solid #e8eaed;
    border-radius: 8px;
    overflow: hidden;

    .el-table__header-wrapper {
      th {
        background-color: #f1f3f4;
        border-bottom: 1px solid #e8eaed;
        color: #3c4043;
        font-weight: 500;
        font-size: 13px;
        height: 48px;
        padding: 0 12px;

        .cell {
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }

    .el-table__body-wrapper {
      .el-table__row {
        border-bottom: 1px solid #f1f3f4;
        min-height: 80px;

        &:hover {
          background-color: #f8f9fa;

          td {
            background-color: transparent;
          }
        }

        td {
          color: #202124;
          font-size: 13px;
          padding: 16px 12px;

          .cell {
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }
    }

    &::before,
    &::after {
      display: none;
    }
  }

  :deep(.el-table__cell) {
    padding: 12px 10px;
  }


  :deep(.el-input) {
    .el-input__wrapper {
      height: 48px;
    }

    .el-input__inner {
      height: 48px;
      line-height: 48px;
    }
  }


  :deep(.el-textarea) {
    .el-textarea__inner {
      min-height: 48px;
      height: 48px;
      line-height: 1.5;
      padding: 8px 12px;
      resize: none;
    }
  }


  :deep(.el-date-editor) {
    height: 48px;

    .el-input__wrapper {
      height: 48px;
    }

    .el-input__inner {
      height: 48px;
      line-height: 48px;
    }
  }


  :deep(.el-input-number) {
    height: 48px;

    .el-input__wrapper {
      height: 48px;
    }

    .el-input__inner {
      height: 48px;
      line-height: 48px;
    }
  }
}


.add-row-container {
  margin-top: 12px;
  text-align: left;
}

:deep(.add-row-btn) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 32px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background-color: #fff;
  color: #1a73e8;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  &:hover {
    background-color: #f1f3f4;
    border-color: #dadce0;
    color: #1a73e8;
  }

  &:active {
    background-color: #e8eaed;
  }
}


:deep(.delete-btn) {
  border: none;
  background-color: #fad2cf;
  color: #c5221f;
  border-radius: 4px;
  font-weight: 500;

  &:hover {
    background-color: #f6b5b1;
  }
}


.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.cancel-btn) {
  border: none;
  color: #1a73e8;
  background: transparent;
  font-weight: 500;
  border-radius: 4px;

  &:hover {
    background-color: #f1f3f4;
  }
}

:deep(.confirm-btn) {
  background-color: #1a73e8;
  border-color: #1a73e8;
  color: #fff;
  border-radius: 4px;
  font-weight: 500;

  &:hover {
    background-color: #1557b0;
    border-color: #1557b0;
  }
}
</style>

<style lang="less">

.dialog-date-picker-popper {
  z-index: 10000 !important;
}
</style>
