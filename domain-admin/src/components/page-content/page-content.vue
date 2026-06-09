<template>
  <div class="google-content">
    <div class="content-card">
      <!-- 页面标题和操作栏 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">{{ contentConfig.header?.title ?? '数据列表' }}</h1>
          <p class="page-subtitle"></p>
        </div>
        <div class="header-actions">
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

            <template v-else-if="item.type === 'handler'">
              <el-table-column v-bind="item" align="center">
                <template #default="scope">
                  <!-- 如果父组件提供了自定义操作插槽，使用自定义插槽 -->
                  <slot v-if="hasHandlerSlot" name="handler" v-bind="scope.row" :row="scope.row"></slot>
                  <!-- 否则使用默认的操作按钮 -->
                  <div v-else class="action-buttons">
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

            <template v-else-if="item.type === 'index'">
              <el-table-column v-bind="item" align="center">
                <template #default="scope">
                  <span class="row-index">{{ scope.$index + 1 }}</span>
                </template>
              </el-table-column>
            </template>

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
import { throttle } from 'lodash'
import { storeToRefs } from 'pinia'
import { computed, ref, onMounted, onUnmounted, useSlots } from 'vue'


const props = defineProps({
  contentConfig: { // 表示表格的配置信息
    type: Object,
    required: true
  },
  listType: { // 表示是哪个列表的类型
    type: String,
    default: 'list'
  },
  dataSourceType: { // 表示是哪个数据源的类型
    type: String,
    default: 'page'
  },
  showCreateBtn: { // 是否显示新建按钮
    type: Boolean,
    default: true
  },
  menuConfig: { // 右键菜单的配置信息
    type: Object,
    default: () => ({
      levelText: '修改等级' // 默认文本
    })
  }
})


const isCreate = usePermissions(`${props.contentConfig.pageName}:create`)
const isDelete = usePermissions(`${props.contentConfig.pageName}:delete`)
const isUpdate = usePermissions(`${props.contentConfig.pageName}:update`)
const isQuery = usePermissions(`${props.contentConfig.pageName}:query`)


let queryInfo = null // 记录查询条件
const currentPage = ref(1) // 当前页数
const pageSize = ref(10) // 默认每页显示的数量
const emit = defineEmits(['newClick', 'editClick', 'uploadFile']) // 定义自定义事件
const showMenu = ref(false) // 是否显示右键菜单
const menuPosition = ref({ // 右键菜单的位置
  left: '0px',
  top: '0px'
})
const currentRow = ref(null) // 记录当前右键点击的行数据


const systemStore = useSystemStore()
const {
  pageList,
  pageAllCount,
  importDomainsList,
  importDomainsAllCount,
  normalDomainsList,
  normalDomainsAllCount
} = storeToRefs(systemStore)
const tableData = computed(() => {
  if (props.dataSourceType === 'import') return importDomainsList.value
  if (props.dataSourceType === 'normal') return normalDomainsList.value
  return pageList.value
})
const totalCount = computed(() => {
  if (props.dataSourceType === 'import') return importDomainsAllCount.value
  if (props.dataSourceType === 'normal') return normalDomainsAllCount.value
  return pageAllCount.value
})


const slots = useSlots()
const hasHandlerSlot = computed(() => {
  return slots.handler !== undefined
})


fetchPageListData()




function handleSizeChange() {

  currentPage.value = 1 // 先将页面变回第一页, 在进行查询 "条/页"对应的数据, 这样偏移量offset才是正确的。
  fetchPageListData(queryInfo) // 发起网络请求
}

function handleCurrentChange() {

  fetchPageListData(queryInfo) // 发起网络请求
}


function fetchPageListData( formData = {}, isQueryOrResetBtn = false) {

  if (!isQuery) return // 如果没有查询权限直接不允许发送网络请求


  if (isQueryOrResetBtn) {
    currentPage.value = 1
  }


  const size = pageSize.value
  const offset = (currentPage.value - 1) * size
  queryInfo = { ...formData, size, offset } // 记录条件查询的条件对象


  systemStore.postPageListAction(props.contentConfig.pageName, queryInfo, props.listType)
  .then(() => {

      if (tableData.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
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
) // 每隔 1000ms 执行一次, 最后一次不执行


function handleNewUserClick() {

  emit('newClick')
}


function handleEditBtnClick(itemData) {

  emit('editClick', itemData, true)
}


systemStore.$onAction(({ name, after }) => {

  after(() => {

    if (name === 'newPageDataAction') {
      currentPage.value = 1 // 表示执行完action函数后, 让当前页数回到第一页
      setTimeout(() => {
        fetchPageListData()
      }, 700);
    }


    if (
      ['editDomainsIsimportAction', 'deletePageByIdAction', 'editPageDataAction'].includes(name)
    ) {
      setTimeout(() => { // 设置settimeout是为了让删除成功提示框消失后再执行
        fetchPageListData(queryInfo)
      }, 700) // 意思是执行完deletePageByIdAction函数后, 才执行fetchPageListData函数(有点类似于promise的then函数)
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
    case '查看':
      console.log(`当前点击了${type}按钮，行数据:`, currentRow.value)
      break
    case '修改等级':

      const isImportant = currentRow.value.is_important === 1 ? 0 : 1
      systemStore.editDomainsIsimportAction(currentRow.value.id, isImportant)
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


defineExpose({
  fetchPageListData,
  tableData
})
</script>

<style lang="less" scoped>

.google-content {
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
  min-width: 200px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
  color: #202124;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: #5f6368;
  margin: 4px 0 0 0;
}


.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  transition: background-color 0.2s;
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
  width: 16px;
  height: 16px;
  fill: currentColor;
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
      fill: #c5221f;
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
</style>
