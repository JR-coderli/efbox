<template>
  <div class="g-report-container">
    <!-- 页面标题 -->
    <!-- <div class="g-page-header">
      <h1>Clickflare 报表管理</h1>
      <p class="g-subtitle">手动同步和查看广告归因报表数据</p>
    </div> -->

    <!-- 数据类型切换 -->
    <div class="g-card g-tabs-card">
      <div class="g-tabs">
        <button
          :class="['g-tab', { active: dataType === 'daily' }]"
          @click="switchDataType('daily')"
        >
          <svg class="g-tab-icon" viewBox="0 0 24 24">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          日数据
        </button>
        <button
          :class="['g-tab', { active: dataType === 'hourly' }]"
          @click="switchDataType('hourly')"
        >
          <svg class="g-tab-icon" viewBox="0 0 24 24">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          小时数据
        </button>
      </div>
    </div>

    <!-- ============ 日数据视图 ============ -->
    <template v-if="dataType === 'daily'">
      <!-- 同步管理弹窗 -->
      <div v-if="showSyncModules" class="g-dialog-overlay" @click.self="showSyncModules = false">
        <div class="g-dialog g-sync-dialog">
          <div class="g-dialog-header">
            <h3>同步管理</h3>
            <button class="g-btn g-btn-icon-only" @click="showSyncModules = false">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="g-dialog-body">
            <!-- 同步操作区域 -->
            <div class="g-card g-sync-card">
              <div class="g-card-header">
                <div class="g-card-title">
                  <svg class="g-icon" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                  </svg>
                  <span>数据同步</span>
                </div>
              </div>

        <!-- 单日期同步 -->
        <div class="g-sync-section">
          <div class="g-sync-row">
            <div class="g-date-picker-wrapper">
              <label class="g-label">选择日期</label>
              <el-date-picker
                v-model="selectedDate"
                type="date"
                placeholder="选择要同步的日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled-date="disabledDate"
                :clearable="false"
                @change="handleDateChange"
                class="g-date-picker"
              />
            </div>
            <button
              class="g-btn g-btn-primary"
              :disabled="!selectedDate || syncing"
              @click="handleSyncSingle()"
            >
              <svg v-if="!syncing" class="g-btn-icon" viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <svg v-if="syncing" class="g-spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                <path d="M12 2A10 10 0 0 1 22 12" stroke="currentColor" stroke-width="4" fill="none">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                </path>
              </svg>
              {{ syncing ? '同步中...' : '同步选中日期' }}
            </button>
            <div v-if="syncStatus[selectedDate]" :class="['g-status', syncStatus[selectedDate].success ? 'g-status-success' : 'g-status-error']">
              <svg v-if="syncStatus[selectedDate].success" class="g-status-icon" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <svg v-else class="g-status-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>{{ syncStatus[selectedDate].message }}</span>
            </div>
          </div>

          <div class="g-tip">
            <svg class="g-tip-icon" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>点击"同步选中日期"按钮从 Clickflare API 拉取指定日期的数据。如果数据已存在，将被覆盖更新。</span>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="g-quick-actions">
          <button class="g-btn g-btn-outlined" @click="handleSyncToday">
            <svg class="g-btn-icon" viewBox="0 0 24 24">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            同步今天
          </button>
          <button class="g-btn g-btn-outlined" @click="handleSyncYesterday">
            <svg class="g-btn-icon" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            同步昨天
          </button>
          <button class="g-btn g-btn-outlined" @click="handleSyncLast7Days">
            <svg class="g-btn-icon" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1v-1c0-2.76 2.24-5 5-5 2.05 0 3.81 1.23 4.56 3h1.44c.39-1.63 1.81-3 3.56-3 2.21 0 4 1.79 4 4s-1.79 4-4 4z"/>
            </svg>
            同步最近7天
          </button>
        </div>
      </div>

      <!-- 已同步日期列表 -->
      <div class="g-card g-dates-card">
        <div class="g-card-header">
          <div class="g-card-title">
            <svg class="g-icon" viewBox="0 0 24 24">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            <span>已同步日期</span>
          </div>
          <button class="g-btn g-btn-icon-only" @click="loadSyncedDates" title="刷新">
            <svg viewBox="0 0 24 24">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>

        <div class="g-table-wrapper g-table-wrapper-fixed" v-loading="loadingDates">
          <table class="g-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>记录数</th>
                <th>最后同步时间</th>
                <th class="g-actions-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in syncedDates" :key="row.date">
                <td><span class="g-date-badge">{{ row.date }}</span></td>
                <td>{{ row.record_count }}</td>
                <td>{{ formatDateTime(row.last_sync_at) }}</td>
                <td class="g-actions-col">
                  <button
                    class="g-btn g-btn-text g-btn-primary"
                    :disabled="syncing === row.date"
                    @click="handleSyncSingle(row.date)"
                  >
                    <svg v-if="syncing === row.date" class="g-spinner-small" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                      <path d="M12 2A10 10 0 0 1 22 12" stroke="currentColor" stroke-width="4" fill="none">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                    重新同步
                  </button>
                  <button class="g-btn g-btn-text g-btn-danger" @click="confirmDelete(row.date)">
                    删除
                  </button>
                </td>
              </tr>
              <tr v-if="syncedDates.length === 0">
                <td colspan="4" class="g-empty">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
          </div>
        </div>
      </div>

      <!-- 报表数据查看 -->
      <div class="g-card g-data-card">
        <div class="g-card-header">
          <div class="g-card-title">
            <svg class="g-icon" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <span>报表数据</span>
          </div>
          <div class="g-header-actions">
            <button class="g-btn g-btn-outlined" @click="toggleSyncModules">
              <svg class="g-btn-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              同步管理
            </button>
            <button class="g-btn g-btn-primary" @click="handleOpenDetailDialog">
              查看详细数据
            </button>
          </div>
        </div>

        <!-- 维度选择器条 -->
        <div class="dimension-bar">
          <!-- 已选择的维度列表（可拖拽） -->
          <div class="dimension-selected-list">
            <div
              v-for="(dimValue, index) in dailySelectedDimensions"
              :key="dimValue"
              class="dimension-selected-item"
              :data-index="index"
              draggable="true"
              @dragstart="handleDailyDragStart"
              @dragover.prevent="handleDailyDragOver"
              @drop="handleDailyDrop"
              @dragend="handleDailyDragEnd"
            >
              <svg class="g-drag-handle" viewBox="0 0 24 24">
                <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
              <span class="dimension-order-badge">{{ index + 1 }}</span>
              <span class="dimension-name">{{ getDailyDimensionLabel(dimValue) }}</span>
              <button class="g-dimension-remove" @click="removeDailyDimension(dimValue)" title="移除">
                <svg viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <!-- 添加维度按钮及下拉面板 -->
            <div class="dimension-add-wrapper" v-if="dailyAvailableDimensions.length > 0" ref="dailyDimensionPickerRef">
              <button
                class="dimension-add-btn"
                @click="dailyShowDimensionPicker = !dailyShowDimensionPicker"
                :class="{ 'dimension-add-btn-active': dailyShowDimensionPicker }"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                添加维度
              </button>

              <!-- 维度选择面板 -->
              <transition name="dimension-picker">
                <div v-if="dailyShowDimensionPicker" class="dimension-picker-panel">
                  <div class="dimension-picker-header">
                    <span>选择要添加的维度</span>
                  </div>
                  <div class="dimension-picker-list">
                    <div
                      v-for="dim in dailyAvailableDimensions"
                      :key="dim.value"
                      class="dimension-picker-item"
                      @click="addDailyDimension(dim.value)"
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
              </transition>
            </div>
          </div>

          <div class="dimension-hint" v-if="dailySelectedDimensions.length > 0">
            <span>点击维度展开 → {{ formatDailyDimensionPreview() }}</span>
          </div>
        </div>

        <div class="g-table-wrapper g-table-wrapper-fixed">
          <table class="g-table">
            <thead>
              <tr>
                <th>维度</th>
                <th>Clicks</th>
                <th>Conversions</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>CPA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(item, idx) in getDailyExpandedData()" :key="item.path">
                <!-- 主行 -->
                <tr class="g-daily-row g-nested-row" :style="{ paddingLeft: item.level * 16 + 'px' }">
                  <td @click="toggleDailyExpand(item)" class="g-clickable-cell g-nested-cell" :style="{ paddingLeft: (item.level * 16 + 8) + 'px' }">
                    <span v-if="dailyHasMoreLevels(item.level)" class="g-expand-icon-inline">
                      <svg v-if="isDailyItemExpanded(item)" class="g-expand-icon" viewBox="0 0 24 24">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                      </svg>
                      <svg v-else class="g-expand-icon" viewBox="0 0 24 24">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                      </svg>
                    </span>
                    <span v-else class="g-expand-placeholder"></span>
                    <span class="g-group-name">{{ item.group_name || '-' }}</span>
                  </td>
                  <td @click="toggleDailyExpand(item)" class="g-clickable-cell">{{ formatNumber(item.total_clicks) }}</td>
                  <td @click="toggleDailyExpand(item)" class="g-clickable-cell">{{ formatNumber(item.total_conversions) }}</td>
                  <td @click="toggleDailyExpand(item)" class="g-clickable-cell">${{ formatNumber(item.total_revenue) }}</td>
                  <td @click="toggleDailyExpand(item)" class="g-clickable-cell">${{ formatNumber(item.total_cost) }}</td>
                  <td @click="toggleDailyExpand(item)" class="g-clickable-cell">${{ formatNumber(item.avg_cpa) }}</td>
                  <td></td>
                </tr>
              </template>
              <tr v-if="getDailyExpandedData().length === 0">
                <td colspan="7" class="g-empty">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ============ 小时数据视图 ============ -->
    <template v-else>
      <!-- 实时数据同步弹窗 -->
      <div v-if="showHourlySyncDialog" class="g-dialog-overlay" @click.self="showHourlySyncDialog = false">
        <div class="g-dialog g-hourly-sync-dialog">
          <div class="g-dialog-header">
            <h3>实时数据同步</h3>
            <button class="g-btn g-btn-icon-only" @click="showHourlySyncDialog = false">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="g-dialog-body">
            <div class="g-sync-section">
              <div class="g-sync-row">
                <div class="g-date-picker-wrapper">
                  <label class="g-label">选择日期</label>
                  <el-date-picker
                    v-model="hourlySelectedDate"
                    type="date"
                    placeholder="选择要同步的日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    :disabled-date="disabledDate"
                    :clearable="false"
                    class="g-date-picker"
                  />
                </div>
                <button
                  class="g-btn g-btn-primary g-btn-realtime"
                  :disabled="!hourlySelectedDate || syncingHourly"
                  @click="handleSyncHourly"
                >
                  <svg v-if="!syncingHourly" class="g-btn-icon" viewBox="0 0 24 24">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  <svg v-if="syncingHourly" class="g-spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                    <path d="M12 2A10 10 0 0 1 22 12" stroke="currentColor" stroke-width="4" fill="none">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </path>
                  </svg>
                  {{ syncingHourly ? '同步中...' : '同步实时数据' }}
                </button>
                <div v-if="hourlySyncStatus" :class="['g-status', hourlySyncStatus.success ? 'g-status-success' : 'g-status-error']">
                  <span>{{ hourlySyncStatus.message }}</span>
                </div>
              </div>

              <div class="g-tip g-tip-info">
                <svg class="g-tip-icon" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <span>点击"同步实时数据"将从0点同步到当前时刻的小时数据。数据会不断更新，可多次点击同步最新数据。</span>
              </div>
            </div>

            <!-- 快捷同步 -->
            <div class="g-quick-actions">
              <button class="g-btn g-btn-outlined" @click="handleSyncTodayHourly">
                <svg class="g-btn-icon" viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                同步今天实时数据
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 小时数据已同步日期列表 -->
      <div class="g-card g-dates-card">
        <div class="g-card-header">
          <div class="g-card-title">
            <svg class="g-icon" viewBox="0 0 24 24">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            <span>小时数据 - 已同步日期</span>
          </div>
          <button class="g-btn g-btn-icon-only" @click="loadHourlySyncedDates" title="刷新">
            <svg viewBox="0 0 24 24">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>

        <div class="g-table-wrapper g-table-wrapper-fixed" v-loading="loadingHourlyDates">
          <table class="g-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>记录数</th>
                <th>最后同步时间</th>
                <th class="g-actions-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in hourlySyncedDates" :key="row.date">
                <td><span class="g-date-badge">{{ row.date }}</span></td>
                <td>{{ row.record_count }}</td>
                <td>{{ formatDateTime(row.last_sync_at) }}</td>
                <td class="g-actions-col">
                  <button class="g-btn g-btn-text g-btn-primary"
                    :disabled="syncingHourly"
                    @click="handleSyncHourlyForDate(row.date)"
                  >
                    重新同步
                  </button>
                  <button class="g-btn g-btn-text g-btn-danger" @click="confirmDeleteHourly(row.date)">
                    删除
                  </button>
                </td>
              </tr>
              <tr v-if="hourlySyncedDates.length === 0">
                <td colspan="4" class="g-empty">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 小时数据概览 -->
      <div class="g-card g-hourly-card">
        <div class="g-card-header">
          <div class="g-card-title">
            <svg class="g-icon" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <span>小时数据概览</span>
          </div>
          <div class="g-header-actions">
            <button class="g-btn g-btn-outlined" @click="toggleHourlySyncDialog">
              <svg class="g-btn-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              同步管理
            </button>
            <el-date-picker
              v-model="hourlyViewDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :disabled-date="disabledDate"
              :clearable="false"
              @change="loadHourlyData"
              class="g-date-picker-small"
            />
            <button class="g-btn g-btn-icon-only" @click="loadHourlyData" title="刷新">
              <svg viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 维度选择器条 -->
        <div class="dimension-bar">
          <!-- <div class="dimension-bar-label">
            <svg class="g-icon-small" viewBox="0 0 24 24">
              <path d="M3 17h18v-2H3v2zm0 3h18v-1H3v1zm0-7h18v-5H3v5zm0-9v2h18V4H3z"/>
            </svg>
            <span>展开维度：</span>
          </div> -->

          <!-- 已选择的维度列表（可拖拽） -->
          <div class="dimension-selected-list">
            <div
              v-for="(dimValue, index) in selectedDimensions"
              :key="dimValue"
              class="dimension-selected-item"
              :data-index="index"
              draggable="true"
              @dragstart="handleDragStart"
              @dragover.prevent="handleDragOver"
              @drop="handleDrop"
              @dragend="handleDragEnd"
            >
              <svg class="g-drag-handle" viewBox="0 0 24 24">
                <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
              <span class="dimension-order-badge">{{ index + 1 }}</span>
              <span class="dimension-name">{{ getDimensionLabel(dimValue) }}</span>
              <button class="g-dimension-remove" @click="removeDimension(dimValue)" title="移除">
                <svg viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <!-- 添加维度按钮及下拉面板 -->
            <div class="dimension-add-wrapper" v-if="availableDimensions.length > 0" ref="dimensionPickerRef">
              <button
                class="dimension-add-btn"
                @click="showDimensionPicker = !showDimensionPicker"
                :class="{ 'dimension-add-btn-active': showDimensionPicker }"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                添加维度
              </button>

              <!-- 维度选择面板 -->
              <transition name="dimension-picker">
                <div v-if="showDimensionPicker" class="dimension-picker-panel">
                  <div class="dimension-picker-header">
                    <span>选择要添加的维度</span>
                  </div>
                  <div class="dimension-picker-list">
                    <div
                      v-for="dim in availableDimensions"
                      :key="dim.value"
                      class="dimension-picker-item"
                      @click="addDimension(dim.value)"
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
              </transition>
            </div>
          </div>

          <div class="dimension-hint" v-if="selectedDimensions.length > 0">
            <span>点击维度 → {{ formatDimensionPreview() }}</span>
          </div>
        </div>

        <div class="g-table-wrapper g-table-wrapper-fixed" v-loading="loadingHourly">
          <table class="g-table">
            <thead>
              <tr>
                <th>维度</th>
                <th>Clicks</th>
                <th>Conversions</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>CPA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(item, idx) in getHourlyExpandedData()" :key="item.path">
                <!-- 主行 -->
                <tr class="g-daily-row g-nested-row" :style="{ paddingLeft: item.level * 16 + 'px' }">
                  <td @click="toggleHourlyExpand(item)" class="g-clickable-cell g-nested-cell" :style="{ paddingLeft: (item.level * 16 + 8) + 'px' }">
                    <span v-if="hourlyHasMoreLevels(item.level)" class="g-expand-icon-inline">
                      <svg v-if="isHourlyItemExpanded(item)" class="g-expand-icon" viewBox="0 0 24 24">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                      </svg>
                      <svg v-else class="g-expand-icon" viewBox="0 0 24 24">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                      </svg>
                    </span>
                    <span v-else class="g-expand-placeholder"></span>
                    <span class="g-group-name">{{ getHourlyItemDisplayLabel(item) }}</span>
                  </td>
                  <td @click="toggleHourlyExpand(item)" class="g-clickable-cell">{{ formatNumber(item.total_clicks) }}</td>
                  <td @click="toggleHourlyExpand(item)" class="g-clickable-cell">{{ formatNumber(item.total_conversions) }}</td>
                  <td @click="toggleHourlyExpand(item)" class="g-clickable-cell">${{ formatNumber(item.total_revenue) }}</td>
                  <td @click="toggleHourlyExpand(item)" class="g-clickable-cell">${{ formatNumber(item.total_cost) }}</td>
                  <td @click="toggleHourlyExpand(item)" class="g-clickable-cell">${{ formatNumber(item.avg_cpa) }}</td>
                  <td></td>
                </tr>
              </template>
              <tr v-if="getHourlyExpandedData().length === 0">
                <td colspan="7" class="g-empty">{{ hourlyViewDate }} 暂无小时数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 详细数据弹窗 -->
    <div v-if="showDataDialog" class="g-dialog-overlay" @click.self="showDataDialog = false">
      <div class="g-dialog">
        <div class="g-dialog-header">
          <h3>详细报表数据</h3>
          <button class="g-btn g-btn-icon-only" @click="showDataDialog = false">
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- 查询条件 -->
        <div class="g-filter-bar">
          <div class="g-filter-group">
            <el-date-picker
              v-model="filterForm.startDate"
              type="date"
              placeholder="开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="g-date-picker"
            />
            <span class="g-separator">至</span>
            <el-date-picker
              v-model="filterForm.endDate"
              type="date"
              placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="g-date-picker"
            />
          </div>
          <input
            v-model="filterForm.landingId"
            type="text"
            placeholder="落地页ID"
            class="g-input"
          />
          <input
            v-model="filterForm.trafficSourceId"
            type="text"
            placeholder="媒体ID"
            class="g-input"
          />
          <button class="g-btn g-btn-primary" @click="loadDetailData">查询</button>
          <button class="g-btn g-btn-outlined" @click="resetFilter">重置</button>
        </div>

        <!-- 详细数据表格 -->
        <div class="g-dialog-body" v-loading="loadingDetail">
          <div class="g-table-scroll">
            <table class="g-table g-table-small">
              <thead>
                <tr>
                  <th v-for="column in DETAIL_TABLE_COLUMNS" :key="column.key" :style="{ width: column.width, minWidth: column.minWidth }">
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in detailData" :key="idx">
                  <td v-for="column in DETAIL_TABLE_COLUMNS" :key="column.key" :class="column.key === 'syncTime' ? 'g-time-cell' : ''">
                    <span v-if="getDetailCellValue(row, column).type === 'date-badge'" class="g-date-badge">{{ getDetailCellValue(row, column).value }}</span>
                    <span v-else-if="getDetailCellValue(row, column).type === 'id-badge'" class="g-id-badge">{{ getDetailCellValue(row, column).value }}</span>
                    <template v-else-if="getDetailCellValue(row, column).type === 'currency'">${{ getDetailCellValue(row, column).value }}</template>
                    <template v-else>{{ getDetailCellValue(row, column).value }}</template>
                  </td>
                </tr>
                <tr v-if="detailData.length === 0">
                  <td :colspan="DETAIL_TABLE_COLUMNS.length" class="g-empty">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 分页 -->
        <div class="g-dialog-footer">
          <div class="g-pagination">
            <div class="g-pagination-info-group">
              <span class="g-pagination-info">共 {{ pagination.total }} 条</span>
              <span class="g-pagination-separator">|</span>
              <span class="g-pagination-info">每页 {{ pagination.size }} 条</span>
              <span class="g-pagination-separator">|</span>
              <span class="g-pagination-info">第 {{ pagination.page }} 页 / 共 {{ totalPages }} 页</span>
            </div>
            <div class="g-pagination-controls">
              <button class="g-btn g-btn-icon-only" :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">
                <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <span class="g-pagination-current">{{ pagination.page }}</span>
              <button class="g-btn g-btn-icon-only" :disabled="pagination.page * pagination.size >= pagination.total" @click="changePage(pagination.page + 1)">
                <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列选择器弹窗（已弃用，保留结构备用） -->
    <!-- 维度选择器已移至小时数据概览卡片中 -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'


import {
  syncReportByDate,
  syncReportByDates,
  getSyncedDates,
  deleteReportByDate,
  getReportSummary,
  getReportList,
  syncHourlyReport,
  getTodayHourlyReport,
  getHourlyReportSummary,
  getHourlyReportDetailByHour,
  getDailyReportDetailByDate,
  deleteHourlyReportByDate,
  getHourlySyncedDates
} from '@/services/main/webpage/report/report'


import { DETAIL_TABLE_COLUMNS } from './config/table-columns.config'


function getLocalDateString(date = new Date()) {
  if (typeof date === 'string') {
    return date
  }
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) {
    console.error('[getLocalDateString] 无效的日期:', date)
    return new Date().toISOString().split('T')[0]
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


function getCurrentHour() {
  return new Date().getHours()
}


const dataType = ref(localStorage.getItem('report_data_type') || 'daily')

const hourlyDataLoaded = ref(false)

function switchDataType(type) {
  dataType.value = type

  localStorage.setItem('report_data_type', type)
  if (type === 'hourly') {

    if (!hourlyViewDate.value) {
      hourlyViewDate.value = getLocalDateString()
      hourlySelectedDate.value = getLocalDateString()
    }

    if (!hourlyDataLoaded.value) {
      loadHourlyData()
      loadHourlySyncedDates()
      hourlyDataLoaded.value = true
    }
  } else {

    loadDailyLevelData(0, null)
  }
}


const selectedDate = ref(getLocalDateString())
const syncing = ref(false)
const syncStatus = ref({})
const syncedDates = ref([])
const loadingDates = ref(false)
const summaryData = ref([])
const loadingSummary = ref(false)
const groupBy = ref('date')

const dailyDimensionOptions = [
  { value: 'date', label: '日期' },
  { value: 'landing', label: '落地页' },
  { value: 'source', label: '媒体' },
  { value: 'offer', label: 'Offer' }
]
const dailySelectedDimensions = ref(['date'])
const dailyShowDimensionPicker = ref(false)
const dailyDimensionPickerRef = ref(null)

const dailyExpandedData = ref({})
const dailyLoadingPaths = ref({})


const hourlySelectedDate = ref(getLocalDateString())
const hourlyViewDate = ref(getLocalDateString())  // 查看的日期
const syncingHourly = ref(false)
const hourlySyncStatus = ref(null)
const hourlySummaryData = ref([])
const loadingHourly = ref(false)
const currentHour = ref(getCurrentHour())

const dimensionOptions = [
  { value: 'hour', label: '小时' },
  { value: 'landing', label: '落地页' },
  { value: 'source', label: '媒体' },
  { value: 'offer', label: 'Offer' }
]
const selectedDimensions = ref(['hour'])
const tempSelectedDimensions = ref(['hour'])
const showColumnSelector = ref(false)
const showDimensionPicker = ref(false)  // 控制维度选择面板显示
const dimensionPickerRef = ref(null)  // 小时数据维度选择器ref

const hourlyExpandedData = ref({ items: [], expandedPaths: new Set() })
const hourlyLoadingPaths = ref({})  // 记录正在加载的路径

const hourlySyncedDates = ref([])
const loadingHourlyDates = ref(false)


const draggedItemIndex = ref(null)
const dragOverItemIndex = ref(null)

const dailyDraggedItemIndex = ref(null)
const dailyDragOverItemIndex = ref(null)


const showSyncModules = ref(false)  // 控制同步模块显示/隐藏
const showHourlySyncDialog = ref(false)  // 控制小时数据同步弹窗显示/隐藏
const showDataDialog = ref(false)
const detailData = ref([])
const loadingDetail = ref(false)
const filterForm = ref({
  startDate: null,
  endDate: null,
  landingId: '',
  trafficSourceId: ''
})
const pagination = ref({
  page: 1,
  size: 20,
  total: 0
})


const groupByLabel = computed(() => {
  const labels = {
    date: '日期',
    landing: '落地页',
    source: '媒体',
    offer: 'Offer'
  }
  return labels[groupBy.value] || '分组'
})


const availableDimensions = computed(() => {
  return dimensionOptions.filter(dim => !selectedDimensions.value.includes(dim.value))
})


const dailyAvailableDimensions = computed(() => {
  return dailyDimensionOptions.filter(dim => !dailySelectedDimensions.value.includes(dim.value))
})


const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.size) || 1
})


const remainingPages = computed(() => {
  return Math.max(0, totalPages.value - pagination.value.page)
})


function getGroupById(row) {
  switch (groupBy.value) {
    case 'landing': return row.landing_id
    case 'source': return row.traffic_source_id
    case 'offer': return row.offer_id
    default: return row.date
  }
}


function formatNumber(val) {
  if (val === null || val === undefined) return '-'
  const num = Number(val)
  if (isNaN(num)) return '-'
  return num.toFixed(2)
}


function disabledDate(time) {
  return time.getTime() > Date.now()
}


function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}


function getDetailCellValue(row, column) {
  switch (column.key) {
    case 'date':
      return { type: 'date-badge', value: row.date }
    case 'landingId':
      return { type: 'id-badge', value: row.landing_id }
    case 'landingName':
      return { type: 'text', value: row.landing_name || '-' }
    case 'sourceId':
      return { type: 'text', value: row.traffic_source_id || '-' }
    case 'trafficSourceName':
      return { type: 'text', value: row.traffic_source_name || '-' }
    case 'offerId':
      return { type: 'text', value: row.offer_id || '-' }
    case 'offerName':
      return { type: 'text', value: row.offer_name || '-' }
    case 'clicks':
      return { type: 'text', value: row.clicks }
    case 'conversions':
      return { type: 'text', value: row.conversions }
    case 'revenue':
      return { type: 'currency', value: formatNumber(row.revenue) }
    case 'cost':
      return { type: 'currency', value: formatNumber(row.cost) }
    case 'cpa':
      return { type: 'currency', value: formatNumber(row.cpa) }
    case 'syncTime':
      return { type: 'time', value: formatDateTime(row.synced_at) }
    default:
      return { type: 'text', value: '-' }
  }
}


function handleDateChange(val) {
  console.log('[日期选择器变化] val:', val, '类型:', typeof val)
}


function changePage(page) {
  pagination.value.page = page
  loadDetailData()
}




async function handleSyncSingle(dateInput) {
  let date = dateInput || selectedDate.value

  if (typeof selectedDate.value !== 'string') {
    selectedDate.value = getLocalDateString(selectedDate.value)
  }

  if (typeof date !== 'string') {
    date = getLocalDateString(date)
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    console.error('[同步] 无效的日期格式:', date)
    ElMessage.error('日期格式无效，请重新选择日期')
    return
  }

  console.log('[同步] 发送日期:', date, '类型:', typeof date, 'selectedDate:', selectedDate.value)

  syncing.value = true
  syncStatus.value[date] = { success: false, message: '同步中...' }

  try {
    const result = await syncReportByDate(date)
    console.log('[同步] API 返回:', result)
    syncStatus.value[date] = {
      success: result.code === 0,
      message: result.code === 0
        ? `同步成功，共 ${result.data.totalRecords} 条记录`
        : result.message || '同步失败'
    }
    if (result.code === 0) {
      ElMessage.success(`${date} 同步成功`)
      loadSyncedDates()
      loadSummaryData()
    } else {
      ElMessage.error(result.message || '同步失败')
    }
  } catch (error) {
    syncStatus.value[date] = { success: false, message: '同步失败' }
    ElMessage.error(`同步失败: ${error.message}`)
  } finally {
    syncing.value = false
  }
}


function handleSyncToday() {
  const today = getLocalDateString()
  handleSyncSingle(today)
}


function handleSyncYesterday() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  handleSyncSingle(getLocalDateString(yesterday))
}


async function handleSyncLast7Days() {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(getLocalDateString(d))
  }

  await ElMessageBox.confirm(
    `即将同步最近 7 天的数据（${dates[0]} 至 ${dates[6]}），是否继续？`,
    '批量同步确认',
    { type: 'warning' }
  )

  syncing.value = 'batch'
  try {
    const result = await syncReportByDates(dates, false)
    if (result.success || result.data.failCount === 0) {
      ElMessage.success(`批量同步完成，成功 ${result.data.successCount} 天`)
    } else {
      ElMessage.warning(`批量同步完成，成功 ${result.data.successCount} 天，失败 ${result.data.failCount} 天`)
    }
    loadSyncedDates()
    loadSummaryData()
  } catch (error) {
    ElMessage.error(`批量同步失败: ${error.message}`)
  } finally {
    syncing.value = false
  }
}


async function confirmDelete(date) {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${date} 的所有数据吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await handleDeleteDate(date)
  } catch {

  }
}


async function handleDeleteDate(date) {
  try {
    const result = await deleteReportByDate(date)
    if (result.code === 0) {
      ElMessage.success(`删除 ${date} 数据成功`)
      loadSyncedDates()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    ElMessage.error(`删除失败: ${error.message}`)
  }
}


async function loadSyncedDates() {
  loadingDates.value = true
  try {
    const result = await getSyncedDates(100)
    if (result.code === 0) {
      syncedDates.value = result.data
    }
  } catch (error) {
    console.error('加载同步日期失败:', error)
  } finally {
    loadingDates.value = false
  }
}


async function loadHourlySyncedDates() {
  loadingHourlyDates.value = true
  try {
    const result = await getHourlySyncedDates(100)
    if (result.code === 0) {
      hourlySyncedDates.value = result.data
    }
  } catch (error) {
    console.error('加载小时数据同步日期失败:', error)
  } finally {
    loadingHourlyDates.value = false
  }
}


async function confirmDeleteHourly(date) {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${date} 的所有小时数据吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await handleDeleteHourlyDate(date)
  } catch {

  }
}


async function handleDeleteHourlyDate(date) {
  try {
    const result = await deleteHourlyReportByDate(date)
    if (result.code === 0) {
      ElMessage.success(`删除 ${date} 小时数据成功`)
      loadHourlySyncedDates()

      if (date === hourlyViewDate.value) {
        loadHourlyData()
      }
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    ElMessage.error(`删除失败: ${error.message}`)
  }
}


async function loadSummaryData() {
  loadingSummary.value = true
  try {
    const result = await getReportSummary({
      groupBy: groupBy.value
    })
    console.log('[统计数据] API 返回:', result)
    if (result.code === 0) {
      summaryData.value = result.data || []
    } else {
      console.error('[统计数据] 返回错误:', result.message)
      ElMessage.error(result.message || '加载统计数据失败')
    }
  } catch (error) {
    console.error('[统计数据] 请求失败:', error)
    ElMessage.error('加载统计数据失败: ' + error.message)
  } finally {
    loadingSummary.value = false
  }
}




async function loadDailyLevelData(level, parentItem = null) {
  if (dailySelectedDimensions.value.length === 0) return

  const currentDimension = dailySelectedDimensions.value[level]
  if (!currentDimension) return


  const pathKey = parentItem ? parentItem.path : ''


  if (!dailyExpandedData.value['root']) {
    dailyExpandedData.value['root'] = { items: [], expandedPaths: new Set() }
  }


  const filters = {}
  if (parentItem) {
    Object.assign(filters, parentItem.filterValues)
  }


  const loadingKey = `root-${pathKey}`
  dailyLoadingPaths.value[loadingKey] = true

  try {

    const endDate = getLocalDateString()

    const startDateObj = new Date()
    startDateObj.setDate(startDateObj.getDate() - 30)
    const startDate = getLocalDateString(startDateObj)

    const result = await getDailyReportDetailByDate({
      startDate,
      endDate,
      groupBy: currentDimension,
      filters: filters,
      level: level
    })

    if (result.code === 0) {
      const data = result.data || []


      const processedItems = data.map((item, idx) => {
        const itemPath = pathKey ? `${pathKey},${level}-${idx}` : `${level}-${idx}`
        const field = getDailyDimensionField(currentDimension)

        return {
          ...item,
          level: level,
          path: itemPath,

          filterValues: parentItem ? {
            ...parentItem.filterValues,
            [field]: item.group_id
          } : {
            [field]: item.group_id
          }
        }
      })


      if (pathKey !== '') {
        dailyExpandedData.value['root'].expandedPaths.add(pathKey + ',')
      }



      if (pathKey === '') {
        dailyExpandedData.value['root'].items = processedItems
        dailyExpandedData.value['root'].expandedPaths = new Set()
      } else {

        const existingItems = dailyExpandedData.value['root'].items || []
        const filteredItems = existingItems.filter(oldItem => {
          return !oldItem.path.startsWith(pathKey + ',')
        })


        let newItems = [...filteredItems]
        if (parentItem) {
          const parentIndex = newItems.findIndex(i => i.path === pathKey)
          if (parentIndex !== -1) {
            newItems = [
              ...newItems.slice(0, parentIndex + 1),
              ...processedItems,
              ...newItems.slice(parentIndex + 1)
            ]
          } else {
            newItems = [...newItems, ...processedItems]
          }
        } else {
          newItems = [...filteredItems, ...processedItems]
        }

        dailyExpandedData.value['root'].items = newItems
      }
    } else {
      ElMessage.error(result.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败: ' + error.message)
  } finally {
    dailyLoadingPaths.value[loadingKey] = false
  }
}


function getDailyDimensionField(dimension) {
  const fieldMap = {
    date: 'date',
    landing: 'landing_id',
    source: 'traffic_source_id',
    offer: 'offer_id'
  }
  return fieldMap[dimension] || dimension + '_id'
}


async function toggleDailyExpand(item) {
  const rootData = dailyExpandedData.value['root']
  if (!rootData) return

  const pathKey = item.path
  const expandedPathKey = pathKey + ','
  const isExpanded = rootData.expandedPaths.has(expandedPathKey)

  if (isExpanded) {

    rootData.expandedPaths.delete(expandedPathKey)

    rootData.items = rootData.items.filter(oldItem => !oldItem.path.startsWith(expandedPathKey))
  } else {

    await loadDailyLevelData(item.level + 1, item)
  }
}


function isDailyItemExpanded(item) {
  const rootData = dailyExpandedData.value['root']
  if (!rootData) return false
  return rootData.expandedPaths.has(item.path + ',')
}


function dailyHasMoreLevels(level) {
  return level < dailySelectedDimensions.value.length - 1
}


function getDailyExpandedData() {
  const rootData = dailyExpandedData.value['root']
  if (!rootData) return []
  return rootData.items || []
}


function addDailyDimension(value) {
  if (!dailySelectedDimensions.value.includes(value)) {
    dailySelectedDimensions.value.push(value)

  }
  if (dailyAvailableDimensions.value.length === 0) {
    dailyShowDimensionPicker.value = false
  }
}

function removeDailyDimension(value) {
  const idx = dailySelectedDimensions.value.indexOf(value)
  if (idx >= 0 && dailySelectedDimensions.value.length > 1) {
    dailySelectedDimensions.value.splice(idx, 1)

  } else if (dailySelectedDimensions.value.length === 1) {
    ElMessage.warning('至少保留一个维度')
  }
}


function handleDailyDragStart(event) {
  const index = parseInt(event.target.dataset.index)
  dailyDraggedItemIndex.value = index
  event.target.classList.add('dragging')
  event.dataTransfer.effectAllowed = 'move'
}

function handleDailyDragOver(event) {
  event.preventDefault()
  const target = event.target.closest('.dimension-selected-item')
  if (target) {
    const index = parseInt(target.dataset.index)
    if (index !== dailyDraggedItemIndex.value) {
      dailyDragOverItemIndex.value = index
    }
  }
}

function handleDailyDrop(event) {
  event.preventDefault()
  const target = event.target.closest('.dimension-selected-item')
  if (!target) return

  const toIndex = parseInt(target.dataset.index)
  const fromIndex = dailyDraggedItemIndex.value

  if (fromIndex === toIndex) return


  const newDimensions = [...dailySelectedDimensions.value]
  const [movedItem] = newDimensions.splice(fromIndex, 1)
  newDimensions.splice(toIndex, 0, movedItem)

  dailySelectedDimensions.value = newDimensions

}

function handleDailyDragEnd(event) {
  event.target.classList.remove('dragging')
  dailyDraggedItemIndex.value = null
  dailyDragOverItemIndex.value = null
}


function formatDailyDimensionPreview() {
  return dailySelectedDimensions.value
    .map((val, idx) => {
      const label = dailyDimensionOptions.find(d => d.value === val)?.label || val
      return `[${idx + 1}] ${label}`
    })
    .join(' → ')
}


function getDailyDimensionLabel(value) {
  const dim = dailyDimensionOptions.find(d => d.value === value)
  return dim ? dim.label : value
}




function handleClickOutside(event) {

  if (showDimensionPicker.value && dimensionPickerRef.value) {
    const picker = dimensionPickerRef.value
    if (!picker.contains(event.target)) {

      const addButton = event.target.closest('.dimension-add-btn')
      if (!addButton) {
        showDimensionPicker.value = false
      }
    }
  }


  if (dailyShowDimensionPicker.value && dailyDimensionPickerRef.value) {
    const picker = dailyDimensionPickerRef.value
    if (!picker.contains(event.target)) {

      const addButton = event.target.closest('.dimension-add-btn')
      if (!addButton) {
        dailyShowDimensionPicker.value = false
      }
    }
  }
}




async function handleSyncHourly() {
  const date = hourlySelectedDate.value
  if (!date) {
    ElMessage.error('请选择日期')
    return
  }

  syncingHourly.value = true
  hourlySyncStatus.value = { success: false, message: '同步中...' }

  try {
    const result = await syncHourlyReport(date)
    hourlySyncStatus.value = {
      success: result.code === 0,
      message: result.code === 0
        ? `同步成功，共 ${result.data.hours} 小时，${result.data.totalRecords} 条记录，耗时 ${result.data.duration} 秒`
        : result.message || '同步失败'
    }
    if (result.code === 0) {
      ElMessage.success(`同步成功`)
      loadHourlyData()
    }
  } catch (error) {
    hourlySyncStatus.value = { success: false, message: '同步失败' }
    ElMessage.error(`同步失败: ${error.message}`)
  } finally {
    syncingHourly.value = false
  }
}


function handleSyncTodayHourly() {
  hourlySelectedDate.value = getLocalDateString()
  handleSyncHourly()
}


async function handleSyncHourlyForDate(date) {
  syncingHourly.value = true
  try {
    const result = await syncHourlyReport(date)
    if (result.code === 0) {
      ElMessage.success(`${date} 小时数据同步成功`)
      loadHourlySyncedDates()
      if (date === hourlyViewDate.value) {
        loadHourlyData()
      }
    } else {
      ElMessage.error(result.message || '同步失败')
    }
  } catch (error) {
    ElMessage.error(`同步失败: ${error.message}`)
  } finally {
    syncingHourly.value = false
  }
}


async function loadHourlyData() {
  loadingHourly.value = true
  currentHour.value = getCurrentHour()

  try {

    const groupBy = selectedDimensions.value[0] || 'hour'
    const result = await getHourlyReportSummary({
      startDate: hourlyViewDate.value,
      endDate: hourlyViewDate.value,
      groupBy
    })
    if (result.code === 0) {
      let data = result.data || []

      if (groupBy === 'hour') {
        data.sort((a, b) => a.hour - b.hour)
      }


      hourlyExpandedData.value = {
        items: data.map((item, index) => {

          let filterValues = {}
          const firstDimension = selectedDimensions.value[0] || 'hour'

          if (firstDimension === 'hour') {
            filterValues = { hour: item.hour }
          } else if (firstDimension === 'landing') {
            filterValues = { landing_id: item.group_id }
          } else if (firstDimension === 'source') {
            filterValues = { traffic_source_id: item.group_id }
          } else if (firstDimension === 'offer') {
            filterValues = { offer_id: item.group_id }
          }

          return {
            ...item,
            path: `0-${index}`,
            level: 0,
            filterValues: filterValues
          }
        }),
        expandedPaths: new Set()
      }
    }
  } catch (error) {
    console.error('加载小时数据失败:', error)
    ElMessage.error('加载小时数据失败: ' + error.message)
  } finally {
    loadingHourly.value = false
  }
}




async function toggleHourlyExpand(item) {
  const pathKey = item.path
  const expandedPathKey = pathKey + ','
  const isExpanded = hourlyExpandedData.value.expandedPaths.has(expandedPathKey)

  if (isExpanded) {

    hourlyExpandedData.value.expandedPaths.delete(expandedPathKey)

    hourlyExpandedData.value.items = hourlyExpandedData.value.items.filter(oldItem => !oldItem.path.startsWith(expandedPathKey))
  } else {

    await loadHourlyLevelData(item.level + 1, item)
  }
}


function isHourlyItemExpanded(item) {
  return hourlyExpandedData.value.expandedPaths.has(item.path + ',')
}


function hourlyHasMoreLevels(level) {
  return level < selectedDimensions.value.length - 1
}


function getHourlyExpandedData() {
  return hourlyExpandedData.value.items || []
}


function getHourlyItemDisplayLabel(item) {

  return item.group_name || '-'
}


function getHourlyDimensionField(dimension) {
  const fieldMap = {
    hour: 'hour',
    landing: 'landing_id',
    source: 'traffic_source_id',
    offer: 'offer_id'
  }
  return fieldMap[dimension] || dimension + '_id'
}


async function loadHourlyLevelData(level, parentItem) {
  if (selectedDimensions.value.length === 0) return

  const currentDimension = selectedDimensions.value[level]
  if (!currentDimension) return


  const pathKey = parentItem ? parentItem.path : ''


  const filters = {}
  if (parentItem) {

    Object.assign(filters, parentItem.filterValues || {})
  }


  const loadingKey = `root-${pathKey}`
  hourlyLoadingPaths.value[loadingKey] = true

  try {

    const params = {
      date: hourlyViewDate.value,
      groupBy: currentDimension,
      filters: filters,
      level: level
    }



    if (currentDimension !== 'hour') {


      if (filters.hour !== undefined && filters.hour !== null) {
        params.hour = filters.hour
      }

    }









    const result = await getHourlyReportDetailByHour(params)



    if (result.code === 0) {
      const data = result.data || []


      const processedItems = data.map((item, idx) => {
        const group_id = item.group_id
        const group_name = item.group_name
        const itemPath = pathKey ? `${pathKey},${level}-${idx}` : `${level}-${idx}`
        const field = getHourlyDimensionField(currentDimension)

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
            [field]: group_id
          }
        }
      })


      hourlyExpandedData.value.expandedPaths.add(pathKey + ',')


      const existingItems = hourlyExpandedData.value.items || []
      const filteredItems = existingItems.filter(oldItem => {
        if (pathKey === '') {
          return false
        }
        return !oldItem.path.startsWith(pathKey + ',')
      })


      let newItems = [...filteredItems]
      if (pathKey !== '' && parentItem) {
        const parentIndex = newItems.findIndex(i => i.path === pathKey)
        if (parentIndex !== -1) {
          newItems = [
            ...newItems.slice(0, parentIndex + 1),
            ...processedItems,
            ...newItems.slice(parentIndex + 1)
          ]
        } else {
          newItems = [...newItems, ...processedItems]
        }
      } else {
        newItems = [...filteredItems, ...processedItems]
      }

      hourlyExpandedData.value.items = newItems
    } else {
      ElMessage.error(result.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败: ' + error.message)
  } finally {
    hourlyLoadingPaths.value[loadingKey] = false
  }
}









function isDimensionSelected(value) {
  return selectedDimensions.value.includes(value)
}


function getDimensionOrder(value) {
  const idx = selectedDimensions.value.indexOf(value)
  return idx >= 0 ? idx + 1 : null
}


function toggleDimension(value) {
  const idx = selectedDimensions.value.indexOf(value)
  if (idx >= 0) {

    if (selectedDimensions.value.length > 1) {
      selectedDimensions.value.splice(idx, 1)
    } else {
      ElMessage.warning('至少保留一个维度')
      return
    }
  } else {

    selectedDimensions.value.push(value)
  }

  hourlyExpandedData.value = { items: [], expandedPaths: new Set() }
  loadHourlyData()
}


function formatDimensionPreview() {
  return selectedDimensions.value
    .map((val, idx) => {
      const label = dimensionOptions.find(d => d.value === val)?.label || val
      return `[${idx + 1}] ${label}`
    })
    .join(' → ')
}


function getDimensionLabel(value) {
  const dim = dimensionOptions.find(d => d.value === value)
  return dim ? dim.label : value
}



function handleDragStart(event) {
  const index = parseInt(event.target.dataset.index)
  draggedItemIndex.value = index
  event.target.classList.add('dragging')
  event.dataTransfer.effectAllowed = 'move'
}


function handleDragOver(event) {
  event.preventDefault()
  const target = event.target.closest('.dimension-selected-item')
  if (target) {
    const index = parseInt(target.dataset.index)
    if (index !== draggedItemIndex.value) {
      dragOverItemIndex.value = index
    }
  }
}


function handleDrop(event) {
  event.preventDefault()
  const target = event.target.closest('.dimension-selected-item')
  if (!target) return

  const toIndex = parseInt(target.dataset.index)
  const fromIndex = draggedItemIndex.value

  if (fromIndex === toIndex) return


  const newDimensions = [...selectedDimensions.value]
  const [movedItem] = newDimensions.splice(fromIndex, 1)
  newDimensions.splice(toIndex, 0, movedItem)

  selectedDimensions.value = newDimensions

  hourlyExpandedData.value = { items: [], expandedPaths: new Set() }
  loadHourlyData()
}


function handleDragEnd(event) {
  event.target.classList.remove('dragging')
  draggedItemIndex.value = null
  dragOverItemIndex.value = null
}



function addDimension(value) {
  if (!selectedDimensions.value.includes(value)) {
    selectedDimensions.value.push(value)

    hourlyExpandedData.value = { items: [], expandedPaths: new Set() }
    loadHourlyData()
  }

  if (availableDimensions.value.length === 0) {
    showDimensionPicker.value = false
  }
}


function removeDimension(value) {
  const idx = selectedDimensions.value.indexOf(value)
  if (idx >= 0 && selectedDimensions.value.length > 1) {
    selectedDimensions.value.splice(idx, 1)

    hourlyExpandedData.value = { items: [], expandedPaths: new Set() }
    loadHourlyData()
  } else if (selectedDimensions.value.length === 1) {
    ElMessage.warning('至少保留一个维度')
  }
}


function isDimensionChecked(value) {
  return tempSelectedDimensions.value.includes(value)
}


function getDimensionLevel(value) {
  const idx = tempSelectedDimensions.value.indexOf(value)
  return idx >= 0 ? idx + 1 : null
}


function handleDimensionCheck() {

}


function handleApplyDimensions() {
  if (tempSelectedDimensions.value.length === 0) {
    ElMessage.warning('请至少选择一个维度')
    return
  }
  selectedDimensions.value = [...tempSelectedDimensions.value]
  showColumnSelector.value = false

  expandedHoursData.value = {}
}


function handleResetDimensions() {
  tempSelectedDimensions.value = ['landing']
}




function toggleSyncModules() {
  showSyncModules.value = !showSyncModules.value
}


function toggleHourlySyncDialog() {
  showHourlySyncDialog.value = !showHourlySyncDialog.value
}


async function loadDetailData() {
  loadingDetail.value = true
  try {
    const result = await getReportList({
      startDate: filterForm.value.startDate,
      endDate: filterForm.value.endDate,
      landingId: filterForm.value.landingId || undefined,
      trafficSourceId: filterForm.value.trafficSourceId || undefined,
      offset: (pagination.value.page - 1) * pagination.value.size,
      size: pagination.value.size,
      sortBy: 'date',
      sortOrder: 'desc'
    })
    console.log('[详细数据] API 返回:', result)
    if (result.code === 0) {
      detailData.value = result.data?.list || []
      pagination.value.total = result.data?.total || 0
    } else {
      console.error('[详细数据] 返回错误:', result.message)
      ElMessage.error(result.message || '加载详细数据失败')
    }
  } catch (error) {
    console.error('[详细数据] 请求失败:', error)
    ElMessage.error('加载详细数据失败: ' + error.message)
  } finally {
    loadingDetail.value = false
  }
}


function resetFilter() {
  filterForm.value = {
    startDate: null,
    endDate: null,
    landingId: '',
    trafficSourceId: ''
  }
  pagination.value.page = 1
  loadDetailData()
}


async function handleOpenDetailDialog() {
  showDataDialog.value = true
  filterForm.value.startDate = null
  filterForm.value.endDate = null
  pagination.value.page = 1
  await loadDetailData()
}


onMounted(() => {
  loadSyncedDates()
  loadSummaryData()


  if (dataType.value === 'hourly') {

    loadHourlyData()
    loadHourlySyncedDates()
    hourlyDataLoaded.value = true
  } else {

    loadDailyLevelData(0, null)
  }


  document.addEventListener('click', handleClickOutside)
})


onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})


watch(dailySelectedDimensions, () => {

  if (dailySelectedDimensions.value.length > 0) {
    loadDailyLevelData(0, null)
  }
}, { deep: true })
</script>

<style lang="less" scoped>

.g-report-container {
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
  font-family: 'Google Sans', 'Roboto', 'Segoe UI', Arial, sans-serif;


  .g-page-header {
    margin-bottom: 24px;

    h1 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 400;
      color: #202124;
    }

    .g-subtitle {
      margin: 0;
      font-size: 14px;
      color: #5f6368;
    }
  }


  .g-card {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
    margin-bottom: 16px;
    overflow: hidden;
  }

  .g-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e8eaed;
  }

  .g-card-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 16px;
    font-weight: 500;
    color: #202124;
  }

  .g-icon {
    width: 20px;
    height: 20px;
    fill: #5f6368;
  }

  .g-header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }


  .g-tabs-card {
    padding: 0;
    overflow: hidden;
  }

  .g-tabs {
    display: flex;
    gap: 0;
  }

  .g-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 24px;
    border: none;
    background: transparent;
    color: #5f6368;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;

    .g-tab-icon {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    &:hover {
      background: #f1f3f4;
    }

    &.active {
      color: #1a73e8;
      border-bottom-color: #1a73e8;
    }
  }


  .g-sync-dialog {
    width: 95%;
    max-width: 900px;
    max-height: 85vh;

    .g-dialog-body {
      padding: 16px;
      overflow-y: auto;
    }
  }


  .g-hourly-sync-dialog {
    width: 95%;
    max-width: 500px !important;
    max-height: 80vh;

    .g-dialog-body {
      padding: 20px 24px;
      overflow-y: auto;
    }

    .g-sync-section {
      padding: 0;
      margin-bottom: 20px;
    }

    .g-sync-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .g-date-picker-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .g-label {
        font-size: 12px;
        font-weight: 500;
        color: #5f6368;
      }
    }

    :deep(.g-date-picker) {
      .el-input__wrapper {
        border-radius: 8px;
        border: 1px solid #dadce0;
        box-shadow: none;
        padding: 8px 12px;
        transition: all 0.2s;

        &:hover {
          border-color: #1a73e8;
        }

        &.is-focus {
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
        }
      }
    }

    .g-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;

      &.g-status-success {
        background: #e6f4ea;
        color: #137333;
      }

      &.g-status-error {
        background: #fce8e6;
        color: #c5221f;
      }

      .g-status-icon {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
    }

    .g-tip {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #f1f3f4;
      border-radius: 8px;
      font-size: 13px;
      color: #5f6368;
      line-height: 1.5;

      &.g-tip-info {
        background: #e8f0fe;
        color: #1967d2;

        .g-tip-icon {
          fill: #1967d2;
        }
      }

      .g-tip-icon {
        width: 18px;
        height: 18px;
        fill: #5f6368;
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    .g-quick-actions {
      display: flex;
      gap: 12px;
      padding: 0;
      border-top: none;
      padding-top: 0;
    }
  }

  .g-sync-card {
    margin-bottom: 16px;
    box-shadow: none;
    border: 1px solid #e8eaed;

    .g-sync-section {
      padding: 20px 24px;
    }

    .g-sync-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .g-date-picker-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .g-label {
        font-size: 12px;
        font-weight: 500;
        color: #5f6368;
      }
    }

    :deep(.g-date-picker) {
      .el-input__wrapper {
        border-radius: 8px;
        border: 1px solid #dadce0;
        box-shadow: none;
        padding: 8px 12px;
        transition: all 0.2s;

        &:hover {
          border-color: #1a73e8;
        }

        &.is-focus {
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
        }
      }
    }

    .g-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;

      &.g-status-success {
        background: #e6f4ea;
        color: #137333;
      }

      &.g-status-error {
        background: #fce8e6;
        color: #c5221f;
      }

      .g-status-icon {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
    }

    .g-tip {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #f1f3f4;
      border-radius: 8px;
      font-size: 13px;
      color: #5f6368;
      line-height: 1.5;

      .g-tip-icon {
        width: 18px;
        height: 18px;
        fill: #5f6368;
        flex-shrink: 0;
        margin-top: 2px;
      }

      &.g-tip-info {
        background: #e8f0fe;
        color: #1967d2;

        .g-tip-icon {
          fill: #1967d2;
        }
      }
    }

    .g-quick-actions {
      display: flex;
      gap: 12px;
      padding: 0 24px 20px;
      border-top: 1px solid #e8eaed;
      padding-top: 20px;
    }
  }


  .g-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;

    .g-btn-icon {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    .g-spinner {
      width: 16px;
      height: 16px;

      &-small {
        width: 14px;
        height: 14px;
        display: inline-block;
      }
    }

    &:hover:not(:disabled) {
      box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
    }

    &:active:not(:disabled) {
      box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.g-btn-primary {
      background: #1a73e8;
      color: #ffffff;

      &:hover:not(:disabled) {
        background: #1557b0;
      }

      &.g-btn-realtime {
        background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
      }
    }

    &.g-btn-outlined {
      background: transparent;
      color: #1a73e8;
      border: 1px solid #dadce0;

      &:hover:not(:disabled) {
        background: #f1f3f4;
        border-color: #dadce0;
      }
    }

    &.g-btn-text {
      background: transparent;
      color: #1a73e8;
      padding: 8px 16px;
      border-radius: 4px;

      &:hover:not(:disabled) {
        background: #f1f3f4;
      }

      &.g-btn-danger {
        color: #c5221f;

        &:hover:not(:disabled) {
          background: #fce8e6;
        }
      }
    }

    &.g-btn-icon-only {
      padding: 8px;
      border-radius: 50%;
      background: transparent;
      color: #5f6368;
      fill: #5f6368;

      svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      &:hover:not(:disabled) {
        background: #f1f3f4;
      }
    }

    &.g-btn-small {
      padding: 6px 12px;
      font-size: 12px;

      .g-btn-icon {
        width: 14px;
        height: 14px;
      }
    }
  }


  .g-select-wrapper {
    position: relative;

    .g-select {
      padding: 10px 36px 10px 16px;
      border: 1px solid #dadce0;
      border-radius: 8px;
      background: #ffffff;
      font-size: 14px;
      color: #202124;
      cursor: pointer;
      appearance: none;
      font-family: inherit;

      &:hover {
        border-color: #1a73e8;
      }

      &:focus {
        outline: none;
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
      }

      &.g-select-small {
        padding: 8px 28px 8px 12px;
        font-size: 13px;
        border-radius: 6px;
      }
    }
  }


  .g-table-wrapper {
    padding: 0 24px 24px;

    .g-loading-mask {
      background: rgba(255, 255, 255, 0.8);
    }
  }


  .g-table-wrapper-fixed {
    max-height: 500px;
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
        text-align: left;
        padding: 12px 16px;
        font-weight: 500;
        color: #5f6368;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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

    .g-actions-col {
      width: 150px;
    }

    .g-empty {
      text-align: center;
      padding: 40px;
      color: #5f6368;
    }
  }

  .g-table-small {
    font-size: 13px;

    thead th {
      padding: 10px 12px;
      font-size: 11px;
    }

    tbody td {
      padding: 10px 12px;
    }
  }







  .g-hourly-card {
    .g-hour-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #e8f0fe;
      color: #1967d2;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      min-width: 50px;
      text-align: center;
    }


    .g-clickable-cell {
      cursor: pointer;

      &:hover {
        background: #f1f3f4;
      }
    }


    .g-expand-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-left: 8px;
      fill: #5f6368;
      transition: transform 0.2s;
    }


    .g-hourly-row {
      &:hover {
        background: #f8f9fa;
      }

      &.g-hourly-row-expanded {
        background: #f1f3f4;
        border-bottom: none;

        .g-expand-icon {
          transform: rotate(180deg);
        }
      }
    }


    .g-hourly-detail-row {
      background: #fafafa;

      &:hover {
        background: #f5f5f5;
      }
    }


    .g-hourly-detail-cell {
      padding: 0;
      border: none;
    }


    .g-hourly-detail-content {
      max-height: 480px;
      overflow-y: auto;
      padding: 16px 24px;
      background: #fafafa;
      border-radius: 0;
      padding-top: 0px;

      .g-table {
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(60, 64, 67, 0.1);

        thead {
          position: sticky;
          top: 0;
          z-index: 10;

          th {
            background: #f8f9fa;
          }
        }

        tbody {
          position: relative;
          z-index: 1;
        }
      }
    }


    .g-group-name {
      margin-left: 8px;
      color: #5f6368;
      font-size: 13px;
    }
  }


  .dimension-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    border-bottom: 1px solid #e8eaed;
    flex-wrap: wrap;
  }

  .dimension-bar-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #5f6368;
    font-weight: 500;
  }

  .g-icon-small {
    width: 16px;
    height: 16px;
    fill: #5f6368;
  }


  .dimension-selected-list {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dimension-selected-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #e8f0fe;
    border: 1px solid #1a73e8;
    border-radius: 8px;
    cursor: move;
    transition: all 0.2s;
    user-select: none;

    &:hover {
      background: #d2e3fc;
      box-shadow: 0 2px 6px rgba(26, 115, 232, 0.2);
    }

    &.dragging {
      opacity: 0.5;
      transform: scale(0.95);
    }
  }

  .g-drag-handle {
    width: 18px;
    height: 18px;
    fill: #5f6368;
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
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    background: #1a73e8;
    color: #ffffff;
    border-radius: 11px;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .dimension-name {
    font-size: 13px;
    color: #1a73e8;
    font-weight: 500;
  }

  .g-dimension-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    padding: 0;
    flex-shrink: 0;
    transition: all 0.2s;

    svg {
      width: 14px;
      height: 14px;
      fill: #5f6368;
      transition: all 0.2s;
    }

    &:hover {
      background: rgba(0, 0, 0, 0.08);

      svg {
        fill: #d93025;
      }
    }
  }


  .dimension-add-wrapper {
    position: relative;
    display: inline-block;
  }


  .dimension-add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px dashed #dadce0;
    border-radius: 8px;
    background: #ffffff;
    color: #5f6368;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;

    svg {
      width: 16px;
      height: 16px;
      fill: #5f6368;
    }

    &:hover {
      background: #f8f9fa;
      border-color: #1a73e8;
      color: #1a73e8;

      svg {
        fill: #1a73e8;
      }
    }

    &.dimension-add-btn-active {
      background: #e8f0fe;
      border-color: #1a73e8;
      border-style: solid;
      color: #1a73e8;

      svg {
        fill: #1a73e8;
      }
    }
  }


  .dimension-picker-panel {
    position: absolute;
    top: 0;
    left: 100%;
    margin-left: 8px;
    padding: 16px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #e8eaed;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    z-index: 100;
    min-width: 260px;
  }

  .dimension-picker-header {
    font-size: 13px;
    font-weight: 500;
    color: #5f6368;
    margin-bottom: 12px;
  }

  .dimension-picker-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .dimension-picker-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #ffffff;
    border: 1px solid #dadce0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #e8f0fe;
      border-color: #1a73e8;

      .dimension-picker-icon svg {
        fill: #1a73e8;
      }

      .dimension-picker-label {
        color: #1a73e8;
      }
    }
  }

  .dimension-picker-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;

    svg {
      width: 16px;
      height: 16px;
      fill: #5f6368;
      transition: all 0.2s;
    }
  }

  .dimension-picker-label {
    font-size: 13px;
    color: #5f6368;
    transition: all 0.2s;
  }


  .dimension-picker-enter-active {
    transition: all 0.25s ease;
  }

  .dimension-picker-leave-active {
    transition: all 0.2s ease;
  }

  .dimension-picker-enter-from {
    opacity: 0;
    transform: translateX(-8px);
  }

  .dimension-picker-leave-to {
    opacity: 0;
    transform: translateX(-4px);
  }

  .dimension-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #f8f9fa;
    border-radius: 6px;
    font-size: 12px;
    color: #5f6368;
    margin-left: auto;

    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }


  .g-nested-row {
    background: #fafafa;

    &:hover {
      background: #f5f5f5;
    }
  }

  .g-nested-cell {
    position: relative;
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
    flex-shrink: 0;
  }

  .g-date-badge {
    display: inline-block;
    padding: 4px 10px;
    background: #e8f0fe;
    color: #1967d2;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .g-id-badge {
    font-family: 'Roboto Mono', monospace;
    font-size: 12px;
    color: #5f6368;
  }

  .g-time-cell {
    font-size: 12px;
    color: #5f6368;
  }


  .g-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .g-dialog {
      background: #ffffff;
      border-radius: 16px;
      width: 90%;
      max-width: 1400px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }
  }

  .g-dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e8eaed;

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #202124;
    }
  }

  .g-dialog-body {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
  }

  .g-dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid #e8eaed;
  }


  .g-filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 16px;

    .g-filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .g-separator {
      color: #5f6368;
      font-size: 14px;
    }

    .g-input {
      padding: 10px 16px;
      border: 1px solid #dadce0;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      width: 150px;
      outline: none;
      transition: all 0.2s;

      &:hover {
        border-color: #1a73e8;
      }

      &:focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
      }

      &::placeholder {
        color: #9aa0a6;
      }
    }
  }


  .g-pagination {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;

    .g-pagination-info-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .g-pagination-info {
      font-size: 14px;
      color: #5f6368;
    }

    .g-pagination-separator {
      color: #dadce0;
      font-size: 14px;
    }

    .g-pagination-controls {
      display: flex;
      align-items: center;
      gap: 4px;

      .g-pagination-current {
        padding: 0 12px;
        font-size: 14px;
        color: #202124;
      }
    }
  }
}


:deep(.el-loading-mask) {
  background: rgba(255, 255, 255, 0.7) !important;

  .el-loading-spinner {
    .path {
      stroke: #1a73e8 !important;
    }
  }
}


.g-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .g-dialog {
    background: #ffffff;
    border-radius: 16px;
    width: 90%;
    max-width: 1400px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  }
}

.g-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e8eaed;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #202124;
  }
}

.g-dialog-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.g-dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid #e8eaed;
}


@media (max-width: 768px) {
  .g-report-container {
    padding: 12px;

    .g-card-header {
      flex-direction: column;
      gap: 12px;
      padding: 16px;

      .g-header-actions {
        width: 100%;
        flex-direction: column;
        gap: 8px;

        .g-btn {
          width: 100%;
          justify-content: center;
        }
      }
    }


    .g-tabs-card .g-tabs {
      .g-tab {
        padding: 12px 16px;
        font-size: 13px;

        .g-tab-icon {
          width: 16px;
          height: 16px;
        }
      }
    }


    .dimension-bar {
      flex-direction: column;
      align-items: stretch;
      padding: 12px;
      gap: 12px;

      .dimension-selected-list {
        justify-content: flex-start;
      }

      .dimension-selected-item {
        flex: 1;
        min-width: 0;
        padding: 6px 8px;
        font-size: 12px;

        .dimension-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
      }

      .dimension-add-wrapper {
        width: 100%;

        .dimension-add-btn {
          width: 100%;
          justify-content: center;
        }

        .dimension-picker-panel {
          position: fixed;
          left: 12px !important;
          right: 12px;
          top: auto !important;
          bottom: 80px;
          margin: 0;
          width: auto;
          max-width: none;
          z-index: 1001;
        }
      }

      .dimension-hint {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 8px;

        span {
          font-size: 11px;
        }
      }
    }


    .g-table-wrapper,
    .g-table-wrapper-fixed {
      padding: 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;

      .g-table {
        font-size: 12px;
        min-width: 100%;
        width: max-content;

        thead th {
          padding: 8px 12px;
          font-size: 11px;
          white-space: nowrap;
        }

        tbody td {
          padding: 8px 12px;
          font-size: 12px;
          white-space: nowrap;
        }

        tr {
          display: table-row;
        }

        th, td {
          display: table-cell;
        }
      }

      .g-clickable-cell {
        position: relative;
        padding-right: 24px !important;
      }

      .g-nested-cell {
        padding-left: 24px !important;
      }
    }


    .g-btn {
      padding: 8px 16px;
      font-size: 13px;

      &.g-btn-small {
        padding: 6px 12px;
        font-size: 11px;
      }

      .g-btn-icon {
        width: 16px;
        height: 16px;
      }
    }


    .g-dialog-overlay .g-dialog {
      width: 95%;
      max-height: 95vh;
    }

    .g-dialog-header {
      padding: 16px;

      h3 {
        font-size: 16px;
      }
    }

    .g-dialog-body {
      padding: 16px;
    }

    .g-dialog-footer {
      padding: 12px 16px;
    }


    .g-filter-bar {
      flex-direction: column;
      gap: 8px;

      .g-filter-group {
        flex-direction: column;
        width: 100%;

        .g-input {
          width: 100%;
        }
      }

      .g-btn {
        width: 100%;
      }
    }


    .g-pagination {
      flex-direction: column;
      gap: 12px;

      .g-pagination-info-group {
        flex-wrap: wrap;
        justify-content: center;
        font-size: 12px;
      }
    }


    :deep(.el-date-picker) {
      width: 100%;

      .el-input__wrapper {
        width: 100%;
      }
    }


    .g-sync-card .g-sync-section {
      padding: 12px 16px;

      .g-sync-row {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .g-date-picker-wrapper {
          width: 100%;
        }

        .g-btn {
          width: 100%;
        }
      }
    }

    .g-quick-actions {
      flex-direction: column;
      gap: 8px !important;

      .g-btn {
        width: 100%;
      }
    }


    .g-dates-card .g-table-wrapper {
      padding: 0;

      .g-table {
        thead th {
          padding: 8px 12px;
          font-size: 11px;
        }

        tbody td {
          padding: 8px 12px;
          font-size: 12px;
        }

        .g-actions-col {
          width: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .g-btn {
            width: 100%;
            padding: 4px 8px;
            font-size: 11px;
          }
        }
      }
    }


    .g-hourly-card {
      .g-hour-badge {
        font-size: 11px;
        padding: 2px 6px;
        min-width: 40px;
      }

      .g-expand-icon {
        width: 14px;
        height: 14px;
      }
    }
  }
}


@media (max-width: 480px) {
  .g-report-container {
    padding: 8px;

    .dimension-bar {
      .dimension-selected-item {
        padding: 4px 6px;
        font-size: 11px;

        .dimension-order-badge {
          min-width: 18px;
          height: 18px;
          font-size: 10px;
        }

        .g-drag-handle {
          width: 14px;
          height: 14px;
        }

        .g-dimension-remove {
          width: 16px;
          height: 16px;

          svg {
            width: 12px;
            height: 12px;
          }
        }
      }

      .dimension-add-btn {
        padding: 6px 10px;
        font-size: 11px;

        svg {
          width: 14px;
          height: 14px;
        }
      }
    }

    .g-table-wrapper,
    .g-table-wrapper-fixed {
      .g-table thead th,
      .g-table tbody td {
        padding: 6px 8px;
        font-size: 11px;
      }
    }
  }
}
</style>
