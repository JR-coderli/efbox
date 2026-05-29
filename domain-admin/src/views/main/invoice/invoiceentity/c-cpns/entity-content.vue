<template>
  <div class="entity-content">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ contentConfig.header?.title ?? '开票主体列表' }}</h1>
        <p class="page-subtitle">管理开票主体的银行账户和公司信息</p>
      </div>
      <div class="header-actions">
        <!-- 视图切换按钮 -->
        <div class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="列表视图"
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/>
            </svg>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'card' }"
            @click="viewMode = 'card'"
            title="卡片视图"
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
            </svg>
          </button>
        </div>
        <button v-if="isCreate" class="google-btn google-btn-primary" @click="emit('newClick')">
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>{{ contentConfig.header?.btnTitle ?? '新建开票主体' }}</span>
        </button>
      </div>
    </div>

    <!-- 内容卡片 -->
    <div class="content-card" :class="{ 'card-view-mode': viewMode === 'card' }">
      <!-- Google 风格数据加载动画 -->
      <div v-if="loading" class="google-data-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">加载中...</p>
      </div>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="table-wrapper">
        <el-table
          :data="finalList"
          class="google-table"
          :border="false"
          :stripe="false"
          :max-height="contentConfig.maxHeight"
          @row-contextmenu="handleContextMenu"
          :row-class-name="tableRowClassName"
        >
          <template v-for="item in contentConfig.propsList" :key="item.label">
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
                width="120"
                align="center"
              >
                <template #default="scope">
                  <div class="action-buttons">
                    <button
                      v-if="isUpdate"
                      class="icon-btn top-btn"
                      @click="handleSetTop(scope.row)"
                      title="置顶"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z"/>
                      </svg>
                    </button>
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
                    <button
                      v-if="isDelete"
                      class="icon-btn delete-btn"
                      @click="handleDeleteBtnClick(scope.row)"
                      title="删除"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </template>
              </el-table-column>
            </template>

            <!-- 普通数据 -->
            <template v-else>
              <el-table-column v-bind="item" show-overflow-tooltip>
                <template #default="scope">
                  <span class="text-cell">{{ scope.row[item.prop] || '-' }}</span>
                </template>
              </el-table-column>
            </template>
          </template>
        </el-table>
      </div>

      <!-- 卡片视图 -->
      <div v-else-if="viewMode === 'card'" class="card-view">
        <div class="card-grid">
          <div
            v-for="(item, index) in finalList"
            :key="item.id"
            class="entity-card"
            :class="{
              'row-highlight': item.id === highlightRowId,
              'card-is-top': item.is_top === 1
            }"
            @contextmenu.prevent="handleContextMenu(item, null, $event)"
          >
            <div class="card-header">
              <div class="card-title">
                <!-- 置顶图标 -->
                <el-tooltip v-if="item.is_top === 1" content="已置顶" placement="top">
                  <svg class="pin-icon" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2z"/>
                  </svg>
                </el-tooltip>
                <h3>{{ item.name || '-' }}</h3>
                <el-tooltip content="附件数量" placement="top">
                  <span class="attachment-count">{{ item.attachment_count || 0 }}</span>
                </el-tooltip>
              </div>
              <el-dropdown trigger="click" @command="(cmd) => handleCardAction(cmd, item)">
                <div class="more-btn">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="12" cy="19" r="2"/>
                  </svg>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="top" v-if="isUpdate">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z"/>
                      </svg>
                      置顶
                    </el-dropdown-item>
                    <el-dropdown-item command="edit" v-if="isUpdate">
                      <svg viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" v-if="isDelete" class="delete-item">
                      <svg viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="card-body">
              <div class="card-row full-width">
                <span class="card-label">Account Name:</span>
                <span class="card-value">{{ item.account_name || '-' }}</span>
              </div>
              <div class="card-row full-width">
                <span class="card-label">Account Number:</span>
                <span class="card-value">{{ item.account_number || '-' }}</span>
              </div>
              <div class="card-row full-width">
                <span class="card-label">Bank Name:</span>
                <span class="card-value">{{ item.bank_name || '-' }}</span>
              </div>
              <div class="card-row full-width">
                <span class="card-label">SWIFT Code:</span>
                <span class="card-value">{{ item.swift_code || '-' }}</span>
              </div>
              <div class="card-row full-width">
                <span class="card-label">Bank Address:</span>
                <span class="card-value">{{ item.bank_address || '-' }}</span>
              </div>
              <div class="card-row full-width">
                <span class="card-label">Company Address:</span>
                <span class="card-value">{{ item.company_address || '-' }}</span>
              </div>
              <div class="card-row full-width">
                <span class="card-label">Bank Code:</span>
                <span class="card-value">{{ item.bank_code || '-' }}</span>
              </div>
              <div class="card-row full-width">
                <span class="card-label">Branch Code:</span>
                <span class="card-value">{{ item.branch_code || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 卡片视图分页 -->
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

      <!-- 列表视图分页 -->
      <div v-if="viewMode === 'list'" class="pagination-wrapper">
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
        <div class="context-menu-item" @click="handleMenuClick('置顶')" v-if="isUpdate">
          <svg viewBox="0 0 24 24"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z"/></svg>
          置顶
        </div>
        <div class="context-menu-item" @click="handleMenuClick('编辑')" v-if="isUpdate">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          编辑
        </div>
        <div class="context-menu-item delete-item" @click="handleMenuClick('删除')" v-if="isDelete">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          删除
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import usePermissions from '@/hooks/usePermissions'
import useSystemStore from '@/stores/main/system/system'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, watch } from 'vue'


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


const viewMode = ref('card')


const isCreate = usePermissions(`${props.contentConfig.pageName}:create`)
const isDelete = usePermissions(`${props.contentConfig.pageName}:delete`)
const isUpdate = usePermissions(`${props.contentConfig.pageName}:update`)
const isQuery = usePermissions(`${props.contentConfig.pageName}:query`)


const systemStore = useSystemStore()
const { pageList, pageAllCount, highlightRowId } = storeToRefs(systemStore)

watch(pageList, (newVal) => {
  const list = newVal ?? []

  finalList.value = list.sort((a, b) => {

    if (a.is_top === 1 && b.is_top !== 1) return -1
    if (a.is_top !== 1 && b.is_top === 1) return 1
    return 0
  })
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


function handleCardAction(command, item) {
  if (command === 'top') {
    handleSetTop(item)
  } else if (command === 'edit') {
    handleEditBtnClick(item)
  } else if (command === 'delete') {
    handleDeleteBtnClick(item)
  }
}


function handleDeleteBtnClick(rowData) {
  ElMessageBox.confirm(
    `确定要删除开票主体"${rowData.name}"吗？删除后关联的附件不会被删除。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {

    await systemStore.deletePageByIdAction(props.contentConfig.pageName, rowData.id, { showNotification: false })

    ElNotification({
      message: '开票主体已删除',
      type: 'success',
      duration: 2000
    })

    page.value = 1
    await fetchPageListData({}, false, false)
  }).catch(() => {

  })
}


async function handleSetTop(rowData) {
  try {
    await systemStore.setTopInvoiceEntity(rowData.id)
    ElNotification({
      message: '置顶成功',
      type: 'success',
      duration: 2000
    })
    await fetchPageListData({}, false, false)
  } catch (error) {
    ElNotification({
      message: '置顶失败',
      type: 'error',
      duration: 2000
    })
  }
}


systemStore.$onAction(({ name, after }) => {
  after(() => {
    if (name === 'newPageDataAction') {
      page.value = 1
      fetchPageListData(queryInfo, false, false)
    }

    if (
      ['deletePageByIdAction', 'editPageDataAction'].includes(name)
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
    case '置顶':
      handleSetTop(currentRow.value)
      break
    case '编辑':
      handleEditBtnClick(currentRow.value)
      break
    case '删除':
      handleDeleteBtnClick(currentRow.value)
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


const tableRowClassName = ({ row }) => {
  if (row.id === highlightRowId.value) return 'row-highlight'
  if (row.is_top === 1) return 'row-is-top'
  return ''
}


defineExpose({
  fetchPageListData,
  pageList
})
</script>

<style lang="less" scoped>
.entity-content {
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
}

.page-subtitle {
  font-size: 13px;
  color: #5f6368;
  margin: 4px 0 0 0;
}


.view-toggle {
  display: flex;
  align-items: center;
  background: #f1f3f4;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.toggle-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
    fill: #5f6368;
  }

  &:hover {
    background: #e8eaed;

    svg {
      fill: #202124;
    }
  }

  &.active {
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);

    svg {
      fill: #1a73e8;
    }
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

  &.card-view-mode {
    border: none;
    background: transparent;
    border-radius: 0;
  }
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


.top-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #80868b;

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
}

.date-text {
  color: #5f6368;
  font-size: 13px;
}

.text-cell {
  color: #202124;
  font-size: 13px;
}


.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
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

  &.delete-btn:hover {
    background-color: #fce8e6;

    svg {
      fill: #d93025;
    }
  }

  &.top-btn:hover {
    background-color: #e8f0fe;

    svg {
      fill: #1a73e8;
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

  &.delete-item:hover {
    background-color: #fce8e6;
    color: #d93025;

    svg {
      fill: #d93025;
    }
  }
}


:deep(.row-highlight) {
  background-color: #e8f0fe;
}


:deep(.row-is-top) {
  background-color: #fafafa;

  td {
    font-weight: 400;
  }
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


.card-view {
  padding: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.entity-card {
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #dadce0;
  }

  &.row-highlight {
    background-color: #e8f0fe;
    border-color: #1a73e8;
  }


  &.card-is-top {
    background-color: #f1f3f4;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e8eaed;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;

  .card-index {
    color: #9aa0a6;
    font-size: 12px;
    font-weight: 500;
  }


  .attachment-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background-color: #dadce0;
    color: #202124;
    font-size: 11px;
    font-weight: 500;
    border-radius: 10px;
  }


  .pin-icon {
    width: 16px;
    height: 16px;
    fill: #1a73e8;
    flex-shrink: 0;
  }


  .top-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #80868b;

    svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #202124;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.card-actions {
  display: flex;
  gap: 4px;
}


.more-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
  }

  &:hover {
    background-color: #e8eaed;

    svg {
      fill: #202124;
    }
  }
}

.card-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 14px;
    height: 14px;
    fill: #5f6368;
  }

  &:hover {
    background-color: #e8eaed;

    svg {
      fill: #202124;
    }
  }

  &.delete-btn:hover {
    background-color: #fce8e6;

    svg {
      fill: #d93025;
    }
  }

  &.top-btn:hover {
    background-color: #e8f0fe;

    svg {
      fill: #1a73e8;
    }
  }
}

.card-body {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px 16px;
}

.card-row {
  display: flex;
  gap: 8px;
  min-width: 45%;
  flex: 1;

  &.full-width {
    min-width: 100%;
    flex-basis: 100%;
  }
}

.card-label {
  color: #5f6368;
  font-size: 13px;
  min-width: 70px;
  flex-shrink: 0;
}

.card-value {
  color: #202124;
  font-size: 14px;
  word-break: break-word;
  flex: 1;

  &.date-text {
    color: #5f6368;
  }
}


@media (max-width: 768px) {
  .entity-content {
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
  }

  .card-grid {
    grid-template-columns: 1fr;
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

    &.delete-item {
      color: #d93025;

      svg {
        fill: #d93025;
      }

      &:hover {
        background-color: #fce8e6;

        svg {
          fill: #d93025;
        }
      }
    }
  }
}
</style>
