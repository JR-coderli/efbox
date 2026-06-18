<template>
  <div class="landers-container" :class="{ 'is-fullscreen': isFullscreen }" ref="landersContainerRef">
    <!-- 全屏提示 -->
    <transition name="fullscreen-hint">
      <div v-if="showFullscreenHint" class="fullscreen-hint">
        <el-icon><FullScreen /></el-icon>
        <span>按 ESC 键退出全屏</span>
      </div>
    </transition>

    <!-- 搜索栏（默认显示） -->
    <div class="search-bar">
      <div class="search-row">
        <div class="search-inputs">
          <div class="search-item">
            <label>Lander名称</label>
            <el-input
              v-model="searchForm.name"
              placeholder="搜索 Lander 名称"
              clearable
              class="search-input"
              @keyup.enter="handleSearch"
              @clear="handleNameClear"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="search-item">
            <label>URL</label>
            <el-input
              v-model="searchForm.url"
              placeholder="搜索 URL"
              clearable
              class="search-input"
              @keyup.enter="handleSearch"
              @clear="handleUrlClear"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="search-actions">
            <el-button @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
        </div>
        <div class="toolbar-actions">
          <el-button v-if="hasControlPermission" class="icon-btn sync-info-btn" :icon="InfoFilled" @click="syncInfoVisible = !syncInfoVisible" :title="syncInfoVisible ? '隐藏同步信息' : '同步信息'" circle />
          <el-button v-if="hasBatchReplacePermission" class="icon-btn" :icon="Edit" @click="openBatchReplaceDialog" title="批量修改URL" circle />
          <el-button v-if="hasCreatePermission" class="icon-btn" :icon="Plus" @click="openCreatePrivateDialog" title="创建 Private Lander" circle />
          <el-button v-if="hasCreatePublicPermission" class="icon-btn" :icon="CirclePlusFilled" @click="openCreatePublicDialog" title="创建 Public Lander" circle />
          <el-button class="icon-btn" :icon="isFullscreen ? Crop : FullScreen" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏显示'" circle />
          <!-- 列设置下拉菜单 -->
          <el-dropdown trigger="click" :hide-on-click="false">
            <el-button class="icon-btn" :icon="Setting" circle title="列设置" />
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
        </div>
      </div>
    </div>

    <!-- 同步状态栏（谷歌风格，可折叠） -->
    <transition name="slide-fade">
      <div class="status-bar" v-show="syncInfoVisible">
      <div class="status-item">
        <span class="status-label">总数</span>
        <span class="status-value">{{ syncStatus.total || 0 }}</span>
      </div>
      <div class="status-divider"></div>
      <div class="status-item success">
        <span class="status-label">已截图</span>
        <span class="status-value">{{ screenshotStats.success || 0 }}</span>
      </div>
      <div class="status-divider"></div>
      <div class="status-item pending">
        <span class="status-label">待截图</span>
        <span class="status-value">{{ screenshotStats.pending || 0 }}</span>
      </div>
      <div class="status-divider"></div>
      <div class="status-item failed">
        <span class="status-label">失败</span>
        <span class="status-value">{{ screenshotStats.failed || 0 }}</span>
      </div>
      <div class="status-divider"></div>
      <div class="status-item">
        <span class="status-label">最后同步</span>
        <span class="status-value small">{{ formatLastSync(syncStatus.last_sync_at) }}</span>
      </div>
      <div class="status-divider"></div>
      <div class="status-item">
        <span class="status-label">自动同步</span>
        <el-switch
          v-model="autoSyncEnabled"
          @change="handleAutoSyncChange"
          :loading="autoSyncLoading"
          size="small"
          inline-prompt
          active-text="开"
          inactive-text="关"
        />
      </div>
      <div class="status-divider"></div>
      <div class="status-item">
        <span class="status-label">同步间隔</span>
        <el-select
          v-model="autoSyncInterval"
          @change="handleIntervalChange"
          :disabled="!autoSyncEnabled"
          size="small"
          style="width: 90px"
        >
          <el-option :value="10" label="10分钟" />
          <el-option :value="30" label="30分钟" />
          <el-option :value="60" label="1小时" />
          <el-option :value="120" label="2小时" />
          <el-option :value="180" label="3小时" />
          <el-option :value="360" label="6小时" />
        </el-select>
      </div>
      <div class="status-spacer"></div>
      <!-- 操作菜单下拉 -->
      <el-dropdown trigger="click" @command="handleCommand">
        <el-button class="icon-btn" :icon="Menu" circle />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="config">
              <el-icon><Setting /></el-icon>截图配置
            </el-dropdown-item>
            <el-dropdown-item command="sync" :disabled="syncLoading">
              <el-icon><Refresh /></el-icon>{{ syncLoading ? '同步中...' : '手动同步' }}
            </el-dropdown-item>
            <el-dropdown-item command="screenshot" :disabled="screenshotLoading">
              <el-icon><Camera /></el-icon>{{ screenshotLoading ? '处理中...' : '触发截图' }}
            </el-dropdown-item>
            <el-dropdown-item command="syncWorkspace" :disabled="syncWorkspaceLoading">
              <el-icon><Refresh /></el-icon>{{ syncWorkspaceLoading ? '同步中...' : '同步工作区' }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    </transition>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        class="google-table"
        stripe
        border
        style="width: 100%"
        @expand-change="handleLanderExpandChange"
      >
        <!-- 展开列 -->
        <el-table-column type="expand" width="50" align="center" class-name="expand-column">
          <template #default="{ row }">
            <div class="expand-content">
              <!-- 维度选择器 -->
              <div class="dimension-bar">
                <div class="dimension-selected-list">
                  <div
                    v-for="(dimValue, index) in getLanderExpandedDimensions(row.lander_key)"
                    :key="dimValue"
                    class="dimension-selected-item"
                    :data-index="index"
                    :draggable="hasReportPermission"
                    @dragstart="hasReportPermission && handleLanderDimensionDragStart(row.lander_key, $event)"
                    @dragover.prevent="hasReportPermission && handleLanderDimensionDragOver(row.lander_key, $event)"
                    @drop="hasReportPermission && handleLanderDimensionDrop(row.lander_key, $event)"
                    @dragend="hasReportPermission && handleLanderDimensionDragEnd(row.lander_key, $event)"
                  >
                    <svg v-if="hasReportPermission" class="g-drag-handle" viewBox="0 0 24 24">
                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                    <span class="dimension-order-badge">{{ index + 1 }}</span>
                    <span class="dimension-name">{{ getLanderDimensionLabel(dimValue) }}</span>
                    <button
                      v-if="hasReportPermission && getLanderExpandedDimensions(row.lander_key).length > 1"
                      class="g-dimension-remove"
                      @click="removeLanderDimension(row.lander_key, dimValue)"
                      title="移除"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>

                  <!-- 添加维度按钮 - 有权限才显示 -->
                  <div class="dimension-add-wrapper" v-if="hasReportPermission && getLanderAvailableDimensions(row.lander_key).length > 0">
                    <button
                      class="dimension-add-btn"
                      @click="toggleLanderDimensionPicker(row.lander_key)"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      添加维度
                    </button>

                    <!-- 维度选择面板 -->
                    <div v-if="landerDimensionPickerVisible[row.lander_key]" class="dimension-picker-panel">
                      <div class="dimension-picker-header">
                        <span>选择要添加的维度</span>
                      </div>
                      <div class="dimension-picker-list">
                        <div
                          v-for="dim in getLanderAvailableDimensions(row.lander_key)"
                          :key="dim.value"
                          class="dimension-picker-item"
                          @click="addLanderDimension(row.lander_key, dim.value)"
                        >
                          <span class="dimension-picker-icon">
                            <svg viewBox="0 0 24 24">
                              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                          </span>
                          <span class="dimension-picker-label">{{ dim.label }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="dimension-hint" v-if="getLanderExpandedDimensions(row.lander_key).length > 0">
                  <span>点击维度展开 → {{ getLanderDimensionPreview(row.lander_key) }}</span>
                </div>
              </div>

              <!-- 展开数据表格 -->
              <div v-if="getLanderExpandedData(row.lander_key).length > 0" class="g-table-wrapper g-table-wrapper-fixed">
                <table class="g-table">
                  <thead>
                    <tr>
                      <th class="g-sortable-th" @click="toggleLanderSort(row.lander_key, 'group_name')">
                        <span class="g-th-content">维度
                          <span class="g-sort-indicator">
                            <svg v-if="landerSortState[row.lander_key]?.field === 'group_name' && landerSortState[row.lander_key]?.order === 'asc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                            <svg v-else-if="landerSortState[row.lander_key]?.field === 'group_name' && landerSortState[row.lander_key]?.order === 'desc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                            <svg v-else viewBox="0 0 24 24" class="g-sort-icon"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                          </span>
                        </span>
                      </th>
                      <th class="g-sortable-th" @click="toggleLanderSort(row.lander_key, 'total_clicks')">
                        <span class="g-th-content">Clicks
                          <span class="g-sort-indicator">
                            <svg v-if="landerSortState[row.lander_key]?.field === 'total_clicks' && landerSortState[row.lander_key]?.order === 'asc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                            <svg v-else-if="landerSortState[row.lander_key]?.field === 'total_clicks' && landerSortState[row.lander_key]?.order === 'desc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                            <svg v-else viewBox="0 0 24 24" class="g-sort-icon"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                          </span>
                        </span>
                      </th>
                      <th class="g-sortable-th" @click="toggleLanderSort(row.lander_key, 'total_conversions')">
                        <span class="g-th-content">Conversions
                          <span class="g-sort-indicator">
                            <svg v-if="landerSortState[row.lander_key]?.field === 'total_conversions' && landerSortState[row.lander_key]?.order === 'asc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                            <svg v-else-if="landerSortState[row.lander_key]?.field === 'total_conversions' && landerSortState[row.lander_key]?.order === 'desc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                            <svg v-else viewBox="0 0 24 24" class="g-sort-icon"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                          </span>
                        </span>
                      </th>
                      <th class="g-sortable-th" @click="toggleLanderSort(row.lander_key, 'total_revenue')">
                        <span class="g-th-content">Revenue
                          <span class="g-sort-indicator">
                            <svg v-if="landerSortState[row.lander_key]?.field === 'total_revenue' && landerSortState[row.lander_key]?.order === 'asc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                            <svg v-else-if="landerSortState[row.lander_key]?.field === 'total_revenue' && landerSortState[row.lander_key]?.order === 'desc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                            <svg v-else viewBox="0 0 24 24" class="g-sort-icon"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                          </span>
                        </span>
                      </th>
                      <th class="g-sortable-th" @click="toggleLanderSort(row.lander_key, 'total_cost')">
                        <span class="g-th-content">Cost
                          <span class="g-sort-indicator">
                            <svg v-if="landerSortState[row.lander_key]?.field === 'total_cost' && landerSortState[row.lander_key]?.order === 'asc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                            <svg v-else-if="landerSortState[row.lander_key]?.field === 'total_cost' && landerSortState[row.lander_key]?.order === 'desc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                            <svg v-else viewBox="0 0 24 24" class="g-sort-icon"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                          </span>
                        </span>
                      </th>
                      <th class="g-sortable-th" @click="toggleLanderSort(row.lander_key, 'avg_cpa')">
                        <span class="g-th-content">CPA
                          <span class="g-sort-indicator">
                            <svg v-if="landerSortState[row.lander_key]?.field === 'avg_cpa' && landerSortState[row.lander_key]?.order === 'asc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                            <svg v-else-if="landerSortState[row.lander_key]?.field === 'avg_cpa' && landerSortState[row.lander_key]?.order === 'desc'" viewBox="0 0 24 24" class="g-sort-icon active"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                            <svg v-else viewBox="0 0 24 24" class="g-sort-icon"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                          </span>
                        </span>
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="(item, idx) in getLanderExpandedData(row.lander_key)" :key="item.path">
                      <!-- 主行 -->
                      <tr class="g-daily-row g-nested-row" :style="{ paddingLeft: item.level * 16 + 'px' }">
                        <td @click="toggleLanderExpand(row.lander_key, item)" class="g-clickable-cell g-nested-cell" :style="{ paddingLeft: (item.level * 16 + 8) + 'px' }">
                          <span v-if="hasItemChildren(row.lander_key, item)" class="g-expand-icon-inline">
                            <svg v-if="isLanderItemExpanded(row.lander_key, item)" class="g-expand-icon" viewBox="0 0 24 24">
                              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                            <svg v-else class="g-expand-icon" viewBox="0 0 24 24">
                              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                            </svg>
                          </span>
                          <span v-else class="g-expand-placeholder"></span>
                          <span class="g-group-name">{{ item.group_name || '-' }}</span>
                        </td>
                        <td @click="toggleLanderExpand(row.lander_key, item)" class="g-clickable-cell">
                          <span v-if="hasReportPermission">{{ formatNumber(item.total_clicks) }}</span>
                          <span v-else class="placeholder-data">***</span>
                        </td>
                        <td @click="toggleLanderExpand(row.lander_key, item)" class="g-clickable-cell">
                          <span v-if="hasReportPermission">{{ formatNumber(item.total_conversions) }}</span>
                          <span v-else class="placeholder-data">***</span>
                        </td>
                        <td @click="toggleLanderExpand(row.lander_key, item)" class="g-clickable-cell">
                          <span v-if="hasReportPermission">${{ formatNumber(item.total_revenue) }}</span>
                          <span v-else class="placeholder-data">***</span>
                        </td>
                        <td @click="toggleLanderExpand(row.lander_key, item)" class="g-clickable-cell">
                          <span v-if="hasReportPermission">${{ formatNumber(item.total_cost) }}</span>
                          <span v-else class="placeholder-data">***</span>
                        </td>
                        <td @click="toggleLanderExpand(row.lander_key, item)" class="g-clickable-cell">
                          <span v-if="hasReportPermission">${{ formatNumber(item.avg_cpa) }}</span>
                          <span v-else class="placeholder-data">***</span>
                        </td>
                        <td></td>
                      </tr>
                      <!-- 加载行动画 -->
                      <tr v-if="landerRowLoading[`${row.lander_key}:${item.path}`]" class="g-loading-row">
                        <td colspan="7" :style="{ paddingLeft: ((item.level + 1) * 16 + 8) + 'px' }">
                          <span class="g-loading-content">
                            <el-icon class="is-loading" :size="14"><Loading /></el-icon>
                            <span>加载中...</span>
                          </span>
                        </td>
                      </tr>
                    </template>
                    <tr v-if="getLanderExpandedData(row.lander_key).length === 0">
                      <td colspan="7" class="g-empty">暂无数据</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="no-expanded-data">
                <span v-if="!landerDataLoading[row.lander_key]">
                  {{ landerHasNoData[row.lander_key] ? '暂无数据' : '请选择维度查看详细数据' }}
                </span>
                <span v-else class="loading-text">
                  <el-icon class="is-loading" :size="16" />
                  加载中...
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <template v-for="item in displayColumns" :key="item.key">

          <!-- Lander 名称 -->
          <template v-if="item.key === 'name'">
            <el-table-column :label="item.label" min-width="200" align="center">
              <template #default="{ row }">
                <div class="lander-name-wrapper">
                  <span class="lander-name" :title="row.name">{{ row.name }}</span>
                  <!-- <a
                    v-if="row.url"
                    target="_blank"
                    class="external-link-btn"
                    title="打开落地页（带参数）"
                    @click="handleOpenUrl(row.url)"
                  >
                    <svg viewBox="0 0 24 24" class="external-icon">
                      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                    </svg>
                  </a> -->
                </div>
              </template>
            </el-table-column>
          </template>

          <!-- URL 地址 -->
          <template v-else-if="item.key === 'url'">
            <el-table-column :label="item.label" min-width="250" align="center">
              <template #default="{ row }">
                <span v-if="row.url" class="url-link">
                  <span>{{ row.url }}</span>
                  <a
                    v-if="row.url"
                    target="_blank"
                    class="external-link-btn"
                    title="打开落地页"
                    @click="handleOpenUrl(row.url)"
                  >
                    <svg viewBox="0 0 24 24" class="external-icon">
                      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                    </svg>
                  </a>
                </span>
                
                <span v-else class="no-url">-</span>
              </template>
            </el-table-column>
          </template>

          <!-- lander_id -->
          <template v-else-if="item.key === 'lander_key'">
            <el-table-column :label="item.label" min-width="200" show-overflow-tooltip align="center">
              <template #default="{ row }">
                <span class="lander-key-text">{{ row.lander_key }}</span>
              </template>
            </el-table-column>
          </template>

          <!-- workspace_id -->
          <template v-else-if="item.key === 'workspace_id'">
            <el-table-column :label="item.label" width="140" align="center">
              <template #default="{ row }">
                <el-popconfirm
                  v-if="hasApprovePermission"
                  :title="`修改为 ${row.workspace_id ? 'Public' : 'Private'}?`"
                  confirm-button-text="确认"
                  cancel-button-text="取消"
                  @confirm="handleApprove(row)"
                >
                  <template #reference>
                    <el-button
                      link
                      :type="row.workspace_id ? 'warning' : 'success'"
                      size="small"
                      class="workspace-convert-btn"
                    >
                      {{ row.workspace_name || (row.workspace_id ? 'Private' : 'Public') }}
                    </el-button>
                  </template>
                </el-popconfirm>
                <template v-else>
                  <span v-if="row.workspace_name" class="workspace-name-value">{{ row.workspace_name }}</span>
                  <span v-else-if="row.workspace_id" class="workspace-id-value">{{ row.workspace_id }}</span>
                  <span v-else class="workspace-id-public">public</span>
                </template>
              </template>
            </el-table-column>
          </template>

          <!-- 截图状态 -->
          <template v-else-if="item.key === 'screenshot_status'">
            <el-table-column :label="item.label" width="120" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.screenshot_status === 'success'" type="success" size="small">已完成</el-tag>
                <el-tag v-else-if="row.screenshot_status === 'processing'" type="warning" size="small">截图中</el-tag>
                <el-tag v-else-if="row.screenshot_status === 'failed'" type="danger" size="small">失败</el-tag>
                <el-tag v-else type="info" size="small">待截图</el-tag>
              </template>
            </el-table-column>
          </template>

          <!-- 预览图 -->
          <template v-else-if="item.key === 'preview'">
            <el-table-column :label="item.label" min-width="200" width="200" align="center">
              <template #default="{ row }">
                <div class="preview-image-wrapper">
                  <!-- 上传按钮 -->
                  <button
                    class="upload-btn"
                    @click="handleUploadClick(row)"
                    title="上传截图"
                  >
                    <el-icon><Upload /></el-icon>
                  </button>
                  <input
                    :ref="el => uploadInputRefs[row.lander_key] = el"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    style="display: none"
                    @change="handleFileChange($event, row)"
                  />

                  <el-image
                    v-if="row.screenshot_url"
                    :src="getFullImageUrl(row.screenshot_url)"
                    :preview-src-list="[getFullImageUrl(row.screenshot_url)]"
                    fit="contain"
                    class="preview-image"
                    :preview-teleported="true"
                    hide-on-click-modal
                  >
                    <template #error>
                      <div class="no-preview-image-error">
                        <el-icon><Picture /></el-icon>
                        <span>图片加载失败</span>
                      </div>
                    </template>
                  </el-image>
                  <div v-else class="no-preview">
                    <el-icon><Picture /></el-icon>
                    <span>暂无截图</span>
                  </div>
                </div>
              </template>
            </el-table-column>
          </template>

          <!-- 同步时间 -->
          <template v-else-if="item.key === 'synced_at'">
            <el-table-column prop="synced_at" :label="item.label" width="180" align="center" />
          </template>

          <!-- 数据汇总 -->
          <template v-else-if="item.key === 'stats_summary'">
            <el-table-column :label="item.label" :min-width="isMobile ? 120 : 120" align="center">
              <template #default="{ row }">
                <!-- 有免加载权限、Antivirus 或已获取：直接显示数据 -->
                <div v-if="hasNoLoadDataPermission || isAntivirus(row) || row.dataLoaded" class="stats-summary-wrapper">
                  <div class="stats-item">
                    <span class="stats-label">Clicks:</span>
                    <span class="stats-value">{{ formatNumber(row.total_clicks) }}</span>
                  </div>
                  <div class="stats-item">
                    <span class="stats-label">Conv:</span>
                    <span class="stats-value">{{ formatNumber(row.total_conversions) }}</span>
                  </div>
                  <div class="stats-item">
                    <span class="stats-label">Cost:</span>
                    <span class="stats-value">${{ formatNumber(row.total_cost) }}</span>
                  </div>
                  <div class="stats-item">
                    <span class="stats-label">Revenue:</span>
                    <span class="stats-value">${{ formatNumber(row.total_revenue) }}</span>
                  </div>
                  <div class="stats-item">
                    <span class="stats-label">ROI:</span>
                    <span :class="['stats-value', row.total_roi >= 0 ? 'stats-success' : 'stats-danger']">
                      {{ formatNumber(row.total_roi) }}%
                    </span>
                  </div>
                </div>

                <!-- 其他主题：显示加载图标 -->
                <div v-else class="data-lock-wrapper">
                  <el-button
                    @click="fetchData(row)"
                    :loading="row.fetching"
                    class="icon-btn"
                    circle
                    title="获取数据"
                  >
                    <el-icon v-if="!row.fetching" class="rotate-icon">
                      <Refresh />
                    </el-icon>
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </template>

          <!-- CF 创建时间 -->
          <template v-else-if="item.key === 'cf_created_at'">
            <el-table-column prop="cf_created_at" :label="item.label" width="180" align="center" />
          </template>

          <!-- 操作 -->
          <template v-else-if="item.key === 'actions'">
            <el-table-column :label="item.label" width="150" align="center" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="hasEditPermission"
                  link
                  type="primary"
                  icon="Edit"
                  size="large"
                  @click="openEditDialog(row)"
                  title="编辑"
                  class="edit-btn"
                >
                </el-button>
                <el-button
                  v-if="hasDeletePermission"
                  link
                  type="danger"
                  icon="Delete"
                  size="large"
                  @click="openDeleteDialog(row)"
                  class="delete-btn"
                  title="删除"
                >
                </el-button>
              </template>
            </el-table-column>
          </template>

        </template>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="google-pagination"
        />
      </div>
    </div>

    <!-- 截图配置对话框 -->
    <el-dialog
      v-model="configDialogVisible"
      title="截图配置"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="configForm" label-width="120px">
        <el-form-item label="URL 查询字符串">
          <el-input
            v-model="configForm.query"
            placeholder="?w=1"
            clearable
          >
            <template #append>
              <el-button @click="resetQuery">重置</el-button>
            </template>
          </el-input>
          <div class="form-tip">
            截图时会在 Lander URL 后面拼接此查询字符串，例如：?w=1
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveConfig" :loading="saveConfigLoading">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 创建 Private Lander 对话框（谷歌风格） -->
    <el-dialog
      v-model="createPrivateDialogVisible"
      title="创建 Private Lander"
      width="650px"
      :close-on-click-modal="false"
      class="google-dialog"
      destroy-on-close
    >
      <el-form :model="createPrivateForm" :rules="createPrivateRules" ref="createPrivateFormRef" label-width="80px" class="google-form">
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="createPrivateForm.name"
            placeholder="请输入 Lander 名称"
            clearable
            size="large"
          />
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input
            v-model="createPrivateForm.url"
            placeholder="请输入 Lander URL"
            clearable
            size="large"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="google-dialog-footer">
          <el-button @click="createPrivateDialogVisible = false" size="large" class="google-btn google-btn-secondary">
            取消
          </el-button>
          <el-button type="primary" @click="handleCreatePrivateLander" :loading="createPrivateLoading" size="large" class="google-btn google-btn-primary">
            创建
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 创建 Public Lander 对话框（谷歌风格） -->
    <el-dialog
      v-model="createPublicDialogVisible"
      title="创建 Public Lander"
      width="650px"
      :close-on-click-modal="false"
      class="google-dialog"
      destroy-on-close
    >
      <el-form :model="createPublicForm" :rules="createPublicRules" ref="createPublicFormRef" label-width="80px" class="google-form">
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="createPublicForm.name"
            placeholder="请输入 Lander 名称"
            clearable
            size="large"
          />
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input
            v-model="createPublicForm.url"
            placeholder="请输入 Lander URL"
            clearable
            size="large"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="google-dialog-footer">
          <el-button @click="createPublicDialogVisible = false" size="large" class="google-btn google-btn-secondary">
            取消
          </el-button>
          <el-button type="primary" @click="handleCreatePublicLander" :loading="createPublicLoading" size="large" class="google-btn google-btn-primary">
            创建
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑 Lander 对话框（谷歌风格） -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑 Lander"
      width="650px"
      :close-on-click-modal="false"
      class="google-dialog"
      destroy-on-close
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px" class="google-form">
        <el-form-item label="Lander 类型">
          <el-tag v-if="editForm.workspace_id" type="warning">Private Lander</el-tag>
          <el-tag v-else type="success">Public Lander</el-tag>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="editForm.name"
            placeholder="请输入 Lander 名称"
            clearable
            size="large"
          />
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input
            v-model="editForm.url"
            placeholder="请输入 Lander URL"
            clearable
            size="large"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="google-dialog-footer">
          <el-button @click="editDialogVisible = false" size="large" class="google-btn google-btn-secondary">
            取消
          </el-button>
          <el-button type="primary" @click="handleUpdateLander" :loading="editLoading" size="large" class="google-btn google-btn-primary">
            更新
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 删除确认对话框（谷歌风格） -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="删除确认"
      width="450px"
      :close-on-click-modal="false"
      class="google-dialog google-dialog-warning"
      destroy-on-close
    >
      <div class="delete-confirm-content">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <div class="confirm-message">
          确定要删除该 Lander "{{ deleteTargetLander?.name }}" 吗？
        </div>
        <div class="confirm-hint">
          删除后无法恢复，请谨慎操作。
        </div>
      </div>
      <template #footer>
        <div class="google-dialog-footer">
          <el-button @click="cancelDelete" size="large" class="google-btn google-btn-secondary" :disabled="deleteLoading">
            取消
          </el-button>
          <el-button type="danger" @click="confirmDelete" :loading="deleteLoading" size="large" class="google-btn google-btn-danger">
            删除
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量修改URL对话框（谷歌风格） -->
    <el-dialog
      v-model="batchReplaceDialogVisible"
      title="批量修改 Lander URL"
      width="1000px"
      :close-on-click-modal="false"
      class="google-dialog"
      destroy-on-close
    >
      <el-form :model="batchReplaceForm" :rules="batchReplaceRules" ref="batchReplaceFormRef" label-width="140px" class="google-form">
        <el-form-item label="要替换的域名" prop="domain">
          <el-input
            v-model="batchReplaceForm.domain"
            placeholder="如: bad-domain.com"
            clearable
            size="large"
          />
        </el-form-item>
        <el-form-item label="替换为域名" prop="replacementDomain">
          <el-input
            v-model="batchReplaceForm.replacementDomain"
            placeholder="如: new-domain.com"
            clearable
            size="large"
          />
        </el-form-item>
        <el-form-item label="Lander 类型" prop="landerType">
          <el-radio-group v-model="batchReplaceForm.landerType" size="large">
            <el-radio value="all">all</el-radio>
            <el-radio value="public">public</el-radio>
            <el-radio value="private">private</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-alert
          v-if="batchPreviewCount > 0"
          :title="`当前有 ${batchPreviewCount} 条 ${batchReplaceForm.landerType === 'public' ? 'Public' : batchReplaceForm.landerType === 'private' ? 'Private' : ''} Lander 的 URL 包含该域名`"
          type="info"
          :closable="false"
          class="preview-alert"
        />
        <el-alert
          v-if="batchPreviewCount === 0 && batchPreviewSearched"
          title="未找到包含该域名的 Lander"
          type="warning"
          :closable="false"
          class="preview-alert"
        />
        <el-alert
          v-if="batchPreviewCount === -1"
          title="请重新预览影响范围"
          type="info"
          :closable="false"
          class="preview-alert"
        />
      </el-form>

      <!-- 预览表格 -->
      <div v-if="batchPreviewList.length > 0" class="batch-preview-table-wrapper">
        <el-table
          :data="batchPreviewList"
          max-height="200"
          border
          size="small"
          class="batch-preview-table"
        >
          <el-table-column label="Lander 名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="preview-lander-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="原始 URL" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="preview-url-old">{{ row.oldUrl }}</span>
            </template>
          </el-table-column>
          <el-table-column label="替换后 URL" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="preview-url-new">{{ row.newUrl }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <div class="google-dialog-footer">
          <el-button @click="batchReplaceDialogVisible = false" size="large" class="google-btn google-btn-secondary" :disabled="batchReplaceLoading">
            取消
          </el-button>
          <el-button @click="handlePreviewBatchReplace" size="large" class="google-btn" :disabled="batchReplaceLoading" :loading="batchPreviewLoading">
            预览影响范围
          </el-button>
          <el-tooltip :content="getBatchReplaceTooltip()" placement="top" :disabled="canStartReplace()">
            <el-button type="primary" @click="handleBatchReplace" :loading="batchReplaceLoading" size="large" class="google-btn google-btn-primary" :disabled="!canStartReplace()">
              开始替换
            </el-button>
          </el-tooltip>
        </div>
      </template>
    </el-dialog>

    <!-- 批量替换进度对话框 -->
    <el-dialog
      v-model="progressDialogVisible"
      :title="getProgressDialogTitle()"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="['success', 'partial', 'failed'].includes(progressData.status)"
      @close="closeProgressDialog"
      class="google-dialog progress-dialog"
    >
      <div class="progress-content">
        <!-- 域名信息 -->
        <div class="progress-info">
          <div class="info-item">
            <span class="label">危险域名：</span>
            <span class="value danger">{{ progressData.dangerousDomain }}</span>
          </div>
          <div class="info-item">
            <span class="label">替换域名：</span>
            <span class="value success">{{ progressData.replacementDomain }}</span>
          </div>
          <div class="info-item">
            <span class="label">影响数量：</span>
            <span class="value">{{ progressData.affectedCount }} 条</span>
          </div>
        </div>

        <!-- 进度条 -->
        <div v-if="['queued', 'processing', 'retrying', 'syncing', 'checking'].includes(progressData.status)" class="progress-bar-wrapper">
          <el-progress
            :percentage="progressData.percent"
            :status="getProgressStatus()"
            :stroke-width="20"
          />
          <div class="progress-text">
            {{ progressData.message }}
          </div>
        </div>

        <!-- 完成状态 -->
        <div v-else class="progress-result">
          <div class="result-icon" :class="progressData.status">
            <el-icon v-if="progressData.status === 'success'"><CircleCheck /></el-icon>
            <el-icon v-else-if="progressData.status === 'partial'"><Warning /></el-icon>
            <el-icon v-else><CircleClose /></el-icon>
          </div>
          <div class="result-message">{{ progressData.message }}</div>

          <!-- 统计信息 -->
          <div class="result-stats">
            <div class="stat-item success">
              <span class="stat-value">{{ progressData.successCount }}</span>
              <span class="stat-label">成功</span>
            </div>
            <div class="stat-item failed">
              <span class="stat-value">{{ progressData.failedCount }}</span>
              <span class="stat-label">失败</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer v-if="['success', 'partial', 'failed'].includes(progressData.status)">
        <el-button @click="closeProgressDialog" size="large" class="google-btn">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, onBeforeUnmount, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh, Camera, Search, Picture, WarningFilled, Warning, Setting, Menu, Upload, FullScreen, Crop, Plus, InfoFilled, CirclePlusFilled, Edit, CircleCheck, CircleClose, Download, Loading
} from '@element-plus/icons-vue'
import {
  getLanderList,
  syncLander,
  getSyncStatus,
  getScreenshotStats,
  triggerScreenshot,
  deleteLander,
  getScreenshotConfig,
  updateScreenshotConfig,
  uploadLanderScreenshot,
  createLander,
  updateLander,
  batchReplaceLanderUrl,
  previewBatchReplace,
  getBatchReplaceProgress
} from '@/services/main/webpage/landers'
import { syncWorkspaces } from '@/services/main/webpage/workspaces'
import { getLanderConfig, setLanderConfig } from '@/services/main/webpage/system-config'
import { getDailyReportDetailByDate } from '@/services/main/webpage/report/report'
import { BASE_URL } from '@/services/request/config'
import useLoginStore from '@/stores/login/login'
import { createOperationLog } from '@/services/main/system/operation-log'
import SparkMD5 from 'spark-md5'



const loginStore = useLoginStore()
const userPermissions = computed(() => loginStore.permissions || [])


const hasControlPermission = computed(() => userPermissions.value.includes('system:webpage:config'))


const hasCreatePermission = computed(() => userPermissions.value.includes('system:webpage:create-private'))


const hasCreatePublicPermission = computed(() => userPermissions.value.includes('system:webpage:create-public'))


const hasDeletePermission = computed(() => userPermissions.value.includes('system:webpage:delete'))


const hasEditPermission = computed(() => userPermissions.value.includes('system:webpage:update'))


const hasApprovePermission = computed(() => userPermissions.value.includes('system:webpage:approve'))


const hasBatchReplacePermission = computed(() => userPermissions.value.includes('system:webpage:batch'))


const hasReportPermission = computed(() => userPermissions.value.includes('system:webpage:report'))


const hasNoLoadDataPermission = computed(() => userPermissions.value.includes('system:webpage:noloaddata'))


const STORAGE_KEY = 'landers_column_settings'


const allColumnsList = [
  { key: 'preview', label: '预览图', required: false },
  { key: 'name', label: 'Lander 名称', required: true },
  { key: 'url', label: 'URL 地址', required: false },
  { key: 'lander_key', label: 'lander_id', required: false, defaultHidden: true },
  { key: 'workspace_id', label: 'workspace', required: false },
  { key: 'screenshot_status', label: '截图状态', required: false, defaultHidden: true },
  { key: 'synced_at', label: '同步时间', required: false, defaultHidden: true },
  { key: 'cf_created_at', label: 'CF 创建时间', required: false },
  { key: 'stats_summary', label: '数据', required: false },
  { key: 'actions', label: '操作', required: false, defaultHidden: true }
]


const columnSettings = ref([])
const draggingIndex = ref(null)


const allColumns = computed(() => allColumnsList)


const displayColumns = computed(() => {
  const originalList = allColumnsList
  const saved = columnSettings.value


  if (!saved.length) return originalList


  const remaining = [...originalList]

  for (const item of saved) {
    const index = remaining.findIndex(col => col.key === item.key)
    if (index !== -1) {
      remaining.splice(index, 1)
    }
  }


  const ordered = []
  for (const item of saved) {
    if (item.visible === false) continue

    const col = originalList.find(c => c.key === item.key)
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

  const currentAllColumns = allColumns.value
  columnSettings.value = currentAllColumns.map(col => ({
    key: col.key,
    visible: !col.defaultHidden
  }))
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




const autoSyncEnabled = ref(false)
const autoSyncInterval = ref(30)
const autoSyncLoading = ref(false)


async function fetchAutoSyncConfig() {
  try {
    const res = await getLanderConfig()
    if (res.code === 0) {
      autoSyncEnabled.value = res.data['lander.auto_sync.enabled'] ?? false
      autoSyncInterval.value = res.data['lander.auto_sync.interval'] ?? 30
    }
  } catch (error) {
    console.error('获取自动同步配置失败:', error)
  }
}


async function handleAutoSyncChange(value) {
  autoSyncLoading.value = true
  try {
    const res = await setLanderConfig({
      auto_sync_enabled: value
    })
    if (res.code === 0) {
      ElMessage.success(res.message || '设置成功')
    }
  } catch (error) {

    autoSyncEnabled.value = !value
    ElMessage.error('设置失败，请重试')
  } finally {
    autoSyncLoading.value = false
  }
}


async function handleIntervalChange(value) {
  try {
    const res = await setLanderConfig({
      auto_sync_interval: value
    })
    if (res.code === 0) {
      ElMessage.success(res.message || '设置成功')
    }
  } catch (error) {

    autoSyncInterval.value = await getLanderConfig().then(res => res.data['lander.auto_sync.interval'] ?? 30)
    ElMessage.error('设置失败，请重试')
  }
}


const syncInfoVisible = ref(false)


const isFullscreen = ref(false)
const showFullscreenHint = ref(false)
const landersContainerRef = ref(null)
const tableRef = ref(null)
let hintTimer = null


const isMobile = computed(() => {
  return window.innerWidth < 768
})


const handleEscKey = (event) => {
  if (event.key === 'Escape' && isFullscreen.value) {
    exitFullscreen()
  }
}


const exitFullscreen = () => {
  isFullscreen.value = false
  document.body.classList.remove('landers-fullscreen-mode')
  document.body.style.overflow = ''
  showFullscreenHint.value = false
}


const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    document.body.classList.add('landers-fullscreen-mode')
    document.body.style.overflow = 'hidden'

    showFullscreenHint.value = true

    if (hintTimer) clearTimeout(hintTimer)
    hintTimer = setTimeout(() => {
      showFullscreenHint.value = false
    }, 3000)
  } else {
    exitFullscreen()
  }
}


const configDialogVisible = ref(false)
const configForm = reactive({
  query: '?w=1'
})
const saveConfigLoading = ref(false)


const createPrivateDialogVisible = ref(false)
const createPrivateLoading = ref(false)
const createPrivateFormRef = ref(null)
const createPrivateForm = reactive({
  name: '',
  url: ''
})


const createPublicDialogVisible = ref(false)
const createPublicLoading = ref(false)
const createPublicFormRef = ref(null)
const createPublicForm = reactive({
  name: '',
  url: ''
})


const editDialogVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  lander_key: '',
  name: '',
  url: '',
  workspace_id: null
})

const editOriginalValues = ref({
  name: '',
  url: ''
})


const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTargetLander = ref(null)


const urlValidator = (rule, value, callback) => {
  if (!value) {
    return callback(new Error('请输入 URL'))
  }
  try {
    new URL(value)
    callback()
  } catch {
    callback(new Error('请输入有效的 URL'))
  }
}

const editRules = {
  name: [
    { required: true, message: '请输入 Lander 名称', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入 URL', trigger: 'blur' },
    { validator: urlValidator, trigger: 'blur' }
  ]
}

const createPrivateRules = {
  name: [
    { required: true, message: '请输入 Lander 名称', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入 URL', trigger: 'blur' },
    { validator: urlValidator, trigger: 'blur' }
  ]
}

const createPublicRules = {
  name: [
    { required: true, message: '请输入 Lander 名称', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入 URL', trigger: 'blur' },
    { validator: urlValidator, trigger: 'blur' }
  ]
}


const batchReplaceDialogVisible = ref(false)
const batchReplaceLoading = ref(false)
const batchPreviewLoading = ref(false)
const batchPreviewCount = ref(0)
const batchPreviewSearched = ref(false)
const batchReplaceFormRef = ref(null)
const batchPreviewList = ref([])
// 标记当前预览窗口会话是否已同步过 Clickflare 数据
// 仅在打开窗口后首次点击「预览影响范围」时触发同步，避免每次重新搜索都重复同步
const batchPreviewSynced = ref(false)

const batchReplaceForm = reactive({
  domain: '',
  replacementDomain: '',
  landerType: 'private' // all, public, private
})

const batchReplaceRules = {
  domain: [{ required: true, message: '请输入要替换的域名', trigger: 'blur' }],
  replacementDomain: [{ required: true, message: '请输入替换后的域名', trigger: 'blur' }]
}


const progressDialogVisible = ref(false)
const progressData = reactive({
  recordId: null,
  dangerousDomain: '',
  replacementDomain: '',
  affectedCount: 0,
  current: 0,
  total: 0,
  percent: 0,
  status: 'processing', // processing, retrying, success, partial, failed
  step: 'processing', // processing, retrying, syncing, completed
  message: '',
  successCount: 0,
  failedCount: 0,
  needSync: false
})
let progressTimer = null


const openBatchReplaceDialog = () => {
  batchReplaceDialogVisible.value = true
  batchPreviewCount.value = 0
  batchPreviewSearched.value = false
  batchPreviewList.value = []
  batchPreviewSynced.value = false  // 重置同步标志：新窗口会话的首次预览会触发同步
  batchReplaceForm.domain = ''
  batchReplaceForm.replacementDomain = ''
  batchReplaceForm.landerType = 'private'
  batchReplaceFormRef.value?.clearValidate()
}

const canStartReplace = () => {
  return batchPreviewSearched.value && batchPreviewCount.value > 0 && !batchReplaceLoading.value
}


const getBatchReplaceTooltip = () => {
  if (!batchPreviewSearched.value) {
    return '请先点击「预览影响范围」'
  }
  if (batchPreviewCount.value === 0) {
    return '未找到可替换的 Lander'
  }
  return ''
}


const getProgressDialogTitle = () => {
  if (progressData.step === 'retrying') return '正在重试...'
  if (progressData.step === 'queued') return '队列中...'
  if (progressData.step === 'syncing') return '正在同步...'
  if (progressData.step === 'checking') return '正在二次检查...'
  return '批量替换进度'
}


const getProgressStatus = () => {
  if (progressData.step === 'retrying') return 'warning'
  if (progressData.step === 'queued') return 'info'
  if (progressData.step === 'syncing') return undefined
  if (progressData.step === 'checking') return undefined
  return undefined
}


watch(() => batchReplaceForm.landerType, () => {

  batchPreviewSearched.value = false
  batchPreviewCount.value = -1 // 使用 -1 表示需要重新预览
  batchPreviewList.value = []
})


const cleanDomain = (domain) => {
  if (!domain) return ''
  let cleaned = domain.trim()

  cleaned = cleaned.replace(/^https?:\/\//i, '')

  const slashIndex = cleaned.indexOf('/')
  if (slashIndex !== -1) {
    cleaned = cleaned.substring(0, slashIndex)
  }
  return cleaned
}


const handlePreviewBatchReplace = async () => {

  const valid = await batchReplaceFormRef.value?.validate().catch(() => false)
  if (!valid) return

  // 仅在窗口会话首次预览时触发同步（force_sync=true）
  // 同步失败后端会返回 code !== 0，synced 不会被置 true，用户再次点击可继续重试
  const forceSync = !batchPreviewSynced.value

  batchPreviewLoading.value = true
  try {
    const res = await previewBatchReplace(
      cleanDomain(batchReplaceForm.domain),
      cleanDomain(batchReplaceForm.replacementDomain),
      batchReplaceForm.landerType,
      undefined,
      undefined,
      forceSync
    )
    if (res.code === 0) {
      batchPreviewSynced.value = true  // 标记本次窗口会话已同步，后续点击不再同步
      batchPreviewCount.value = res.data.total || 0
      batchPreviewList.value = res.data.list || []
      batchPreviewSearched.value = true
    } else {
      ElMessage.error(res.message || '查询失败')
    }
  } catch (error) {
    ElMessage.error('查询失败')
  } finally {
    batchPreviewLoading.value = false
  }
}


const handleBatchReplace = async () => {

  const valid = await batchReplaceFormRef.value?.validate().catch(() => false)
  if (!valid) return


  if (!batchPreviewSearched.value) {
    ElMessage.warning('请先点击"预览影响范围"查看受影响的 Lander 数量')
    return
  }

  if (batchPreviewCount.value === 0) {
    ElMessage.warning('没有找到包含该域名的 Lander')
    return
  }

  batchReplaceLoading.value = true
  try {
    const res = await batchReplaceLanderUrl(
      cleanDomain(batchReplaceForm.domain),
      cleanDomain(batchReplaceForm.replacementDomain),
      batchReplaceForm.landerType
    )
    if (res.code === 0) {
      const { recordId, affectedCount } = res.data
      const typeText = batchReplaceForm.landerType === 'public' ? 'Public' : batchReplaceForm.landerType === 'private' ? 'Private' : ''


      progressData.recordId = recordId
      progressData.dangerousDomain = batchReplaceForm.domain
      progressData.replacementDomain = batchReplaceForm.replacementDomain
      progressData.affectedCount = affectedCount
      progressData.current = 0
      progressData.total = affectedCount
      progressData.percent = 0
      progressData.status = 'processing'
      progressData.step = 'processing'
      progressData.message = '正在启动任务...'
      progressData.successCount = 0
      progressData.failedCount = 0
      progressData.needSync = false


      batchReplaceDialogVisible.value = false
      progressDialogVisible.value = true


      startProgressPolling()
    } else {
      ElMessage.error(res.message || '批量替换任务启动失败')
    }
  } catch (error) {
    ElMessage.error('批量替换任务启动失败')
  } finally {
    batchReplaceLoading.value = false
  }
}


const startProgressPolling = () => {

  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }


  fetchProgress()


  progressTimer = setInterval(() => {
    fetchProgress()
  }, 1000)
}


const fetchProgress = async () => {
  try {
    const res = await getBatchReplaceProgress(progressData.recordId)
    if (res.code === 0) {
      const data = res.data


      progressData.status = data.status
      progressData.successCount = data.success_count || 0
      progressData.failedCount = data.failed_count || 0
      progressData.needSync = data.need_sync || false


      if (data.progress) {
        progressData.step = data.progress.step
        progressData.current = data.progress.current
        progressData.total = data.progress.total
        progressData.percent = data.progress.percent
        progressData.message = data.progress.message
      }


      const isFinished = ['success', 'partial', 'failed'].includes(data.status)

      if (isFinished) {

        if (progressTimer) {
          clearInterval(progressTimer)
          progressTimer = null
        }


        const typeText = batchReplaceForm.landerType === 'public' ? 'Public' : batchReplaceForm.landerType === 'private' ? 'Private' : ''
        const statusText = {
          'success': '成功',
          'partial': '部分成功',
          'failed': '失败'
        }[data.status] || ''

        progressData.message = `处理完成：成功 ${progressData.successCount} 条，失败 ${progressData.failedCount} 条`


        createOperationLog({
          module: 'lander',
          operation: 'batch_replace_url',
          description: `批量替换 URL 域名：${progressData.dangerousDomain} → ${progressData.replacementDomain} (${typeText || '全部'}) - ${statusText}`,
          details: {
            from_domain: progressData.dangerousDomain,
            to_domain: progressData.replacementDomain,
            workspace_type: batchReplaceForm.landerType,
            affectedCount: progressData.affectedCount,
            successCount: progressData.successCount,
            failedCount: progressData.failedCount
          }
        }).catch(err => console.error('记录日志失败:', err))


        if (progressData.needSync) {
          progressData.message = '正在同步数据...'

          setTimeout(() => {
            getList()
            fetchSyncStatus()
            fetchScreenshotStats()
            progressData.message = `处理完成：成功 ${progressData.successCount} 条，失败 ${progressData.failedCount} 条`
          }, 2000)
        } else {

          getList()
          fetchSyncStatus()
          fetchScreenshotStats()
        }
      }
    }
  } catch (error) {
    console.error('查询进度失败:', error)
  }
}


const closeProgressDialog = () => {
  progressDialogVisible.value = false

  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}


onBeforeUnmount(() => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
})


const getFullImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}



const searchForm = reactive({
  name: '',
  url: ''
})


const tableData = ref([])
const loading = ref(false)


const pagination = reactive({
  page: 1,
  size: 50,
  total: 0
})



const landerDimensionOptions = [
  { value: 'date', label: '日期' },
  { value: 'source', label: '媒体' },
  { value: 'offer', label: 'Offer' }
]



const landerExpandedData = ref({})


const landerDimensionPickerVisible = ref({})


const landerDataLoading = ref({})


const landerRowLoading = ref({})



const landerSortState = ref({})


const landerHasNoData = ref({})


const landerDraggedItemIndex = ref(null)
const landerDragOverItemIndex = ref(null)
const landerDraggedLanderKey = ref(null)


const getLanderExpandedDimensions = (landerKey) => {
  return landerExpandedData.value[landerKey]?.selectedDimensions || []
}


const getLanderAvailableDimensions = (landerKey) => {
  const selected = getLanderExpandedDimensions(landerKey)
  return landerDimensionOptions.filter(dim => !selected.includes(dim.value))
}


const getLanderDimensionLabel = (dimValue) => {
  const dim = landerDimensionOptions.find(d => d.value === dimValue)
  return dim ? dim.label : dimValue
}


const getLanderDimensionPreview = (landerKey) => {
  const dims = getLanderExpandedDimensions(landerKey)
  if (dims.length === 0) return ''

  const labels = dims.map(d => getLanderDimensionLabel(d))
  return labels.join(' → ')
}


const toggleLanderDimensionPicker = (landerKey) => {
  landerDimensionPickerVisible.value[landerKey] = !landerDimensionPickerVisible.value[landerKey]
}


const handleClickOutsideDimensionPicker = (event) => {

  const target = event.target
  const isInsidePicker = target.closest('.dimension-picker-panel')
  const isInsideAddButton = target.closest('.dimension-add-btn')


  if (!isInsidePicker && !isInsideAddButton) {
    Object.keys(landerDimensionPickerVisible.value).forEach(key => {
      landerDimensionPickerVisible.value[key] = false
    })
  }
}


const addLanderDimension = async (landerKey, dimensionValue) => {
  console.log('[addLanderDimension] 开始添加维度:', landerKey, dimensionValue)

  if (!landerExpandedData.value[landerKey]) {

    landerExpandedData.value[landerKey] = {
      selectedDimensions: [],
      expandedData: reactive({ items: [], expandedPaths: new Set() }),
      pickerVisible: false
    }
    console.log('[addLanderDimension] 初始化数据结构:', landerExpandedData.value[landerKey])
  }

  const data = landerExpandedData.value[landerKey]
  data.selectedDimensions.push(dimensionValue)
  landerDimensionPickerVisible.value[landerKey] = false

  console.log('[addLanderDimension] 当前选择的维度:', data.selectedDimensions)


  await loadLanderLevelData(landerKey, 0, null)

  console.log('[addLanderDimension] 加载完成，展开数据项数量:', data.expandedData.items.length)
}


const handleLanderExpandChange = async (row, expandedRows) => {
  if (expandedRows.includes(row)) {

    createOperationLog({
      module: 'lander',
      operation: 'expand_data',
      description: `展开数据: ${row.name}`,
      details: {
        lander_id: row.lander_key,
        lander_name: row.name
      }
    }).catch(err => console.error('记录日志失败:', err))


    const data = landerExpandedData.value[row.lander_key]
    if (!data || data.selectedDimensions.length === 0) {
      await addLanderDimension(row.lander_key, 'date')
    }
  }
}


const removeLanderDimension = async (landerKey, dimensionValue) => {
  const data = landerExpandedData.value[landerKey]
  if (!data) return


  if (data.selectedDimensions.length <= 1) {
    ElMessage.warning('至少需要保留一个维度')
    return
  }

  const index = data.selectedDimensions.indexOf(dimensionValue)
  if (index > -1) {
    data.selectedDimensions.splice(index, 1)

    data.expandedData.items = []
    data.expandedData.expandedPaths = new Set()


    await loadLanderLevelData(landerKey, 0)
  }
}


const handleLanderDimensionDragStart = (landerKey, event) => {
  const index = parseInt(event.target.dataset.index)
  landerDraggedItemIndex.value = index
  landerDraggedLanderKey.value = landerKey
  event.target.classList.add('dragging')
  event.dataTransfer.effectAllowed = 'move'
}

const handleLanderDimensionDragOver = (landerKey, event) => {
  event.preventDefault()

  if (landerKey !== landerDraggedLanderKey.value) return

  const target = event.target.closest('.dimension-selected-item')
  if (target) {
    const index = parseInt(target.dataset.index)
    if (index !== landerDraggedItemIndex.value) {
      landerDragOverItemIndex.value = index
    }
  }
}

const handleLanderDimensionDrop = (landerKey, event) => {
  event.preventDefault()

  if (landerKey !== landerDraggedLanderKey.value) return

  const target = event.target.closest('.dimension-selected-item')
  if (!target) return

  const toIndex = parseInt(target.dataset.index)
  const fromIndex = landerDraggedItemIndex.value

  if (fromIndex === toIndex) return

  const data = landerExpandedData.value[landerKey]
  if (!data) return


  const newDimensions = [...data.selectedDimensions]
  const [movedItem] = newDimensions.splice(fromIndex, 1)
  newDimensions.splice(toIndex, 0, movedItem)

  data.selectedDimensions = newDimensions


  data.expandedData.items = []
  data.expandedData.expandedPaths = new Set()


  loadLanderLevelData(landerKey, 0)
}

const handleLanderDimensionDragEnd = (landerKey, event) => {
  event.target.classList.remove('dragging')
  landerDraggedItemIndex.value = null
  landerDragOverItemIndex.value = null
  landerDraggedLanderKey.value = null
}


const getLanderExpandedData = (landerKey) => {
  const items = landerExpandedData.value[landerKey]?.expandedData?.items
  if (!items || items.length === 0) return []

  const sort = landerSortState.value[landerKey]
  if (!sort) return items


  const result = []
  const topLevelItems = items.filter(i => i.level === 0)

  const sortLevel = (levelItems, parentPath) => {
    const sorted = [...levelItems].sort((a, b) => {
      let valA = a[sort.field]
      let valB = b[sort.field]


      if (sort.field === 'group_name') {
        valA = valA || ''
        valB = valB || ''
        return sort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }


      valA = Number(valA) || 0
      valB = Number(valB) || 0
      return sort.order === 'asc' ? valA - valB : valB - valA
    })

    sorted.forEach(item => {
      result.push(item)

      const children = items.filter(i => i.path.startsWith(item.path + ',') && i.level === item.level + 1)
      if (children.length > 0) {
        sortLevel(children, item.path + ',')
      }
    })
  }

  sortLevel(topLevelItems, '')
  return result
}


const getDefaultSort = (landerKey) => {
  const data = landerExpandedData.value[landerKey]
  if (!data || data.selectedDimensions.length === 0) {
    return { field: 'total_clicks', order: 'desc' }
  }
  const firstDim = data.selectedDimensions[0]
  if (firstDim === 'date') {
    return { field: 'group_name', order: 'asc' }
  }
  return { field: 'total_clicks', order: 'desc' }
}


const toggleLanderSort = (landerKey, field) => {
  const current = landerSortState.value[landerKey]
  if (current && current.field === field) {

    current.order = current.order === 'asc' ? 'desc' : 'asc'
  } else {

    const order = field === 'group_name' ? 'asc' : 'desc'
    landerSortState.value[landerKey] = { field, order }
  }
}


const hasItemChildren = (landerKey, item) => {
  const data = landerExpandedData.value[landerKey]
  if (!data || !data.expandedData) return false


  const hasChildren = data.expandedData.items.some(childItem =>
    childItem.path.startsWith(item.path + ',') && childItem.level > item.level
  )
  if (hasChildren) return true


  const selected = data.selectedDimensions || []
  const hasNextLevel = item.level < selected.length - 1


  if (hasNextLevel && !data.expandedData.expandedPaths.has(item.path + ',')) {
    return true
  }

  return false
}


const isLanderItemExpanded = (landerKey, item) => {
  const data = landerExpandedData.value[landerKey]
  if (!data || !data.expandedData) return false
  return data.expandedData.expandedPaths.has(item.path + ',')
}


const toggleLanderExpand = async (landerKey, item) => {
  const data = landerExpandedData.value[landerKey]
  if (!data) return

  const pathKey = item.path
  const expandedPathKey = pathKey + ','
  const isExpanded = data.expandedData.expandedPaths.has(expandedPathKey)

  if (isExpanded) {

    data.expandedData.expandedPaths.delete(expandedPathKey)
    data.expandedData.items = data.expandedData.items.filter(oldItem => !oldItem.path.startsWith(expandedPathKey))
  } else {

    const loadingKey = `${landerKey}:${pathKey}`
    landerRowLoading.value[loadingKey] = true
    try {
      await loadLanderLevelData(landerKey, item.level + 1, item)
    } finally {
      landerRowLoading.value[loadingKey] = false
    }
  }
}


const loadLanderLevelData = async (landerKey, level, parentItem) => {
  console.log('[loadLanderLevelData] 开始加载:', { landerKey, level, parentItem })

  const data = landerExpandedData.value[landerKey]
  if (!data || data.selectedDimensions.length === 0) {
    console.log('[loadLanderLevelData] 没有数据或维度，返回')
    return
  }

  const currentDimension = data.selectedDimensions[level]
  if (!currentDimension) {
    console.log('[loadLanderLevelData] 当前维度为空，返回')
    return
  }

  console.log('[loadLanderLevelData] 当前维度:', currentDimension)


  const filters = { landing_id: landerKey }
  if (parentItem) {
    Object.assign(filters, parentItem.filterValues || {})
  }

  const requestParams = {
    groupBy: currentDimension,
    filters: filters,
    level: level
  }

  console.log('[loadLanderLevelData] 查询参数:', requestParams)


  landerDataLoading.value[landerKey] = true

  try {

    const result = await getDailyReportDetailByDate(requestParams)

    console.log('[loadLanderLevelData] API返回结果:', result)

    if (result.code === 0) {
      const responseData = result.data || []
      console.log('[loadLanderLevelData] 响应数据数量:', responseData.length)


      if (level === 0 && responseData.length === 0) {
        console.log('[loadLanderLevelData] 该 Lander 暂无报表数据')
        landerHasNoData.value[landerKey] = true
      } else if (level === 0 && responseData.length > 0) {

        landerHasNoData.value[landerKey] = false
        if (!landerSortState.value[landerKey]) {
          landerSortState.value[landerKey] = getDefaultSort(landerKey)
        }
      }

      const pathKey = parentItem ? parentItem.path : ''

      const processedItems = responseData.map((item, idx) => {
        const group_id = item.group_id
        const group_name = item.group_name
        const itemPath = pathKey ? `${pathKey},${level}-${idx}` : `${level}-${idx}`


        let field = ''
        if (currentDimension === 'date') {
          field = 'date'
        } else if (currentDimension === 'source') {
          field = 'traffic_source_id'
        } else if (currentDimension === 'offer') {
          field = 'offer_id'
        }

        return {
          ...item,
          group_id,
          group_name,
          level: level,
          path: itemPath,
          filterValues: parentItem ? {
            ...(parentItem.filterValues || {}),
            [field]: group_id
          } : {
            landing_id: landerKey,
            [field]: group_id
          }
        }
      })

      console.log('[loadLanderLevelData] 处理后的数据项数量:', processedItems.length)


      if (pathKey !== '') {
        data.expandedData.expandedPaths.add(pathKey + ',')
      }



      if (pathKey === '') {
        data.expandedData.items = processedItems
        data.expandedData.expandedPaths = new Set()
      } else {

        const existingItems = data.expandedData.items || []


        const filteredItems = existingItems.filter(oldItem => {
          return !oldItem.path.startsWith(pathKey + ',')
        })


        const parentIndex = filteredItems.findIndex(item => item.path === pathKey)
        if (parentIndex !== -1) {

          data.expandedData.items = [
            ...filteredItems.slice(0, parentIndex + 1),
            ...processedItems,
            ...filteredItems.slice(parentIndex + 1)
          ]
        } else {

          data.expandedData.items = [...filteredItems, ...processedItems]
        }
      }

      console.log('[loadLanderLevelData] 展开数据总数:', data.expandedData.items.length)
    } else {
      console.error('[loadLanderLevelData] API返回错误:', result)
      ElMessage.error(result.message || '加载数据失败')
    }
  } catch (error) {
    console.error('[loadLanderLevelData] 加载失败:', error)
    ElMessage.error('加载数据失败: ' + error.message)
  } finally {

    landerDataLoading.value[landerKey] = false
  }
}


const getLastSyncDate = () => {

  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}


const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0]
}


const syncStatus = ref({
  total: 0,
  last_sync_at: null
})


const screenshotStats = ref({
  total: 0,
  success: 0,
  pending: 0,
  processing: 0,
  failed: 0
})


const syncLoading = ref(false)
const screenshotLoading = ref(false)
const syncWorkspaceLoading = ref(false)


const uploadInputRefs = ref({})
const uploadingLander = ref(null)


let statusPollingTimer = null


const formatLastSync = (dateStr) => {
  if (!dateStr) return '从未同步'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  return `${days} 天前`
}


const getList = async () => {
  loading.value = true
  try {
    const res = await getLanderList({
      name: searchForm.name || undefined,
      url: searchForm.url || undefined,
      offset: (pagination.page - 1) * pagination.size,
      size: pagination.size,
      sort_by: 'cf_created_at',  // 按 CF 创建时间排序
      sort_order: 'desc'           // 倒序
    })
    if (res.code === 0) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    } else {
      tableData.value = []
      pagination.total = 0
    }
  } catch (error) {
    ElMessage.error('获取列表失败')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}


const fetchSyncStatus = async () => {
  try {
    const res = await getSyncStatus()
    if (res.code === 0) {
      syncStatus.value = res.data
    }
  } catch (error) {
    console.error('获取同步状态失败:', error)
  }
}


const fetchScreenshotStats = async () => {
  try {
    const res = await getScreenshotStats()
    if (res.code === 0) {
      screenshotStats.value = res.data
    }
  } catch (error) {
    console.error('获取截图统计失败:', error)
  }
}


const handleSearch = () => {
  pagination.page = 1


  const searchConditions = []
  if (searchForm.name) searchConditions.push(`名称: "${searchForm.name}"`)
  if (searchForm.url) searchConditions.push(`地址: "${searchForm.url}"`)

  if (searchConditions.length > 0) {
    createOperationLog({
      module: 'lander',
      operation: 'search',
      description: `${searchConditions.join('、')}`,
      details: {
        conditions: searchConditions.join(', ')
      }
    }).catch(err => console.error('记录日志失败:', err))
  }

  getList()
}


const handleReset = () => {
  searchForm.name = ''
  searchForm.url = ''
  pagination.page = 1
  getList()
}


const formatNumber = (val) => {
  if (val === null || val === undefined) return '0'
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}


const isAntivirus = (row) => {
  const name = row.name || ''

  return /antivirus/i.test(name)
}


const fetchData = async (row) => {

  createOperationLog({
    module: 'lander',
    operation: 'fetch_data',
    description: `点击获取数据: ${row.name}`,
    details: {
      lander_id: row.lander_key,
      lander_name: row.name
    }
  }).catch(err => console.error('记录日志失败:', err))


  row.fetching = true


  await new Promise(resolve => setTimeout(resolve, 500))

  row.fetching = false
  row.dataLoaded = true
}


const handleNameClear = () => {
  searchForm.name = ''
  pagination.page = 1
  getList()
}


const handleUrlClear = () => {
  searchForm.url = ''
  pagination.page = 1
  getList()
}


const handleSync = async (showMessage = true) => {
  if (showMessage) {
    ElMessage.success('已开启同步')
  }
  syncLander().then(() => {
    getList()
    fetchSyncStatus()
    fetchScreenshotStats()
  }).catch(err => {
    console.error('同步错误:', err)
  })
}


const handleTriggerScreenshot = async () => {
  screenshotLoading.value = true
  try {
    const res = await triggerScreenshot()
    if (res.code === 0) {
      ElMessage.success(`已添加 ${res.data.added} 个截图任务到队列`)
      setTimeout(() => {
        fetchScreenshotStats()
      }, 1000)
    } else {
      ElMessage.error(res.message || '启动截图任务失败')
    }
  } catch (error) {
    ElMessage.error('启动截图任务失败')
  } finally {
    screenshotLoading.value = false
  }
}


const handleSyncWorkspaces = async () => {
  syncWorkspaceLoading.value = true
  try {
    const res = await syncWorkspaces()
    if (res.code === 0) {
      const { inserted, updated, deleted, skipped, total } = res.data
      ElMessage.success(`同步成功：新增 ${inserted}，更新 ${updated}，删除 ${deleted}，跳过 ${skipped}，总计 ${total}`)

      getList()
    } else {
      ElMessage.error(res.message || '同步工作区失败')
    }
  } catch (error) {
    console.error('同步工作区失败:', error)
    ElMessage.error('同步工作区失败')
  } finally {
    syncWorkspaceLoading.value = false
  }
}


const openEditDialog = (row) => {
  editForm.lander_key = row.lander_key
  editForm.name = row.name
  editForm.url = row.url
  editForm.workspace_id = row.workspace_id || null

  editOriginalValues.value.name = row.name
  editOriginalValues.value.url = row.url
  editDialogVisible.value = true
  editLoading.value = false


  editFormRef.value?.clearValidate()
}


const handleUpdateLander = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  editLoading.value = true
  try {
    await updateLander(editForm.lander_key, {
      name: editForm.name,
      url: editForm.url,
      workspace_id: editForm.workspace_id
    })

    ElMessage.success('更新成功')


    const changedFields = []
    if (editOriginalValues.value.name !== editForm.name) {
      changedFields.push(`名称: "${editOriginalValues.value.name}" → "${editForm.name}"`)
    }
    if (editOriginalValues.value.url !== editForm.url) {
      changedFields.push(`URL: "${editOriginalValues.value.url}" → "${editForm.url}"`)
    }


    const landerType = editForm.workspace_id ? 'Private Lander' : 'Public Lander'


    createOperationLog({
      module: 'lander',
      operation: 'update',
      description: `更新 Lander [${editForm.lander_key}] - ${editForm.name} (${landerType})`,
      details: {
        lander_id: editForm.lander_key,
        name: editForm.name,
        url: editForm.url,
        type: landerType,
        changed_fields: changedFields.length > 0 ? changedFields.join(', ') : '无变化'
      }
    }).catch(err => console.error('记录日志失败:', err))


    editDialogVisible.value = false


    handleSync(false)
  } catch (error) {
    console.error('更新 Lander 失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '更新失败'
    ElMessage.error(errorMsg)
  } finally {
    editLoading.value = false
  }
}


const handleApprove = async (row) => {
  const isPrivate = !!row.workspace_id
  const targetText = isPrivate ? 'Public' : 'Private'
  const currentText = isPrivate ? 'Private' : 'Public'

  try {


    const workspaceId = isPrivate ? null : '6909c803d94c5200122b38b1'

    await updateLander(row.lander_key, { workspace_id: workspaceId })

    ElMessage.success(`已转换为 ${targetText} Lander`)


    createOperationLog({
      module: 'lander',
      operation: 'convert_type',
      description: `转换 Lander [${row.lander_key}] - ${row.name} 从 ${currentText} 转为 ${targetText}`,
      details: {
        lander_id: row.lander_key,
        name: row.name,
        from_type: currentText,
        to_type: targetText,
        workspace_id: workspaceId
      }
    }).catch(err => console.error('记录日志失败:', err))


    handleSync(false)
  } catch (error) {
    console.error('转换 Lander 类型失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '转换失败'
    ElMessage.error(errorMsg)
  }
}


const openDeleteDialog = (row) => {
  deleteTargetLander.value = row
  deleteDialogVisible.value = true
  deleteLoading.value = false
}


const confirmDelete = async () => {
  if (!deleteTargetLander.value) return

  deleteLoading.value = true
  try {
    await deleteLander(deleteTargetLander.value.lander_key)


    ElMessage.success('删除成功')


    createOperationLog({
      module: 'lander',
      operation: 'delete',
      description: `删除 Lander: ${deleteTargetLander.value.name}`,
      details: {
        name: deleteTargetLander.value.name,
        lander_key: deleteTargetLander.value.lander_key
      }
    }).catch(err => console.error('记录日志失败:', err))


    deleteDialogVisible.value = false
    deleteTargetLander.value = null


    handleSync(false)
  } catch (error) {
    console.error('删除 Lander 失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '删除失败'
    ElMessage.error(errorMsg)

  } finally {
    deleteLoading.value = false
  }
}


const cancelDelete = () => {
  deleteDialogVisible.value = false
  deleteTargetLander.value = null
}


const handleSizeChange = (val) => {
  pagination.size = val


  createOperationLog({
    module: 'lander',
    operation: 'pagination',
    description: `修改落地页列表每页显示为 ${val} 条`,
    details: {
      pageSize: val,
      page: pagination.page
    }
  }).catch(err => console.error('记录日志失败:', err))

  getList()
  tableRef.value?.scrollBarRef?.setScrollTop(0)
}

const handleCurrentChange = (val) => {
  pagination.page = val


  createOperationLog({
    module: 'lander',
    operation: 'pagination',
    description: `点击落地页列表第 ${val} 页`,
    details: {
      page: val,
      pageSize: pagination.size
    }
  }).catch(err => console.error('记录日志失败:', err))

  getList()
  tableRef.value?.scrollBarRef?.setScrollTop(0)
}


const handleOpenUrl = (url) => {

  createOperationLog({
    module: 'lander',
    operation: 'open_url',
    description: `链接: ${url}?w=1`,
    details: {
      url: url
    }
  }).catch(err => console.error('记录日志失败:', err))


  if (!url) return ''
  const t = Math.floor(Date.now() / 10000);
  const n = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const raw = `eflp${t}${n}`;
  const s = SparkMD5.hash(raw).substring(0, 10);
  const sep = url.includes('?') ? '&' : '?';
  window.open(`${url}${sep}go=1&t=${t}&n=${n}&s=${s}&w=1`, "_blank")
}


const fetchConfig = async () => {
  try {
    const res = await getScreenshotConfig()
    if (res.code === 0) {
      configForm.query = res.data.query || ''
    }
  } catch (error) {
    console.error('获取配置失败:', error)
  }
}


const openConfigDialog = async () => {
  await fetchConfig()
  configDialogVisible.value = true
}


const handleSaveConfig = async () => {
  saveConfigLoading.value = true
  try {
    const res = await updateScreenshotConfig(configForm.query)
    if (res.code === 0) {
      ElMessage.success('配置保存成功')
      configDialogVisible.value = false
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saveConfigLoading.value = false
  }
}


const resetQuery = () => {
  configForm.query = '?w=1'
}


const openCreatePrivateDialog = () => {

  createPrivateForm.name = ''
  createPrivateForm.url = ''
  createPrivateDialogVisible.value = true
}


const openCreatePublicDialog = () => {

  createPublicForm.name = ''
  createPublicForm.url = ''
  createPublicDialogVisible.value = true
}


const handleCreatePrivateLander = async () => {

  const valid = await createPrivateFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  createPrivateLoading.value = true
  try {
    const res = await createLander({
      workspace_id: '6909c803d94c5200122b38b1',
      name: createPrivateForm.name,
      url: createPrivateForm.url,
      cta_count: 1
    })



    if (res?._id) {
      ElMessage.success('创建成功')
      createPrivateDialogVisible.value = false


      createOperationLog({
        module: 'lander',
        operation: 'create',
        description: `创建 Private Lander: ${createPrivateForm.name}`,
        details: {
          name: createPrivateForm.name,
          url: createPrivateForm.url,
          lander_id: res._id
        }
      }).catch(err => console.error('记录日志失败:', err))


      handleSync(false)
    } else if (res?.statusCode || res?.code) {

      const errorMsg = res.message || '创建失败'
      console.error('Clickflare API 错误:', res)
      ElMessage.error(errorMsg)
    } else {
      console.error('未知响应格式:', res)
      ElMessage.error('创建失败：响应格式异常')
    }
  } catch (error) {
    console.error('创建 Private Lander 失败:', error)

    if (error.response?.data) {
      const errData = error.response.data
      console.error('Clickflare API 错误响应:', errData)

      const errorMsg = errData.message || errData.data?.[0]?.message || '创建失败，请重试'
      ElMessage.error(errorMsg)
    } else {
      ElMessage.error('创建失败，请重试')
    }
  } finally {
    createPrivateLoading.value = false
  }
}


const handleCreatePublicLander = async () => {

  const valid = await createPublicFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  createPublicLoading.value = true
  try {
    const res = await createLander({
      workspace_id: null,  // Public Lander
      name: createPublicForm.name,
      url: createPublicForm.url,
      cta_count: 1
    })



    if (res?._id) {
      ElMessage.success('创建成功')
      createPublicDialogVisible.value = false


      createOperationLog({
        module: 'lander',
        operation: 'create',
        description: `创建 Public Lander: ${createPublicForm.name}`,
        details: {
          name: createPublicForm.name,
          url: createPublicForm.url,
          lander_id: res._id
        }
      }).catch(err => console.error('记录日志失败:', err))


      handleSync(false)
    } else if (res?.statusCode || res?.code) {

      const errorMsg = res.message || '创建失败'
      console.error('Clickflare API 错误:', res)
      ElMessage.error(errorMsg)
    } else {
      console.error('未知响应格式:', res)
      ElMessage.error('创建失败：响应格式异常')
    }
  } catch (error) {
    console.error('创建 Public Lander 失败:', error)

    if (error.response?.data) {
      const errData = error.response.data
      console.error('Clickflare API 错误响应:', errData)

      const errorMsg = errData.message || errData.data?.[0]?.message || '创建失败，请重试'
      ElMessage.error(errorMsg)
    } else {
      ElMessage.error('创建失败，请重试')
    }
  } finally {
    createPublicLoading.value = false
  }
}


const handleCommand = (command) => {
  switch (command) {
    case 'config':
      openConfigDialog()
      break
    case 'sync':
      handleSync()
      break
    case 'screenshot':
      handleTriggerScreenshot()
      break
    case 'syncWorkspace':
      handleSyncWorkspaces()
      break
  }
}


const handleUploadClick = (row) => {
  const inputRef = uploadInputRefs.value[row.lander_key]
  if (inputRef) {
    inputRef.click()
  }
}


const handleFileChange = async (event, row) => {
  const file = event.target.files?.[0]
  if (!file) return


  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只支持 JPG、PNG、GIF、WebP 格式的图片')
    return
  }


  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }

  uploadingLander.value = row.lander_key

  try {
    const res = await uploadLanderScreenshot(row.lander_key, file)
    if (res.code === 0) {
      ElMessage.success('截图上传成功')

      const index = tableData.value.findIndex(item => item.lander_key === row.lander_key)
      if (index !== -1) {
        tableData.value[index].screenshot_url = res.data.screenshot_url
        tableData.value[index].screenshot_status = 'success'
      }

      fetchScreenshotStats()
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  } finally {
    uploadingLander.value = null

    event.target.value = ''
  }
}


onMounted(() => {
  loadColumnSettings()
  fetchAutoSyncConfig()
  getList()
  fetchSyncStatus()
  fetchScreenshotStats()


  statusPollingTimer = setInterval(() => {
    fetchSyncStatus()
    fetchScreenshotStats()
  }, 30000)


  document.addEventListener('keydown', handleEscKey)


  document.addEventListener('click', handleClickOutsideDimensionPicker)


  document.addEventListener('click', handleExpandColumnClick)
})


const handleExpandColumnClick = (event) => {

  const target = event.target
  const expandCell = target.closest('.expand-column')

  if (expandCell) {

    const expandIcon = expandCell.querySelector('.el-table__expand-icon')
    if (expandIcon && target !== expandIcon && !expandIcon.contains(target)) {

      expandIcon.click()
    }
  }
}

onUnmounted(() => {

  if (hintTimer) clearTimeout(hintTimer)
  if (statusPollingTimer) clearInterval(statusPollingTimer)

  document.removeEventListener('keydown', handleEscKey)
  document.removeEventListener('click', handleClickOutsideDimensionPicker)
  document.removeEventListener('click', handleExpandColumnClick)

  document.body.classList.remove('landers-fullscreen-mode')
  document.body.style.overflow = ''
})
</script>

<style lang="less" scoped>
.landers-container {

  background: #f8f9fa;
  width: 100%;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;


  &.is-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    padding: 16px;
    background: #f8f9fa;

    .status-bar {
      margin-bottom: 16px;
    }
  }


  .status-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    margin-bottom: 12px;
    flex-wrap: wrap;

    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;

      .status-label {
        font-size: 13px;
        color: #5f6368;
      }

      .status-value {
        font-size: 14px;
        font-weight: 500;
        color: #202124;

        &.small {
          font-size: 12px;
        }
      }

      &.success .status-value {
        color: #137333;
      }

      &.pending .status-value {
        color: #b06000;
      }

      &.failed .status-value {
        color: #c5221f;
      }
    }


    :deep(.el-switch) {
      --el-switch-on-color: #1a73e8;
      --el-switch-off-color: #dadce0;
      height: 20px;

      .el-switch__core {
        height: 20px;
        min-width: 42px;
        border-radius: 10px;
      }

      .el-switch__action {
        width: 16px;
        height: 16px;
        top: 1px;
        left: 1px;
      }

      &.is-checked .el-switch__action {
        left: calc(100% - 17px);
      }
    }

    :deep(.el-switch--small) {
      height: 18px;

      .el-switch__core {
        height: 18px;
        min-width: 38px;
      }

      .el-switch__action {
        width: 14px;
        height: 14px;
      }
    }


    :deep(.el-select) {
      .el-input__wrapper {
        border-radius: 6px;
        box-shadow: none;
        border: 1px solid #dadce0;
        background: #fff;

        &:hover {
          border-color: #1a73e8;
        }

        &.is-disabled {
          background: #f1f3f4;
        }
      }
    }

    .status-divider {
      width: 1px;
      height: 16px;
      background: #dadce0;
    }

    .status-spacer {
      flex: 1;
    }

    .icon-btn {
      border: none;
      background: transparent;
      color: #5f6368;

      &:hover {
        background: #f1f3f4;
        color: #1a73e8;
      }
    }
  }


  .search-bar {
    padding: 12px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    margin-bottom: 12px;
    animation: slideDown 0.2s ease-out;

    .search-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .search-inputs {
        display: flex;
        align-items: flex-end;
        gap: 16px;
        flex: 1;
        flex-wrap: wrap;

        .search-item {
          display: flex;
          align-items: center;
          gap: 8px;

          label {
            font-size: 13px;

            color: black;
            white-space: nowrap;
          }

          .search-input {
            width: 200px;

            :deep(.el-input__wrapper) {
              border-radius: 4px;
              border: 1px solid #dadce0;
              box-shadow: none;

              &:hover {
                border-color: #1a73e8;
              }

              &.is-focused {
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
              }
            }
          }
        }

        .search-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;

          .el-button {
            height: 32px;
            padding: 0 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
        }
      }

      .toolbar-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
        align-items: center;

        .icon-btn {
          width: 32px;
          height: 32px;
          padding: 0;
        }
      }
    }
  }


  .table-container {
    padding: 0;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin: 12px 12px 12px 0;
      flex-shrink: 0;
    }

    :deep(.el-table) {
      border: none;
      flex: 1;
      display: flex;
      flex-direction: column;

      .el-table__inner-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .el-table__body-wrapper {
        overflow-x: auto !important;
        overflow-y: auto !important;
        flex: 1;
      }

      .el-table__header,
      .el-table__body {
        width: 100% !important;
        table-layout: fixed;
      }

      thead th {
        background: #f8f9fa;
        color: #3c4043;
        font-weight: 500;
        font-size: 13px;
        border-bottom: 1px solid #e8eaed;
        padding: 0 14px;
        height: 40px;
      }

      tbody tr {
        &:hover {
          background: #f8f9fa !important;
        }

        td {
          border-bottom: 1px solid #e8eaed;
          color: #202124;
          font-size: 13px;
          padding: 0 14px;
          height: 230px;
          vertical-align: middle;
        }


        .el-table__expand-column {
          cell-padding: 0;

          .cell {
            padding: 0 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            cursor: pointer;
          }

          .el-table__expand-icon,
          .el-table__expand-icon--expanded {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: none; // 让点击事件穿透到父元素

            svg {
              width: 16px;
              height: 16px;
              pointer-events: auto;
            }
          }
        }
      }

      .url-link {

        text-decoration: none;
        font-size: 13px;
        display: block;
        word-break: break-all;
        white-space: normal;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;




      }

      .no-url {
        color: #9aa0a6;
        font-size: 13px;
      }

      .lander-key-text {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        color: #5f6368;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .workspace-id-value {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        color: #5f6368;
      }

      .workspace-name-value {
        font-size: 12px;
        color: #5f6368;
        font-weight: 500;
      }

      .workspace-id-public {
        font-size: 12px;
        color: #188038;
        font-weight: 500;
      }

      .workspace-convert-btn {
        min-width: 70px;
        height: 28px;
        padding: 0 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;

        &.el-button--success {
          color: #188038;
          background-color: #e6f4ea;

          &:hover {
            background-color: #ceead6;
          }
        }

        &.el-button--warning {
          color: #f29900;
          background-color: #fef7e0;

          &:hover {
            background-color: #feecd3;
          }
        }
      }


      .lander-name-wrapper {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        gap: 6px;
        width: 100%;
        padding: 0 8px;

        .lander-name {
          color: #202124;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 9;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          text-align: center;
        }
      }

      .external-link-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          margin-top: 2px;
          color: #5f6368;
          text-decoration: none;
          border-radius: 4px;
          transition: all 0.2s;

          .external-icon {
            width: 14px;
            height: 14px;
            fill: currentColor;
          }

          &:hover {
            color: #1a73e8;
            background: #e8f0fe;
          }
        }


      .preview-image-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        flex-shrink: 0;
        height: 100%;
        padding: 4px;


        .upload-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 100;
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: auto;

          .el-icon {
            font-size: 14px;
          }

          &:hover {
            background: rgba(26, 115, 232, 0.9);
          }
        }

        &:hover .upload-btn {
          opacity: 1;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          max-height: 222px;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid #e8eaed;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;


          :deep(.el-image__inner) {
            max-width: 100%;
            max-height: 100%;
            width: auto !important;
            height: auto !important;
            object-fit: contain;
          }
        }

        .no-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #9aa0a6;
          font-size: 12px;
          width: 100%;
          height: 100%;
          max-height: 222px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e8eaed;
          flex-shrink: 0;

          .el-icon {
            font-size: 20px;
          }
        }

        .no-preview-image-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #9aa0a6;
          font-size: 12px;
          width: 100%;
          height: 100%;
          max-height: 222px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e8eaed;

          .el-icon {
            font-size: 20px;
          }
        }
      }

      &::before {
        display: none;
      }


      .delete-btn {
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


      .edit-btn {
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


      .stats-summary-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        justify-content: center;
        padding: 4px 0;

        .stats-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;

          .stats-label {
            color: #5f6368;
            font-weight: 500;
            font-size: 14px;
          }

          .stats-value {
            font-weight: 600;
            font-size: 14px;
            color: #202124;

            &.stats-primary {
              color: #1a73e8;
            }

            &.stats-success {
              color: #188038;
            }

            &.stats-danger {
              color: #d93025;
            }
          }
        }
      }


      .data-lock-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 4px 0;
      }


      .placeholder-data {
        color: #ccc;
        letter-spacing: 2px;
        user-select: none;
        font-weight: 500;
      }


      .rotate-icon {
        font-size: 18px;
        transition: transform 0.3s ease;

        &:hover {
          transform: rotate(90deg);
        }
      }
    }
  }
}


:deep(.google-pagination) {
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

  .btn-prev,
  .btn-next {
    border-radius: 4px;
    border: 1px solid #dadce0;
    color: #5f6368;
    background: #fff;

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
    line-height: 32px;

    &:hover {
      background-color: #f1f3f4;
    }

    &.is-active {
      background-color: #1a73e8;
      color: #fff;
    }
  }
}


:deep(.el-form-item) {
  .form-tip {
    margin-top: 4px;
    font-size: 12px;
    color: #5f6368;
    line-height: 1.5;
  }

  .form-hint {
    margin-top: 4px;
    font-size: 12px;
    color: #5f6368;
    line-height: 1.5;
  }

  .preview-alert {
    margin-top: 12px;
  }
}


@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}


:deep(.column-setting-menu) {
  min-width: 240px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid #e8eaed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #fff;
}

.column-setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e8eaed;
  font-size: 14px;
  font-weight: 500;
  color: #202124;

  .el-button {
    font-size: 13px;
    font-weight: 500;
    color: #1a73e8;

    &:hover {
      background: #e8f0fe;
    }
  }
}

.column-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: move;
  user-select: none;
  transition: background 0.15s ease;

  &:hover {
    background-color: #f8f9fa;
  }

  &.column-hidden {
    opacity: 0.55;
  }

  &.column-required {
    background-color: #f8f9fa;
  }

  &.dragging {
    opacity: 0.5;
    background-color: #e8f0fe;
  }
}

.column-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  opacity: 0.35;
  flex-shrink: 0;
  transition: opacity 0.15s ease;

  svg {
    width: 16px;
    height: 16px;
    fill: #5f6368;
  }

  .column-item:hover & {
    opacity: 0.6;
  }
}

.column-item-left {
  flex: 1;
  min-width: 0;
}

:deep(.column-setting-menu .el-checkbox) {
  margin: 0;
  height: auto;

  .el-checkbox__input.is-checked .el-checkbox__inner {
    background-color: #1a73e8;
    border-color: #1a73e8;
  }

  .el-checkbox__inner {
    border-radius: 2px;
    border-color: #5f6368;

    &:hover {
      border-color: #1a73e8;
    }
  }

  .el-checkbox__label {
    font-size: 13px;
    color: #202124;
    font-weight: 400;
  }

  &:hover .el-checkbox__inner {
    border-color: #1a73e8;
  }

  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;

    .el-checkbox__label {
      color: #5f6368;
    }

    .el-checkbox__inner {
      background-color: #f1f3f4;
      border-color: #dadce0;
    }
  }
}

:deep(.column-setting-menu .el-scrollbar__view) {
  padding: 4px 0;
}




:deep(.google-dialog) {
  .el-dialog__header {
    padding: 20px 24px 16px;
    margin: 0;
    border-bottom: 1px solid #e8eaed;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
      line-height: 24px;
    }

    .el-dialog__headerbtn {
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
  }

  .el-dialog__body {
    padding: 20px 24px;
  }
}


.google-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;

    .el-form-item__label {
      font-size: 13px;
      color: #5f6368;
      font-weight: 500;
      padding-right: 16px;
    }

    .el-form-item__error {
      font-size: 12px;
      color: #c5221f;
      padding-top: 4px;
    }
  }

  :deep(.el-input) {
    .el-input__wrapper {
      border-radius: 4px;
      border: 1px solid #dadce0;
      box-shadow: none;
      background: #fff;
      padding: 8px 12px;
      transition: border-color 0.2s;

      &:hover {
        border-color: #1a73e8;
      }

      &.is-focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
      }

      .el-input__inner {
        font-size: 14px;
        color: #202124;
        &::placeholder {
          color: #9aa0a6;
        }
      }

      .el-input__clear {
        color: #9aa0a6;
        &:hover {
          color: #5f6368;
        }
      }
    }
  }
}


.google-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0;
}


.google-btn {
  min-width: 80px;
  height: 36px;
  padding: 0 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  transition: all 0.2s;

  &.google-btn-secondary {
    background: #fff;
    color: #5f6368;
    border: 1px solid #dadce0;

    &:hover {
      background: #f8f9fa;
      border-color: #dadce0;
      color: #202124;
    }
  }

  &.google-btn-primary {
    background: #1a73e8;
    color: #fff;

    &:hover {
      background: #1557b0;
    }

    &:disabled {
      background: #dadce0;
      color: #9aa0a6;
    }
  }

  &.google-btn-danger {
    background: #c5221f;
    color: #fff;

    &:hover {
      background: #a50e0e;
    }
  }
}


:deep(.column-setting-menu .el-scrollbar__bar) {
  &.is-vertical .el-scrollbar__thumb {
    background-color: #dadce0;
    border-radius: 4px;

    &:hover {
      background-color: #bdc1c6;
    }
  }
}


.expand-content {
  padding: 16px 24px;
  background: #f8f9fa;
}


.dimension-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  .dimension-selected-list {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dimension-selected-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #fff;
    border: 1px solid #dadce0;
    border-radius: 6px;
    font-size: 13px;
    color: #202124;
    transition: all 0.2s;
    cursor: move;

    &:hover {
      background: #f1f3f4;
    }

    &.dragging {
      opacity: 0.5;
      cursor: grabbing;
    }

    .g-drag-handle {
      width: 14px;
      height: 14px;
      color: #5f6368;
      cursor: grab;
      flex-shrink: 0;

      &:active {
        cursor: grabbing;
      }
    }

    .dimension-order-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #1a73e8;
      color: #fff;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 500;
    }

    .dimension-name {
      font-weight: 500;
    }
  }

  .g-dimension-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: #5f6368;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s;
    flex-shrink: 0;

    svg {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background: #fce8e6;
      color: #c5221f;
    }
  }

  .dimension-add-wrapper {
    position: relative;
  }

  .dimension-add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #fff;
    border: 1px dashed #dadce0;
    border-radius: 6px;
    font-size: 13px;
    color: #5f6368;
    cursor: pointer;
    transition: all 0.2s;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: #f1f3f4;
      border-color: #1a73e8;
      color: #1a73e8;
    }
  }

  .dimension-picker-panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1000;
    min-width: 180px;
    background: #fff;
    border: 1px solid #dadce0;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(60, 64, 67, 0.15);
    overflow: hidden;

    .dimension-picker-header {
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #dadce0;
      font-size: 13px;
      font-weight: 500;
      color: #5f6368;
    }

    .dimension-picker-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .dimension-picker-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #f1f3f4;
      }

      .dimension-picker-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        color: #1a73e8;

        svg {
          width: 14px;
          height: 14px;
        }
      }

      .dimension-picker-label {
        font-size: 13px;
        color: #202124;
      }
    }
  }

  .dimension-hint {
    margin-left: auto;
    font-size: 12px;
    color: #5f6368;
    padding: 6px 12px;
    background: #fff;
    border: 1px solid #dadce0;
    border-radius: 4px;
  }
}


.no-expanded-data {
  padding: 40px;
  text-align: center;
  color: #5f6368;
  font-size: 14px;

  .loading-text {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #1a73e8;
  }
}


.g-loading-row {
  td {
    padding: 8px 12px;
    color: #1a73e8;
    font-size: 13px;
  }

  .g-loading-content {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    .el-icon {
      animation: rotating 1.5s linear infinite;
    }
  }
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


.g-clickable-cell {
  cursor: pointer;

  &:hover {
    background: #f1f3f4;
  }
}


.g-expand-icon-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  flex-shrink: 0;

  .g-expand-icon {
    width: 16px;
    height: 16px;
    fill: #5f6368;
    transition: transform 0.2s;
  }

  &.g-expanded .g-expand-icon {
    transform: rotate(180deg);
  }
}

.g-expand-placeholder {
  display: inline-block;
  width: 24px;
}

.g-group-name {
  margin-left: 8px;
  color: #5f6368;
  font-size: 13px;
}

.g-nested-cell {
  position: relative;
}


.g-nested-row {
  background: #fafafa;

  &:hover {
    background: #f5f5f5;
  }
}

.g-empty {
  text-align: center;
  padding: 40px;
  color: #5f6368;
}


.g-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  thead {
    tr {
      border-bottom: 1px solid #e8eaed;
    }

    th {
      padding: 12px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 500;
      color: #3c4043;

      &.g-sortable-th {
        cursor: pointer;
        user-select: none;

        &:hover {
          background: #f1f3f4;
        }
      }

      .g-th-content {
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }

      .g-sort-indicator {
        display: inline-flex;
        align-items: center;
        margin-left: 2px;
      }

      .g-sort-icon {
        width: 14px;
        height: 14px;
        fill: #c4c7cc;

        &.active {
          fill: #1a73e8;
        }
      }
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #e8eaed;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f8f9fa;
      }
    }

    td {
      padding: 12px 16px;
      color: #202124;
    }
  }
}


.g-table-wrapper-fixed {
  max-height: 400px;
  overflow-y: auto;
  padding: 0;
  position: relative;


  .g-table thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f8f9fa;
  }

  .g-table thead th {
    background: #f8f9fa;
  }


  .g-table tbody td {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
    font-size: 13px !important;

    height: 25px !important;  // 覆盖全局的 height: 230px
    vertical-align: middle;
  }
}

.g-table-wrapper {
  padding: 0 24px 24px;
}
</style>

<style lang="less">

body.landers-fullscreen-mode {
  .el-select-dropdown,
  .el-picker-dropdown,
  .el-dropdown-menu,
  .el-popper,
  .el-dialog__wrapper {
    z-index: 10000 !important;
  }
}

.el-image-viewer__wrapper {
  .el-image-viewer__canvas {
    img {
      max-width: 65vw !important;
      max-height: 75vh !important;
    }
  }
}
</style>

<style lang="less" scoped>

.fullscreen-hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 24px;
  font-size: 14px;
  z-index: 10001;
  pointer-events: none;

  .el-icon {
    font-size: 16px;
  }
}


.fullscreen-hint-enter-active,
.fullscreen-hint-leave-active {
  transition: all 0.3s ease;
}

.fullscreen-hint-enter-from,
.fullscreen-hint-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}


.delete-confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  gap: 12px;

  .warning-icon {
    font-size: 48px;
    color: #f59e0b;
  }

  .confirm-message {
    font-size: 16px;
    font-weight: 500;
    color: #202124;
    text-align: center;
  }

  .confirm-hint {
    font-size: 13px;
    color: #5f6368;
    text-align: center;
  }
}


:deep(.google-dialog-warning) {
  .el-dialog__header {
    padding: 20px 24px 16px;
    margin: 0;


    .el-dialog__title {
      font-size: 18px;
      font-weight: 500;

      line-height: 24px;
    }
  }
}


.batch-preview-table-wrapper {
  margin-top: 16px;
  border-top: 1px solid #e8eaed;
  padding-top: 16px;

  .batch-preview-table {
    :deep(th) {
      background: #f8f9fa;
      color: #3c4043;
      font-weight: 500;
      font-size: 12px;
      padding: 8px 12px;
    }

    :deep(td) {
      padding: 8px 12px;
      font-size: 12px;
    }

    .preview-lander-name {
      color: #202124;
      font-weight: 500;
    }

    .preview-url-old {
      color: #c5221f;
      word-break: break-all;
      font-size: 12px;
    }

    .preview-url-new {
      color: #137333;
      word-break: break-all;
      font-size: 12px;
    }
  }
}


.progress-dialog {
  .progress-content {
    padding: 20px 0;

    .progress-info {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;

      .info-item {
        display: flex;
        align-items: center;
        font-size: 14px;

        .label {
          color: #5f6368;
          margin-right: 8px;
        }

        .value {
          color: #202124;
          font-weight: 500;

          &.danger {
            color: #c5221f;
          }

          &.success {
            color: #137333;
          }
        }
      }
    }

    .progress-bar-wrapper {
      padding: 0 20px;

      .progress-text {
        text-align: center;
        margin-top: 16px;
        color: #5f6368;
        font-size: 14px;
      }
    }

    .progress-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;

      .result-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;

        .el-icon {
          font-size: 32px;
        }

        &.success {
          background: #e6f4ea;
          color: #137333;
        }

        &.partial {
          background: #fef7e0;
          color: #b06000;
        }

        &.failed {
          background: #fce8e6;
          color: #c5221f;
        }
      }

      .result-message {
        font-size: 16px;
        color: #202124;
        margin-bottom: 24px;
        text-align: center;
      }

      .result-stats {
        display: flex;
        gap: 32px;

        .stat-item {
          text-align: center;

          .stat-value {
            display: block;
            font-size: 28px;
            font-weight: 500;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 12px;
            color: #5f6368;
          }

          &.success .stat-value {
            color: #137333;
          }

          &.failed .stat-value {
            color: #c5221f;
          }
        }
      }
    }
  }
}
</style>
