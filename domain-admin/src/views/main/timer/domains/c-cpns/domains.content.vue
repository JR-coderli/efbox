<template>
  <div class="domains-content">
    <div class="content-card">
      <!-- 页面标题和操作栏 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">{{ contentConfig.header?.title ?? '数据列表' }}</h1>
          <!-- 用途筛选标签 -->
          <div v-if="selectedPurpose" class="active-filter">
            <span class="filter-label">用途:</span>
            <span class="filter-value">{{ selectedPurpose }}</span>
            <button class="clear-filter-btn" @click="clearPurposeFilter" title="清除筛选">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="header-actions">
          <!-- 用途筛选按钮 -->
          <el-dropdown trigger="click" @command="handlePurposeFilter">
            <el-button class="filter-btn" :class="{ active: selectedPurpose }">
              <svg viewBox="0 0 24 24">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v7H6V9zm9.5 3l-2.5 3h-4l-2.5-3h9z"/>
              </svg>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="''" class="filter-option" :class="{ active: !selectedPurpose }">
                  全部
                </el-dropdown-item>
                <el-dropdown-item v-for="purpose in purposeOptions" :key="purpose" :command="purpose" class="filter-option" :class="{ active: selectedPurpose === purpose }">
                  <span class="purpose-dot" :style="{ backgroundColor: getPurposeColor(purpose) }"></span>
                  {{ purpose }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-button
            v-if="isCreate && showCreateBtn"
            class="google-btn google-btn-primary"
            @click="handleNewUserClick"
          >
            <svg class="btn-icon" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>{{ contentConfig.header?.btnTitle ?? '新建数据' }}</span>
          </el-button>
        </div>
      </div>

      <!-- 表格容器 -->
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          class="google-table"
          :border="false"
          :stripe="false"
          v-bind="contentConfig.childrenTree"
          :max-height="contentConfig.tableMaxHeight"
          @row-contextmenu="handleContextMenu"
        >
          <template v-for="item in contentConfig.propsList" :key="item.label">
            <!-- 时间类型列 -->
            <template v-if="item.type === 'timer'">
              <el-table-column
                v-bind="item"
                align="center"
                sortable
                show-overflow-tooltip
              >
                <template #default="scope">
                  <span class="date-text">{{ formatUTC(scope.row[item.prop], 'YYYY/MM/DD HH:mm:ss') }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 操作列 -->
            <template v-else-if="item.type === 'handler'">
              <el-table-column v-bind="item" align="center" fixed="right">
                <template #default="scope">
                  <slot name="handler" v-bind="scope.row" :row="scope.row"></slot>
                </template>
              </el-table-column>
            </template>

            <!-- 自定义插槽列 -->
            <template v-else-if="item.type === 'custom'">
              <el-table-column v-bind="item" align="center">
                <template #default="scope">
                  <slot
                    :name="item.slotName"
                    v-bind="scope.row"
                    :prop="item.prop"
                    :prop01="item.prop01"
                    :prop02="item.prop02"
                  >
                  </slot>
                </template>
              </el-table-column>
            </template>

            <!-- 序号列 -->
            <template v-else-if="item.type === 'index'">
              <el-table-column v-bind="item" align="center">
                <template #default="scope">
                  <span class="row-index">{{ scope.$index + 1 }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 普通列 -->
            <template v-else>
              <el-table-column v-bind="item" align="center">
                <template #default="scope">
                  <span class="table-text">{{ scope.row[item.prop] }}</span>
                </template>
              </el-table-column>
            </template>
          </template>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30]"
          layout="total, sizes, prev, pager, next"
          :total="totalCount"
          class="google-pagination"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 右键菜单 -->
    <div class="context-menu" v-show="showMenu" :style="menuPosition">
      <ul>
        <li v-if="contentConfig?.pageName === 'domains'" @click="handleMenuClick('修改等级')">{{ menuConfig.levelText }}</li>
        <li @click="handleMenuClick('编辑')" v-if="isUpdate">编辑</li>
        <li @click="handleMenuClick('删除')" v-if="isDelete">删除</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import usePermissions from '@/hooks/usePermissions'
import useSystemStore from '@/stores/main/system/system'
import { formatUTC } from '@/utils/format'
import { storeToRefs } from 'pinia'
import { computed, ref, onMounted, onUnmounted } from 'vue'


const props = defineProps({
  contentConfig: { // 表格的配置信息
    type: Object,
    required: true
  },
  listType: { // 列表类型
    type: String,
    default: 'list'
  },
  dataSourceType: { // 数据源类型
    type: String,
    default: 'page'
  },
  showCreateBtn: { // 是否显示新建按钮
    type: Boolean,
    default: true
  },
  menuConfig: { // 右键菜单配置
    type: Object,
    default: () => ({
      levelText: '修改等级'
    })
  }
})

const emit = defineEmits(['newClick', 'editClick', 'deleteClick', 'levelChange'])


const isCreate = usePermissions(`${props.contentConfig.pageName}:create`)
const isDelete = usePermissions(`${props.contentConfig.pageName}:delete`)
const isUpdate = usePermissions(`${props.contentConfig.pageName}:update`)
const isQuery = usePermissions(`${props.contentConfig.pageName}:query`)


let queryInfo = null
const currentPage = ref(1)
const pageSize = ref(10)
const showMenu = ref(false)
const menuPosition = ref({
  left: '0px',
  top: '0px'
})
const currentRow = ref(null)


const selectedPurpose = ref('')

const allDataForFilter = ref([])

const isLoadingAllData = ref(false)


const systemStore = useSystemStore()
const {
  pageList,
  pageAllCount,
  importDomainsList,
  importDomainsAllCount,
  normalDomainsList,
  normalDomainsAllCount
} = storeToRefs(systemStore)


const rawData = computed(() => {
  if (props.dataSourceType === 'import') return importDomainsList.value || []
  if (props.dataSourceType === 'normal') return normalDomainsList.value || []
  return pageList.value || []
})


const purposeOptions = computed(() => {
  const purposes = new Set()


  if (allDataForFilter.value.length > 0) {
    allDataForFilter.value.forEach(item => {
      if (item.purpose) {
        purposes.add(item.purpose)
      }
    })
  } else {

    rawData.value.forEach(item => {
      if (item.purpose) {
        purposes.add(item.purpose)
      }
    })
  }

  return Array.from(purposes).sort()
})


const tableData = computed(() => {
  let data = rawData.value || []


  if (selectedPurpose.value) {
    data = allDataForFilter.value || []

    const filtered = data.filter(item => {
      const itemPurpose = item.purpose || ''
      return itemPurpose === selectedPurpose.value
    })


    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filtered.slice(start, end)
  }


  return data
})

const totalCount = computed(() => {

  if (selectedPurpose.value) {
    const data = allDataForFilter.value || []
    const filtered = data.filter(item => {
      const itemPurpose = item.purpose || ''
      return itemPurpose === selectedPurpose.value
    })
    return filtered.length
  }


  if (props.dataSourceType === 'import') return importDomainsAllCount.value || 0
  if (props.dataSourceType === 'normal') return normalDomainsAllCount.value || 0
  return pageAllCount.value || 0
})


function getPurposeColor(purpose) {
  if (!purpose) return 'transparent'

  const predefinedColors = {
    '推广': '#e8f0fe',
    '测试': '#fef7e0',
    '生产': '#ceead6',
    '开发': '#fad2cf',
    '备用': '#e8dff5',
    '临时': '#e8eaed',
    '正式': '#ceead6',
    '预发布': '#feefe3',
  }

  if (predefinedColors[purpose]) {
    return predefinedColors[purpose]
  }

  let hash = 0
  for (let i = 0; i < purpose.length; i++) {
    hash = purpose.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 92%)`
}


async function fetchAllDataForFilter() {
  if (isLoadingAllData.value) return

  isLoadingAllData.value = true

  try {


    const totalCount = props.dataSourceType === 'import'
      ? importDomainsAllCount.value
      : props.dataSourceType === 'normal'
        ? normalDomainsAllCount.value
        : pageAllCount.value

    const size = totalCount || 10000 // 如果没有总数，使用一个默认的大值
    const result = await systemStore.postPageListAction(
      props.contentConfig.pageName,
      { size, offset: 0 }, // 请求所有数据
      props.listType
    )


    if (props.dataSourceType === 'import') {
      allDataForFilter.value = [...(importDomainsList.value || [])]
    } else if (props.dataSourceType === 'normal') {
      allDataForFilter.value = [...(normalDomainsList.value || [])]
    } else {
      allDataForFilter.value = [...(pageList.value || [])]
    }
  } finally {
    isLoadingAllData.value = false
  }
}


async function handlePurposeFilter(purpose) {
  selectedPurpose.value = purpose || ''
  currentPage.value = 1  // 重置到第一页

  if (purpose) {

    await fetchAllDataForFilter()
  } else {

    allDataForFilter.value = []
    await fetchPageListData({}, false, true)
  }
}


async function clearPurposeFilter() {
  selectedPurpose.value = ''
  currentPage.value = 1
  allDataForFilter.value = [] // 清空筛选数据


  await fetchPageListData({}, true, true)
}


fetchPageListData()


function handleSizeChange() {
  currentPage.value = 1

  if (!selectedPurpose.value) {
    fetchPageListData(queryInfo)
  }
}

function handleCurrentChange() {

  if (!selectedPurpose.value) {
    fetchPageListData(queryInfo)
  }
}


function fetchPageListData(formData = {}, isQueryOrResetBtn = false, force = false) {

  if (!force && !isQuery) return Promise.resolve()

  if (isQueryOrResetBtn) {
    currentPage.value = 1
  }

  const size = pageSize.value
  const offset = (currentPage.value - 1) * size
  queryInfo = { ...formData, size, offset }

  return systemStore.postPageListAction(props.contentConfig.pageName, queryInfo, props.listType)
    .then(() => {
      if (tableData.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
        return fetchPageListData(queryInfo)
      }
    })
}


function handleNewUserClick() {
  emit('newClick', props.listType)
}


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
      emit('editClick', currentRow.value, props.listType)
      break
    case '删除':
      emit('deleteClick', currentRow.value.id)
      break
    case '修改等级':

      const isImportant = currentRow.value.is_important === 1 ? 0 : 1
      systemStore.editDomainsIsimportAction(currentRow.value.id, isImportant)
      emit('levelChange', currentRow.value.id, isImportant)
      break
  }
}

const closeMenu = () => {
  showMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})


systemStore.$onAction(({ name, after }) => {
  after(() => {
    if (name === 'newPageDataAction') {
      currentPage.value = 1
      setTimeout(() => {
        if (selectedPurpose.value) {

          fetchAllDataForFilter()
        } else {
          fetchPageListData()
        }
      }, 700)
    }

    if (
      ['editDomainsIsimportAction', 'deletePageByIdAction', 'editPageDataAction'].includes(name)
    ) {
      setTimeout(() => {
        if (selectedPurpose.value) {
          fetchAllDataForFilter()
        } else {
          fetchPageListData(queryInfo)
        }
      }, 700)
    }
  })
})


function refreshData() {
  if (selectedPurpose.value) {
    fetchAllDataForFilter()
  } else {
    fetchPageListData(queryInfo)
  }
}


defineExpose({
  fetchPageListData,
  fetchAllDataForFilter,
  selectedPurpose,
  tableData,
  refreshData
})
</script>

<style lang="less" scoped>
.domains-content {
  margin-bottom: 20px;
}

.content-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8eaed;
}


.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8eaed;
}

.header-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
  color: #202124;
  margin: 0;
}


.active-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #e8f0fe;
  border-radius: 16px;
  font-size: 13px;

  .filter-label {
    color: #5f6368;
  }

  .filter-value {
    color: #1a73e8;
    font-weight: 500;
  }
}

.clear-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #5f6368;
  padding: 0;

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  &:hover {
    color: #202124;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}


.filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #5f6368;
  transition: all 0.2s;

  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  &:hover {
    background-color: #f1f3f4;
    color: #202124;
  }

  &.active {
    color: #1a73e8;
    background-color: #e8f0fe;

    &:hover {
      background-color: #d2e3fc;
    }
  }
}


.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 32px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;

  &:hover {
    background-color: #1557b0;
  }
}

.btn-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}


.table-wrapper {
  overflow-x: auto;
}


:deep(.google-table) {
  border: none;

  .el-table__header-wrapper {
    th {
      background-color: #f1f3f4;
      border-bottom: 1px solid #e8eaed;
      color: #3c4043;
      font-weight: 500;
      font-size: 13px;
      height: 44px;
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

      &:hover {
        background-color: #f8f9fa;

        td {
          background-color: transparent;
        }
      }

      td {
        color: #202124;
        font-size: 13px;
        height: 48px;
        padding: 0 14px;

        .cell {
          padding: 0;
        }
      }
    }
  }

  &::before,
  &::after {
    display: none;
  }
}

.row-index {
  color: #9aa0a6;
  font-size: 13px;
  font-weight: 500;
}

.table-text {
  color: #202124;
  font-size: 13px;
}

.date-text {
  color: #5f6368;
  font-size: 13px;
}


.pagination-wrapper {
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
  display: flex;
  justify-content: flex-end;
}

:deep(.google-pagination) {
  .el-pagination__total {
    color: #5f6368;
    font-size: 13px;
  }

  .el-pagination__sizes {
    .el-select {
      .el-input__wrapper {
        border-radius: 4px;
        border: 1px solid #dadce0;

        &:hover {
          border-color: #1a73e8;
        }
      }
    }
  }

  .btn-prev,
  .btn-next {
    border-radius: 4px;
    border: 1px solid #dadce0;
    color: #5f6368;

    &:hover:not:disabled {
      background-color: #f1f3f4;
      color: #1a73e8;
    }

    &:disabled {
      opacity: 0.4;
    }
  }

  .el-pager li {
    border-radius: 4px;
    margin: 0 2px;
    color: #5f6368;
    font-weight: 500;
    min-width: 32px;
    height: 32px;
    line-height: 30px;

    &:hover {
      background-color: #f1f3f4;
    }

    &.is-active {
      background-color: #1a73e8;
      color: #fff;
    }
  }
}


.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.15);
  z-index: 20;

  ul {
    list-style: none;
    padding: 4px 0;
    margin: 0;
    min-width: 120px;
  }

  li {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
    color: #5f6368;

    &:hover {
      background-color: #f1f3f4;
      color: #202124;
    }
  }
}


:deep(.el-dropdown-menu) {
  padding: 4px 0;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.15);
}

:deep(.filter-option) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: #5f6368;

  &.active {
    background-color: #e8f0fe;
    color: #1a73e8;
  }

  &:hover {
    background-color: #f1f3f4;
    color: #202124;
  }

  &.active:hover {
    background-color: #d2e3fc;
    color: #1a73e8;
  }
}

.purpose-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
</style>
