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

      <!-- 备注（双击编辑） -->
      <template #remark="scope">
        <!-- 有备注：悬浮弹出面板显示完整备注（支持换行） -->
        <el-tooltip
          v-if="editingRemarkId !== scope.id && scope.remark"
          :content="scope.remark"
          placement="top"
          effect="dark"
          :show-after="200"
          popper-class="remark-tooltip"
        >
          <div class="remark-display" @dblclick="startRemarkEdit($event, scope.id, scope.remark)">
            {{ scope.remark }}
          </div>
        </el-tooltip>
        <!-- 无备注：不弹面板，悬浮时单元格内文字由「+ 添加备注」变为「双击编辑」 -->
        <div
          v-else-if="editingRemarkId !== scope.id"
          class="remark-display remark-empty"
          @dblclick="startRemarkEdit($event, scope.id, '')"
        >
          <span class="ph-default">+ 添加备注</span>
          <span class="ph-hover">双击编辑</span>
        </div>
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
        <div class="currency-amount">{{ formatCurrency(amount) }}</div>
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
          {{ formatCurrency((Number(amount_received) - Number(amount)).toFixed(2)) }}
        </div>
      </template>

      <!-- 对账单（双击打开预览气泡，支持上传/粘贴/删除，风格对齐付款追踪） -->
      <template #statements="scope">
        <el-tooltip effect="light" placement="top" :show-after="500" :disabled="!scope.statements || scope.statements.length === 0">
          <template #content>
            <div class="file-tooltip" v-if="scope.statements && scope.statements.length > 0">
              <div v-for="sta in scope.statements" :key="sta.id">{{ sta.filename }}</div>
            </div>
          </template>
          <div
            class="upload-cell"
            :class="{ 'has-files': scope.statements && scope.statements.length > 0, 'is-active': preview.visible && preview.trackId === scope.id && preview.type === 'statement' }"
            @dblclick.stop="openPreview($event, scope.statements || [], 0, scope.id, 'statement')"
          >
            <template v-if="scope.statements && scope.statements.length > 0">
              <div class="file-preview-list">
                <template v-for="(sta, idx) in scope.statements" :key="sta.id">
                  <div v-if="idx < 3" class="file-preview-item clickable" @click.stop="openFileInNewWindow(sta)">
                    <el-image
                      v-if="isImage(sta.mimetype)"
                      :src="getFileUrl(sta.destination, sta.filename)"
                      fit="cover"
                      class="preview-img"
                    />
                    <img
                      v-else-if="sta.thumbnail"
                      :src="getFileUrl(sta.thumbnail)"
                      class="preview-img pdf-thumb"
                    />
                    <div v-else class="file-type-icon">{{ getFileExt(sta.filename) }}</div>
                  </div>
                </template>
                <span v-if="scope.statements.length > 3" class="file-more clickable" @click.stop="openFileInNewWindow(scope.statements[0])">+{{ scope.statements.length - 3 }}</span>
              </div>
            </template>
            <span v-else class="upload-hint" data-text="双击上传对账单"></span>
            <span
              v-if="scope.statements && scope.statements.length > 0"
              class="cell-dropdown-arrow"
              @click.stop="openPreview($event, scope.statements || [], 0, scope.id, 'statement')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
            </span>
          </div>
        </el-tooltip>
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
        >
          <template #default="{ item }">
            <div class="customer-option">
              <span class="customer-option__full">{{ item.full_name }}</span>
              <span v-if="item.short_name" class="customer-option__short">{{ item.short_name }}</span>
            </div>
          </template>
        </el-autocomplete>
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

    <!-- 文件预览气泡（teleport 到 body，风格对齐付款追踪） -->
    <teleport to="body">
        <div
          v-if="preview.visible"
          class="bubble-backdrop"
          @mousedown="closePreview"
        >
          <div
            class="bubble-wrapper"
            :style="previewBubbleStyle"
            @mousedown.stop
          >
            <div class="bubble-arrow" :class="previewPlacement === 'bottom' ? 'arrow-up' : 'arrow-down'" :style="previewArrowStyle"></div>
            <div class="bubble-body preview-bubble">
              <div class="preview-grid">
                <div
                  v-for="(file, fIdx) in preview.files"
                  :key="file._uploadKey || file.id"
                  class="preview-grid-item"
                  :class="{ 'is-uploading': file.isUploading }"
                >
                  <!-- 缩略图 -->
                  <div class="grid-thumb">
                    <img
                      v-if="isImage(file.mimetype) && !file.isUploading"
                      :src="getFileUrl(file.destination, file.filename)"
                    />
                    <div v-else-if="isImage(file.mimetype)" class="grid-file-type">IMG</div>
                    <img
                      v-else-if="file.thumbnail"
                      :src="getFileUrl(file.thumbnail)"
                    />
                    <div v-else class="grid-file-type">{{ getFileExt(file.filename) }}</div>
                  </div>
                  <!-- 上传进度遮罩 -->
                  <div v-if="file.isUploading" class="grid-upload-mask">
                    <div class="upload-progress-bar">
                      <div class="upload-progress-fill" :style="{ width: file.progress + '%' }"></div>
                    </div>
                    <span class="upload-progress-text">{{ file.progress }}%</span>
                  </div>
                  <!-- 悬浮遮罩（非上传中才显示） -->
                  <div v-else class="grid-overlay">
                    <span class="grid-filename" :title="file.filename">{{ file.filename }}</span>
                    <div class="grid-actions">
                      <button class="grid-action-btn" @click.stop="previewFile(file)" title="预览">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
                      </button>
                      <button class="grid-action-btn" @click.stop="downloadFile(file)" title="下载">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>
                      </button>
                      <button class="grid-action-btn danger" @click.stop="requestDeleteFile(file)" title="删除">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <!-- 添加文件 -->
                <div class="preview-grid-item add-item" @click="triggerPreviewUpload">
                  <svg viewBox="0 0 24 24" width="28" height="28"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
                  <span>添加文件</span>
                </div>
              </div>
              <div class="paste-hint">也可按 Ctrl+V 粘贴文件上传</div>
            </div>
            <!-- 删除确认遮罩（放在 bubble-wrapper 层级，脱离 bubble-body 的 overflow:hidden） -->
            <div v-if="confirmDeleteId" class="delete-confirm-overlay" @click.stop="confirmDeleteId = null">
              <div class="delete-confirm-bubble" @click.stop>
                <span>确定删除该文件？</span>
                <div class="confirm-btns">
                  <button class="confirm-yes" @click.stop="confirmDeleteYes">确定</button>
                  <button class="confirm-no" @click.stop="confirmDeleteId = null">取消</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 隐藏的文件上传 input -->
          <input type="file" ref="previewFileInput" multiple style="display: none" @change="handlePreviewFileUpload" />
        </div>
    </teleport>

    <!-- 备注行内编辑（teleport 到 body，风格对齐付款追踪） -->
    <teleport to="body">
      <div v-if="editingRemarkId !== null" class="inline-edit-overlay" @mousedown="saveRemarkEdit">
        <div class="inline-edit-wrapper" :style="remarkEditStyle" @mousedown.stop>
          <textarea
            v-model="remarkText"
            ref="remarkInputRef"
            class="inline-edit-textarea"
            placeholder="请输入备注..."
            @input="autoResizeRemark"
            @keydown.esc.prevent="cancelRemarkEdit"
          />
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { Warning } from '@element-plus/icons-vue'
import AttachmentContent from './c-cpns/attachment-content.vue'
import contentConfig from './config/content.config'
import AttachmentModal from './c-cpns/attachment-modal.vue'
import modalConfig from './config/modal.config'

import { nextTick, ref, watch, reactive, onMounted, onUnmounted } from 'vue'
import useMainStore from '@/stores/main/main'
import useLoginStore from '@/stores/login/login'
import getTodayStr from '@/utils/get-today-str'
import getNowTimestampStr from '@/utils/get-now-timestamp'
import useSystemStore from '@/stores/main/system/system'
import { editAttachmentRemark } from '@/services/main/system/system'
import convertDateRange from '@/utils/convert-date-range'
import formatCurrency from '@/utils/format-currency'
import { storeToRefs } from 'pinia'
import { LOGIN_TOKEN } from '@/global/constants'
import { localCache } from '@/utils/cache'
import { BASE_URL } from '@/services/request/config'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
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
const editingRemarkId = ref(null) // 当前正在编辑备注的行id
const remarkText = ref('') // 备注输入框内容
const remarkInitialValue = ref('') // 备注初始值（判断是否变化）
const remarkInputRef = ref(null) // 备注输入框元素（原生 textarea）
const remarkEditStyle = ref({}) // 备注输入框定位样式（对齐单元格）
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

  // 分组视图需要一次性拉取全部数据用于前端分组；合并视图走服务端正常分页
  const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'

  searchState.value = customer.short_name
  allQueryInfo.value.short_name = customer.short_name
  allQueryInfo.value.page = 1

  const queryInfo = {
    ...allQueryInfo.value,
    ...(isGroupView ? { pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(contentConfig.pageName, queryInfo, "attalist")
}

const queryModalSearchAsync = (queryString, cb) => {

  const queryInfo = {
    filters: {
      name_keyword: queryString // 后端对 full_name / short_name 做联合模糊搜索
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
    res.forEach(item => { item.value = item.full_name }) // el-autocomplete要求返回的数据中必须有value属性（下拉展示样式见 #default 插槽）



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
    const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'
    allQueryInfo.value.short_name = item.value // 记录被选中的客户
    allQueryInfo.value.page = 1

    const queryInfo = {
      ...allQueryInfo.value,
      ...(isGroupView ? { pageSize: 10000 } : {}),
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
  const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'
  allQueryInfo.value.page = 1 // 回到第一页
  allQueryInfo.value.short_name = searchState.value


  const queryInfo = {
    ...allQueryInfo.value,
    ...(isGroupView ? { pageSize: 10000 } : {}),
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
  const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'

  const queryInfo = {
    ...allQueryInfo.value,
    ...(isGroupView ? { pageSize: 10000 } : {}),
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


// 备注：双击编辑（走独立接口 editAttachmentRemark，风格对齐付款追踪）
function startRemarkEdit(event, id, startValue) {
  const cellEl = event.currentTarget
  const cellRect = cellEl.getBoundingClientRect()

  remarkInitialValue.value = startValue || ''
  editingRemarkId.value = id
  remarkText.value = startValue || ''

  remarkEditStyle.value = {
    position: 'absolute',
    left: `${cellRect.left}px`,
    top: `${cellRect.top - 1}px`,
    minWidth: `${cellRect.width + 2}px`,
    minHeight: `${cellRect.height + 2}px`
  }

  nextTick(() => {
    const ta = remarkInputRef.value
    if (ta) {
      ta.focus()
      ta.style.height = 'auto'
      ta.style.height = `${Math.max(cellRect.height, ta.scrollHeight)}px`
    }
  })
}

function autoResizeRemark() {
  const ta = remarkInputRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = `${Math.max(30, ta.scrollHeight)}px`
}

function cancelRemarkEdit() {
  editingRemarkId.value = null
  remarkText.value = ''
  remarkInitialValue.value = ''
  remarkEditStyle.value = {}
}

async function saveRemarkEdit() {
  const id = editingRemarkId.value
  const finalValue = remarkText.value ?? ''
  const changed = finalValue !== remarkInitialValue.value

  editingRemarkId.value = null
  remarkText.value = ''
  remarkInitialValue.value = ''
  remarkEditStyle.value = {}

  if (id === null || !changed) return

  const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'
  const queryInfo = {
    ...allQueryInfo.value,
    ...(isGroupView ? { page: 1, pageSize: 10000 } : {}),
    role_name: loginStore.userInfo.role.name || '',
    user_id: loginStore.userInfo.id
  }

  try {
    await editAttachmentRemark(id, { remark: finalValue })
    ElMessage.success('备注已更新')
    systemStore.postPageListAction('cus_attachments', queryInfo, 'attalist')
  } catch (e) {
    ElMessage.error('备注更新失败')
    systemStore.postPageListAction('cus_attachments', queryInfo, 'attalist')
  }
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


// ========== 对账单附件：预览气泡 + 上传/粘贴/删除（风格对齐付款追踪） ==========
const preview = reactive({
  visible: false,
  files: [],
  trackId: null,
  type: 'statement' // 收款管理目前只有对账单一种
})
const previewPlacement = ref('bottom')
const confirmDeleteId = ref(null)
const previewFileInput = ref(null)
const previewBubbleStyle = ref({})
const previewArrowStyle = ref({})

function openPreview(event, files, index, trackId, type) {
  const rect = event.currentTarget?.getBoundingClientRect() || event.target?.getBoundingClientRect()
  if (!rect) return
  preview.files = files
  preview.trackId = trackId
  preview.type = type

  const bubbleWidth = 340
  const estimatedBubbleHeight = 280

  let left = rect.left + rect.width / 2 - bubbleWidth / 2
  const maxLeft = window.innerWidth - bubbleWidth - 12
  if (left > maxLeft) left = maxLeft
  if (left < 12) left = 12

  let top = rect.bottom + 14

  if (top + estimatedBubbleHeight > window.innerHeight - 12) {
    top = rect.top - estimatedBubbleHeight - 14
    previewPlacement.value = 'top'
  } else {
    previewPlacement.value = 'bottom'
  }
  if (top < 12) top = 12

  previewBubbleStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${bubbleWidth}px`
  }

  const arrowLeft = rect.left + rect.width / 2 - left
  previewArrowStyle.value = { left: `${arrowLeft}px` }

  preview.visible = true
}

function closePreview() {
  preview.visible = false
  preview.files = []
  preview.trackId = null
  preview.type = null
}

// 刷新列表（保持当前查询条件，分组视图拉全量）
function refreshAttachmentList() {
  const isGroupView = attachmentContentRef.value?.groupBy !== 'merged'
  const queryInfo = {
    ...allQueryInfo.value,
    ...(isGroupView ? { page: 1, pageSize: 10000 } : {}),
    role_name: loginStore.userInfo.role.name || '',
    user_id: loginStore.userInfo.id
  }
  systemStore.postPageListAction(contentConfig.pageName, queryInfo, 'attalist')
}

// 上传/删除后用最新行数据同步预览气泡里的文件列表
function refreshPreviewFiles() {
  if (!preview.trackId) return
  const list = attachmentContentRef.value?.pageList || []
  const row = list.find(item => item.id === preview.trackId)
  if (!row) return
  preview.files = row.statements || []
}

function previewFile(file) {
  const url = getFileUrl(file.destination, file.filename)
  if (url) window.open(url, '_blank')
}

function openFileInNewWindow(file) {
  const url = getFileUrl(file.destination, file.filename)
  if (url) window.open(url, '_blank')
}

async function downloadFile(file) {
  const url = getFileUrl(file.destination, file.filename)
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = file.filename || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

function triggerPreviewUpload() {
  previewFileInput.value?.click()
}

async function uploadFilesToPreview(files) {
  if (!files || files.length === 0 || !preview.trackId) return

  const fieldName = 'customer_statement'
  const uploadUrl = `${BASE_URL}/cus_attachments/upload/statement/${preview.trackId}`
  const token = localCache.getCache(LOGIN_TOKEN)


  const uploadItems = []
  for (let i = 0; i < files.length; i++) {
    const item = reactive({
      _uploadKey: `_upload_${Date.now()}_${i}`,
      id: null,
      filename: files[i].name,
      mimetype: files[i].type,
      isUploading: true,
      progress: 0
    })
    uploadItems.push({ file: files[i], item })
    preview.files.push(item)
  }


  const timers = uploadItems.map(({ item }) => {
    return setInterval(() => {
      if (item.progress < 85) {
        item.progress += Math.floor(Math.random() * 12) + 3
        if (item.progress > 85) item.progress = 85
      }
    }, 200)
  })

  let successCount = 0

  for (let i = 0; i < uploadItems.length; i++) {
    const { file, item } = uploadItems[i]
    const formData = new FormData()
    formData.append(fieldName, file)


    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const thumbnail = await generatePdfThumbnail(arrayBuffer)
        if (thumbnail) formData.append('thumbnail', thumbnail)
      } catch {

      }
    }

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })
      const result = await res.json()
      if (result.code === 0) {
        successCount++
        clearInterval(timers[i])
        item.progress = 100
      } else {
        clearInterval(timers[i])
        item.progress = 0
        item.isUploading = false
      }
    } catch {
      clearInterval(timers[i])
      item.progress = 0
      item.isUploading = false
    }
  }


  await new Promise(resolve => setTimeout(resolve, 400))

  if (successCount > 0) {
    ElNotification({ message: `${successCount}个文件上传成功`, type: 'success', duration: 2000 })
    refreshAttachmentList()
    await nextTick()
    refreshPreviewFiles()
  } else {

    preview.files = preview.files.filter(f => !f.isUploading)
    ElNotification({ message: '文件上传失败', type: 'error' })
  }
}

async function handlePreviewFileUpload(event) {
  await uploadFilesToPreview(event.target.files)
  event.target.value = ''
}

function requestDeleteFile(file) {
  confirmDeleteId.value = file.id
}

function confirmDeleteYes() {
  const file = preview.files.find(f => f.id === confirmDeleteId.value)
  confirmDeleteId.value = null
  if (file) deleteFile(file)
}

async function deleteFile(file) {
  if (!file || !preview.trackId) return


  const trackId = preview.trackId

  try {
    const url = `${BASE_URL}/cus_attachments/statement/${file.id}`
    const token = localCache.getCache(LOGIN_TOKEN)
    const res = await fetch(url, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const result = await res.json()
    if (result.code === 0) {
      ElNotification({ message: '文件已删除', type: 'success', duration: 2000 })
      const idx = preview.files.findIndex(f => f.id === file.id)
      if (idx !== -1) preview.files.splice(idx, 1)
      if (preview.files.length === 0) {
        closePreview()
      }
      refreshAttachmentList()

      if (preview.visible && preview.trackId === trackId) {
        await nextTick()
        refreshPreviewFiles()
      }
    } else {
      ElNotification({ message: result.message || '删除失败', type: 'error' })
    }
  } catch {
    ElNotification({ message: '删除失败', type: 'error' })
  }
}

function isImage(mimetype) {
  return mimetype?.startsWith('image/')
}

function getFileUrl(destination, filename) {
  if (!destination) return ''
  if (destination.startsWith('http')) return destination
  const basePath = destination.startsWith('/') ? destination.slice(1) : destination
  const fullPath = filename ? `${basePath}/${filename}` : basePath
  return `${BASE_URL}/${fullPath}`
}

function getFileExt(filename) {
  if (!filename) return '?'
  const ext = filename.split('.').pop().toUpperCase()
  return ext.length > 4 ? ext.slice(0, 4) : ext
}


async function generatePdfThumbnail(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const desiredWidth = 200
  const unscaledViewport = page.getViewport({ scale: 1 })
  const scale = desiredWidth / unscaledViewport.width
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.8)
}


// 预览气泡打开时支持 Ctrl+V 粘贴上传
async function handlePaste(event) {
  if (!preview.visible || !preview.trackId) return
  const files = event.clipboardData?.files
  if (!files || files.length === 0) return
  event.preventDefault()
  await uploadFilesToPreview(files)
}

function handlePreviewKeydown(event) {
  if (!preview.visible) return
  if (event.key === 'Escape') {
    closePreview()
  }
}


function handleTableScroll() {
  if (editingRowId.value !== null) {
    editingRowId.value = null
    editText.value = 0
    amountInitialValue.value = 0
  }
  if (editingRemarkId.value !== null) {
    editingRemarkId.value = null
    remarkText.value = ''
    remarkInitialValue.value = ''
    remarkEditStyle.value = {}
  }
}

onMounted(async () => {

  const tableWrapper = document.querySelector('.table-wrapper')
  if (tableWrapper) {
    tableWrapper.addEventListener('scroll', handleTableScroll)
  }

  // 对账单预览气泡：粘贴上传 / Esc 关闭
  document.addEventListener('paste', handlePaste)
  document.addEventListener('keydown', handlePreviewKeydown)

  await fetchInvoiceEntities()
  attachmentContentRef.value?.fetchPageListData()
})

onUnmounted(() => {
  const tableWrapper = document.querySelector('.table-wrapper')
  if (tableWrapper) {
    tableWrapper.removeEventListener('scroll', handleTableScroll)
  }
  document.removeEventListener('paste', handlePaste)
  document.removeEventListener('keydown', handlePreviewKeydown)
})


</script>

<style lang="less" scoped>
.attachement {
  width: 100%;
  height: 100%;
}


/* ===== 对账单单元格（与付款追踪同风格） ===== */
.file-preview-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
}

.file-preview-item {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e8eaed;

  &.clickable {
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover {
      border-color: #1a73e8;
      box-shadow: 0 0 0 1px #1a73e8;
    }
  }

  .preview-img {
    width: 100%;
    height: 100%;
  }

  .pdf-thumb {
    object-fit: cover;
    background: #fff;
  }
}

.file-more.clickable {
  cursor: pointer;
  &:hover { color: #1a73e8; }
}

.file-type-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f1f3f4;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  color: #5f6368;
}

.file-more {
  font-size: 11px;
  color: #5f6368;
  font-weight: 500;
}

.file-tooltip {
  div {
    font-size: 13px;
    line-height: 1.6;
    color: #202124;
  }
}

.upload-hint {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}

.upload-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  padding: 4px 6px;
  box-sizing: border-box;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
  position: relative;

  &:hover {
    border-color: #1a73e8;
    background-color: #f0f5ff;
  }

  &.is-active {
    border-color: #1a73e8;
    background-color: #f0f5ff;
  }

  &.has-files:hover {
    background-color: transparent;
  }

  &.has-files.is-active {
    background-color: transparent;
  }
}

.upload-cell:hover > .upload-hint {
  width: auto;
  height: auto;
  background-color: transparent;
  border-radius: 0;
  color: #9aa0a6;
  font-size: 13px;

  &::after {
    content: attr(data-text);
  }
}

.cell-dropdown-arrow {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  color: #9aa0a6;
  opacity: 0;
  transition: opacity 0.15s, background-color 0.15s, color 0.15s;
  cursor: pointer;

  &:hover {
    background-color: #1a73e8;
    color: #fff;
  }
}

.upload-cell:hover > .cell-dropdown-arrow {
  opacity: 1;
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


.remark-display {
  cursor: text;
  width: 100%;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.15s, background-color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;

  &:hover {
    border-color: #1a73e8;
    background-color: #f0f5ff;
  }
}

.remark-empty {
  color: #bdc1c6;
  font-size: 12px;
  font-style: italic;

  .ph-default { display: inline; }
  .ph-hover { display: none; }

  &:hover {
    .ph-default { display: none; }
    .ph-hover { display: inline; color: #1a73e8; }
  }
}

.remark-input-wrapper {
  .edit-input-number {
    width: 240px;
  }
}


/* 备注行内编辑（与付款追踪同风格：全屏遮罩 + 定位 wrapper + 原生 textarea） */
.inline-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.inline-edit-wrapper {
  box-sizing: border-box;
  background: #fff !important;
  border: 2px solid #1a73e8;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(26, 115, 232, 0.15);
  overflow: visible;
  padding: 0;
}

.inline-edit-textarea {
  display: block;
  width: 100%;
  min-height: 30px;
  padding: 4px 6px;
  border: none;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  outline: none;
  color: #202124;
  word-break: break-all;
  background: #fff !important;
  box-sizing: border-box;
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

/* 客户下拉项：全称加粗居左，简称灰色居右 */
.customer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  overflow: hidden;

  &__full {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__short {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>

<style lang="less">
/* 备注悬浮提示：保留换行（tooltip 传送到 body，需放全局） */
.remark-tooltip {
  white-space: pre-wrap !important;
  max-width: 320px !important;
  line-height: 1.6;
}


/* ===== 对账单预览气泡（teleport 到 body，与付款追踪同风格） ===== */
.bubble-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.bubble-wrapper {
  position: absolute;
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.15));
  transform-origin: center bottom;
}

.bubble-arrow {
  position: absolute;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border: 8px solid transparent;

  &.arrow-down {
    bottom: -16px;
    border-top-color: #fff;
    border-bottom-width: 0;
  }

  &.arrow-up {
    top: -16px;
    border-bottom-color: #fff;
    border-top-width: 0;
  }
}

.bubble-body {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.preview-bubble {
  padding: 10px;
}

.paste-hint {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e0e0e0;
  font-size: 12px;
  color: #999;
  text-align: center;
  user-select: none;
}

.delete-confirm-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.delete-confirm-bubble {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #202124;

  .confirm-btns {
    display: flex;
    gap: 8px;
  }

  .confirm-yes {
    border: none;
    background: #d93025;
    color: #fff;
    padding: 6px 20px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;

    &:hover { background: #c5221f; }
  }

  .confirm-no {
    border: 1px solid #dadce0;
    background: #fff;
    color: #5f6368;
    padding: 6px 20px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;

    &:hover { background: #f1f3f4; }
  }
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.preview-grid-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #f1f3f4;
  cursor: pointer;

  &.is-uploading {
    cursor: default;
    &:hover .grid-overlay { opacity: 0; }
  }

  .grid-thumb {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .grid-file-type {
    font-size: 11px;
    font-weight: 600;
    color: #5f6368;
  }

  .grid-upload-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
  }

  .upload-progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  .upload-progress-fill {
    height: 100%;
    background: #fff;
    border-radius: 2px;
    transition: width 0.2s ease;
  }

  .upload-progress-text {
    font-size: 11px;
    color: #fff;
    font-weight: 500;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.18s;
    padding: 6px;
  }

  &:hover .grid-overlay {
    opacity: 1;
  }

  .grid-filename {
    font-size: 10px;
    color: #fff;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    line-height: 1.3;
  }

  .grid-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .grid-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.4);
    }

    &.danger:hover {
      background: rgba(217, 48, 37, 0.6);
    }
  }
}

.preview-grid-item.add-item {
  border: 1px dashed #dadce0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #9aa0a6;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;

  svg {
    fill: #9aa0a6;
    width: 22px;
    height: 22px;
  }

  span {
    font-size: 10px;
  }

  &:hover {
    border-color: #1a73e8;
    color: #1a73e8;
    background-color: #f0f5ff;

    svg {
      fill: #1a73e8;
    }
  }
}
</style>
