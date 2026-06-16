<template>
  <div class="google-content">
    <!-- 搜索栏 -->
    <!-- <div class="search-bar">
      <el-input
        v-model="searchShortName"
        placeholder="搜索客户简称"
        clearable
        class="search-input"
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select
        v-model="searchPaymentStatus"
        placeholder="付款状态"
        clearable
        class="search-select"
        @change="handleSearch"
      >
        <el-option label="未付款" value="未付款" />
        <el-option label="已付款" value="已付款" />
      </el-select>
      <button class="google-btn google-btn-text" @click="handleSearch">
        <svg class="btn-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <span>搜索</span>
      </button>
      <button class="google-btn google-btn-text" @click="handleReset">
        <span>重置</span>
      </button>
    </div> -->

    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ contentConfig.header?.title ?? '付款追踪' }}</h1>
        <el-autocomplete
          v-model="searchShortName"
          placeholder="搜索客户简称"
          clearable
          class="google-search-input"
          popper-class="short-name-popper"
          :fetch-suggestions="queryShortNameSuggestions"
          :trigger-on-focus="true"
          value-key="value"
          @select="onSearchSelect"
          @clear="handleSearch"
          @input="handleSearchDebounced"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #default="{ item }">
            <span>{{ item.value }}</span>
          </template>
        </el-autocomplete>
        <!-- 付款状态快捷筛选 -->
        <div class="quick-filter">
          <button
            class="filter-btn"
            :class="{ active: !searchPaymentStatus }"
            @click="quickFilterPaymentStatus('')"
          >全部</button>
          <button
            class="filter-btn"
            :class="{ active: searchPaymentStatus === '未付款' }"
            @click="quickFilterPaymentStatus('未付款')"
          >未付款</button>
          <button
            class="filter-btn"
            :class="{ active: searchPaymentStatus === '【已付款】' }"
            @click="quickFilterPaymentStatus('【已付款】')"
          >已付款</button>
        </div>
        <!-- 当前搜索条件（标签形式，点击 × 可移除） -->
        <div class="active-filters">
          <el-tag
            v-for="tag in activeFilters"
            :key="tag.key"
            closable
            @close="removeFilter(tag.key)"
          >
            {{ tag.label }}
          </el-tag>
        </div>
      </div>
      <div class="header-actions">
        <!-- 列设置按钮 -->
        <el-dropdown trigger="click" @command="handleColumnSetting" :hide-on-click="false">
          <el-button icon="Setting" circle title="列设置" class="column-setting-trigger" />
          <template #dropdown>
            <el-dropdown-menu class="column-setting-menu">
              <div class="column-setting-header">
                <span>列设置</span>
                <el-button link type="primary" size="small" @click="resetColumns">重置</el-button>
              </div>
              <el-scrollbar max-height="350px">
                <div
                  v-for="(col, index) in orderedColumns"
                  :key="col.key"
                  class="column-item"
                  :class="{ 'column-required': col.required, 'column-hidden': !isColumnVisible(col), 'dragging': draggingIndex === index }"
                  draggable="true"
                  @dragstart="handleDragStart(index, $event)"
                  @dragover.prevent="handleDragOver(index)"
                  @dragend="handleDragEnd"
                  @drop="handleDrop(index)"
                >
                  <div class="column-drag-handle">
                    <svg viewBox="0 0 24 24">
                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <div class="column-item-left">
                    <el-checkbox
                      :model-value="isColumnVisible(col)"
                      @change="toggleColumn(col.key)"
                      :disabled="col.required"
                    >
                      {{ col.label }}
                    </el-checkbox>
                  </div>
                </div>
              </el-scrollbar>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button v-if="isCreate" class="google-btn google-btn-primary" @click="emit('newClick')">
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>{{ contentConfig.header?.btnTitle || '新增记录' }}</span>
        </button>
      </div>
    </div>

    <!-- 内容卡片 -->
    <div class="content-card">
      <!-- 加载动画 -->
      <div v-if="loading" class="google-data-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">加载中...</p>
      </div>

      <!-- 列表视图 -->
      <div class="table-wrapper">
        <el-table
          :data="finalList"
          class="google-table"
          :border="true"
          :stripe="false"
          show-summary
          :summary-method="getSummary"
          @row-contextmenu="handleContextMenu"
          :row-class-name="tableRowClassName"
        >
          <template v-for="item in displayColumns" :key="item.label">
            <!-- 序号 -->
            <template v-if="item.prop === 'id'">
              <el-table-column v-bind="item" width="60" class-name="index-column">
                <template #default="scope">
                  <span class="row-index">{{ pageAllCount - (page - 1) * pageSize - scope.$index }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 客户简称（可点击搜索） -->
            <template v-else-if="item.prop === 'short_name'">
              <el-table-column v-bind="item" show-overflow-tooltip>
                <template #default="scope">
                  <span
                    class="clickable-name"
                    v-if="scope.row.customer?.short_name"
                    @click="handleNameClick(scope.row.customer.short_name)"
                  >{{ scope.row.customer.short_name }}</span>
                  <span v-else class="empty-placeholder"></span>
                </template>
              </el-table-column>
            </template>

            <!-- 金额类字段 -->
            <template v-else-if="item.prop === 'amount_diff'">
              <el-table-column v-bind="item" align="right">
                <template #default="scope">
                  <span class="amount-diff" :class="{ 'is-positive': getDiff(scope.row) > 0, 'is-negative': getDiff(scope.row) < 0, 'is-zero': getDiff(scope.row) === 0 }">
                    {{ getCurrencySymbol(scope.row.currency) + getDiff(scope.row).toFixed(2) }}
                  </span>
                </template>
              </el-table-column>
            </template>

            <!-- 自定义插槽 -->
            <template v-else-if="item.type === 'custom'">
              <el-table-column v-bind="item">
                <template #default="scope">
                  <slot
                    :name="item.slotName"
                    v-bind="scope.row"
                    :prop="item.prop"
                  />
                </template>
              </el-table-column>
            </template>

            <!-- 操作 -->
            <template v-else-if="item.type === 'handler'">
              <el-table-column v-bind="item" label="操作" width="80" align="center">
                <template #default="scope">
                  <button v-if="isUpdate" class="icon-btn edit-btn" @click="handleEditBtnClick(scope.row)" title="编辑">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  <button v-if="isDelete" class="icon-btn delete-btn" @click="handleDeleteBtnClick(scope.row)" title="删除">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </template>
              </el-table-column>
            </template>

            <!-- 普通数据 -->
            <template v-else>
              <el-table-column v-bind="item" show-overflow-tooltip>
                <template #default="scope">
                  <span class="text-cell" v-if="scope.row[item.prop]">{{ scope.row[item.prop] }}</span>
                  <span v-else class="empty-placeholder"></span>
                </template>
              </el-table-column>
            </template>
          </template>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :hide-on-single-page="false"
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30]"
          layout="total, sizes, prev, pager, next"
          :total="pageAllCount"
          class="google-pagination"
        />
      </div>
    </div>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div class="context-menu" v-show="showMenu" :style="menuPosition">
        <div class="context-menu-item" @click="handleMenuClick('编辑')" v-if="isUpdate">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          编辑
        </div>
        <div class="context-menu-item danger" @click="handleMenuClick('删除')" v-if="isDelete">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          删除
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue'
import usePermissions from '@/hooks/usePermissions'
import useSystemStore from '@/stores/main/system/system'
import useLoginStore from '@/stores/login/login'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { throttle, debounce } from 'lodash-es'

const props = defineProps({
  contentConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['newClick', 'editClick', 'deleteClick'])
const currentRow = ref(null)
const showMenu = ref(false)
const menuPosition = ref({ left: '0px', top: '0px' })
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)


const searchShortName = ref('')
const searchPaymentStatus = ref('')
const searchYear = ref('')   // 点击年份筛选（周期起始年份）
const searchMonth = ref('')  // 点击月份筛选（周期起始月份）
const searchCurrency = ref('')     // 点击币种筛选
const searchEntity = ref('')       // 点击付款主体筛选

// 客户简称候选列表（用于下拉提示）
const customerShortNames = ref([])
async function loadCustomerShortNames() {
  try {
    const list = await systemStore.getPaymentTrackCustomersAction()
    customerShortNames.value = Array.from(
      new Set((list || []).map(c => c.short_name).filter(Boolean))
    )
  } catch {
    customerShortNames.value = []
  }
}

// el-autocomplete 下拉过滤（纯客户端，避免每次按键都请求候选列表）
function queryShortNameSuggestions(queryString, cb) {
  const q = (queryString || '').trim().toLowerCase()
  const source = customerShortNames.value.map(name => ({ value: name }))
  const results = q
    ? source.filter(item => item.value.toLowerCase().includes(q))
    : source
  cb(results)
}

function onSearchSelect() {
  handleSearch()
}

// 输入时防抖搜索：持续输入不发起请求，停止输入 300ms 后才查询
const handleSearchDebounced = debounce(handleSearch, 300)

// 点击表格中的客户简称 → 直接填入搜索框并立即搜索
function handleNameClick(shortName) {
  if (!shortName) return
  handleSearchDebounced.cancel()
  searchShortName.value = shortName
  handleSearch()
}

// 当前生效的搜索条件（用于标签展示）
const activeFilters = computed(() => {
  const tags = []
  const name = (searchShortName.value || '').trim()
  if (name) {
    tags.push({ key: 'short_name', label: `客户：${name}` })
  }
  if (searchYear.value) {
    tags.push({ key: 'year', label: `年份：${searchYear.value}` })
  }
  if (searchMonth.value) {
    tags.push({ key: 'month', label: `月份：${searchMonth.value}月` })
  }
  if (searchCurrency.value) {
    tags.push({ key: 'currency', label: `币种：${searchCurrency.value}` })
  }
  if (searchEntity.value) {
    tags.push({ key: 'payment_entity', label: `主体：${searchEntity.value}` })
  }
  if (searchPaymentStatus.value) {
    const label = searchPaymentStatus.value === '【已付款】' ? '已付款' : searchPaymentStatus.value
    tags.push({ key: 'payment_status', label })
  }
  return tags
})

// 移除某个搜索条件（点击标签上的 ×）
function removeFilter(key) {
  handleSearchDebounced.cancel()
  if (key === 'short_name') {
    searchShortName.value = ''
  } else if (key === 'year') {
    searchYear.value = ''
  } else if (key === 'month') {
    searchMonth.value = ''
  } else if (key === 'currency') {
    searchCurrency.value = ''
  } else if (key === 'payment_entity') {
    searchEntity.value = ''
  } else if (key === 'payment_status') {
    searchPaymentStatus.value = ''
  }
  handleSearch()
}

// 点击年份徽章 → 按该年份筛选（供父组件通过 ref 调用）
function searchByYear(year) {
  searchYear.value = year ? Number(year) : ''
  page.value = 1
  fetchPageListData()
}

// 点击月份徽章 → 按该月份筛选（供父组件通过 ref 调用）
function searchByMonth(month) {
  searchMonth.value = month ? Number(month) : ''
  page.value = 1
  fetchPageListData()
}

// 点击币种徽章 → 按该币种筛选（供父组件通过 ref 调用）
function searchByCurrency(currency) {
  searchCurrency.value = currency || ''
  page.value = 1
  fetchPageListData()
}

// 点击付款主体徽章 → 按该主体筛选（供父组件通过 ref 调用）
function searchByEntity(entity) {
  searchEntity.value = entity || ''
  page.value = 1
  fetchPageListData()
}

// 快捷筛选付款状态（'' 全部 / '未付款' / '已付款'）
function quickFilterPaymentStatus(status) {
  searchPaymentStatus.value = status || ''
  page.value = 1
  fetchPageListData()
}


const STORAGE_KEY = 'payment_track_column_settings'

const allColumns = computed(() => {
  return props.contentConfig.propsList.map(item => {
    let key = item.prop || item.type || item.label
    if (key.includes('.')) key = key.replace(/\./g, '_')
    return {
      key,
      label: item.label,
      prop: item.prop,
      type: item.type,
      required: item.type === 'handler',
      hidden: item.hidden === true
    }
  })
})

const columnSettings = ref([])
const draggingIndex = ref(null)

function getColKey(col) {
  let key = col.prop || col.type || col.label
  if (key.includes('.')) key = key.replace(/\./g, '_')
  return key
}

const displayColumns = computed(() => {
  const originalList = props.contentConfig.propsList
  const saved = columnSettings.value
  if (!saved.length) return originalList

  const savedKeys = new Set(saved.map(s => s.key))


  const newColumns = originalList.filter(col => !savedKeys.has(getColKey(col)))


  const ordered = []
  for (const item of saved) {
    if (item.visible === false) continue
    const col = originalList.find(c => getColKey(c) === item.key)
    if (col) ordered.push(col)
  }


  for (const newCol of newColumns) {
    const newColKey = getColKey(newCol)
    const configIdx = originalList.findIndex(c => getColKey(c) === newColKey)

    let insertIdx = ordered.length
    for (let i = configIdx + 1; i < originalList.length; i++) {
      const afterKey = getColKey(originalList[i])
      const foundIdx = ordered.findIndex(c => getColKey(c) === afterKey)
      if (foundIdx !== -1) {
        insertIdx = foundIdx
        break
      }
    }
    ordered.splice(insertIdx, 0, newCol)
  }

  return ordered
})

const orderedColumns = computed(() => {
  const saved = columnSettings.value
  const all = allColumns.value
  if (!saved.length) return all

  const ordered = []
  const remaining = [...all]
  for (const item of saved) {
    const index = remaining.findIndex(c => c.key === item.key)
    if (index !== -1) {
      const col = remaining.splice(index, 1)[0]
      ordered.push({ ...col, visible: item.visible })
    }
  }
  ordered.push(...remaining)
  return ordered
})

function loadColumnSettings() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const currentAllColumns = allColumns.value

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      const currentKeys = new Set(currentAllColumns.map(col => col.key))
      const settings = []
      const processedKeys = new Set()

      for (const item of parsed) {
        if (currentKeys.has(item.key)) {
          settings.push({ key: item.key, visible: item.visible !== false })
          processedKeys.add(item.key)
        }
      }
      for (const col of currentAllColumns) {
        if (!processedKeys.has(col.key)) {
          settings.push({ key: col.key, visible: !col.hidden })
        }
      }
      columnSettings.value = settings
    } catch {
      columnSettings.value = currentAllColumns.map(col => ({ key: col.key, visible: !col.hidden }))
    }
  } else {
    columnSettings.value = currentAllColumns.map(col => ({ key: col.key, visible: !col.hidden }))
  }
}

function saveColumnSettings() {
  const settings = orderedColumns.value.map(col => ({
    key: col.key,
    visible: col.visible !== false
  }))
  columnSettings.value = settings
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function isColumnVisible(item) {
  const key = typeof item === 'string' ? item : item.key
  const setting = columnSettings.value.find(s => s.key === key)
  if (!setting) return true
  return setting.visible !== false
}

function toggleColumn(columnKey) {
  const setting = columnSettings.value.find(s => s.key === columnKey)
  const col = allColumns.value.find(c => c.key === columnKey)
  if (!col || col.required) return

  if (setting) {
    setting.visible = !setting.visible
  } else {
    columnSettings.value.push({ key: columnKey, visible: true })
  }
  saveColumnSettings()
}

function handleDragStart(index, event) {
  draggingIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.target.style.opacity = '0.5'
}

function handleDragOver(index) {}

function handleDragEnd(event) {
  draggingIndex.value = null
  event.target.style.opacity = '1'
}

function handleDrop(targetIndex) {
  const fromIndex = draggingIndex.value
  if (fromIndex === null || fromIndex === targetIndex) return

  const settings = [...columnSettings.value]
  const item = settings.splice(fromIndex, 1)[0]
  settings.splice(targetIndex, 0, item)
  columnSettings.value = settings
  saveColumnSettings()
  draggingIndex.value = null
}

function resetColumns() {
  localStorage.removeItem(STORAGE_KEY)
  columnSettings.value = []
  loadColumnSettings()
}

function handleColumnSetting() {}


const isCreate = usePermissions(`${props.contentConfig.pageName}:create`)
const isDelete = usePermissions(`${props.contentConfig.pageName}:delete`)
const isUpdate = usePermissions(`${props.contentConfig.pageName}:update`)
const isQuery = usePermissions(`${props.contentConfig.pageName}:query`)


const systemStore = useSystemStore()
const loginStore = useLoginStore()
const { pageList, pageAllCount, highlightRowId } = storeToRefs(systemStore)


function getDiff(row) {
  const amount = Number(row.amount) || 0
  const paid = Number(row.amount_paid) || 0
  return amount - paid
}


const currencySymbolMap = {
  'CNY': '¥', 'RMB': '¥', '人民币': '¥',
  'USD': '$', '美元': '$',
  'EUR': '€', '欧元': '€',
  'GBP': '£', '英镑': '£',
  'JPY': '¥', '日元': '¥',
  'HKD': 'HK$', '港币': 'HK$',
  'KRW': '₩', '韩元': '₩',
  'SGD': 'S$',
  'AUD': 'A$',
  'CAD': 'C$',
  'THB': '฿', '泰铢': '฿',
  'INR': '₹',
}

function getCurrencySymbol(currency) {
  if (!currency) return ''
  return currencySymbolMap[currency.toUpperCase()] || currency
}


function getSummary({ columns, data }) {
  const sumProps = ['amount', 'amount_paid', 'amount_diff']
  const sums = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    const prop = column.property
    if (!sumProps.includes(prop)) {
      sums[index] = ''
      return
    }
    // 按币种分组求和（不同币种直接相加无意义）
    const currencyGroups = {}
    data.forEach(row => {
      const cur = row.currency || ''
      const val = Number(row[prop]) || 0
      if (!currencyGroups[cur]) currencyGroups[cur] = 0
      currencyGroups[cur] += val
    })
    const parts = Object.entries(currencyGroups).map(([cur, val]) => {
      const symbol = getCurrencySymbol(cur)
      return (symbol || cur || '') + val.toFixed(2)
    })
    sums[index] = parts.join(' / ')
  })
  return sums
}


const finalList = computed(() => {
  const list = pageList.value
  if (list && Array.isArray(list) && list.length > 0) {
    return list.map(item => ({
      ...item,
      row_id: item.id,
      short_name: item.customer?.short_name || '',
      amount_diff: getDiff(item)
    }))
  }
  return []
})

watch(page, () => {
  fetchPageListData()
})

watch(pageSize, (newVal, oldVal) => {
  if (oldVal) {
    page.value = 1
    fetchPageListData()
  }
})


function fetchPageListData(showLoading = true) {
  if (!isQuery) return

  if (showLoading) loading.value = true

  const queryInfo = {
    page: page.value,
    pageSize: pageSize.value,
    short_name: searchShortName.value,
    payment_status: searchPaymentStatus.value,
    year: searchYear.value || undefined,
    month: searchMonth.value || undefined,
    currency: searchCurrency.value || undefined,
    payment_entity: searchEntity.value || undefined,
    role_name: loginStore.userInfo?.role?.name || '',
    user_id: loginStore.userInfo?.id
  }

  return systemStore.postPageListAction(props.contentConfig.pageName, queryInfo, 'list')
    .then(() => {
      if (pageList.value.length === 0 && page.value > 1) {
        page.value--
        return fetchPageListData(false)
      }
    })
    .catch((error) => {
      console.error('获取数据失败:', error)
    })
    .finally(() => {
      if (showLoading) loading.value = false
    })
}


function handleSearch() {
  page.value = 1
  fetchPageListData()
}


function handleReset() {
  searchShortName.value = ''
  searchPaymentStatus.value = ''
  page.value = 1
  fetchPageListData()
}


function handleEditBtnClick(rowData) {
  emit('editClick', rowData)
}


function handleDeleteBtnClick(rowData) {
  handleDeleteClick(rowData)
}


const handleDeleteClick = throttle(
  (rowData) => {
    ElMessageBox.confirm(
      '删除后数据无法恢复，是否确定删除？',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    ).then(async () => {
      await systemStore.deletePageByIdAction(props.contentConfig.pageName, rowData.id)
      fetchPageListData(false)
    }).catch(() => {

    })
  },
  1000,
  { trailing: false }
)


systemStore.$onAction(({ name, after }) => {
  after(() => {
    if (name === 'editPageDataAction') {
      fetchPageListData(false)
    }
  })
})


const handleContextMenu = (row, column, event) => {
  event.preventDefault()
  currentRow.value = row
  showMenu.value = true
  menuPosition.value = {
    left: event.clientX + 'px',
    top: event.clientY + 'px'
  }
}

const handleMenuClick = (type) => {
  showMenu.value = false
  switch(type) {
    case '编辑':
      handleEditBtnClick(currentRow.value)
      break
    case '删除':
      handleDeleteClick(currentRow.value)
      break
  }
}

const closeMenu = () => {
  showMenu.value = false
}


const tableRowClassName = ({ row }) => {
  return row.id === highlightRowId.value ? 'row-highlight' : ''
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
  loadColumnSettings()
  fetchPageListData()
  loadCustomerShortNames()
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

defineExpose({
  fetchPageListData,
  pageList,
  searchByYear,
  searchByMonth,
  searchByCurrency,
  searchByEntity
})
</script>

<style lang="less" scoped>
:deep(.cell.el-tooltip) {

  min-width: 0 !important;
}

.google-content {
  padding: 8px;
  // max-width: 1600px;
  margin: 0 auto;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  .search-input {
    width: 220px;
  }

  .search-select {
    width: 140px;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 500;
  color: #202124;
  margin: 0;
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  :deep(.el-tag) {
    background-color: #e8f0fe;
    color: #1a73e8;
    border: none;
    border-radius: 4px;
    padding: 0 10px;
    height: 26px;
    line-height: 24px;
    font-size: 13px;
    font-weight: 500;
    .el-tag__close {
      color: #1a73e8;
      &:hover { background-color: #d2e3fc; }
    }
  }
}

.quick-filter {
  display: inline-flex;
  border: 1px solid #dadce0;
  border-radius: 6px;
  overflow: hidden;

  .filter-btn {
    padding: 5px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #5f6368;
    background: #fff;
    border: none;
    border-right: 1px solid #dadce0;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background-color: #f1f3f4;
    }

    &.active {
      background-color: #e8f0fe;
      color: #1a73e8;
    }
  }
}

.clickable-name {
  color: #1a73e8;
  cursor: pointer;
  font-weight: 500;
  &:hover { text-decoration: underline; }
}

:deep(.google-search-input) {
  max-width: 250px !important;
  // flex-shrink: 0;
  :deep(.el-input__wrapper) {
    border-radius: 4px;
    box-shadow: 0 0 0 1px #dadce0 inset;
    &:hover { box-shadow: 0 0 0 1px #bdc1c6 inset; }
    &.is-focus { box-shadow: 0 0 0 1px #1a73e8 inset; }
  }
  :deep(.el-input__prefix) {
    color: #9aa0a6;
  }
}

.google-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 20px;
  height: 32px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;
  &:hover { background-color: #1557b0; }
}

.google-btn-text {
  background-color: #fff;
  color: #1a73e8;
  border: 1px solid #dadce0;
  &:hover { background-color: #f8f9fa; border-color: #d2e3fc; }
}

.btn-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.column-setting-trigger {
  border: 1px solid #dadce0;
  color: #5f6368;
  &:hover { border-color: #1a73e8; color: #1a73e8; }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8eaed;
  position: relative;
}

.table-wrapper {
  overflow-x: auto;
}

:deep(.google-table) {
  border: none;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;

  .el-table__header-wrapper {
    th {
      background-color: #f1f3f4;
      border-bottom: 1px solid #e8eaed;
      color: #3c4043;
      font-weight: 500;
      font-size: 13px;
      height: 40px;
      padding: 0 14px;
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
      &:hover { background-color: #f8f9fa; td { background-color: transparent; } }
      td {
        color: #202124;
        font-size: 13px;
        height: 44px;
        padding: 0 14px;
        .cell { padding: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-left: -10px; margin-right: -10px; }
      }
    }
  }

  .el-table__footer-wrapper {
    td {
      background-color: #f1f3f4;
      color: #202124;
      font-size: 13px;
      font-weight: 600;
      height: 44px;
      padding: 0 14px;
      border-top: 1px solid #e8eaed;
      .cell {
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Roboto Mono', monospace;
        &:first-letter { margin-right: 1px; }
      }
    }
    td:first-child .cell {
      justify-content: center;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
    }
  }

  &::before, &::after { display: none; }
}

.row-index { color: #9aa0a6; font-size: 13px; font-weight: 500; }
.name-text { font-weight: 500; color: #202124; }
.amount-text { font-family: 'Roboto Mono', monospace; font-size: 13px; color: #202124; }

.amount-diff {
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  &.is-positive { color: #1e8e3e; }
  &.is-negative { color: #d93025; }
  &.is-zero { color: #9aa0a6; }
}

.text-cell { color: #202124; font-size: 13px; }

.empty-placeholder {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}

.icon-btn {
  width: 32px; height: 32px; border: none; border-radius: 4px;
  background: transparent; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  svg { width: 16px; height: 16px; fill: #5f6368; }
  &:hover { background-color: #f1f3f4; svg { fill: #202124; } }
}

.delete-btn:hover { background-color: #fce8e6 !important; svg { fill: #d93025 !important; } }

.pagination-wrapper {
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
  display: flex;
  justify-content: flex-end;
}

:deep(.google-pagination) {
  .el-pagination__total { color: #5f6368; font-size: 13px; }
  .el-pager li {
    border-radius: 4px; margin: 0 3px; color: #5f6368; font-weight: 500;
    &:hover { background-color: #f1f3f4; }
    &.is-active { background-color: #1a73e8; color: #fff; }
  }
}

.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8eaed;
  z-index: 9999;
  min-width: 140px;
  padding: 8px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #202124;
  svg { width: 16px; height: 16px; fill: #5f6368; }
  &:hover { background-color: #f1f3f4; svg { fill: #1a73e8; } }
  &.danger:hover { color: #d93025; svg { fill: #d93025; } }
}

:deep(.row-highlight) { background-color: #e8f0fe; }

.google-data-loading {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.7);
  .loading-spinner {
    width: 40px; height: 40px; position: relative;
    &::before, &::after {
      content: ''; position: absolute; border-radius: 50%;
      animation: spinner 1.6s linear infinite;
    }
    &::before {
      width: 100%; height: 100%; border: 3px solid transparent;
      border-top-color: #1a73e8; border-left-color: #1a73e8;
    }
    &::after {
      width: 60%; height: 60%; top: 20%; left: 20%;
      border: 3px solid transparent; border-top-color: #4285f4;
      border-right-color: #4285f4; animation-direction: reverse; animation-duration: 0.8s;
    }
  }
  .loading-text { margin: 0; font-size: 14px; color: #5f6368; }
}

@keyframes spinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

:deep(.column-setting-menu) {
  min-width: 220px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid #e8eaed;
}

.column-setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e8eaed;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: move;
  user-select: none;
  &:hover { background-color: #f1f3f4; }
  &.column-hidden { opacity: 0.6; }
  &.dragging { opacity: 0.5; }
}

.column-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px; height: 20px;
  margin-right: 8px;
  opacity: 0.4;
  flex-shrink: 0;
  svg { width: 16px; height: 16px; fill: #909399; }
}

.column-item-left { flex: 1; min-width: 0; }

:deep(.column-setting-menu .el-checkbox) {
  margin: 0;
  .el-checkbox__label { font-size: 13px; color: #606266; }
}
</style>
