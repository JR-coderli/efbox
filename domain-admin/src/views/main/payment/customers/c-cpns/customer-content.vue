<template>
  <div class="google-content">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          {{ contentConfig.header?.title ?? '客户列表' }}
          <!-- <el-tooltip content="右键列表行可编辑" placement="top" :show-after="200">
            <el-icon class="title-hint-icon"><QuestionFilled /></el-icon>
          </el-tooltip> -->
        </h1>
        <!-- <p class="page-subtitle">管理客户信息和联系方式</p> -->
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
          <span>新建客户</span>
        </button>
      </div>
    </div>

    <!-- 内容卡片 -->
    <div class="content-card">
      <!-- Google 风格数据加载动画 -->
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
          :max-height="contentConfig.maxHeight"
          @row-contextmenu="handleContextMenu"
          :row-class-name="tableRowClassName"
        >
          <template v-for="item in displayColumns" :key="item.label">
            <!-- 序号 -->
            <template v-if="item.prop === 'id'">
              <el-table-column
                v-bind="item"
                label="#"
                width="60"
                class-name="index-column"
              >
                <template #default="scope">
                  <span class="row-index">{{ scope.$index + 1 }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 客户全称 -->
            <template v-else-if="item.prop === 'full_name'">
              <el-table-column v-bind="item" show-overflow-tooltip class-name="name-column">
                <template #default="scope">
                  <span class="name-text">{{ scope.row.full_name }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 客户简称 -->
            <template v-else-if="item.prop === 'short_name'">
              <el-table-column v-bind="item" class-name="short-name-column">
                <template #default="scope">
                  <span v-if="scope.row.short_name" class="short-name-text">{{ scope.row.short_name }}</span>
                  <span v-else class="empty-placeholder"></span>
                </template>
              </el-table-column>
            </template>

            <!-- 公司地址 -->
            <template v-else-if="item.prop === 'company_address'">
              <el-table-column v-bind="item" show-overflow-tooltip class-name="address-column">
                <template #default="scope">
                  <span v-if="scope.row.company_address" class="address-text">{{ scope.row.company_address }}</span>
                  <span v-else class="empty-placeholder"></span>
                </template>
              </el-table-column>
            </template>

            <!-- 日期 -->
            <template v-else-if="item.type === 'timer'">
              <el-table-column
                v-bind="item"
                sortable
                show-overflow-tooltip
                class-name="date-column"
              >
                <template #default="scope">
                  <span class="date-text">{{ scope.row[item.prop] }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 操作 -->
            <template v-else-if="item.type === 'handler'">
              <el-table-column
                v-bind="item"
                label="操作"
                width="80"
                align="center"
              >
                <template #default="scope">
                  <button
                    v-if="isUpdate"
                    class="icon-btn edit-btn"
                    @click="handleEditBtnClick(scope.row)"
                    title="编辑"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </template>
              </el-table-column>
            </template>

            <!-- 自定义插槽 -->
            <template v-else-if="item.type === 'custom'">
              <el-table-column
                v-bind="item"
              >
                <template #default="scope">
                  <slot
                    :name="item.slotName"
                    v-bind="scope.row"
                    :prop="item.prop"
                  />
                </template>
              </el-table-column>
            </template>

            <!-- 普通数据 -->
            <template v-else>
              <el-table-column v-bind="item" show-overflow-tooltip>
                <template #default="scope">
                  <span class="text-cell">{{ scope.row[item.prop] }}</span>
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
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { QuestionFilled } from '@element-plus/icons-vue'
import usePermissions from '@/hooks/usePermissions'
import useSystemStore from '@/stores/main/system/system'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'


const props = defineProps({
  contentConfig: {
    type: Object,
    required: true
  }
})


const emit = defineEmits(['newClick', 'editClick'])
const currentRow = ref(null)
const showMenu = ref(false)
const menuPosition = ref({
  left: '0px',
  top: '0px'
})
const page = ref(1)
const pageSize = ref(10)
let queryInfo = null
const finalList = ref([])
const loading = ref(false)


const STORAGE_KEY = 'payment_customer_column_settings'


const allColumns = computed(() => {
  return props.contentConfig.propsList.map(item => {
    let key = item.prop || item.type || item.label
    if (key.includes('.')) {
      key = key.replace(/\./g, '_')
    }
    return {
      key: key,
      label: item.label,
      prop: item.prop,
      type: item.type,
      required: item.type === 'handler'
    }
  })
})


const columnSettings = ref([])
const draggingIndex = ref(null)


const displayColumns = computed(() => {
  const originalList = props.contentConfig.propsList
  const saved = columnSettings.value

  if (!saved.length) return originalList

  const remaining = [...originalList]
  for (const item of saved) {
    const index = remaining.findIndex(col => {
      let key = col.prop || col.type || col.label
      if (key.includes('.')) key = key.replace(/\./g, '_')
      return key === item.key
    })
    if (index !== -1) {
      remaining.splice(index, 1)
    }
  }

  const ordered = []
  for (const item of saved) {
    if (item.visible === false) continue
    const col = originalList.find(c => {
      let key = c.prop || c.type || c.label
      if (key.includes('.')) key = key.replace(/\./g, '_')
      return key === item.key
    })
    if (col) {
      ordered.push(col)
    }
  }
  ordered.push(...remaining)
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
      const visibilityMap = new Map(parsed.map(item => [item.key, item.visible]))
      const settings = []
      const processedKeys = new Set()

      for (const item of parsed) {
        if (currentKeys.has(item.key)) {
          settings.push({
            key: item.key,
            visible: visibilityMap.get(item.key) !== false
          })
          processedKeys.add(item.key)
        }
      }
      for (const col of currentAllColumns) {
        if (!processedKeys.has(col.key)) {
          settings.push({ key: col.key, visible: true })
        }
      }
      columnSettings.value = settings
    } catch {
      columnSettings.value = currentAllColumns.map(col => ({ key: col.key, visible: true }))
    }
  } else {
    columnSettings.value = currentAllColumns.map(col => ({ key: col.key, visible: true }))
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
const { pageList, pageAllCount, highlightRowId } = storeToRefs(systemStore)

watch(pageList, (newVal) => {
  if (newVal.length > 0 && newVal[0].hasOwnProperty('short_name')) {
    const mappedData = newVal.map(item => ({
      ...item,
      short_name: item.short_name || '',
      company_address: item.company_address || '',
      normal_emails: (item.emails || []).filter(e => e.type === 'normal'),
      send_emails: (item.emails || []).filter(e => e.type === 'send'),
    }))
    if (mappedData.length > pageSize.value) {
      const startIndex = (page.value - 1) * pageSize.value
      const endIndex = startIndex + pageSize.value
      finalList.value = mappedData.slice(startIndex, endIndex)
    } else {
      finalList.value = mappedData
    }
  } else if (newVal.length === 0) {
    finalList.value = []
  }
})

watch(page, () => {
  fetchPageListData(queryInfo)
})

watch(pageSize, (newVal, oldVal) => {
  if (oldVal) {
    page.value = 1
    fetchPageListData(queryInfo)
  }
})


fetchPageListData()


function fetchPageListData(formData = {}, isQueryOrResetBtn = false, showLoading = true) {
  if (!isQuery) return

  if (isQueryOrResetBtn) {
    page.value = 1
  }

  const options = {
    page: page.value,
    pageSize: pageSize.value
  }
  queryInfo = { ...formData, options }

  if (showLoading) {
    loading.value = true
  }
  return systemStore.postPageListAction(props.contentConfig.pageName, queryInfo)
    .then(() => {
      if (pageList.value.length === 0 && page.value > 1) {
        page.value--
        return fetchPageListData(queryInfo, false, showLoading)
      }
    })
    .catch((error) => {
      console.error('获取数据失败:', error)
    })
    .finally(() => {
      if (showLoading) {
        loading.value = false
      }
    })
}


function handleEditBtnClick(rowData) {
  emit('editClick', rowData)
}


systemStore.$onAction(({ name, after }) => {
  after(() => {
    if (name === 'newPageDataAction') {
      page.value = 1
      fetchPageListData(queryInfo, false, false)
    }

    if (
      ['editPaymentCustomerRemarkAction', 'editPaymentCustomerPayDayAction', 'deletePageByIdAction', 'editPageDataAction'].includes(name)
    ) {
      fetchPageListData(queryInfo, false, false)
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
  }
}

const closeMenu = () => {
  showMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
  loadColumnSettings()
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})


const tableRowClassName = ({ row }) => {
  return row.id === highlightRowId.value ? 'row-highlight' : ''
}


defineExpose({
  fetchPageListData,
  pageList
})
</script>

<style lang="less" scoped>
:deep(.cell.el-tooltip) {
  width: 100% !important;
}

.google-content {
  padding: 8px;
  max-width: 1600px;
  margin: 0 auto;
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
}

.page-title {
  font-size: 20px;
  font-weight: 500;
  color: #202124;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-hint-icon {
  font-size: 18px;
  color: #9aa0a6;
  cursor: help;
  transition: color 0.2s;

  &:hover {
    color: #1a73e8;
  }
}

.page-subtitle {
  font-size: 13px;
  color: #5f6368;
  margin: 4px 0 0 0;
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

  &:hover {
    background-color: #1557b0;
  }

  &:active {
    background-color: #174ea6;
  }
}

.btn-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.column-setting-trigger {
  border: 1px solid #dadce0;
  color: #5f6368;

  &:hover {
    border-color: #1a73e8;
    color: #1a73e8;
  }
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
}

.table-wrapper {
  position: relative;
  overflow-x: auto;

  :deep(.google-table) {
    min-width: 100%;
  }
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
        justify-content: flex-start;
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
        height: 44px;
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

.name-text {
  font-weight: 500;
  color: #202124;
}

.short-name-text {
  color: #202124;
  font-size: 13px;
}

.address-text {
  color: #5f6368;
  font-size: 13px;
}

.date-text {
  color: #5f6368;
  font-size: 13px;
}

.text-cell {
  color: #202124;
  font-size: 13px;
}

.empty-placeholder {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}

:deep(.el-table__body-wrapper td) {
  &.name-column,
  &.short-name-column,
  &.address-column {
    .cell {
      text-align: left;
    }
  }
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
  }

  &:hover {
    background-color: #f1f3f4;

    svg {
      fill: #202124;
    }
  }
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
    margin: 0 3px;
    color: #5f6368;
    font-weight: 500;

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

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
  }

  &:hover {
    background-color: #f1f3f4;

    svg {
      fill: #1a73e8;
    }
  }
}

:deep(.row-highlight) {
  background-color: #e8f0fe;
}

@media (max-width: 1024px) {
  .google-content {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    display: flex;
    justify-content: flex-end;
  }

  :deep(.google-table) {
    .el-table__header-wrapper th,
    .el-table__body-wrapper td {
      padding: 0 12px;
    }

    .date-column {
      display: none;
    }
  }
}

@media (max-width: 768px) {
  .google-content {
    padding: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-subtitle {
    display: none;
  }

  .google-btn {
    padding: 0 16px;
    height: 32px;
    font-size: 13px;
  }

  .google-btn span {
    display: none;
  }

  .google-btn .btn-icon {
    width: 20px;
    height: 20px;
  }

  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 4px;
  }

  :deep(.google-table) {
    min-width: 100%;

    .el-table__header-wrapper th,
    .el-table__body-wrapper td {
      padding: 0 10px;
      font-size: 13px;
      height: 56px;
    }

    .cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .pagination-wrapper {
    padding: 12px 16px;

    :deep(.google-pagination) {
      .el-pagination__total {
        display: none;
      }

      .el-pagination__sizes {
        display: none;
      }

      .btn-prev,
      .btn-next {
        width: 32px;
        height: 32px;
      }

      .el-pager li {
        min-width: 32px;
        height: 32px;
        line-height: 30px;
      }
    }
  }

  .icon-btn {
    width: 32px;
    height: 32px;

    svg {
      width: 16px;
      height: 16px;
    }
  }
}

@media (max-width: 480px) {
  .google-content {
    padding: 8px;
  }

  .content-card {
    border-radius: 6px;
  }

  :deep(.google-table) {
    .el-table__header-wrapper th,
    .el-table__body-wrapper td {
      padding: 0 8px;

      &.has-gutter {
        display: none;
      }
    }
  }

  .pagination-wrapper {
    padding: 8px 12px;

    :deep(.google-pagination) {
      justify-content: center;

      .el-pager {
        display: none;
      }
    }
  }
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

  &:hover {
    background-color: #f1f3f4;
  }

  &.column-hidden {
    opacity: 0.6;
  }

  &.column-required {
    background-color: #fafafa;
  }

  &.dragging {
    opacity: 0.5;
  }
}

.column-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  opacity: 0.4;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
    fill: #909399;
  }
}

.column-item-left {
  flex: 1;
  min-width: 0;
}

:deep(.column-setting-menu .el-checkbox) {
  margin: 0;

  .el-checkbox__label {
    font-size: 13px;
    color: #606266;
  }

  &.is-disabled .el-checkbox__label {
    color: #c0c4cc;
  }
}

:deep(.column-setting-menu .el-scrollbar__view) {
  padding: 4px 0;
}

.google-data-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.7);

  .loading-spinner {
    width: 40px;
    height: 40px;
    position: relative;

    &::before,
    &::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      animation: spinner 1.6s linear infinite;
    }

    &::before {
      width: 100%;
      height: 100%;
      border: 3px solid transparent;
      border-top-color: #1a73e8;
      border-left-color: #1a73e8;
    }

    &::after {
      width: 60%;
      height: 60%;
      top: 20%;
      left: 20%;
      border: 3px solid transparent;
      border-top-color: #4285f4;
      border-right-color: #4285f4;
      animation-direction: reverse;
      animation-duration: 0.8s;
    }
  }

  .loading-text {
    margin: 0;
    font-size: 14px;
    color: #5f6368;
  }
}

@keyframes spinner {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

<style lang="less">
.el-dropdown-menu {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;

    svg {
      width: 16px;
      height: 16px;
      fill: #5f6368;
    }

    &:hover {
      svg {
        fill: #202124;
      }
    }
  }
}
</style>
