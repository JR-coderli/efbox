<template>
  <div class="google-content">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ contentConfig.header?.title ?? '用户列表' }}</h1>
        <p class="page-subtitle">管理系统用户和权限</p>
      </div>
      <div class="header-actions" v-if="isCreate">
        <button class="google-btn google-btn-primary" @click="emit('newClick')">
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>新建用户</span>
        </button>
      </div>
    </div>

    <!-- 内容卡片 -->
    <div class="content-card">
      <!-- 表格容器 -->
      <div class="table-wrapper">
        <el-table
          :data="filteredList"
          class="google-table"
          :border="false"
          :stripe="false"
          @row-contextmenu="handleContextMenu"
          :row-class-name="tableRowClassName"
        >
          <template v-for="item in contentConfig.propsList" :key="item.label">
            <!-- ID -->
            <template v-if="item.prop === 'id'">
              <el-table-column
                v-bind="item"
                :label="''"
                :width="item.width"
                class-name="id-column"
              >
                <template #default="scope">
                  <span class="user-id">{{ scope.row.id }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 用户名 -->
            <template v-else-if="item.prop === 'name'">
              <el-table-column
                v-bind="item"
                label="用户名"
                :width="item.width"
              >
                <template #default="scope">
                  <div class="user-name-cell">
                    <span class="user-name">{{ scope.row.name }}</span>
                  </div>
                </template>
              </el-table-column>
            </template>

            <!-- 角色 -->
            <template v-else-if="item.prop === 'role_name'">
              <el-table-column
                v-bind="item"
                label="角色"
                :width="item.width"
              >
                <template #default="scope">
                  <span class="role-chip" :class="getRoleClass(scope.row.role_name)">
                    {{ scope.row.role_name }}
                  </span>
                </template>
              </el-table-column>
            </template>

            <!-- 头像 -->
            <template v-else-if="item.type === 'custom'">
              <el-table-column
                v-bind="item"
                :label="item.label"
                :width="item.width"
                align="center"
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

            <!-- 日期 -->
            <template v-else-if="item.type === 'timer'">
              <el-table-column
                v-bind="item"
                sortable
                :width="item.width"
              >
                <template #default="scope">
                  <span class="date-text">{{ formatDate(scope.row[item.prop]) }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 操作 -->
            <template v-else-if="item.type === 'handler'">
              <el-table-column
                label="操作"
                :width="actionColumnWidth"
                align="center"
                :class-name="isMobile ? 'action-column-mobile' : ''"
                :fixed="isMobile ? false : 'right'"
              >
                <template #default="scope">
                  <div class="action-buttons">
                    <button
                      v-if="canEdit(scope.row)"
                      class="icon-btn edit-btn"
                      @click="handleEditBtnClick(scope.row)"
                      title="编辑"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      v-if="canDelete(scope.row)"
                      class="icon-btn delete-btn"
                      @click="handleDeleteBtnClick(scope.row.id)"
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

            <!-- 其他普通列 -->
            <template v-else>
              <el-table-column v-bind="item" />
            </template>
          </template>
        </el-table>
      </div>

      <!-- 分页器 -->
      <div class="pagination-wrapper" v-if="pageAllCount > pageSize">
        <div class="pagination-info">
          共 {{ filteredList.length }} 条记录
        </div>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30]"
          :total="filteredList.length"
          layout="sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="google-pagination"
        />
      </div>
    </div>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div class="context-menu" v-show="showMenu" :style="menuPosition">
        <div class="context-menu-item" v-if="canEdit(currentRow)" @click="handleMenuClick('编辑')">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          编辑
        </div>
        <div class="context-menu-item danger" v-if="canDelete(currentRow)" @click="handleMenuClick('删除')">
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
import useLoginStore from '@/stores/login/login'
import { throttle } from 'lodash'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, computed } from 'vue'


const isMobile = ref(window.innerWidth <= 768)
const actionColumnWidth = computed(() => isMobile.value ? 60 : 120)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

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


const isCreate = usePermissions('system:users:create')
const isDelete = usePermissions('system:users:delete')
const isUpdate = usePermissions('system:users:update')
const isQuery = usePermissions('system:users:query')

const systemStore = useSystemStore()
const loginStore = useLoginStore()
const { pageList, pageAllCount, highlightRowId } = storeToRefs(systemStore)


const currentUser = loginStore.userInfo
const TECHNICIAN_ROLE_ID = 1
const isTechnician = computed(() => {
  return currentUser?.role?.id === TECHNICIAN_ROLE_ID
})


const filteredList = computed(() => {
  if (isTechnician.value) {
    return pageList.value
  } else {
    return pageList.value.filter(user => user.role_id !== TECHNICIAN_ROLE_ID)
  }
})


function canEdit(row) {
  if (!isUpdate) return false
  if (!row) return false
  if (isTechnician.value) return true
  return row.role_id !== TECHNICIAN_ROLE_ID
}


function canDelete(row) {
  if (!isDelete) return false
  if (!row) return false
  if (isTechnician.value) return true
  return row.role_id !== TECHNICIAN_ROLE_ID
}


function getRoleClass(roleName) {
  const roleMap = {
    '技术员': 'role-admin',
    '管理员': 'role-user',
    '财务': 'role-finance',
    '商务': 'role-business'
  }
  return roleMap[roleName] || 'role-default'
}


function formatDate(dateStr) {
  if (!dateStr) return '-'
  return dateStr
}

fetchPageListData()

function handleSizeChange() {
  page.value = 1
  fetchPageListData(queryInfo)
}

function handleCurrentChange() {
  fetchPageListData(queryInfo)
}

function fetchPageListData(formData = {}, isQueryOrResetBtn = false) {
  if (!isQuery) return

  if (isQueryOrResetBtn) {
    page.value = 1
  }

  const size = pageSize.value
  const offset = (page.value - 1) * size
  queryInfo = { ...formData, size, offset }

  systemStore.postPageListAction(props.contentConfig.pageName, queryInfo)
    .then(() => {
      if (pageList.value.length === 0 && page.value > 1) {
        page.value--
        fetchPageListData(queryInfo)
      }
    })
}

const handleDeleteBtnClick = throttle(
  (id) => {
    ElMessageBox.confirm(
      '删除后数据无法恢复，是否确定删除？',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    ).then(() => {
      systemStore.deletePageByIdAction(props.contentConfig.pageName, id)
    }).catch(() => {

    })
  },
  1000,
  { trailing: false }
)

function handleEditBtnClick(rowData) {
  emit('editClick', rowData)
}


systemStore.$onAction(({ name, after }) => {
  after(() => {
    if (name === 'newPageDataAction') {
      page.value = 1
      setTimeout(() => {
        fetchPageListData()
      }, 700)
    }

    if (['deletePageByIdAction', 'editPageDataAction'].includes(name)) {
      setTimeout(() => {
        fetchPageListData(queryInfo)
      }, 700)
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
      handleDeleteBtnClick(currentRow.value.id)
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
  return row.id === highlightRowId.value ? 'row-highlight' : ''
}

defineExpose({
  fetchPageListData,
  pageList
})
</script>

<style lang="less" scoped>


.google-content {
  padding: 8px;
  // max-width: 1400px;
  margin: 0 auto;
}


.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  flex: 1;
  min-width: 200px;
}

.page-title {
  font-size: 32px;
  font-weight: 400;
  color: #202124;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 14px;
  color: #5f6368;
  margin: 0;
}


.google-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  height: 36px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;

  &:hover {
    background-color: #1557b0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
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


.content-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
  overflow: hidden;
}


.table-wrapper {
  overflow-x: auto;
}


:deep(.google-table) {
  border: none;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;

  .el-table__header-wrapper {
    th {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e8eaed;
      color: #3c4043;
      font-weight: 500;
      font-size: 13px;
      height: 48px;
      padding: 0 16px;

      .cell {
        padding: 0;
      }
    }
  }

  .el-table__body-wrapper {
    .el-table__row {
      &:hover {
        background-color: #f1f3f4 !important;
      }

      td {
        border-bottom: 1px solid #e8eaed;
        color: #202124;
        font-size: 14px;
        height: 56px;
        padding: 0 16px;

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


.user-id {
  color: #5f6368;
  font-size: 13px;
  font-family: 'Roboto Mono', monospace;
}


.user-name-cell {
  .user-name {
    color: #202124;
    font-weight: 500;
  }
}


.role-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
}

.role-admin {
  background-color: #fce8e6;
  color: #c5221f;
}

.role-user {
  background-color: #e8f0fe;
  color: #1967d2;
}

.role-finance {
  background-color: #e6f4ea;
  color: #137333;
}

.role-business {
  background-color: #fef7e0;
  color: #b06000;
}

.role-default {
  background-color: #f1f3f4;
  color: #5f6368;
}


.date-text {
  color: #5f6368;
  font-size: 13px;
}


.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
    fill: #5f6368;
  }

  &:hover {
    background-color: #f1f3f4;

    svg {
      fill: #202124;
    }
  }

  &:active {
    background-color: #e8eaed;
  }
}

.edit-btn:hover svg {
  fill: #1a73e8;
}

.delete-btn:hover svg {
  fill: #c5221f;
}


.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #e8eaed;
  flex-wrap: wrap;
  gap: 16px;
}

.pagination-info {
  color: #5f6368;
  font-size: 14px;
}

:deep(.google-pagination) {
  .el-pagination__sizes {
    .el-select {
      .el-input__wrapper {
        box-shadow: none;
        border: 1px solid #dadce0;
        border-radius: 4px;
        padding: 0 8px;

        &:hover {
          border-color: #1a73e8;
        }

        .el-input__inner {
          color: #202124;
        }
      }
    }
  }

  .btn-prev,
  .btn-next {
    border-radius: 4px;
    border: 1px solid #dadce0;
    background: #fff;
    color: #1a73e8;

    &:hover:not(:disabled) {
      background-color: #f1f3f4;
    }
  }

  .el-pager li {
    border-radius: 4px;
    margin: 0 2px;
    min-width: 32px;
    height: 32px;
    line-height: 30px;
    font-weight: 500;

    &.is-active {
      background-color: #1a73e8;
      color: #fff;
    }

    &:hover:not(.is-active) {
      background-color: #f1f3f4;
      color: #1a73e8;
    }
  }
}


.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 9999;
  min-width: 160px;
  padding: 8px 0;
  animation: contextMenuFadeIn 0.15s ease;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #202124;
  transition: background-color 0.15s ease;

  svg {
    width: 18px;
    height: 18px;
    fill: #5f6368;
  }

  &:hover {
    background-color: #f1f3f4;

    svg {
      fill: #202124;
    }
  }

  &.danger:hover {
    background-color: #fce8e6;

    svg {
      fill: #c5221f;
    }
  }
}


:deep(.row-highlight) {
  animation: rowHighlight 1.5s ease;
}

@keyframes rowHighlight {
  0% {
    background-color: #e8f0fe;
  }
  100% {
    background-color: transparent;
  }
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


    .id-column {
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
    border-radius: 8px;
  }

  :deep(.google-table) {
    min-width: 100%;

    .el-table__header-wrapper th,
    .el-table__body-wrapper td {
      padding: 0 8px;
      font-size: 13px;
      height: 48px;
    }


    .cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .pagination-wrapper {
    flex-direction: column;
    gap: 12px;

    .pagination-info {
      width: 100%;
      text-align: center;
    }

    :deep(.google-pagination) {
      width: 100%;
      display: flex;
      justify-content: center;

      .el-pagination__sizes {
        display: none;
      }
    }
  }


  .role-chip {
    padding: 2px 8px;
    font-size: 12px;
  }


  :deep(.action-column-mobile) {
    width: 60px !important;
    min-width: 60px !important;

    .cell {
      padding: 0 4px !important;
    }
  }

  .action-buttons {
    gap: 4px;

    .icon-btn {
      width: 28px;
      height: 28px;

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }


  .user-name-cell {
    max-width: 120px;

    .user-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}


@media (max-width: 480px) {
  .google-content {
    padding: 8px;
  }

  .content-card {
    border-radius: 8px;
  }

  :deep(.google-table) {
    .el-table__header-wrapper th,
    .el-table__body-wrapper td {
      padding: 0 6px;

      &.has-gutter {
        display: none;
      }
    }
  }


  :deep(.google-table) {
    .date-column,
    .avatar-column {
      display: none;
    }
  }
}
</style>
