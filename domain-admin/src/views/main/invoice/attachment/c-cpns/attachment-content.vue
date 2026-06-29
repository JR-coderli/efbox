<template>
  <div class="content">
    <!-- 表格头部 -->
    <div class="header">
      <h3 class="title">
        <span>{{ contentConfig.header?.title ?? '数据列表' }}</span>
        <slot name="search"></slot>
      </h3>

      <div class="header-filters">
        <div class="tags-style">
          <el-tag
            v-for="tag in activeFilters"
            :key="tag.key"
            closable
            @close="removeFilter(tag.key)"
          >
            {{ tag.label }}
          </el-tag>
        </div>

         <!-- 收款状态快捷筛选 -->
        <div v-if="groupBy === 'merged'" class="quick-filter">
          <button
            class="filter-btn"
            :class="{ active: !allQueryInfo.payment_status }"
            @click="quickFilterPaymentStatus(null)"
          >全部</button>
          <button
            class="filter-btn"
            :class="{ active: allQueryInfo.payment_status === '未收款' }"
            @click="quickFilterPaymentStatus('未收款')"
          >未收款</button>
          <button
            class="filter-btn"
            :class="{ active: allQueryInfo.payment_status === '已收款' }"
            @click="quickFilterPaymentStatus('已收款')"
          >已收款</button>
        </div>
      </div>

      <div class="btns">
        <!-- 日期范围筛选（按周期起始日期） -->
        <el-date-picker
          v-model="searchDateRange"
          type="daterange"
          unlink-panels
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          clearable
          popper-class="payment-date-popper"
          class="date-range-picker"
          @change="handleDateChange"
        />

        <!-- 刷新按钮 -->
        <el-button :icon="Refresh" circle title="刷新" @click="handleRefresh" />

        <!-- 视图/分组选择 -->
        <el-dropdown trigger="click" @command="handleGroupSelect">
          <el-button :icon="Filter" circle title="筛选分组" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="merged">
                <span v-if="groupBy === 'merged'" class="selected-dot"></span>
                默认
              </el-dropdown-item>
              <el-dropdown-item command="invoice_entity">
                <span v-if="groupBy === 'invoice_entity'" class="selected-dot"></span>
                开票主体
              </el-dropdown-item>
              <el-dropdown-item command="mail_status">
                <span v-if="groupBy === 'mail_status'" class="selected-dot"></span>
                发送状态
              </el-dropdown-item>
              <el-dropdown-item command="payment_status">
                <span v-if="groupBy === 'payment_status'" class="selected-dot"></span>
                收款状态
              </el-dropdown-item>
              <el-dropdown-item command="customer">
                <span v-if="groupBy === 'customer'" class="selected-dot"></span>
                客户
              </el-dropdown-item>
              <el-dropdown-item command="creator">
                <span v-if="groupBy === 'creator'" class="selected-dot"></span>
                创建人
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 列设置按钮 -->
        <el-dropdown trigger="click" @command="handleColumnSetting" :hide-on-click="false">
          <el-button icon="Setting" circle title="列设置" />
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
        <el-button v-if="isCreate" type="primary" @click="emit('newClick')">{{
        contentConfig.header?.btnTitle ?? '新建数据'
      }}</el-button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table">
      <!-- 合并视图 -->
      <template v-if="groupBy === 'merged'">
        <!-- Google 风格数据加载动画 -->
        <div v-if="dataLoading" class="google-data-loading">
          <div class="loading-spinner"></div>
          <p class="loading-text">加载中...</p>
        </div>

        <el-table
        v-loading="invoiceLoading"
        element-loading-text="生成发票中..."
        :data="pageList"
        style="width: 100%"
        :border="contentConfig.border ?? true"
        :stripe="contentConfig.stripe ?? true"
        :max-height="contentConfig.maxHeight"
        @row-contextmenu="handleContextMenu"
        :row-class-name="tableRowClassName"
        @sort-change="handleSortChange"
      >
        <template v-for="item in displayColumns" :key="item.label">

          <!-- 日期 -->
          <template v-if="item.type === 'timer'">
            <el-table-column
              align="center"
              sortable
              show-overflow-tooltip
              v-bind="item"
            >
              <template #default="scope">
                {{ scope.row[item.prop] }}
              </template>
            </el-table-column>
          </template>

          <!-- 操作 -->
          <template v-else-if="item.type === 'handler'">
            <el-table-column v-bind="item" align="center">
              <template #default="scope">
                <!-- 编辑 -->
                <el-button
                  v-if="isUpdate"
                  link
                  type="primary"
                  icon="Edit"
                  size="large"
                  @click="handleEditBtnClick(scope.row)"
                >
                </el-button>

                <!-- 删除 -->
                <el-button
                  v-if="isDelete"
                  link
                  type="danger"
                  icon="Delete"
                  size="large"
                  @click="handleDeleteBtnClick(scope.row.id)"
                >
                </el-button>
              </template>
            </el-table-column>
          </template>

          <!-- 操作 -->
          <template v-else-if="item.type === 'send-handler'">
            <el-table-column v-bind="item" align="center">
              <template #default="scope">
                <!-- 发送邮件 -->
                <el-tooltip
                  effect="light"
                  placement="left"
                  content="发送邮件"
                >
                  <el-button
                  v-if="isUpdate"
                  class="send-email-btn"
                  link
                  icon="Promotion"
                  size="large"
                  @click="confirmSendEmail(scope.row)"
                >
                </el-button>
                </el-tooltip>
                <!-- 删除 -->
                <el-tooltip
                  effect="light"
                  placement="top"
                  content="删除"
                >
                  <el-button
                  v-if="isDelete"
                  class="delete-btn"
                  link
                  type="danger"
                  icon="Delete"
                  size="large"
                  @click="handleDeleteBtnClick(scope.row.id)"
                >
                  </el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </template>

          <!-- 自定义内容 -->
          <template v-else-if="item.type === 'custom'">
            <el-table-column
              align="center"
              v-bind="item"
              :show-overflow-tooltip="item.showOverflowTooltip"
            >
              <template #default="scope">
                <slot
                  :name="item.slotName"
                  v-bind="scope.row"
                  :prop="item.prop"
                  :prop01="item.prop01"
                  :prop02="item.prop02"
                  :$index="scope.$index"
                >
              </slot>
              </template>
            </el-table-column>
          </template>

          <!-- 自定义内容 + 自定义表头 -->
          <template v-else-if="item.type === 'custom-header'">
            <el-table-column
              align="center"
              v-bind="item"
              :show-overflow-tooltip="item.showOverflowTooltip"
            >
              <template #header>
                <span class="th-title">
                  {{ item.label }}
                  <el-tooltip :content="getHeaderTooltip(item.slotName)" placement="top">
                    <el-icon class="th-icon">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </template>
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

          <!-- 自定义内容 + 自定义表头 -->
          <template v-else-if="item.type === 'custom-menu'">
            <el-table-column
              align="center"
              v-bind="item"
              :show-overflow-tooltip="item.showOverflowTooltip"
            >
              <template #header>
                <span class="th-title">
                  {{ item.label }}
                  <!-- <el-icon class="th-icon">
                    <Menu />
                  </el-icon> -->
                  <el-dropdown
                      trigger="click"
                      @command="handleHeaderCommand($event, item)"
                    >
                    <el-icon class="th-icon clickable">
                      <Menu />
                    </el-icon>

                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="未收款">
                          未收款
                        </el-dropdown-item>
                        <el-dropdown-item command="已收款">
                          已收款
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </span>
              </template>
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

          <!-- 普通数据 -->
          <template v-else>
            <el-table-column align="center" v-bind="item" />
          </template>

        </template>
      </el-table>
      </template>

      <!-- 分组视图 -->
      <template v-else-if="groupBy !== 'merged'">
        <!-- Google 风格数据加载动画 -->
        <div v-if="dataLoading" class="google-data-loading">
          <div class="loading-spinner"></div>
          <p class="loading-text">加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-if="!dataLoading && groupedData.length === 0" class="empty-grouped-state">
          <p>暂无数据</p>
        </div>

        <!-- 分组列表 -->
        <div v-for="group in groupedData" :key="group.key" class="group-section">
          <!-- 分组标题 -->
          <div class="group-header">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">共 {{ group.total }} 条</span>
          </div>

          <!-- 分组表格 -->
          <div class="group-table-wrapper">
            <el-table
              v-loading="invoiceLoading"
              element-loading-text="生成发票中..."
              :data="group.pagedData"
              style="width: 100%"
              :border="contentConfig.border ?? true"
              :stripe="contentConfig.stripe ?? true"
              @row-contextmenu="(row, column, event) => handleContextMenu(row, column, event)"
              :row-class-name="tableRowClassName"
              @sort-change="(args) => handleSortChange(args, group.key)"
            >
              <template v-for="item in displayColumns" :key="item.label">

                <!-- 日期 -->
                <template v-if="item.type === 'timer'">
                  <el-table-column
                    align="center"
                    sortable
                    show-overflow-tooltip
                    v-bind="item"
                  >
                    <template #default="scope">
                      {{ scope.row[item.prop] }}
                    </template>
                  </el-table-column>
                </template>

                <!-- 操作 -->
                <template v-else-if="item.type === 'handler'">
                  <el-table-column v-bind="item" align="center">
                    <template #default="scope">
                      <!-- 编辑 -->
                      <el-button
                        v-if="isUpdate"
                        link
                        type="primary"
                        icon="Edit"
                        size="large"
                        @click="handleEditBtnClick(scope.row)"
                      >
                      </el-button>

                      <!-- 删除 -->
                      <el-button
                        v-if="isDelete"
                        link
                        type="danger"
                        icon="Delete"
                        size="large"
                        @click="handleDeleteBtnClick(scope.row.id)"
                      >
                      </el-button>
                    </template>
                  </el-table-column>
                </template>

                <!-- 自定义插槽 -->
                <template v-else-if="item.type === 'slot'">
                  <el-table-column
                    align="center"
                    v-bind="item"
                    :show-overflow-tooltip="item.showOverflowTooltip"
                  >
                    <template #default="scope">
                      <slot
                        :name="item.slotName"
                        v-bind="scope.row"
                        :destination="scope.row.destination"
                        :filename="scope.row.filename"
                      >
                      </slot>
                    </template>
                  </el-table-column>
                </template>

                <!-- 自定义内容 -->
                <template v-else-if="item.type === 'custom'">
                  <el-table-column
                    align="center"
                    v-bind="item"
                    :show-overflow-tooltip="item.showOverflowTooltip"
                  >
                    <template #default="scope">
                      <slot
                        :name="item.slotName"
                        v-bind="scope.row"
                        :prop="item.prop"
                        :prop01="item.prop01"
                        :prop02="item.prop02"
                        :$index="scope.$index"
                      >
                      </slot>
                    </template>
                  </el-table-column>
                </template>

                <!-- 自定义内容 + 自定义表头 -->
                <template v-else-if="item.type === 'custom-header'">
                  <el-table-column
                    align="center"
                    v-bind="item"
                    :show-overflow-tooltip="item.showOverflowTooltip"
                  >
                    <template #header>
                      <span class="th-title">
                        {{ item.label }}
                        <el-tooltip :content="getHeaderTooltip(item.slotName)" placement="top">
                          <el-icon class="th-icon">
                            <QuestionFilled />
                          </el-icon>
                        </el-tooltip>
                      </span>
                    </template>
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

                <!-- 自定义内容 + 自定义表头 -->
                <template v-else-if="item.type === 'custom-menu'">
                  <el-table-column
                    align="center"
                    v-bind="item"
                    :show-overflow-tooltip="item.showOverflowTooltip"
                  >
                    <template #header>
                      <span class="th-title">
                        {{ item.label }}
                        <el-dropdown
                            trigger="click"
                            @command="handleHeaderCommand($event, item)"
                          >
                          <el-icon class="th-icon clickable">
                            <Menu />
                          </el-icon>

                          <template #dropdown>
                            <el-dropdown-menu>
                              <el-dropdown-item command="未收款">
                                未收款
                              </el-dropdown-item>
                              <el-dropdown-item command="已收款">
                                已收款
                              </el-dropdown-item>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </span>
                    </template>
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

                <!-- 普通数据 -->
                <template v-else>
                  <el-table-column align="center" v-bind="item" />
                </template>

              </template>
            </el-table>
          </div>

          <!-- 分组分页 -->
          <div class="group-pagination">
            <el-pagination
              :current-page="group.page"
              :page-size="group.pageSize"
              :page-sizes="[10, 20, 30]"
              :total="group.total"
              layout="total, sizes, prev, pager, next"
              size="small"
              @update:current-page="(val) => handleGroupPageChange(group.key, val)"
              @update:page-size="(val) => handleGroupPageSizeChange(group.key, val)"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- 分页器（仅合并视图显示） -->
    <div v-if="groupBy === 'merged'" class="pagination">
      <el-pagination
        v-model:current-page="allQueryInfo.page"
        v-model:page-size="allQueryInfo.pageSize"
        :page-sizes="[10, 20, 30]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pageAllCount"
      />
    </div>

    <!-- 右键菜单 -->
    <div class="context-menu" v-show="showMenu" :style="menuPosition">
      <ul>
        <li @click="handleMenuClick('发送')" v-if="isUpdate">
          <svg viewBox="0 0 1024 1024"><path fill="currentColor" d="m64 448 832-320-128 704-446.08-243.328L832 192 242.816 545.472zm256 512V657.024L512 768z"></path></svg>
          发送
        </li>
        <li @click="handleMenuClick('删除')" v-if="isDelete" class="delete-item">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          删除
        </li>
      </ul>
    </div>


    <!-- 邮件发送确认框 -->
    <!-- <el-dialog
      v-model="dialogVisible"
      title="核对邮件内容"
      width="500"
    >
      <div class="confirm-message">
        <div>
          <span class="message-title">客户: </span>
          <span class="true-message">{{ clickedRowData.customer.full_name }}</span>
        </div>
        <div>
          <span class="message-title">周期:</span>
          <span class="true-message">{{ convertDateRange(clickedRowData.period) }}</span>  
        </div>
        <div>
          <span class="message-title">总金额: </span>
          <span class="true-message">{{ "$" + clickedRowData.amount }}</span>
        </div>
        <div>
          <span class="message-title">发送邮件: </span>
          <div class="email-list">
            <template v-for="value in clickedRowData.customer.emails" :key="value.id">
              <span class="true-message">
                {{ value.email }}
              </span>
            </template>
            <span class="true-message">netapop@outlook.com </span>
          </div>
        </div>
        <div>
          <span class="message-title">发票文件: </span>
          <a style="color: #409EFF;text-decoration: underline;" :href="clickedRowData.destination" target="_blank">{{ clickedRowData.filename }}</a>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSendEmail">
            确定发送
          </el-button>
        </div>
      </template>
    </el-dialog> -->
    
    <el-dialog
      v-model="dialogVisible"
      title="核对邮件内容"
      width="550px"
      class="google-style-dialog"
    >
      <div class="confirm-container">
        <p class="helper-text">请在发送前核对以下账单及联系人信息</p>
        
        <div class="info-group">
          <div class="info-item">
            <label>客户名称</label>
            <div class="content1 main-text">{{ clickedRowData.customer.full_name }}</div>
          </div>

          <div class="info-item">
            <label>账单周期</label>
            <div class="content1">{{ convertDateRange(clickedRowData.period) }}</div>
          </div>

          <div class="info-item">
            <label>结算总计</label>
            <div class="content1 price-text">{{ "$" + clickedRowData.amount }}</div>
          </div>

          <div class="info-item">
            <label>接收邮箱</label>
            <div class="content1">
              <div class="email-tag-wrapper">
                <span v-for="value in clickedRowData.customer.emails.filter(e => e.type === 'send')" :key="value.id" class="email-chip">
                  {{ value.email }}
                </span>
                <span class="email-chip secondary">netapop@outlook.com</span>
              </div>
            </div>
          </div>

          <div class="info-item no-border">
            <label>发票附件</label>
            <div class="content1">
              <a class="file-link" :href="clickedRowData.destination" target="_blank">
                <svg class="file-icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                {{ clickedRowData.filename }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="google-actions">
          <el-button @click="dialogVisible = false" class="btn-cancel" :disabled="sending">取消</el-button>
          <el-button type="primary" @click="handleSendEmail" class="btn-confirm" :loading="sending" :disabled="sending">
            {{ sending ? '发送中...' : '确认发送' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  
  </div>
</template>

<script setup>
import { QuestionFilled, Promotion, Filter, Refresh } from '@element-plus/icons-vue'
import usePermissions from '@/hooks/usePermissions'
import useSystemStore from '@/stores/main/system/system'
import useLoginStore from '@/stores/login/login'
import { throttle } from 'lodash'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import convertDateRange from '@/utils/convert-date-range'


const STORAGE_KEY = 'attachment_column_settings'


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
      required: item.type === 'send-handler', // 操作列必需
      defaultHidden: item.defaultHidden || false // 默认隐藏
    }
  })
})


const columnSettings = ref([])
const draggingIndex = ref(null) // 当前拖拽的索引


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
          settings.push({
            key: col.key,
            visible: !col.defaultHidden
          })
        }
      }

      columnSettings.value = settings
    } catch {

      columnSettings.value = currentAllColumns.map(col => ({
        key: col.key,
        visible: !col.defaultHidden
      }))
    }
  } else {

    columnSettings.value = currentAllColumns.map(col => ({
      key: col.key,
      visible: !col.defaultHidden
    }))
  }
}


function saveColumnSettings() {
  const settings = orderedColumns.value.map(col => ({
    key: col.key,
    visible: col.visible !== false // 默认 true
  }))
  columnSettings.value = settings
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}


function isColumnVisible(item) {
  const key = typeof item === 'string' ? item : item.key
  const setting = columnSettings.value.find(s => s.key === key)
  if (!setting) return true // 默认可见
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


function handleDragOver(index) {

}


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


function handleColumnSetting() {

}


function getHeaderTooltip(slotName) {
  const tooltipMap = {
    'customer_short_name': '点击名称进行查找',
    'filename': '点击文件名可查看发票',
    'amount_received': '双击可编辑',
    'amount_diff': '差额 = 收款金额 - 金额'
  }
  return tooltipMap[slotName] || ''
}


const props = defineProps({
  contentConfig: { // 表格的配置信息
    type: Object,
    required: true
  },
  tableShowLoading: {
    type: Boolean,
    default: false
  },
  showFirstPage: {
    type: Boolean,
    default: true
  }
})


const emit = defineEmits(['newClick', 'editClick']) // 定义自定义事件
const currentRow = ref(null) // 记录当前右键点击的行数据
const showMenu = ref(false) // 是否显示右键菜单
const menuPosition = ref({ // 右键菜单的位置
  left: '0px',
  top: '0px'
})
let queryInfo = null // 记录查询条件

const invoiceLoading = ref(false) // 生成发票的加载动画
const dataLoading = ref(false) // 数据加载的加载动画
const dialogVisible = ref(false) // 显示邮件发送确认框?
const clickedRowData = ref(null) // 当前点击发送的邮件的那一行表格数据
const sending = ref(false) // 邮件发送中状态


const sortState = ref({
  prop: '',
  order: ''
})


// 日期范围筛选（按周期起始日期，直接读写 store 的 allQueryInfo）
const dateShortcuts = [
  {
    text: '前七天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '前三十天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: '上个月',
    value: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return [start, end]
    }
  },
  {
    text: '这个月',
    value: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date()
      return [start, end]
    }
  },
  {
    text: '今年',
    value: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date()
      return [start, end]
    }
  }
]

const searchDateRange = computed({
  get() {
    const s = allQueryInfo.value?.start_date
    const e = allQueryInfo.value?.end_date
    return (s && e) ? [s, e] : null
  },
  set(val) {
    allQueryInfo.value.start_date = val?.[0] || undefined
    allQueryInfo.value.end_date = val?.[1] || undefined
  }
})


function handleDateChange() {
  allQueryInfo.value.page = 1
  fetchPageListData({}, true, true)
}


const isCreate = usePermissions(`${props.contentConfig.pageName}:create`)
const isDelete = usePermissions(`${props.contentConfig.pageName}:delete`)
const isUpdate = usePermissions(`${props.contentConfig.pageName}:update`)
const isQuery = usePermissions(`${props.contentConfig.pageName}:query`)


const systemStore = useSystemStore()
const loginStore = useLoginStore()
const { pageList, pageAllCount, allQueryInfo, highlightRowId } = storeToRefs(systemStore)



const groupBy = ref('merged')


const groupedRawData = ref([])


const groupPagination = ref({})


const groupSortState = ref({})


const allDataForGrouping = ref([])


const groupedData = computed(() => {
  if (groupBy.value === 'merged') return []

  const result = []
  for (const group of groupedRawData.value) {

    const sort = groupSortState.value[group.key]
    let sortedData = group.data
    if (sort && sort.prop && sort.order) {
      sortedData = [...group.data].sort((a, b) => {
        let valA = a[sort.prop]
        let valB = b[sort.prop]


        if (typeof valA === 'number' && typeof valB === 'number') {
          return sort.order === 'ascending' ? valA - valB : valB - valA
        }


        valA = String(valA ?? '')
        valB = String(valB ?? '')
        const cmp = valA.localeCompare(valB)
        return sort.order === 'ascending' ? cmp : -cmp
      })
    }

    const pagination = groupPagination.value[group.key] || { page: 1, pageSize: 10 }
    const startIndex = (pagination.page - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    const pageData = sortedData.slice(startIndex, endIndex)


    const pagedData = pageData.map((item, idx) => ({
      ...item,
      reverse_index: sortedData.length - startIndex - idx
    }))

    result.push({
      ...group,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: sortedData.length,
      pagedData: pagedData
    })
  }
  return result
})


const originalPagination = ref({
  page: 1,
  pageSize: 10
})


watch(pageList, (newList) => {

  if (groupBy.value !== 'merged' && newList) {
    allDataForGrouping.value = [...newList]
    updateGroupedData(newList)
  }
}, { deep: true })


watch(() => props.tableShowLoading, newVal => {
  invoiceLoading.value = newVal
})


watch(() => allQueryInfo.value.page, async (newPage) => {
  if (groupBy.value === 'merged') {

    await nextTick()
    fetchPageListData()
  }
})


watch(() => allQueryInfo.value.pageSize, async (newVal, oldVal) => {
  if (oldVal && groupBy.value === 'merged') {

    await nextTick()
    allQueryInfo.value.page = 1
    fetchPageListData()
  }
})





function getGroupInfo(item, type) {
  switch (type) {
    case 'customer':
      return {
        key: item.customer?.id || 'unknown',
        name: item.customer?.short_name || '未知客户'
      }
    case 'invoice_entity':
      return {
        key: item.invoice_entity_name || 'none',
        name: item.invoice_entity_name || '未分配'
      }
    case 'mail_status':

      const isSent = item.mail_status === 'sent'
      return {
        key: isSent ? 'sent' : 'unsent',
        name: isSent ? '已发送' : '未发送'
      }
    case 'payment_status':

      const isReceived = item.payment_status === '已收款'
      return {
        key: isReceived ? 'received' : 'unreceived',
        name: isReceived ? '已收款' : '未收款'
      }
    case 'creator':
      return {
        key: item.creator_name || 'unknown',
        name: item.creator_name || '未知创建人'
      }
    default:
      return { key: 'unknown', name: '未知' }
  }
}


function updateGroupedData(dataList) {
  if (!dataList || dataList.length === 0) {
    groupedRawData.value = []
    return
  }


  const groups = new Map()

  for (const item of dataList) {
    const groupInfo = getGroupInfo(item, groupBy.value)

    if (!groups.has(groupInfo.key)) {
      groups.set(groupInfo.key, {
        key: groupInfo.key,
        name: groupInfo.name,
        data: []
      })
    }

    groups.get(groupInfo.key).data.push(item)
  }


  const sortedGroups = Array.from(groups.values()).sort((a, b) => {

    if (a.key === 'unknown' || a.key === 'none') return 1
    if (b.key === 'unknown' || b.key === 'none') return -1
    return a.name.localeCompare(b.name, 'zh-CN')
  })

  groupedRawData.value = sortedGroups


  const newPagination = { ...groupPagination.value }
  for (const group of sortedGroups) {
    if (!newPagination[group.key]) {
      newPagination[group.key] = { page: 1, pageSize: 10 }
    }
  }
  groupPagination.value = newPagination
}


function handleGroupSelect(command) {
  groupBy.value = command
  handleGroupByChange(command)
}


async function handleGroupByChange(newGroupBy) {

  if (newGroupBy === 'merged') {
    groupedRawData.value = []
    groupPagination.value = {}
    groupSortState.value = {}
    allDataForGrouping.value = []

    allQueryInfo.value.page = originalPagination.value.page
    allQueryInfo.value.pageSize = originalPagination.value.pageSize

    fetchPageListData({}, false, false)
  } else {

    originalPagination.value = {
      page: allQueryInfo.value.page,
      pageSize: allQueryInfo.value.pageSize
    }
    groupPagination.value = {} // 重置分组分页状态
    groupSortState.value = {} // 重置分组排序状态

    dataLoading.value = true
    try {

      const allDataQuery = {
        ...(queryInfo || {}),
        ...allQueryInfo.value,
        sort_prop: sortState.value.prop,
        sort_order: sortState.value.order === 'ascending' ? 'asc' : (sortState.value.order === 'descending' ? 'desc' : ''),
        page: 1,
        pageSize: 10000, // 获取所有数据
        "role_name": loginStore.userInfo.role.name || '',
        "user_id": loginStore.userInfo.id
      }
      await systemStore.postPageListAction(props.contentConfig.pageName, allDataQuery, "attalist")

      allDataForGrouping.value = [...pageList.value]
      updateGroupedData(allDataForGrouping.value)
    } catch (error) {
      console.error('获取所有数据失败:', error)
    } finally {
      dataLoading.value = false
    }
  }
}


function handleGroupPageChange(groupKey, newPage) {
  const currentPagination = groupPagination.value[groupKey] || { page: 1, pageSize: 10 }


  groupPagination.value = {
    ...groupPagination.value,
    [groupKey]: { ...currentPagination, page: newPage }
  }
}


function handleGroupPageSizeChange(groupKey, newPageSize) {
  const currentPagination = groupPagination.value[groupKey] || { page: 1, pageSize: 10 }


  groupPagination.value = {
    ...groupPagination.value,
    [groupKey]: { page: 1, pageSize: newPageSize }
  }
}



function fetchPageListData(formData = {}, isQueryOrResetBtn = false, showLoading = true) {

  if (!isQuery) return


  if (isQueryOrResetBtn) {
    allQueryInfo.value.page = 1
  }


  queryInfo = {
    ...formData,
    ...allQueryInfo.value,
    sort_prop: sortState.value.prop,
    sort_order: sortState.value.order === 'ascending' ? 'asc' : (sortState.value.order === 'descending' ? 'desc' : ''),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  } // 记录条件查询的条件对象


  if (showLoading) {
    dataLoading.value = true // 显示数据加载动画
  }
  return systemStore.postPageListAction(props.contentConfig.pageName, queryInfo, "attalist")
  .then(() => {

      if (pageList.value.length === 0 && allQueryInfo.value.page > 1) {
        allQueryInfo.value.page--

        return fetchPageListData({}, false, showLoading)
      }
    })
    .catch((error) => {
      console.error('获取数据失败:', error)
    })
    .finally(() => {
      if (showLoading) {
        dataLoading.value = false // 隐藏数据加载动画
      }
    })
}


async function handleRefresh() {
  if (groupBy.value === 'merged') {
    fetchPageListData({}, false, true)
  } else {

    await handleGroupByChange(groupBy.value)
  }
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



function handleEditBtnClick(rowData) {

  emit('editClick', rowData)
}


function confirmSendEmail(rowData) {
  dialogVisible.value = true // 打开弹窗
  clickedRowData.value = rowData // 记录被点击的那一行表格数据

}
async function handleSendEmail() {
  sending.value = true

  try {

    const sendEmails = clickedRowData.value.customer.emails
      .filter(item => item.type === 'send')
      .map(item => ({ email: item.email, full_name: clickedRowData.value.customer.full_name }))

    await systemStore.sendEmailAction({
      filename: clickedRowData.value.filename,
      id: clickedRowData.value.id,
      emails: sendEmails,
      invoice_entity_name: clickedRowData.value.invoice_entity_name
    })


    dialogVisible.value = false
  } finally {
    sending.value = false
  }
}


systemStore.$onAction(({ name, after }) => {
  after(() => {

    if (name === 'newPageDataAction') {
      allQueryInfo.value.page = 1 // 表示执行完action函数后, 让当前页数回到第一页
    }


    if (name === 'generatePdfAction') {
      invoiceLoading.value = false
    }



    if (
      ['newPageDataAction', 'generatePdfAction', 'editDomainsIsimportAction', 'deletePageByIdAction', "sendEmailAction"].includes(name)
    ) {
      fetchPageListData({}, false, false) // 不显示加载动画，以便看到高亮效果
    }
  })
})



const handleContextMenu = (row, column, event) => {
  event.preventDefault() 

  currentRow.value = row // 记录当前被点击的这行数据
  showMenu.value = true // 显示右键菜单
  menuPosition.value = { // 修改右键菜单出现的位置
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
    case '发送':
      confirmSendEmail(currentRow.value)
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
  loadColumnSettings() // 加载列显示设置
})
onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})



function quickFilterPaymentStatus(status) {
  allQueryInfo.value.page = 1
  allQueryInfo.value.payment_status = status || undefined

  const hasSearch = !!allQueryInfo.value.short_name
  const condition = {
    ...allQueryInfo.value,
    ...(hasSearch ? { page: 1, pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(props.contentConfig.pageName, condition, "attalist")
}


const handleHeaderCommand = (command, column) => {
  console.log('选择状态：', command)
  console.log('点击列信息：', column)

  allQueryInfo.value.page = 1
  allQueryInfo.value.payment_status = command


  const hasSearch = !!allQueryInfo.value.short_name
  const condition = {
    ...allQueryInfo.value,
    ...(hasSearch ? { page: 1, pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(props.contentConfig.pageName, condition, "attalist")
}



const tableRowClassName = ({ row }) => {
  return row.id === highlightRowId.value
    ? 'row-highlight'
    : ''
}


const activeFilters = computed(() => {
  const q = allQueryInfo.value
  const tags = []

  if (q.short_name) {
    tags.push({
      key: 'short_name',
      label: `客户：${q.short_name}`,
    })
  }

  if (q.payment_status !== undefined) {
    tags.push({
      key: 'payment_status',
      label: q.payment_status === "已收款" ? '已收款' : '未收款',
    })
  }

  if (q.start_date && q.end_date) {
    tags.push({
      key: 'date_range',
      label: `日期：${q.start_date} 至 ${q.end_date}`,
    })
  }

  return tags
})

function removeFilter(key) {

  if (key === "short_name") {
    allQueryInfo.value.short_name = ""
  } else if (key === "payment_status") {
    allQueryInfo.value.payment_status = undefined
  } else if (key === "date_range") {
    allQueryInfo.value.start_date = undefined
    allQueryInfo.value.end_date = undefined
  }


  const hasSearch = !!allQueryInfo.value.short_name
  const condition = {
    ...allQueryInfo.value,
    ...(hasSearch ? { page: 1, pageSize: 10000 } : {}),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(props.contentConfig.pageName, condition, "attalist")
}


function handleSortChange({ prop, order }, groupKey) {

  if (groupBy.value !== 'merged' && groupKey) {
    if (prop && order) {
      groupSortState.value = {
        ...groupSortState.value,
        [groupKey]: { prop, order }
      }
    } else {

      const newState = { ...groupSortState.value }
      delete newState[groupKey]
      groupSortState.value = newState
    }
    return
  }



  sortState.value = {
    prop: prop || '',
    order: order || ''
  }


  const condition = {
    ...queryInfo,
    ...allQueryInfo.value,
    sort_prop: prop || '',
    sort_order: order === 'ascending' ? 'asc' : (order === 'descending' ? 'desc' : ''),
    "role_name": loginStore.userInfo.role.name || '',
    "user_id": loginStore.userInfo.id
  }

  systemStore.postPageListAction(props.contentConfig.pageName, condition, "attalist")
}



defineExpose({
  fetchPageListData,
  pageList,
  confirmSendEmail,
  groupBy
})
</script>

<style lang="less" scoped>
.content {
  padding: 8px;
  // max-width: 1600px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;

  .title {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    font-size: 20px;
    font-weight: 500;
    color: #202124;
    flex-wrap: wrap;


    :deep(.el-autocomplete) {
      max-width: 250px;
    }
  }

  .btns {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}


.header-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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


.tags-style {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  :deep(.el-tag) {
    background-color: #e8f0fe;
    color: #1a73e8;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 13px;
    font-weight: 500;

    .el-tag__close {
      color: #1a73e8;

      &:hover {
        background-color: #d2e3fc;
        color: #1a73e8;
      }
    }
  }
}


.table {
  position: relative;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8eaed;

  :deep(.el-table) {
    border: none;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;

    .el-table__header-wrapper {
      th {
        background-color: #f1f3f4;
        border-bottom: 1px solid #e8eaed;
        color: #3c4043;
        font-weight: 500;
        font-size: 13px;
        height: 48px;
        padding: 0 14px;

        .cell {
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
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

  :deep(.el-table__cell) {
    padding: 0;

    .cell {
      display: flex;

      justify-content: center;
      align-items: center;
      font-size: 13px;
    }
  }


  :deep(.el-table__cell .el-tooltip) {
    padding-right: 15px !important;
  }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
  background-color: #fff;

  :deep(.el-pagination) {
    max-width: 85vw;
    flex-wrap: wrap;

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

    .el-pagination__jump {
      @media (max-width: 500px) {
        margin-top: 10px;
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

    .el-input__wrapper {
      border-radius: 4px;
      border: 1px solid #dadce0;
    }
  }
}

.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);

  ul {
    list-style: none;
    padding: 8px 0;
    margin: 0;
    min-width: 120px;
  }

  li {
    padding: 10px 16px;
    cursor: pointer;
    font-size: 13px;
    color: #202124;
    display: flex;
    align-items: center;
    gap: 10px;

    svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;

      &:not([viewBox="0 0 24 24"]) {
        width: 14px;
        height: 14px;
      }
    }

    svg[viewBox="0 0 1024 1024"] {
      fill: #5f6368;
    }

    svg[viewBox="0 0 24 24"] {
      fill: #5f6368;
    }

    &:hover {
      background-color: #f1f3f4;

      svg[viewBox="0 0 1024 1024"] {
        fill: #202124;
      }

      svg[viewBox="0 0 24 24"] {
        fill: #202124;
      }
    }

    &.delete-item {
      &:hover {
        background-color: #fce8e6;

        svg[viewBox="0 0 24 24"] {
          fill: #d93025;
        }
      }
    }
  }
}


:deep(.row-highlight) {
  background-color: #e8f0fe;
}


:deep(.send-email-btn) {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: #f1f3f4;
  color: #5f6368;

  &:hover {
    background-color: #e8f0fe;
    color: #1a73e8;
  }

  .el-icon {
    font-size: 16px;
  }
}


:deep(.delete-btn) {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: #f1f3f4;
  color: #5f6368;

  &:hover {
    background-color: #fce8e6;
    color: #d93025;
  }

  .el-icon {
    font-size: 16px;
  }
}


:deep(.el-table__cell .cell:has(.send-email-btn)) {
  gap: 4px;
}


:deep(.google-style-dialog) {
  border-radius: 6px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

:deep(.google-style-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e8eaed;
}

:deep(.google-style-dialog .el-dialog__title) {
  font-size: 20px;
  font-weight: 500;
  color: #202124;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
}

:deep(.google-style-dialog .el-dialog__headerbtn) {
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

:deep(.google-style-dialog .el-dialog__body) {
  padding: 20px 24px;
}

:deep(.google-style-dialog .el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #e8eaed;
}


.confirm-container {
  color: #3c4043;
}

.helper-text {
  font-size: 14px;
  color: #5f6368;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 20px;
    height: 20px;
    background: #e8f0fe;
    border-radius: 50%;
    flex-shrink: 0;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E") no-repeat center;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E") no-repeat center;
    mask-size: 16px;
    -webkit-mask-size: 16px;
    background-color: #1a73e8;
  }
}


.info-group {
  border: 1px solid #e8eaed;

  overflow: hidden;
  background: #fff;
}

.info-item {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f4;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }
}

.info-item.no-border {
  border-bottom: none;
}

.info-item label {
  width: 90px;
  font-size: 13px;
  font-weight: 500;
  color: #5f6368;
  flex-shrink: 0;
}

.info-item .content1 {
  font-size: 14px;
  color: #202124;
  flex-grow: 1;
}

.main-text {
  font-weight: 500;
  color: #202124;
}

.price-text {
  color: #1a73e8;
  font-weight: 500;
  font-size: 16px;
}


.email-tag-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.email-chip {
  background: #e8f0fe;
  color: #1967d2;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}

.email-chip.secondary {
  background: #f1f3f4;
  color: #5f6368;
}


.file-link {
  display: inline-flex;
  align-items: center;
  color: #1a73e8;
  text-decoration: none;
  font-weight: 500;
  padding: 6px 12px;
  background: #e8f0fe;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #d2e3fc;
    text-decoration: none;
  }
}

.file-icon {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  fill: #1a73e8;
}


.google-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.btn-cancel) {
  border: none !important;
  color: #1a73e8 !important;
  background: transparent !important;
  font-weight: 500;
  padding: 0 20px;
  height: 36px;
  border-radius: 4px;

  &:hover:not(:disabled) {
    background: #f1f3f4 !important;
  }
}

:deep(.btn-confirm) {
  background-color: #1a73e8 !important;
  border-color: #1a73e8 !important;
  border-radius: 4px !important;
  font-weight: 500;
  padding: 0 24px;
  height: 36px;

  &:hover:not(:disabled):not(.is-disabled) {
    background-color: #1557b0 !important;
    border-color: #1557b0 !important;
  }

  &:disabled, &.is-disabled {
    background-color: #dadce0 !important;
    border-color: #dadce0 !important;
  }
}


.th-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.th-icon {
  font-size: 14px;
  color: #909399;
}

.th-icon.clickable {
  cursor: pointer;
}

.th-icon.clickable:hover {
  color: #1a73e8;
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

// 日期范围筛选触发器：未选中时只显示一个小日历图标
:deep(.date-range-picker) {
  cursor: pointer;
  --el-date-editor-width: auto;
  width: fit-content !important;
  max-width: 40px;
  flex: 0 0 auto;
  flex-grow: 0;
  flex-shrink: 0;

  .el-range-editor.el-input__wrapper {
    width: auto !important;
    min-width: 32px;
    height: 32px;
    padding: 0 8px !important;
    border-radius: 4px;
    box-shadow: 0 0 0 1px #dadce0 inset;
    cursor: pointer;
    transition: box-shadow 0.15s, background-color 0.15s;

    &:hover {
      box-shadow: 0 0 0 1px #bdc1c6 inset;
      background-color: #f8f9fa;
    }

    &.is-focus {
      box-shadow: 0 0 0 1px #1a73e8 inset;
    }
  }

  .el-range-input,
  .el-range-separator,
  .el-range__close-icon {
    display: none;
  }

  .el-range__icon {
    margin-right: 0;
    color: #5f6368;
    font-size: 16px;
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


.group-section {
  margin-bottom: 40px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgb(241, 243, 244);
  border-bottom: 1px solid #e8eaed;
}

.group-name {
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '';
    width: 4px;
    height: 16px;
    background: #1a73e8;
    border-radius: 2px;
  }
}

.group-count {
  font-size: 13px;
  color: #5f6368;
}

.group-table-wrapper {
  :deep(.el-table) {
    border: none;

    th, td {
      border: none !important;
    }

    .el-table__header-wrapper {
      background: #fafafa;
    }

    .el-table__body-wrapper {
      border: none;
    }

    &::before,
    &::after {
      display: none;
    }
  }
}

.group-pagination {
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
  display: flex;
  justify-content: center;
  background: #fafafa;

  :deep(.el-pagination) {
    .el-pagination__total {
      color: #5f6368;
    }
  }
}

.empty-grouped-state {
  padding: 60px 20px;
  text-align: center;
  color: #5f6368;
  font-size: 14px;
  background: #fff;
  border-radius: 8px;
  border: 1px dashed #e8eaed;
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
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8eaed;
  padding: 6px;

  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    font-size: 14px;
    color: #3c4043;
    border-radius: 4px;
    margin: 2px 0;
    min-width: 140px;

    &:hover {
      background-color: #f1f3f4;
      color: #202124;
    }

    .selected-dot {
      width: 8px;
      height: 8px;
      background-color: #1a73e8;
      border-radius: 50%;
      flex-shrink: 0;
    }

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
