<template>
  <div class="attachement">
    <!-- 表格列表 -->
    <attachment-content
      ref="attachmentContentRef"
      :content-config="contentConfig"
      :table-show-loading="tableShowLoading"
      @new-click="handleNewClick"
    >
      <!-- 查找客户 (表格顶部搜索) -->
      <template #search>
         <el-autocomplete
          v-model="searchState"
          :fetch-suggestions="queryContentSearchAsync"
          placeholder="查找客户"
          @select="handleSearchSelect"
          @blur="handleSearchBlur"
          @keyup.enter="handleSearchEnter"
          clearable
        />
      </template>

      <!-- 0. 倒序序号 -->
      <template #reverse_index="{ $index, reverse_index }">
        {{ reverse_index !== undefined ? reverse_index : (pageAllCount - (allQueryInfo.page - 1) * allQueryInfo.pageSize - $index) }}
      </template>

      <!-- 1. 周期 -->
      <template #period="{ period }">
        <div>{{ convertDateRange(period) }}</div>
        <!-- <div>{{ period }}</div> -->
      </template>

      <!-- 1.5 客户简称（可点击搜索） -->
      <template #customer_short_name="{ customer }">
        <span class="clickable-customer" @click="handleCustomerClick(customer)">
          {{ customer?.short_name || '-' }}
        </span>
      </template>

      <!-- 开票主体 -->
      <template #invoice_entity="{ invoice_entity_name }">
        <span
          v-if="invoice_entity_name"
          class="invoice-entity-name"
          :style="{ backgroundColor: getEntityColor(invoice_entity_name).bg, color: getEntityColor(invoice_entity_name).text }"
        >
          {{ invoice_entity_name }}
        </span>
        <span v-else class="empty-placeholder"></span>
      </template>

      <!-- 1.5 金额 -->
      <template #amount="{ amount }">
        <div class="currency-amount">${{ amount }}</div>
      </template>

      <!-- 2. 文件名 -->
      <template #filename="{destination, filename}">
        <!-- <el-link :href="destination" target="_blank">{{ filename }}</el-link> -->
        <a
          :href="destination"
          target="_blank"
          style="color: #409EFF;text-decoration: underline;"
          >{{ filename }}</a
        >
      </template>

      <!-- 2.5 应收日期 -->
      <template #receivable_date="scope">
        <div
          :class="['receivable-date-cell', { 'is-overdue': isOverdueAndUnpaid(scope) }]"
        >
          <span>{{ scope.receivable_date || '-' }}</span>
          <el-tooltip
            v-if="isOverdueAndUnpaid(scope)"
            content="应收日期已到但未收款"
            placement="top"
          >
            <el-icon class="warning-icon"><Warning /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <!-- 3. 邮箱发送状态 -->
      <template #mail_status="scope">
        <el-tag v-if="scope.mail_status === 'sent'" type="success">已发送</el-tag>
        <el-popconfirm
          v-else
          title="发送邮件？"
          confirm-button-text="确定"
          cancel-button-text="取消"
          @confirm="handleMailStatusClick(scope)"
        >
          <template #reference>
            <el-tag type="info" class="clickable-mail-status">未发送</el-tag>
          </template>
        </el-popconfirm>
      </template>

      <!-- 4. 收款金额 -->
      <template #amount_received="scope">
        <!-- 非编辑状态 -->
        <div
          v-if="editingRowId !== scope.id"
          @dblclick="startEdit($event, scope.id, Number(scope.amount_received))"
          class="amount-display currency-amount"
        >
          ${{ scope.amount_received }}
        </div>

        <!-- 编辑状态 - 使用 Teleport 渲染到 body -->
        <Teleport to="body">
          <div
            v-if="editingRowId === scope.id"
            class="amount-input-wrapper"
            :style="inputPosition"
          >
            <el-input-number
              v-model="editText"
              :min="0"
              :precision="2"
              :controls="false"
              ref="inputRef"
              @blur="saveEdit(scope.id)"
              @keyup.enter="saveEdit(scope.id)"
              class="edit-input-number"
              @change="(val) => editText = val === null ? 0 : val"
            />
          </div>
        </Teleport>
      </template>

      <!-- 4.5 差额 -->
      <template #amount_diff="{ amount, amount_received }">
        <div
          class="currency-amount"
          :class="{
            'diff-negative': Number(amount_received) - Number(amount) < 0,
            'diff-zero': Number(amount_received) - Number(amount) === 0
          }"
        >
          ${{ (Number(amount_received) - Number(amount)).toFixed(2) }}
        </div>
      </template>

      <!-- 5. 收款状态 -->
      <template #payment_status="scope">
        <template v-if="scope.payment_status === '已收款'">
          <el-popconfirm 
            title="修改为未收款?"
            @confirm="handleConfirm(scope, '未收款')"
          >
            <template #reference>
              <div style="display: flex !important; justify-content: center;">
                <el-button size="small" type="success">已收款</el-button>
              </div>
            </template>
          </el-popconfirm>
        </template>

        <template v-else>
          <el-popconfirm 
            title="确定收款?"
            @confirm="handleConfirm(scope, '已收款')"
          >
            <template #reference>
              <div style="display: flex !important; justify-content: center;">
                <el-button size="small" type="info">未收款</el-button>
              </div>
            </template>
          </el-popconfirm>
        </template>
        
      </template>

    </attachment-content>

    <!-- 弹窗 -->
    <attachment-modal
      ref="modalRef"
      :modal-config="modalConfig"
      :selected-customer="selectedCustomer"
      :invoice-entities="invoiceEntities"
      :selected-invoice-entity-id="selectedInvoiceEntityId"
      @generate-pdf="handleGeneratePdfClick"
      @select-invoice-entity="handleSelectInvoiceEntity"
    >
      <!-- 查找客户 (弹窗内) -->
      <template #customer>
         <el-autocomplete
          v-model="customerState"
          :fetch-suggestions="queryModalSearchAsync"
          placeholder="查找客户"
          @select="handleModalSelect"
          @blur="handleModalBlur"
          :teleported="false"
          style="width: 100%"
        />
      </template>

      <!-- 选择开票主体 -->
      <template #invoice_entity>
         <el-select
          v-model="selectedInvoiceEntityId"
          placeholder="请选择开票主体"
          clearable
          filterable
          :teleported="false"
          style="width: 100%"
        >
          <el-option
            v-for="entity in invoiceEntities"
            :key="entity.id"
            :label="entity.name"
            :value="entity.id"
          />
        </el-select>
      </template>
    </attachment-modal>
  </div>
</template>

<script setup>
import { Warning } from '@element-plus/icons-vue'
import AttachmentContent from './c-cpns/attachment-content.vue'
import contentConfig from './config/content.config'
import AttachmentModal from './c-cpns/attachment-modal.vue'
import modalConfig from './config/modal.config'

import { nextTick, ref, watch, onMounted, onUnmounted } from 'vue'
import useMainStore from '@/stores/main/main'
import useLoginStore from '@/stores/login/login'
import getTodayStr from '@/utils/get-today-str'
import getNowTimestampStr from '@/utils/get-now-timestamp'
import useSystemStore from '@/stores/main/system/system'
import convertDateRange from '@/utils/convert-date-range'
import { storeToRefs } from 'pinia'
const systemStore = useSystemStore()

const { allQueryInfo, pageAllCount } = storeToRefs(systemStore)


const entityColors = [
  { name: 'Eflow', bg: '#e8f0fe', text: '#1967d2' },
  { name: 'Terra', bg: '#e6f4ea', text: '#137333' },
]


const defaultColors = [
  { bg: '#e8f0fe', text: '#1967d2' },
  { bg: '#e6f4ea', text: '#137333' },
  { bg: '#fce8e6', text: '#c5221f' },
  { bg: '#fef7e0', text: '#b06000' },
  { bg: '#f3e8fd', text: '#7b1fa2' },
]


function getEntityColor(name) {

  for (const item of entityColors) {
    if (name === item.name) {
      return { bg: item.bg, text: item.text }
    }
  }

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return defaultColors[hash % defaultColors.length]
}


const modalRef = ref() // AttachmentModal子组件对象
const attachmentContentRef = ref() // AttachmentContent子组件对象
const searchState = ref('')    // 表格顶部的 autocomplete 值
const customerState = ref('')  // 弹窗内的 autocomplete 值
const validList = ref([]) // 保存服务器返回的客户姓名列表, 用于校验输入的客户是否存在
const selectedCustomer = ref(null) // 选中的客户信息
const invoiceEntities = ref([]) // 开票主体列表
const selectedInvoiceEntityId = ref(null) // 选中的开票主体ID
const editingRowId = ref(null) // 当前正在编辑的收款金额对应的行id
const editText = ref(0) // 收款金额输入框中输入的内容
const inputRef = ref(null) // input输入框元素
const inputPosition = ref({ top: '0px', left: '0px' }) // 输入框位置
const amountInitialValue = ref(0) // 记录收款金额的初始金额
const tableShowLoading = ref(false) // 表格显示加载动画?
let searchTimer = null // 记录定时器


function isOverdueAndUnpaid(scope) {
  const { receivable_date, payment_status } = scope
  if (!receivable_date || payment_status === '已收款') return false
  const today = getTodayStr() // 格式: YYYY-MM-DD
  return receivable_date <= today
}



function handleNewClick() {

  selectedInvoiceEntityId.value = null

  modalRef.value?.setModalVisible('new') // 打开弹窗新增
}


async function fetchInvoiceEntities() {
  try {
    const list = await systemStore.postPageListAction('invoiceentity', {
      filters: { status: 1 }, // 只获取启用状态的主体
      options: { page: 1, pageSize: 100 }
    })
    invoiceEntities.value = list || []
  } catch (error) {
    console.error('获取开票主体列表失败:', error)
    invoiceEntities.value = []
  }
}


function handleSelectInvoiceEntity(entityId) {
  selectedInvoiceEntityId.value = entityId
}


function handleMailStatusClick(rowData) {

  attachmentContentRef.value?.confirmSendEmail(rowData)
}


const mainStore = useMainStore()
const loginStore = useLoginStore()


function handleCustomerClick(customer) {
  if (!customer?.short_name) return

  searchState.value = customer.short_name
  allQueryInfo.value.short_name = customer.short_name
  allQueryInfo.value.page = 1

  const queryInfo = {
    ...allQueryInfo.value,

    page: 1,
    pageSize: 10000,
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(contentConfig.pageName, queryInfo, "attalist")
}

const queryModalSearchAsync = (queryString, cb) => {

  const queryInfo = {
    filters: {
      full_name: queryString
    },
    options: {
      page: 1,
      pageSize: 20,
    }
  }

  mainStore.postPageListAction(contentConfig.pageName, queryInfo).then((res) => {
    if (!res || !Array.isArray(res)) {
      cb([])
      return
    }
    res.forEach(item => { item.value = item.full_name }) // el-autocomplete要求返回的数据中必须有value属性, 用于显示在下拉列表中的文本内容



    validList.value = res.map(item => item.full_name)

    cb(res) // 将获取到的客户列表数据, 传递给 el-autocomplete 组件, 用于显示在下拉列表中
  })
}
const queryContentSearchAsync = (queryString, cb) => {

  allQueryInfo.value.short_name = queryString
  allQueryInfo.value.page = 1


  const customerQuery = {
    ...allQueryInfo.value,
    payment_status: undefined
  }
  systemStore.postCustomerListAction(customerQuery).then(res => {

    const shortNameList = res.map(item => {
      return item.short_name
    })
    const showList = shortNameList.map(value => ({ value }))

    validList.value = shortNameList

    cb(showList) // 将获取到的客户列表数据, 传递给 el-autocomplete 组件, 用于显示在下拉列表中
  })


  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    triggerTableSearch()
  }, 500)
}


function selectCustomer(item, type) {
  console.log("item", item)

  if (type === "attachment-content") {
    allQueryInfo.value.short_name = item.value // 记录被选中的客户

    const queryInfo = {
      ...allQueryInfo.value,

      page: 1,
      pageSize: 10000,
      "role_name": loginStore.userInfo.role.name || '',
      "user_id": loginStore.userInfo.id
    }
    systemStore.postPageListAction(contentConfig.pageName, queryInfo, "attalist")
    
  } else if (type === "attachment-modal") {

    selectedCustomer.value = {
      id: item.id,
      full_name: item.full_name,
      short_name: item.short_name,
      company_address: item.company_address,
      payment_cycle_days: item.payment_cycle_days,
      date: getTodayStr(),
    }

    if (item.invoice_entity_id) {
      selectedInvoiceEntityId.value = item.invoice_entity_id
    }
  }
}



function handleSearchSelect(item) {
  selectCustomer(item, "attachment-content")
  searchState.value = item.value
}

watch(
  () => allQueryInfo.value.short_name,
  (newVal) => {
    searchState.value = newVal
  },
  { immediate: true }
)

function handleSearchBlur() {


}

function handleModalSelect(item) {
  selectCustomer(item, "attachment-modal")
  customerState.value = item.full_name
}
function handleModalBlur() {
  validateInputValue(customerState)
}


const handleSearchEnter = () => {
  allQueryInfo.value.page = 1 // 回到第一页
  allQueryInfo.value.short_name = searchState.value


  const hasSearch = !!allQueryInfo.value.short_name
  const queryInfo = {
    ...allQueryInfo.value,
    ...(hasSearch ? { page: 1, pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(
    contentConfig.pageName,
    queryInfo,
    'attalist'
  )
}

const triggerTableSearch = () => {

  const hasSearch = !!allQueryInfo.value.short_name
  const queryInfo = {
    ...allQueryInfo.value,
    ...(hasSearch ? { page: 1, pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(
    contentConfig.pageName,
    queryInfo,
    'attalist'
  )
}



function validateInputValue(stateRef) {
  const inputVal = (stateRef.value || '').trim()
  if (!inputVal) return
  if (!validList.value.includes(inputVal)) {
    ElMessage.error('客户不存在，请重新选择')
    stateRef.value = ''
  }
}



function startEdit(event, id, startValue) {
  amountInitialValue.value = startValue
  editingRowId.value = id
  editText.value = startValue


  const target = event.currentTarget
  const rect = target.getBoundingClientRect()

  inputPosition.value = {
    top: rect.top + 'px',
    left: rect.left + 'px'
  }


  nextTick(() => {
    inputRef.value?.focus()

    if (startValue === 0) {
      const input = inputRef.value?.$el?.querySelector('input')
      input?.select()
    }
  })
}


function saveEdit(id) {

  const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'

  const queryInfo = {
    ...allQueryInfo.value,

    ...(isGroupView ? { page: 1, pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }


  const finalValue = editText.value == null || editText.value === '' ? 0 : editText.value



  if (finalValue !== amountInitialValue.value) {

    systemStore.editPageDataAction('cus_attachments', id, { amount_received: finalValue }, queryInfo, "attalist")
  }


  editingRowId.value = null
  editText.value = 0
  amountInitialValue.value = 0
}


function handleConfirm(scope, type) {

  const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'

  const queryInfo = {
    ...allQueryInfo.value,

    ...(isGroupView ? { page: 1, pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  if (type === "已收款") {
    systemStore.editPageDataAction('cus_attachments', scope.id, { payment_status: type, confirmed_date: getNowTimestampStr()}, queryInfo, "attalist")
  }

  if (type === "未收款") {
    systemStore.editPageDataAction('cus_attachments', scope.id, { payment_status: type, confirmed_date: "" }, queryInfo, "attalist")
  }
}


function handleGeneratePdfClick() {
  tableShowLoading.value = true
}


systemStore.$onAction(({ name, after }) => {
  after(() => {
    if (name === 'generatePdfAction') {
      tableShowLoading.value = false
    }
  })
})


function handleTableScroll() {
  if (editingRowId.value !== null) {
    editingRowId.value = null
    editText.value = 0
    amountInitialValue.value = 0
  }
}

onMounted(async () => {

  const tableWrapper = document.querySelector('.table-wrapper')
  if (tableWrapper) {
    tableWrapper.addEventListener('scroll', handleTableScroll)
  }


  await fetchInvoiceEntities()
  attachmentContentRef.value?.fetchPageListData()
})

onUnmounted(() => {
  const tableWrapper = document.querySelector('.table-wrapper')
  if (tableWrapper) {
    tableWrapper.removeEventListener('scroll', handleTableScroll)
  }
})


</script>

<style lang="less" scoped>
.attachement {
  width: 100%;
  height: 100%;
}


:deep(.el-table .cell) {
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}


.amount-display {
  cursor: text;
  width: 100%;
  text-align: center;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.15s, background-color 0.15s;

  &:hover {
    border-color: #1a73e8;
    background-color: #f0f5ff;
  }
}




















.currency-amount.diff-negative {
  color: #d93025;
  font-weight: 600;
}

.currency-amount.diff-zero {
  color: #9aa0a6;
}


.receivable-date-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  &.is-overdue {
    color: #e6a23c;
    font-weight: 600;

    .warning-icon {
      color: #e6a23c;
      animation: pulse 1.5s ease-in-out infinite;
    }
  }

  .warning-icon {
    font-size: 16px;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}


.amount-input-wrapper {
  position: fixed;
  z-index: 9999;
  background: #fff;
  padding: 4px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  .edit-input-number {
    width: 140px;

    :deep(.el-input__wrapper) {
      border-radius: 4px;
      border: 1px solid #1a73e8;
      box-shadow: 0 0 0 1px #1a73e8;
    }

    :deep(.el-input__inner) {
      text-align: center;
      font-weight: 500;
    }
  }
}


:deep(a) {
  color: #1a73e8;
  text-decoration: none;
  font-weight: 500;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;

  &:hover {
    text-decoration: underline;
  }
}


.clickable-customer {
  color: #1a73e8;
  cursor: pointer;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;

  &:hover {
    background: #e8f0fe;
  }
}


.invoice-entity-name {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.empty-placeholder {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}


:deep(.el-tag) {
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;

  &.el-tag--success {
    background-color: #ceead6;
    color: #137333;
  }

  &.el-tag--info {
    background-color: #e8f0fe;
    color: #1a73e8;
  }

  &.el-tag--warning {
    background-color: #feefe3;
    color: #b06000;
  }

  &.el-tag--danger {
    background-color: #fad2cf;
    color: #c5221f;
  }
}


:deep(.clickable-mail-status) {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
}


:deep(.el-button--small) {
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #dadce0;

  &.el-button--success {
    background-color: #ceead6;
    color: #137333;
    border-color: transparent;

    &:hover {
      background-color: #b7dfc8;
    }
  }

  &.el-button--info {
    background-color: #e8f0fe;
    color: #1a73e8;
    border-color: transparent;

    &:hover {
      background-color: #d2e3fc;
    }
  }
}


:deep(.el-autocomplete) {
  max-width: 250px;

  .el-input__wrapper {
    border-radius: 8px;
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


:deep(.el-button) {
  &.el-button--primary {
    background-color: #1a73e8;
    border-color: #1a73e8;
    border-radius: 4px;
    font-weight: 500;

    &:hover {
      background-color: #1557b0;
    }
  }

  &.el-button--circle {
    border-radius: 50%;
    border: 1px solid #dadce0;

    &:hover {
      background-color: #f1f3f4;
      color: #1a73e8;
    }
  }

  &.is-link {
    &:hover {
      background-color: #f1f3f4;
    }
  }
}





</style>

<style scoped lang="less">

.el-autocomplete__popper {
  z-index: 9999 !important;
}


:deep(.el-autocomplete-suggestion__wrap) {
  max-height: 264px !important;
}
</style>
