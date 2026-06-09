<template>
  <div class="google-content">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ contentConfig.header?.title ?? '角色列表' }}</h1>
        <p class="page-subtitle">管理系统角色和菜单权限</p>
      </div>
      <div class="header-actions" v-if="isCreate">
        <button class="google-btn google-btn-primary" @click="emit('newClick')">
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>新建角色</span>
        </button>
      </div>
    </div>

    <!-- 内容卡片 -->
    <div class="content-card">
      <!-- 表格容器 -->
      <div class="table-wrapper">
        <el-table
          :data="pageList"
          class="google-table"
          :border="false"
          :stripe="false"
          @row-contextmenu="handleContextMenu"
          :row-class-name="tableRowClassName"
        >
          <!-- ID -->
          <el-table-column
            label="ID"
            prop="id"
            width="80"
            class-name="id-column"
          >
            <template #default="scope">
              <span class="role-id">{{ scope.row.id }}</span>
            </template>
          </el-table-column>

          <!-- 角色名称 -->
          <el-table-column
            label="角色名称"
            prop="name"
            width="150"
          >
            <template #default="scope">
              <div class="role-name-cell">
                <span class="role-name">{{ scope.row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <!-- 角色描述 -->
          <el-table-column
            label="角色描述"
            prop="intro"
            min-width="250"
          >
            <template #default="scope">
              <span class="role-intro">{{ scope.row.intro || '-' }}</span>
            </template>
          </el-table-column>

          <!-- 创建时间 -->
          <el-table-column
            label="创建时间"
            prop="createAt"
            width="180"
          >
            <template #default="scope">
              <span class="date-text">{{ formatDate(scope.row.createAt) }}</span>
            </template>
          </el-table-column>

          <!-- 更新时间 -->
          <el-table-column
            label="更新时间"
            prop="updateAt"
            width="180"
          >
            <template #default="scope">
              <span class="date-text">{{ formatDate(scope.row.updateAt) }}</span>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column
            label="操作"
            width="120"
            align="center"
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
        </el-table>
      </div>
    </div>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div class="context-menu" v-show="showMenu" :style="menuPosition">
        <div class="context-menu-item" @click="handleMenuClick('编辑')">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import hyRequest from '@/services/request'

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


const isCreate = usePermissions('system:role:create')
const isDelete = usePermissions('system:role:delete')
const isUpdate = usePermissions('system:role:update')
const isQuery = usePermissions('system:role:query')

const systemStore = useSystemStore()
const loginStore = useLoginStore()


const TECHNICIAN_ROLE_ID = 1


const isTechnician = computed(() => {
  return loginStore.userInfo?.role_id === TECHNICIAN_ROLE_ID
})


const rawPageList = ref([])


const pageList = computed(() => {
  if (isTechnician.value) {
    return rawPageList.value
  }
  return rawPageList.value.filter(role => role.id !== TECHNICIAN_ROLE_ID)
})

const highlightRowId = ref(null)


function canDelete(row) {
  if (!isDelete) return false
  if (!row) return false

  if (row.id === TECHNICIAN_ROLE_ID) return false

  if (!isTechnician.value && row.id === TECHNICIAN_ROLE_ID) return false
  return true
}


function canEdit(row) {
  if (!isUpdate) return false
  if (!row) return false

  if (isTechnician.value) return true

  if (row.id === TECHNICIAN_ROLE_ID) return false
  return true
}


function formatDate(dateStr) {
  if (!dateStr) return '-'
  return dateStr
}

fetchPageListData()

async function fetchPageListData() {
  if (!isQuery) return
  const result = await hyRequest.post({
    url: '/role/list',
    data: {
      offset: '0',
      size: '100'
    }
  })
  if (result.code === 0) {
    rawPageList.value = result.data.list || []
  }
}

const handleDeleteBtnClick = throttle(
  (id) => {
    if (id === 1) {
      ElNotification({
        message: '技术员角色不能删除',
        type: 'warning'
      })
      return
    }

    ElMessageBox.confirm(
      '删除后数据无法恢复，且已分配该角色的用户将受到影响。是否确定删除？',
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
    if (name === 'newPageDataAction' || name === 'deletePageByIdAction' || name === 'editPageDataAction') {
      setTimeout(() => {
        fetchPageListData()
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
      if (canDelete(currentRow.value)) {
        handleDeleteBtnClick(currentRow.value.id)
      }
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
  max-width: 1400px;
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


.role-id {
  color: #5f6368;
  font-size: 13px;
  font-family: 'Roboto Mono', monospace;
}


.role-name-cell {
  .role-name {
    color: #202124;
    font-weight: 500;
  }
}


.role-intro {
  color: #5f6368;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
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
}
</style>
