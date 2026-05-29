<template>
  <div class="pushnami-page">
    <!-- 规则编辑弹窗 -->
    <div v-if="showRulesEditor" class="rules-editor-overlay" @click.self="showRulesEditor = false">
      <div class="rules-editor-dialog">
        <div class="dialog-header">
          <h3>编辑 Bid 调整规则</h3>
          <button class="close-btn" @click="showRulesEditor = false">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          <!-- 全局配置 -->
          <div class="global-config">
            <div class="config-card">
              <div class="config-label">
                <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                <span>source-冷却时间</span>
              </div>
              <div class="config-input">
                <input type="number" v-model.number="editingRules.cooldownMinutes" min="1">
                <span class="input-suffix">分钟</span>
              </div>
            </div>
            <div class="config-card">
              <div class="config-label">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg>
                <span>脚本-执行间隔</span>
              </div>
              <div class="config-input">
                <input type="number" v-model.number="editingRules.intervalMinutes" min="1">
                <span class="input-suffix">分钟</span>
              </div>
            </div>
            <!-- 时间范围配置 -->
            <div class="config-card config-card-time-range">
              <div class="config-label">
                <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                <span>脚本-时间范围</span>
              </div>
              <div class="config-content">
                <label class="time-range-enable-label">
                  <input type="checkbox" v-model="editingRules.timeRangeEnabled">
                  <span>启用时间限制</span>
                </label>
                <div v-if="editingRules.timeRangeEnabled" class="time-range-inputs-inline">
                  <input type="time" v-model="editingRules.timeRangeStart" class="time-range-input">
                  <span class="time-separator">-</span>
                  <input type="time" v-model="editingRules.timeRangeEnd" class="time-range-input">
                </div>
              </div>
            </div>
          </div>

          <!-- 规则汇总 -->
          <div class="rules-summary-section">
            <div class="rules-summary-header">
              <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              <span>规则汇总</span>
            </div>
            <div class="rules-summary-content">
              <div v-if="editingRules.rules.length === 0" class="rules-summary-empty">暂无规则</div>
              <div v-else>
                <div class="rules-summary-list">
                  <div v-for="(rule, idx) in editingRules.rules" :key="idx" class="rules-summary-item">
                    <span class="rule-index">规则 {{ idx + 1 }}:</span>
                    <span class="rule-condition">{{ formatRuleSummaryNew(rule) }}</span>
                  </div>
                </div>
                <div class="rules-summary-notice">
                  <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  <span>当多条规则同时匹配时，只执行第一条（规则按顺序匹配）</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 规则卡片 -->
          <div class="rules-container-new">
            <div class="rules-list">
              <div v-for="(rule, ruleIdx) in editingRules.rules" :key="ruleIdx" class="rule-card-new">
                <div class="rule-card-header">
                  <span class="rule-badge">规则 {{ ruleIdx + 1 }}</span>
                  <button class="delete-rule-btn" @click="deleteRule(ruleIdx)" title="删除规则">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </div>
                <div class="rule-card-body">
                  <!-- 条件列表 -->
                  <div class="conditions-list">
                    <div v-for="(condition, condIdx) in rule.conditions" :key="condIdx" class="condition-row">
                      <!-- 条件序号 -->
                      <span class="condition-number">{{ condIdx + 1 }}</span>

                      <!-- 字段选择 -->
                      <select class="condition-select" v-model="condition.field">
                        <option value="bid">Bid</option>
                        <option value="conversions">Conversions</option>
                        <option value="clicks">Clicks</option>
                        <option value="spent">Spent</option>
                        <option value="cpa">CPA</option>
                      </select>

                      <!-- 运算符选择 -->
                      <select class="condition-select" v-model="condition.operator">
                        <option value=">">大于 (>)</option>
                        <option value=">=">大于等于 (≥)</option>
                        <option value="<">小于 (&lt;)</option>
                        <option value="<=">小于等于 (≤)</option>
                        <option value="==">等于 (=)</option>
                        <option value="!=">不等于 (≠)</option>
                      </select>

                      <!-- 值类型选择（Target CPA） -->
                      <select class="condition-select valueType-select" v-model="condition.valueType">
                        <option value="fixed">固定值</option>
                        <option value="target_cpa">Target CPA</option>
                      </select>

                      <!-- 值输入 -->
                      <div class="value-input-wrapper">
                        <input
                          type="number"
                          class="condition-input"
                          v-model.number="condition.value"
                          step="0.01"
                          :placeholder="condition.valueType === 'target_cpa' ? '百分比' : '值'"
                        >
                        <span v-if="condition.valueType === 'target_cpa'" class="value-suffix">%</span>
                      </div>

                      <!-- 逻辑关系选择 (最后一个条件不显示) -->
                      <select v-if="condIdx < rule.conditions.length - 1" class="logic-select" v-model="condition.logic">
                        <option value="&&">且 (AND)</option>
                        <option value="||">或 (OR)</option>
                      </select>

                      <!-- 删除条件按钮 -->
                      <button v-if="rule.conditions.length > 1" class="delete-condition-btn" @click="deleteCondition(ruleIdx, condIdx)" title="删除条件">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                    </div>

                    <!-- 添加条件按钮 -->
                    <button class="add-condition-btn" @click="addCondition(ruleIdx)">
                      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                      添加条件
                    </button>
                  </div>

                  <!-- 新 Bid 设置 -->
                  <div class="new-bid-field">
                    <label>调整后 Bid</label>
                    <div class="number-input">
                      <span class="input-prefix">$</span>
                      <input type="number" v-model.number="rule.newBid" step="0.01" min="0" placeholder="0.00">
                    </div>
                  </div>

                  <!-- 规则说明 -->
                  <div class="rule-summary">{{ formatRuleSummaryNew(rule) }}</div>
                </div>
              </div>
            </div>

            <!-- 添加规则按钮 -->
            <button class="add-rule-btn" @click="addRule">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              添加规则
            </button>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="md-button" @click="showRulesEditor = false">取消</button>
          <button class="md-button md-primary" @click="saveRules" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 页面顶部区域（包含设置按钮） -->
    <!-- <div class="page-top">
      <div class="page-spacer"></div>
      <div class="page-settings">
        <div class="settings-dropdown" ref="settingsDropdown">
          <button class="settings-btn" @click="toggleSettingsMenu" title="设置">
            <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </button>
          <div class="settings-menu" :class="{ show: showSettingsMenu }">
            <button class="settings-menu-item close-browser-item" @click="closeBrowser">
              <svg viewBox="0 0 24 24"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>
              <span>关闭chrome</span>
            </button>
          </div>
        </div>
      </div>
    </div> -->

    <!-- 任务管理卡片 -->
    <div class="md-card task-card">
      <div class="task-list">
        <div class="task-item task-blue">
          <div class="task-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
          </div>
          <div class="task-info">
            <div class="task-name">Bid 调整</div>
            <div class="task-time-range">
              <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <span v-if="timeRangeConfig.bid_adjust && timeRangeConfig.bid_adjust.enabled">{{ timeRangeConfig.bid_adjust.startTime }} - {{ timeRangeConfig.bid_adjust.endTime }}</span>
              <span v-else>全天</span>
            </div>
          </div>
          <div class="task-meta">
            <span v-if="tasksStatus.bidAdjust?.status === 'running'" class="task-running-badge">运行中</span>
            <span v-else-if="tasksStatus.bidAdjust?.status === 'scheduled' && tasksStatus.bidAdjust.timeUntilNextRun" class="task-next-run">
              {{ formatTimeRemaining(tasksStatus.bidAdjust.timeUntilNextRun) }}后运行
            </span>
            <span v-else class="task-paused-badge">已暂停</span>
          </div>
          <button class="icon-btn" @click="openRulesEditor" title="编辑规则">
            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <label class="md-switch">
            <input type="checkbox" v-model="tasks.bidAdjust" @change="updateTaskSwitch('bid_adjust')">
            <span class="md-switch-track"></span>
            <span class="md-switch-thumb"></span>
          </label>
        </div>

        <div class="task-item task-red" :class="{ 'task-disabled': !FEATURE_FLAGS.BLOCK_ENABLED }">
          <div class="task-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div class="task-info">
            <div class="task-name">Block 任务</div>
            <div class="task-time-range">
              <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <span v-if="timeRangeConfig.block && timeRangeConfig.block.enabled">{{ timeRangeConfig.block.startTime }} - {{ timeRangeConfig.block.endTime }}</span>
              <span v-else>全天</span>
            </div>
          </div>
          <div class="task-meta">
            <span v-if="tasksStatus.block?.status === 'running'" class="task-running-badge">运行中</span>
            <span v-else-if="tasksStatus.block?.status === 'scheduled' && tasksStatus.block.timeUntilNextRun" class="task-next-run">
              下次运行: {{ formatTimeRemaining(tasksStatus.block.timeUntilNextRun) }}
            </span>
            <span v-else class="task-paused-badge">已暂停</span>
          </div>
          <label class="md-switch" :class="{ 'switch-disabled': !FEATURE_FLAGS.BLOCK_ENABLED }">
            <input type="checkbox" v-model="tasks.block" @change="updateTaskSwitch('block')" :disabled="!FEATURE_FLAGS.BLOCK_ENABLED">
            <span class="md-switch-track"></span>
            <span class="md-switch-thumb"></span>
          </label>
        </div>

        <div class="task-item task-green" :class="{ 'task-disabled': !FEATURE_FLAGS.BUDGET_BOOST_ENABLED }">
          <div class="task-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
          </div>
          <div class="task-info">
            <div class="task-name">Budget 放量</div>
            <div class="task-time-range">
              <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <span v-if="timeRangeConfig.budget_boost && timeRangeConfig.budget_boost.enabled">{{ timeRangeConfig.budget_boost.startTime }} - {{ timeRangeConfig.budget_boost.endTime }}</span>
              <span v-else>全天</span>
            </div>
          </div>
          <div class="task-meta">
            <span v-if="tasksStatus.budgetBoost?.status === 'running'" class="task-running-badge">运行中</span>
            <span v-else-if="tasksStatus.budgetBoost?.status === 'scheduled' && tasksStatus.budgetBoost.timeUntilNextRun" class="task-next-run">
              下次运行: {{ formatTimeRemaining(tasksStatus.budgetBoost.timeUntilNextRun) }}
            </span>
            <span v-else class="task-paused-badge">已暂停</span>
          </div>
          <label class="md-switch" :class="{ 'switch-disabled': !FEATURE_FLAGS.BUDGET_BOOST_ENABLED }">
            <input type="checkbox" v-model="tasks.budgetBoost" @change="updateTaskSwitch('budget_boost')" :disabled="!FEATURE_FLAGS.BUDGET_BOOST_ENABLED">
            <span class="md-switch-track"></span>
            <span class="md-switch-thumb"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 日志卡片 -->
    <div class="md-card">
      <div class="card-header">
        <div class="log-type-switcher">
          <button
            class="log-type-btn"
            :class="{ active: logViewType === 'operation' }"
            @click="switchLogView('operation')"
          >
            {{ logViewTypes.operation }}
          </button>
          <button
            class="log-type-btn"
            :class="{ active: logViewType === 'execution' }"
            @click="switchLogView('execution')"
          >
            {{ logViewTypes.execution }}
          </button>
          <button
            class="log-type-btn"
            :class="{ active: logViewType === 'running' }"
            @click="switchLogView('running')"
          >
            {{ logViewTypes.running }}
          </button>
        </div>
      </div>

      <!-- 操作日志视图 -->
      <div v-show="logViewType === 'operation'">
        <div class="filter-tabs">
          <div class="filter-tabs-left">
            <button
              v-for="tab in filterTabs"
              :key="tab.value"
              class="filter-tab"
              :class="{ active: logType === tab.value }"
              @click="setLogType(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
          <!-- 列设置按钮 -->
          <el-dropdown trigger="click" :hide-on-click="false">
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
        </div>

        <div class="table-container">
          <table class="md-table" v-if="operationLogs.length > 0">
            <thead>
              <tr>
                <th v-for="col in displayColumns" :key="col.key" :width="col.width">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in operationLogs" :key="row.id">
                <td v-for="col in displayColumns" :key="col.key" :class="col.class" :width="col.width">
                  <template v-if="col.slotName === 'task_type'">
                    <span class="task-badge" :class="'badge-' + row.task_type">
                      {{ getTaskTypeName(row.task_type) }}
                    </span>
                  </template>
                  <template v-else-if="col.slotName === 'campaign_name'">
                    <span class="text-truncate">{{ row[col.prop] || '-' }}</span>
                  </template>
                  <template v-else-if="col.slotName === 'conversions'">
                    {{ row[col.prop] ?? '-' }}
                  </template>
                  <template v-else-if="col.slotName === 'clicks'">
                    {{ row[col.prop] ?? '-' }}
                  </template>
                  <template v-else-if="col.slotName === 'spent'">
                    {{ row[col.prop] ? '$' + row[col.prop] : '-' }}
                  </template>
                  <template v-else-if="col.slotName === 'cpa'">
                    {{ row[col.prop] ? '$' + row[col.prop] : '-' }}
                  </template>
                  <template v-else-if="col.slotName === 'target_cpa'">
                    {{ row[col.prop] ? '$' + row[col.prop] : '-' }}
                  </template>
                  <template v-else-if="col.slotName === 'total_spend'">
                    {{ row[col.prop] ? '$' + row[col.prop] : '-' }}
                  </template>
                  <template v-else-if="col.slotName === 'operation'">
                    <span v-if="row.old_value && row.new_value" class="value-change">
                      <span class="old-value">{{ row.old_value }}</span>
                      <svg class="arrow-icon" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                      </svg>
                      <span class="new-value" :class="{
                        'value-up': parseFloat(row.new_value) > parseFloat(row.old_value),
                        'value-down': parseFloat(row.new_value) < parseFloat(row.old_value)
                      }">{{ row.new_value }}</span>
                    </span>
                    <span v-else-if="row.task_type === 'block'" class="blocked-badge">已 Block</span>
                    <span v-else>-</span>
                  </template>
                  <template v-else-if="col.slotName === 'created_at'">
                    <span class="text-muted">{{ formatTime(row[col.prop]) }}</span>
                  </template>
                  <template v-else>
                    {{ row[col.prop] }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <p>暂无操作日志</p>
          </div>
        </div>

        <div class="pagination" v-if="opLogTotal > 0">
          <div class="pagination-left">
            <span class="pagination-info">共 {{ opLogTotal }} 条</span>
            <select class="page-size-select" v-model.number="opLogPageSize" @change="onOpLogPageSizeChange">
              <option :value="10">10 条/页</option>
              <option :value="20">20 条/页</option>
              <option :value="50">50 条/页</option>
              <option :value="100">100 条/页</option>
            </select>
          </div>
          <div class="pagination-controls">
            <button
              class="page-btn"
              :disabled="opLogPage === 1"
              @click="goToOpLogFirstPage"
              title="首页"
            >
              <svg viewBox="0 0 24 24"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6-6zM6 6h2v12H6z"/></svg>
            </button>
            <button
              class="page-btn"
              :disabled="opLogPage === 1"
              @click="goToOpLogPrevPage"
              title="上一页"
            >
              <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <span class="page-info">
              <input
                type="number"
                class="page-input"
                v-model.number="opLogPageInput"
                @keyup.enter="jumpToOpLogPage"
                :min="1"
                :max="Math.ceil(opLogTotal / opLogPageSize)"
              >
              / {{ Math.ceil(opLogTotal / opLogPageSize) }}
            </span>
            <button
              class="page-btn"
              :disabled="opLogPage >= Math.ceil(opLogTotal / opLogPageSize)"
              @click="goToOpLogNextPage"
              title="下一页"
            >
              <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
            <button
              class="page-btn"
              :disabled="opLogPage >= Math.ceil(opLogTotal / opLogPageSize)"
              @click="goToOpLogLastPage"
              title="末页"
            >
              <svg viewBox="0 0 24 24"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 执行日志视图 -->
      <div v-show="logViewType === 'execution'">
        <div class="filter-tabs">
          <div>
            <button
              v-for="tab in execFilterTabs"
              :key="tab.value"
              class="filter-tab"
              :class="{ active: execLogType === tab.value }"
              @click="setExecLogType(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="md-table" v-if="executionLogs.length > 0">
            <thead>
              <tr>
                <th v-for="col in contentConfig.executionLogColumns" :key="col.prop" :width="col.width">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in executionLogs" :key="row.id">
                <td v-for="col in contentConfig.executionLogColumns" :key="col.prop" :class="col.class" :width="col.width">
                  <template v-if="col.slotName === 'task_type'">
                    <span class="task-badge" :class="'badge-' + row.task_type">
                      {{ getTaskTypeName(row.task_type) }}
                    </span>
                  </template>
                  <template v-else-if="col.slotName === 'status'">
                    <span class="status-badge" :class="'status-' + row.status">
                      {{ getStatusText(row.status) }}
                    </span>
                  </template>
                  <template v-else-if="col.slotName === 'errors'">
                    <span :class="{ 'text-error': row.errors > 0 }">{{ row.errors || 0 }}</span>
                  </template>
                  <template v-else-if="col.slotName === 'message'">
                    <span class="message-cell">{{ row.message || '-' }}</span>
                  </template>
                  <template v-else-if="col.slotName === 'started_at'">
                    <span class="text-muted">{{ formatTime(row[col.prop]) }}</span>
                  </template>
                  <template v-else-if="col.slotName === 'completed_at'">
                    <span class="text-muted">{{ row[col.prop] ? formatTime(row[col.prop]) : '-' }}</span>
                  </template>
                  <template v-else-if="col.slotName === 'log_file'">
                    <button
                      class="download-log-btn"
                      @click="downloadLogFile(row)"
                      title="下载日志文件"
                    >
                      <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                      下载
                    </button>
                  </template>
                  <template v-else-if="col.slotName === 'operation'">
                    <button
                      v-if="row.status === 'started'"
                      class="stop-btn"
                      :disabled="stoppingIds.has(row.id)"
                      @click="stopExecution(row.id)"
                    >
                      {{ stoppingIds.has(row.id) ? '停止中...' : '停止' }}
                    </button>
                    <span v-else class="text-muted">-</span>
                  </template>
                  <template v-else>
                    {{ row[col.prop] || 0 }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <p>暂无脚本记录</p>
          </div>
        </div>

        <div class="pagination" v-if="execLogTotal > 0">
          <div class="pagination-left">
            <span class="pagination-info">共 {{ execLogTotal }} 条</span>
            <select class="page-size-select" v-model.number="execLogPageSize" @change="onExecLogPageSizeChange">
              <option :value="10">10 条/页</option>
              <option :value="20">20 条/页</option>
              <option :value="50">50 条/页</option>
              <option :value="100">100 条/页</option>
            </select>
          </div>
          <div class="pagination-controls">
            <button
              class="page-btn"
              :disabled="execLogPage === 1"
              @click="goToExecLogFirstPage"
              title="首页"
            >
              <svg viewBox="0 0 24 24"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6-6zM6 6h2v12H6z"/></svg>
            </button>
            <button
              class="page-btn"
              :disabled="execLogPage === 1"
              @click="goToExecLogPrevPage"
              title="上一页"
            >
              <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <span class="page-info">
              <input
                type="number"
                class="page-input"
                v-model.number="execLogPageInput"
                @keyup.enter="jumpToExecLogPage"
                :min="1"
                :max="Math.ceil(execLogTotal / execLogPageSize)"
              >
              / {{ Math.ceil(execLogTotal / execLogPageSize) }}
            </span>
            <button
              class="page-btn"
              :disabled="execLogPage >= Math.ceil(execLogTotal / execLogPageSize)"
              @click="goToExecLogNextPage"
              title="下一页"
            >
              <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
            <button
              class="page-btn"
              :disabled="execLogPage >= Math.ceil(execLogTotal / execLogPageSize)"
              @click="goToExecLogLastPage"
              title="末页"
            >
              <svg viewBox="0 0 24 24"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 运行日志视图 -->
      <div v-show="logViewType === 'running'">
        <div class="running-log-container" v-loading="runningLogsLoading">
          <!-- 运行中且有日志时显示日志内容 -->
          <div v-if="hasRunningTask && runningLogs.length > 0" class="running-logs-list">
            <div
              v-for="(log, idx) in runningLogs"
              :key="idx"
              class="log-entry"
              :class="'log-level-' + getLogLevelClass(log.level)"
            >
              <span class="log-timestamp">{{ log.timestamp }}</span>
              <span class="log-level" :class="'level-badge-' + getLogLevelClass(log.level)">{{ log.level }}</span>
              <span v-if="log.prefix" class="log-prefix">[{{ log.prefix }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
          <!-- 其他情况显示占位符 -->
          <div v-else class="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <p>暂无运行日志</p>
            <p class="text-muted">{{ hasRunningTask ? '任务正在执行中...' : '当前没有正在运行的任务' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import pushnamiService from '@/services/main/timer/pushnami'
import { createOperationLog } from '@/services/main/system/operation-log'
import contentConfig from './config/content.config'




const FEATURE_FLAGS = {
  BLOCK_ENABLED: false,       // Block 任务功能开关 (改为 true 即可启用)
  BUDGET_BOOST_ENABLED: false // Budget 放量功能开关 (改为 true 即可启用)
}


const loading = ref(false)
const logsLoading = ref(false)
const execLogsLoading = ref(false)
const stoppingIds = ref(new Set())


let logPollingTimer = null


let tasksStatusPollingTimer = null


const isStarting = ref(false)


const serviceStatus = ref(null)


const tasksStatus = ref({
  bidAdjust: { enabled: false, status: 'paused', nextRunTime: null, timeUntilNextRun: null },
  block: { enabled: false, status: 'paused', nextRunTime: null, timeUntilNextRun: null },
  budgetBoost: { enabled: false, status: 'paused', nextRunTime: null, timeUntilNextRun: null }
})


const showSettingsMenu = ref(false)
const settingsDropdown = ref(null)


const logViewType = ref(localStorage.getItem('pushnami_log_view_type') || 'operation')

let hideRunningLogTabTimer = null


const runningLogs = ref([])
const runningLogsLoading = ref(false)
let runningLogsPollingTimer = null


const showRulesEditor = ref(false)
const saving = ref(false)

const tasks = ref({
  bidAdjust: true,
  block: true,
  budgetBoost: true
})


const prevTasks = ref({ ...tasks.value })

const rules = ref({
  bidAdjust: { intervalMinutes: 180, cooldownMinutes: 100, rules: [] },
  block: { threshold: 15, intervalMinutes: 1440, cooldownMinutes: 1440 },
  budgetBoost: { spendThreshold: 0.5, multiplier: 2, intervalMinutes: 1440, cooldownMinutes: 1440 }
})


const timeRangeConfig = ref({
  bid_adjust: { enabled: false, startTime: '00:00', endTime: '23:59' },
  block: { enabled: false, startTime: '00:00', endTime: '23:59' },
  budget_boost: { enabled: false, startTime: '00:00', endTime: '23:59' }
})


const editingRules = ref({
  cooldownMinutes: 100,
  intervalMinutes: 180,
  rules: [],
  timeRangeEnabled: false,
  timeRangeStart: '00:00',
  timeRangeEnd: '23:59'
})


const operationLogs = ref([])
const logType = ref('')
const opLogPage = ref(contentConfig.pagination.page)
const opLogPageSize = ref(contentConfig.pagination.pageSize)
const opLogTotal = ref(0)
const opLogPageInput = ref(1)


const executionLogs = ref([])
const execLogType = ref('')
const execLogPage = ref(contentConfig.pagination.page)
const execLogPageSize = ref(contentConfig.pagination.pageSize)
const execLogTotal = ref(0)
const execLogPageInput = ref(1)


const execFilterTabs = contentConfig.filterTabs






const columnSettings = ref([])
const draggingIndex = ref(null)


const allColumns = computed(() => {
  return contentConfig.operationLogColumns.map(item => ({
    key: item.key,
    label: item.label,
    prop: item.prop,
    slotName: item.slotName,
    width: item.width,
    class: item.class,
    required: item.required || false,
    defaultHidden: item.defaultHidden || false
  }))
})


function initColumnSettings() {
  columnSettings.value = allColumns.value.map(col => ({
    key: col.key,
    visible: !col.defaultHidden
  }))
}


const displayColumns = computed(() => {
  const originalList = contentConfig.operationLogColumns
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
  draggingIndex.value = null
}


function resetColumns() {
  initColumnSettings()
}


const filterTabs = contentConfig.filterTabs
const taskTypeMap = contentConfig.taskTypeMap
const statusMap = contentConfig.statusMap
const logViewTypes = contentConfig.logViewTypes

function getTaskTypeName(type) {
  return taskTypeMap[type] || type
}

function getStatusText(status) {
  return statusMap[status] || status
}

function formatTime(str) {
  if (!str) return '-'
  const date = new Date(str)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}


function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}


function getLogLevelClass(level) {
  const levelMap = {
    '[INFO]': 'info',
    '[✅]': 'success',
    '[⚠️]': 'warning',
    '[❌]': 'error',
    '[DRY RUN]': 'dryrun',
    '[TASK]': 'task',
    '[CAMPAIGN]': 'campaign',
    '[SOURCE]': 'source'
  }
  return levelMap[level] || 'info'
}


function formatTimeRemaining(seconds) {
  if (!seconds || seconds <= 0) return '--'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}小时${minutes}分`
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`
  } else {
    return `${secs}秒`
  }
}


async function fetchTasksStatus() {
  try {
    const res = await pushnamiService.getTasksStatus()
    if (res.code === 200 && res.data) {
      tasksStatus.value = res.data.tasks || tasksStatus.value


      if (serviceStatus.value) {
        serviceStatus.value.isRunning = res.data.isRunning
        serviceStatus.value.currentTask = res.data.currentTask
      }
    }
  } catch (e) {
    console.error('获取任务状态失败:', e)
  }
}


function startTasksStatusPolling() {
  if (tasksStatusPollingTimer) {
    clearInterval(tasksStatusPollingTimer)
  }

  fetchTasksStatus()

  tasksStatusPollingTimer = setInterval(() => {
    fetchTasksStatus()
  }, 10000)
}


function stopTasksStatusPolling() {
  if (tasksStatusPollingTimer) {
    clearInterval(tasksStatusPollingTimer)
    tasksStatusPollingTimer = null
  }
}


const hasRunningTask = computed(() => {
  return tasksStatus.value.bidAdjust?.status === 'running' ||
         tasksStatus.value.block?.status === 'running' ||
         tasksStatus.value.budgetBoost?.status === 'running'
})


function logOperation(operation, description, details = null) {
  createOperationLog({
    module: 'pushnami',
    operation,
    description,
    details
  }).catch(e => console.error('记录操作日志失败:', e))
}


function switchLogView(type) {
  const viewNameMap = {
    operation: '操作记录',
    execution: '脚本记录',
    running: '运行日志'
  }
  const viewName = viewNameMap[type] || type
  logOperation('switch_view', `切换到${viewName}`, { type })

  logViewType.value = type
  localStorage.setItem('pushnami_log_view_type', type)


  if (hideRunningLogTabTimer) {
    clearTimeout(hideRunningLogTabTimer)
    hideRunningLogTabTimer = null
  }


  if (type === 'running') {
    fetchRunningLogs()
  }


  if (type === 'operation') {
    fetchOperationLogs()
  } else if (type === 'execution') {
    fetchExecutionLogs()
  }
}

function setLogType(value) {
  logType.value = value
  opLogPage.value = 1
  fetchOperationLogs()
}

function setExecLogType(value) {
  execLogType.value = value
  execLogPage.value = 1
  fetchExecutionLogs()
}


function openRulesEditor() {
  logOperation('open_rule_editor', '打开 Bid 调整规则编辑器')


  showSettingsMenu.value = false


  const existingRules = rules.value.bidAdjust.rules || []


  const convertedRules = existingRules.map(rule => {

    if (rule.conditions) {
      return { ...rule }
    }

    const conditions = []
    if (rule.minConversions !== undefined) {
      conditions.push({ field: 'conversions', operator: '>', value: rule.minConversions, logic: '&&' })
    }
    if (rule.minCpa !== undefined && rule.minCpa !== null && rule.minCpa !== '') {
      conditions.push({ field: 'cpa', operator: '>=', value: rule.minCpa, logic: '&&' })
    }
    if (rule.maxCpa !== undefined && rule.maxCpa !== null && rule.maxCpa !== '') {
      conditions[conditions.length - 1].logic = '&&'
      conditions.push({ field: 'cpa', operator: '<', value: rule.maxCpa, logic: '' })
    }

    if (conditions.length > 0) {
      conditions[conditions.length - 1].logic = ''
    }
    return {
      conditions: conditions.length > 0 ? conditions : [{ field: 'cpa', operator: '>=', value: 7, logic: '' }],
      newBid: rule.newBid || 0.10
    }
  })


  const timeRangeData = timeRangeConfig.value.bid_adjust || { enabled: false, startTime: '00:00', endTime: '23:59' }

  editingRules.value = {
    cooldownMinutes: rules.value.bidAdjust.cooldownMinutes || 100,
    intervalMinutes: rules.value.bidAdjust.intervalMinutes || 180,
    rules: convertedRules.length > 0 ? convertedRules : [{ conditions: [{ field: 'cpa', operator: '>=', value: 7, logic: '' }], newBid: 0.10 }],
    timeRangeEnabled: timeRangeData.enabled || false,
    timeRangeStart: timeRangeData.startTime || '00:00',
    timeRangeEnd: timeRangeData.endTime || '23:59'
  }
  showRulesEditor.value = true
}


function toggleSettingsMenu() {
  showSettingsMenu.value = !showSettingsMenu.value
}


async function closeBrowser() {
  showSettingsMenu.value = false


  if (isTaskRunning.value) {
    ElMessage.warning(`有任务正在执行中: ${currentTaskDisplay.value}, 请等待任务完成后再关闭chrome`)
    return
  }

  try {
    await ElMessageBox.confirm(
      '关闭后, 下次任务执行时会自动重新打开浏览器。确定要关闭吗？',
      '关闭chrome',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  try {
    const res = await pushnamiService.closeBrowser()

    if (res.code === 200) {
      ElMessage.success(res.message)

      logOperation('close_browser', '关闭chrome')


      await fetchServiceStatus()
    } else {
      ElMessage.error(res.message || '关闭chrome失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('关闭chrome失败')
  }
}


function handleClickOutside(event) {
  if (settingsDropdown.value && !settingsDropdown.value.contains(event.target)) {
    showSettingsMenu.value = false
  }
}


async function saveRules() {
  saving.value = true
  try {

    for (let i = 0; i < editingRules.value.rules.length; i++) {
      const rule = editingRules.value.rules[i]
      if (rule.newBid === undefined || rule.newBid === null || rule.newBid === '' || isNaN(rule.newBid)) {
        ElMessage.warning(`第 ${i + 1} 条规则的"调整后 Bid"不能为空，请设置有效值`)
        saving.value = false
        return
      }
      if (rule.newBid < 0) {
        ElMessage.warning(`第 ${i + 1} 条规则的"调整后 Bid"不能为负数`)
        saving.value = false
        return
      }
    }


    const processedRules = editingRules.value.rules.map(rule => ({
      conditions: rule.conditions,
      newBid: rule.newBid
    }))

    const configValue = {
      rules: processedRules,
      intervalMinutes: editingRules.value.intervalMinutes,
      cooldownMinutes: editingRules.value.cooldownMinutes
    }

    await pushnamiService.updateConfig({
      config_key: 'bid_adjust_rules',
      config_value: JSON.stringify(configValue)
    })


    if (editingRules.value.timeRangeEnabled) {
      const startMinutes = timeToMinutes(editingRules.value.timeRangeStart)
      const endMinutes = timeToMinutes(editingRules.value.timeRangeEnd)

      if (startMinutes > endMinutes) {

        const confirmed = await ElMessageBox.confirm(
          `您设置的开始时间 (${editingRules.value.timeRangeStart}) 晚于结束时间 (${editingRules.value.timeRangeEnd})，这将被理解为跨天时间范围（从 ${editingRules.value.timeRangeStart} 到次日 ${editingRules.value.timeRangeEnd}）。
          确定要保存此设置吗？`,
          '时间范围确认',
          {
            confirmButtonText: '确定保存',
            cancelButtonText: '重新设置',
            type: 'warning'
          }
        ).catch(() => false)

        if (!confirmed) {
          saving.value = false
          return
        }
      }
    }


    if (editingRules.value.timeRangeEnabled && editingRules.value.timeRangeStart === editingRules.value.timeRangeEnd) {
      ElMessage.warning('开始时间和结束时间不能相同，请设置不同的时间')
      saving.value = false
      return
    }


    timeRangeConfig.value.bid_adjust = {
      enabled: editingRules.value.timeRangeEnabled || false,
      startTime: editingRules.value.timeRangeStart || '00:00',
      endTime: editingRules.value.timeRangeEnd || '23:59'
    }

    await pushnamiService.updateConfig({
      config_key: 'time_range',
      config_value: JSON.stringify(timeRangeConfig.value)
    })


    logOperation('save_bid_rules', `保存 Bid 调整规则，共 ${processedRules.length} 条`, {
      rulesCount: processedRules.length,
      intervalMinutes: editingRules.value.intervalMinutes,
      cooldownMinutes: editingRules.value.cooldownMinutes,
      timeRangeEnabled: editingRules.value.timeRangeEnabled,
      timeRange: editingRules.value.timeRangeEnabled ? `${editingRules.value.timeRangeStart} - ${editingRules.value.timeRangeEnd}` : null
    })


    rules.value.bidAdjust = {
      ...rules.value.bidAdjust,
      intervalMinutes: editingRules.value.intervalMinutes,
      cooldownMinutes: editingRules.value.cooldownMinutes,
      rules: processedRules
    }

    showRulesEditor.value = false
    ElMessage.success('已保存, 后续任务将使用新规则')
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}


function addRule() {
  editingRules.value.rules.push({
    conditions: [
      { field: 'cpa', operator: '>=', value: 7, valueType: 'fixed', logic: '' }
    ],
    newBid: 0.10
  })
}


function deleteRule(ruleIdx) {
  editingRules.value.rules.splice(ruleIdx, 1)

  if (editingRules.value.rules.length === 0) {
    addRule()
  }
}


function addCondition(ruleIdx) {
  const conditions = editingRules.value.rules[ruleIdx].conditions


  conditions.push({
    field: 'cpa',
    operator: '>=',
    value: 0,
    valueType: 'fixed',  // 'fixed' 表示固定值，'target_cpa' 表示 Target CPA 的百分比
    logic: ''
  })


  if (conditions.length > 1) {
    conditions[conditions.length - 2].logic = '&&'
  }
}


function deleteCondition(ruleIdx, condIdx) {
  const rule = editingRules.value.rules[ruleIdx]
  rule.conditions.splice(condIdx, 1)

  if (rule.conditions.length > 0) {
    rule.conditions[rule.conditions.length - 1].logic = ''
  }
}


function formatRuleSummaryNew(rule) {
  if (!rule.conditions || rule.conditions.length === 0) {
    return '请添加条件'
  }

  const fieldNames = {
    bid: 'Bid',
    conversions: 'Conversions',
    clicks: 'Clicks',
    spent: 'Spent',
    cpa: 'CPA'
  }

  const parts = rule.conditions.map((cond, idx) => {
    const fieldName = fieldNames[cond.field] || cond.field
    const value = cond.value ?? '-'


    let valueDisplay
    if (cond.valueType === 'target_cpa') {
      valueDisplay = `(Target CPA * ${value}%)`
    } else {
      valueDisplay = value
    }

    let conditionStr = `${fieldName} ${cond.operator} ${valueDisplay}`


    if (idx < rule.conditions.length - 1) {
      conditionStr += ` ${cond.logic === '&&' ? '且' : '或'} `
    }

    return conditionStr
  })

  return `${parts.join('')} → Bid = ${rule.newBid ?? '-'}`
}

async function refreshData() {
  loading.value = true
  try {
    await Promise.all([fetchConfig(), fetchOperationLogs()])

    if (logViewType.value === 'execution') {
      await fetchExecutionLogs()
    }
  } catch { ElMessage.error('刷新失败') }
  finally { loading.value = false }
}


async function refreshLogs() {
  try {
    if (logViewType.value === 'operation') {
      await fetchOperationLogs()
    } else if (logViewType.value === 'execution') {
      await fetchExecutionLogs()
    } else if (logViewType.value === 'running') {
      await fetchRunningLogs()
    }
  } catch (e) {

  }
}


function startLogPolling() {
  if (logPollingTimer) {
    clearInterval(logPollingTimer)
  }

  logPollingTimer = setInterval(() => {
    refreshLogs()
  }, 10000)
}


function stopLogPolling() {
  if (logPollingTimer) {
    clearInterval(logPollingTimer)
    logPollingTimer = null
  }
}

async function fetchConfig() {
  try {
    const res = await pushnamiService.getConfig()
    if (res.code === 200 && res.data) {
      if (res.data.task_switch) {
        const dbTasks = res.data.task_switch
        tasks.value = {
          bidAdjust: dbTasks.bid_adjust ?? true,
          block: dbTasks.block ?? true,
          budgetBoost: dbTasks.budget_boost ?? true
        }

        prevTasks.value = {
          bid_adjust: tasks.value.bidAdjust,
          block: tasks.value.block,
          budget_boost: tasks.value.budgetBoost
        }
      }
      if (res.data.bid_adjust_rules) {
        rules.value.bidAdjust = {
          ...rules.value.bidAdjust,
          ...res.data.bid_adjust_rules,
          rules: res.data.bid_adjust_rules.rules || []
        }
      }
      if (res.data.block_rules) rules.value.block = { ...rules.value.block, ...res.data.block_rules }
      if (res.data.budget_boost_rules) rules.value.budgetBoost = { ...rules.value.budgetBoost, ...res.data.budget_boost_rules }

      if (res.data.time_range) {
        timeRangeConfig.value = {
          bid_adjust: res.data.time_range.bid_adjust || { enabled: false, startTime: '00:00', endTime: '23:59' },
          block: res.data.time_range.block || { enabled: false, startTime: '00:00', endTime: '23:59' },
          budget_boost: res.data.time_range.budget_boost || { enabled: false, startTime: '00:00', endTime: '23:59' }
        }
      }
    }
  } catch (e) { console.error(e) }
}

async function fetchOperationLogs() {
  logsLoading.value = true
  try {
    const res = await pushnamiService.getOperationLogs({
      page: opLogPage.value,
      pageSize: opLogPageSize.value,
      task_type: logType.value || undefined
    })
    if (res.code === 200) {
      operationLogs.value = res.data.list || []
      opLogTotal.value = res.data.total || 0
      opLogPageInput.value = opLogPage.value
    }
  } catch { ElMessage.error('获取日志失败') }
  finally { logsLoading.value = false }
}

async function fetchExecutionLogs() {
  execLogsLoading.value = true
  try {
    const res = await pushnamiService.getExecutionLogs({
      page: execLogPage.value,
      pageSize: execLogPageSize.value,
      task_type: execLogType.value || undefined
    })
    if (res.code === 200) {
      executionLogs.value = res.data.list || []
      execLogTotal.value = res.data.total || 0
      execLogPageInput.value = execLogPage.value
    }
  } catch { ElMessage.error('获取执行日志失败') }
  finally { execLogsLoading.value = false }
}


function logOpPagination(action, details = {}) {
  logOperation('op_pagination', `操作日志${action}`, details)
}


function logExecPagination(action, details = {}) {
  logOperation('exec_pagination', `执行日志${action}`, details)
}


function onOpLogPageSizeChange() {
  logOpPagination(`修改为每页 ${opLogPageSize.value} 条`, { pageSize: opLogPageSize.value })
  opLogPage.value = 1
  fetchOperationLogs()
}


function goToOpLogFirstPage() {
  if (opLogPage.value > 1) {
    logOpPagination('跳转首页', { from: opLogPage.value, to: 1 })
    opLogPage.value = 1
    fetchOperationLogs()
  }
}


function goToOpLogPrevPage() {
  if (opLogPage.value > 1) {
    logOpPagination('上一页', { from: opLogPage.value, to: opLogPage.value - 1 })
    opLogPage.value--
    fetchOperationLogs()
  }
}


function goToOpLogNextPage() {
  const maxPage = Math.ceil(opLogTotal.value / opLogPageSize.value)
  if (opLogPage.value < maxPage) {
    logOpPagination('下一页', { from: opLogPage.value, to: opLogPage.value + 1 })
    opLogPage.value++
    fetchOperationLogs()
  }
}


function jumpToOpLogPage() {
  const maxPage = Math.ceil(opLogTotal.value / opLogPageSize.value)
  const targetPage = parseInt(opLogPageInput.value)
  if (targetPage >= 1 && targetPage <= maxPage) {
    const oldPage = opLogPage.value
    opLogPage.value = targetPage
    logOpPagination('跳转页面', { from: oldPage, to: targetPage })
    fetchOperationLogs()
  } else {
    ElMessage.warning(`请输入 1-${maxPage} 之间的页码`)
    opLogPageInput.value = opLogPage.value
  }
}


function goToOpLogLastPage() {
  const maxPage = Math.ceil(opLogTotal.value / opLogPageSize.value)
  if (opLogPage.value < maxPage) {
    logOpPagination('跳转末页', { from: opLogPage.value, to: maxPage })
    opLogPage.value = maxPage
    fetchOperationLogs()
  }
}


function onExecLogPageSizeChange() {
  logExecPagination(`修改为每页 ${execLogPageSize.value} 条`, { pageSize: execLogPageSize.value })
  execLogPage.value = 1
  fetchExecutionLogs()
}


function goToExecLogFirstPage() {
  if (execLogPage.value > 1) {
    logExecPagination('跳转首页', { from: execLogPage.value, to: 1 })
    execLogPage.value = 1
    fetchExecutionLogs()
  }
}


function goToExecLogPrevPage() {
  if (execLogPage.value > 1) {
    logExecPagination('上一页', { from: execLogPage.value, to: execLogPage.value - 1 })
    execLogPage.value--
    fetchExecutionLogs()
  }
}


function goToExecLogNextPage() {
  const maxPage = Math.ceil(execLogTotal.value / execLogPageSize.value)
  if (execLogPage.value < maxPage) {
    logExecPagination('下一页', { from: execLogPage.value, to: execLogPage.value + 1 })
    execLogPage.value++
    fetchExecutionLogs()
  }
}


function jumpToExecLogPage() {
  const maxPage = Math.ceil(execLogTotal.value / execLogPageSize.value)
  const targetPage = parseInt(execLogPageInput.value)
  if (targetPage >= 1 && targetPage <= maxPage) {
    const oldPage = execLogPage.value
    execLogPage.value = targetPage
    logExecPagination('跳转页面', { from: oldPage, to: targetPage })
    fetchExecutionLogs()
  } else {
    ElMessage.warning(`请输入 1-${maxPage} 之间的页码`)
    execLogPageInput.value = execLogPage.value
  }
}


function goToExecLogLastPage() {
  const maxPage = Math.ceil(execLogTotal.value / execLogPageSize.value)
  if (execLogPage.value < maxPage) {
    logExecPagination('跳转末页', { from: execLogPage.value, to: maxPage })
    execLogPage.value = maxPage
    fetchExecutionLogs()
  }
}

async function updateTaskSwitch(taskType) {
  const keyMap = {
    bid_adjust: 'bidAdjust',
    block: 'block',
    budget_boost: 'budgetBoost'
  }
  const taskNames = {
    bid_adjust: 'Bid 调整',
    block: 'Block 任务',
    budget_boost: 'Budget 放量'
  }

  const key = keyMap[taskType]
  const newValue = tasks.value[key]
  const oldValue = prevTasks.value[taskType]


  const statusText = newValue ? '开启' : '关闭'
  logOperation('toggle_task', `${statusText}${taskNames[taskType]}`, {
    task: taskType,
    enabled: newValue
  })


  prevTasks.value[taskType] = newValue


  try {
    const dbTasks = {
      bid_adjust: tasks.value.bidAdjust,
      block: tasks.value.block,
      budget_boost: tasks.value.budgetBoost
    }

    await pushnamiService.updateConfig({
      config_key: 'task_switch',
      config_value: JSON.stringify(dbTasks)
    })
  } catch { ElMessage.error('保存失败') }


  if (newValue && !oldValue) {

    runTask(taskType)

    setTimeout(() => fetchTasksStatus(), 500)
  } else if (!newValue && oldValue) {

    try {
      await pushnamiService.cancelScheduledTask(taskType)
      ElMessage.info(`${taskNames[taskType]}已关闭，待执行的任务已取消`)
    } catch (e) {
      console.error('取消待执行任务失败:', e)
    }

    fetchTasksStatus()
  }
}


async function stopExecution(id) {

  if (stoppingIds.value.has(id)) return
  stoppingIds.value.add(id)

  const log = executionLogs.value.find(l => l.id === id)
  if (!log) {
    stoppingIds.value.delete(id)
    return
  }

  const taskName = taskTypeMap[log.task_type] || log.task_type

  try {
    await pushnamiService.stopExecution(id)

    logOperation('stop_execution', `停止${taskName}脚本执行`, {
      executionId: id,
      taskType: log.task_type
    })

    ElMessage.success('停止请求已发送')


    setTimeout(() => {
      fetchExecutionLogs()
    }, 2000)
  } catch (e) {
    console.error(e)
    ElMessage.error('停止失败')
  } finally {
    stoppingIds.value.delete(id)
  }
}


async function fetchServiceStatus() {

  if (isStarting.value) {
    return
  }

  try {
    const res = await pushnamiService.getServiceStatus()
    if (res.code === 200) {
      serviceStatus.value = res.data
    }
  } catch (e) {
    console.error('获取服务状态失败:', e)
  }
}


async function runTask(taskType) {
  const taskNames = {
    bid_adjust: 'Bid 调整',
    block: 'Block 任务',
    budget_boost: 'Budget 放量'
  }

  const taskName = taskNames[taskType] || taskType


  if (isStarting.value || serviceStatus.value?.isRunning) {
    ElMessage.warning(isStarting.value ? '任务正在启动中...' : `已有任务正在执行中: ${currentTaskDisplay.value}`)
    return
  }


  isStarting.value = true

  try {
    const res = await pushnamiService.triggerTask(taskType)

    if (res.code === 200) {
      ElMessage.success(`${taskName} 已开始执行`)

      logOperation('run_task', `执行${taskName}`, {
        taskType
      })


      serviceStatus.value = {
        ...serviceStatus.value,
        isInitialized: true,
        isRunning: true,
        currentTask: taskType
      }


      isStarting.value = false


      setTimeout(() => {
        fetchServiceStatus()
        fetchExecutionLogs()
      }, 3000)
    } else if (res.code === 409) {
      ElMessage.warning(res.message)
      await fetchServiceStatus()
      isStarting.value = false
    } else if (res.code === 202 && res.scheduled) {

      const timeRangeStr = `${res.timeRange.startTime} - ${res.timeRange.endTime}`
      ElMessage.info({
        message: `当前时间不在执行范围内 (${timeRangeStr})，任务已调度，将在 ${res.timeRange.startTime} 自动开始执行`,
        duration: 5000
      })
      isStarting.value = false

      setTimeout(() => fetchTasksStatus(), 1000)
    } else {
      ElMessage.error(res.message || '启动任务失败')
      isStarting.value = false
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('启动任务失败')
    isStarting.value = false
  }
}


const isTaskRunning = computed(() => {
  return isStarting.value || serviceStatus.value?.isRunning || false
})


const currentTaskDisplay = computed(() => {
  const taskMap = {
    bid_adjust: 'Bid 调整',
    block: 'Block 任务',
    budget_boost: 'Budget 放量',
    all: '全部任务'
  }
  return taskMap[serviceStatus.value?.currentTask] || serviceStatus.value?.currentTask || ''
})


async function downloadLogFile(row) {
  try {
    const response = await pushnamiService.downloadLog(row.id)


    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {

    }


    if (data && data.code && data.code !== 200) {
      ElMessage.error(data.message || '下载失败')
      return
    }


    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = row.log_file_name || `pushnami-log-${row.id}.log`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('日志文件下载成功')

    logOperation('download_log', `下载日志文件: ${row.log_file_name}`, {
      executionId: row.id
    })
  } catch (e) {
    console.error(e)
    ElMessage.error('下载日志文件失败')
  }
}


async function fetchRunningLogs() {
  runningLogsLoading.value = true
  try {
    const res = await pushnamiService.getRunningLogs()
    if (res.code === 200) {
      runningLogs.value = res.data || []
    }
  } catch (e) {

    console.error('获取运行日志失败:', e)
  } finally {
    runningLogsLoading.value = false
  }
}


function startRunningLogsPolling() {
  if (runningLogsPollingTimer) {
    clearInterval(runningLogsPollingTimer)
  }

  runningLogsPollingTimer = setInterval(() => {
    if (logViewType.value === 'running') {
      fetchRunningLogs()
    }
  }, 3000)
}


function stopRunningLogsPolling() {
  if (runningLogsPollingTimer) {
    clearInterval(runningLogsPollingTimer)
    runningLogsPollingTimer = null
  }
}


watch(serviceStatus, (newStatus) => {

  if (hideRunningLogTabTimer) {
    clearTimeout(hideRunningLogTabTimer)
    hideRunningLogTabTimer = null
  }


}, { deep: true })

onMounted(async () => {

  initColumnSettings()
  await refreshData()
  await fetchServiceStatus()

  startLogPolling()

  startTasksStatusPolling()

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {

  stopLogPolling()
  stopRunningLogsPolling()
  stopTasksStatusPolling()
  if (hideRunningLogTabTimer) {
    clearTimeout(hideRunningLogTabTimer)
    hideRunningLogTabTimer = null
  }

  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="less" scoped>

@blue: #1a73e8;
@blue-light: #e8f0fe;
@red: #d93025;
@red-light: #fce8e6;
@green: #1e8e3e;
@green-light: #e6f4ea;
@gray-50: #f8f9fa;
@gray-100: #f1f3f4;
@gray-200: #e8eaed;
@gray-300: #dadce0;
@gray-400: #bdc1c6;
@gray-500: #5f6368;
@gray-600: #3c4043;
@gray-700: #3c4043;
@gray-900: #202124;

.pushnami-page {
  padding: 5px 15px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', 'SF Pro Display', -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #202124;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}


.rules-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.rules-editor-dialog {
  background: white;
  border-radius: 28px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid @gray-100;

  h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 400;
    color: @gray-900;
  }
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: @gray-100;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    width: 20px;
    height: 20px;
    fill: @gray-700;
  }

  &:hover {
    background: @gray-200;
  }
}

.dialog-body {
  padding: 24px 32px;
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: @gray-300;
    border-radius: 4px;

    &:hover {
      background: @gray-500;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid @gray-100;
  background: @gray-50;
}


.conflict-alert {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 24px;


  border-radius: 12px;

  svg {
    width: 24px;
    height: 24px;
    fill: #b06000;
    flex-shrink: 0;
    margin-top: 2px;
  }
}

.alert-content {
  flex: 1;
}

.alert-title {
  color: #b06000;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.alert-desc {
  color: #5f6368;
  font-size: 13px;
  line-height: 1.5;
}


.global-config {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.config-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border: 1px solid @gray-200;
  border-radius: 16px;
  transition: all 0.2s ease;

  &:hover {
    border-color: @gray-300;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.config-label {
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    width: 20px;
    height: 20px;
    fill: @gray-700;
  }

  span {
    font-size: 14px;
    font-weight: 500;
    color: @gray-700;
  }
}

.config-input {
  display: flex;
  align-items: center;
  gap: 8px;

  input {
    width: 80px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid @gray-300;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    text-align: center;

    &:focus {
      outline: none;
      border-color: @blue;
      box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.15);
    }
  }

  .input-suffix {
    font-size: 13px;
    color: @gray-500;
  }
}


.config-card-time-range {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;

  .config-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
}

.time-range-enable-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  span {
    font-size: 13px;
    color: @gray-700;
    cursor: pointer;
  }
}

.time-range-inputs-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-range-input {
  width: 90px;
  padding: 6px 10px;
  border: 1px solid @gray-300;
  border-radius: 6px;
  font-size: 13px;
  color: @gray-900;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: @blue;
    box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
  }

  &:hover {
    border-color: @gray-400;
  }
}

.time-separator {
  color: @gray-500;
  font-size: 14px;
}


.task-time-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: @gray-600;

  svg {
    width: 14px;
    height: 14px;
    fill: @gray-500;
  }
}


.rules-summary-section {
  background: white;
  border-radius: 16px;
  border: 1px solid @gray-200;
  overflow: hidden;
  margin-bottom: 20px;
}

.rules-summary-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;

  border-bottom: 1px solid @gray-200;

  svg {
    width: 20px;
    height: 20px;

  }

  span {
    font-size: 14px;
    font-weight: 500;

  }
}

.rules-summary-content {
  padding: 16px 20px;
}

.rules-summary-empty {
  text-align: center;
  padding: 20px;
  color: @gray-400;
  font-size: 14px;
}

.rules-summary-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rules-summary-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: @gray-50;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;

  .rule-index {
    font-weight: 500;

    white-space: nowrap;
  }

  .rule-condition {
    color: @gray-700;
    font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  }
}

.rules-summary-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 14px;
  font-size: 12px;
  color: @gray-600;

  svg {
    width: 16px;
    height: 16px;
    fill: @gray-500;
    flex-shrink: 0;
  }

  span {
    line-height: 1.4;
  }
}


.rules-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.rules-block {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid @gray-100;

  &.rules-block-down {
    .block-icon {
      background: #fce8e6;
      color: #c5221f;
    }

    .rule-badge-down {
      background: #fce8e6;
      color: #c5221f;
    }
  }

  &.rules-block-up {
    .block-icon {
      background: #e6f4ea;
      color: #137333;
    }

    .rule-badge-up {
      background: #e6f4ea;
      color: #137333;
    }
  }
}

.block-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: @gray-50;
  border-bottom: 1px solid @gray-100;
}

.block-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
  }
}

.block-info {
  flex: 1;
}

.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: @gray-900;
}

.block-subtitle {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: @gray-500;
}


.rules-grid {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.rule-card {
  background: white;
  border: 1px solid @gray-200;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border-color: @gray-300;
  }


  &.rule-card-conflict {
    border: 2px solid #f1c21b;
    background: #fef9e7;

    .rule-card-header {
      background: #fef7e0;
    }

    .conflict-icon {
      display: block;
    }
  }


  &.rule-card-invalid {
    border: 2px solid #c5221f;
    background: #fce8e6;

    .rule-card-header {
      background: #fad2cf;
    }

    .conflict-icon {
      display: block;

      &.invalid-icon {
        fill: #c5221f;
      }
    }
  }
}

.rule-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: @gray-50;
  border-bottom: 1px solid @gray-100;
}

.rule-badge {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.conflict-icon {
  display: none;
  width: 18px;
  height: 18px;
  fill: #b06000;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.rule-card-body {
  padding: 16px;
}

.rule-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  &:not(:last-child) {
    margin-bottom: 12px;
  }
}

.rule-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 500;
    color: @gray-500;
  }
}

.number-input {
  position: relative;
  display: flex;
  align-items: center;

  .input-prefix {
    position: absolute;
    left: 12px;
    font-size: 13px;
    font-weight: 500;
    color: @gray-500;
    pointer-events: none;
  }

  input {
    width: 100%;
    height: 40px;
    padding: 0 12px 0 32px;
    border: 1px solid @gray-300;
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: @blue;
      box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.15);
    }

    &::placeholder {
      color: @gray-400;
    }
  }
}

.rule-card-footer {
  padding: 12px 16px;
  background: @gray-50;
  border-top: 1px solid @gray-100;
  font-size: 12px;
  color: @gray-600;
  font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.4;
}


.rules-container-new {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-card-new {
  background: white;
  border: 1px solid @gray-200;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s ease;

  .rule-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: @gray-50;
    border-bottom: 1px solid @gray-100;

    .rule-badge {
      padding: 4px 12px;
      background: @blue-light;
      color: @blue;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .delete-rule-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;

      svg {
        width: 18px;
        height: 18px;
        fill: @gray-400;
      }

      &:hover {
        background: #fce8e6;

        svg {
          fill: #c5221f;
        }
      }
    }
  }

  .rule-card-body {
    padding: 20px;
  }

  .conditions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .condition-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .condition-number {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: @gray-100;
    color: @gray-600;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
  }

  .condition-select {
    height: 36px;
    padding: 0 12px;
    border: 1px solid @gray-300;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: @blue;
      box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.15);
    }
  }

  .condition-input {
    height: 36px;
    padding: 0 12px;
    border: 1px solid @gray-300;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    min-width: 80px;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: @blue;
      box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.15);
    }
  }

  .valueType-select {
    min-width: 110px;
  }

  .value-input-wrapper {
    display: flex;
    align-items: center;
    position: relative;
    min-width: 80px;

    .condition-input {
      min-width: 70px;
    }

    .condition-input.has-suffix {
      padding-right: 35px;
    }
  }

  .value-suffix {
    position: absolute;
    right: 10px;
    font-size: 13px;
    color: @gray-500;
    pointer-events: none;
  }

  .logic-select {
    height: 36px;
    padding: 0 12px;
    border: 1px solid @gray-300;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    background: @gray-50;
    cursor: pointer;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: @blue;
      box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.15);
    }
  }

  .delete-condition-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
    flex-shrink: 0;

    svg {
      width: 16px;
      height: 16px;
      fill: @gray-400;
    }

    &:hover {
      background: #fce8e6;

      svg {
        fill: #c5221f;
      }
    }
  }

  .add-condition-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border: 1px dashed @gray-300;
    border-radius: 8px;
    background: transparent;
    color: @gray-600;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;

    svg {
      width: 16px;
      height: 16px;
      fill: @gray-400;
    }

    &:hover {
      border-color: @blue;
      background: @blue-light;
      color: @blue;

      svg {
        fill: @blue;
      }
    }
  }

  .rule-summary {
    margin: 16px 0;
    padding: 12px 16px;
    background: @gray-50;
    border-radius: 8px;
    font-size: 12px;
    color: @gray-700;
    font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    line-height: 1.5;
  }

  .new-bid-field {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 20px;

    label {
      font-size: 13px;
      font-weight: 500;
      color: @gray-700;

    }

    .number-input {
      flex: 1;
    }
  }
}

.add-rule-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 24px;
  border: 1px dashed @blue;
  border-radius: 12px;
  background: @blue-light;
  color: @blue;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
    fill: @blue;
  }

  &:hover {
    background: #e8f0fe;
    border-color: #1967d2;

    svg {
      fill: #1967d2;
    }
  }
}


.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  flex-shrink: 0;


  svg {
    width: 18px;
    height: 18px;
    fill: @gray-500;
  }

  &:hover {
    background: @gray-100;

    svg {
      fill: @blue;
    }
  }
}


.run-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: @green-light;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;

  svg {
    width: 16px;
    height: 16px;
    fill: @green;
  }

  &:hover:not(:disabled) {
    background: @green;
    svg {
      fill: white;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}


.page-top {
  position: relative;
  margin-bottom: 16px;
  height: 0;
}

.page-settings {
  position: absolute;
  top: -25px;
  right: -25px;
  z-index: 10;
}


.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid @gray-200;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 20px;
  font-weight: 400;
  color: @gray-900;
  margin: 0;
}

.page-subtitle {
  display: none;
}


.md-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: @gray-100;
  color: @gray-700;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: @gray-200;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.md-primary {
    background: @blue;
    color: white;

    &:hover:not(:disabled) {
      background: #1557b0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
    }
  }

  &.md-small {
    height: 32px;
    padding: 0 16px;
    font-size: 13px;
  }
}


.md-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  margin-bottom: 16px;
  overflow: hidden;
}

.task-card {
  margin-bottom: 16px;
}

.settings-dropdown {
  position: relative;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
    fill: @gray-500;
  }

  &:hover {
    background: @gray-100;

    svg {
      fill: @gray-700;
    }
  }
}

.settings-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  padding: 6px 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s ease;

  &.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
}

.settings-menu-item {
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: @gray-700;
  font-family: inherit;
  transition: background 0.15s ease;

  svg {
    width: 18px;
    height: 18px;
    fill: @gray-500;
  }

  &:hover {
    background: @gray-50;
  }

  &.close-browser-item:hover {
    background: #fce8e6;
    color: #c5221f;

    svg {
      fill: #c5221f;
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid @gray-100;
  background-color: #f4f4f4;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: @gray-900;
  margin: 0;
}

.card-subtitle {
  font-size: 13px;
  color: @gray-500;
}


.log-type-switcher {
  display: inline-flex;
  background: @gray-100;
  border-radius: 8px;
  padding: 4px;
}

.log-type-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: @gray-500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover {
    color: @gray-700;
  }

  &.active {
    background: white;
    color: @blue;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
}


.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;

  &.status-started {
    background: @blue-light;
    color: @blue;
  }

  &.status-completed {
    background: @green-light;
    color: @green;
  }

  &.status-failed {
    background: @red-light;
    color: @red;
  }

  &.status-interrupted {
    background: #fff3e0;
    color: #e65100;
  }

  &.status-stopped {
    background: #eceff1;
    color: #546e7a;
  }
}


.message-cell {
  min-width: 300px;
  max-height: 60px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  font-size: 12px;
  line-height: 1.5;
  color: @gray-700;
  word-break: break-word;
  padding-top: 2px;
  padding-bottom: 2px;
}


.text-error {
  color: @red;
  font-weight: 500;
}


.task-list {
  display: flex;

  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
  justify-content: space-between;
}

.task-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: 8px;
  transition: background 0.2s ease;
  width: 32%;

  @media (max-width: 1200px) {
    width: 100%;
  }

  &:hover {
    background: @gray-50;
  }

  &.task-disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background: transparent;
    }
  }

  &.task-blue .task-icon { background: @blue-light; color: @blue; }
  &.task-red .task-icon { background: @red-light; color: @red; }
  &.task-green .task-icon { background: @green-light; color: @green; }
}

.task-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 54px;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: @gray-900;
  margin-bottom: 2px;
}

.task-meta {
  font-size: 12px;
  color: @gray-500;
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}


.task-running-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #e6f4ea;
  color: #137333;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.task-next-run {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 4px;
  font-size: 11px;
}

.task-paused-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: @gray-100;
  color: @gray-500;
  border-radius: 4px;
  font-size: 11px;
}

.task-status {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  background: @gray-100;
  color: @gray-500;
  white-space: nowrap;

  &.active {
    background: @green-light;
    color: @green;
    font-weight: 500;
  }
}


.md-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;

  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .md-switch-track {
      background: @blue;

      &::after {
        transform: translateX(20px);
      }
    }

    &:checked + .md-switch-track .md-switch-thumb {
      transform: translateX(20px);
    }
  }
}

.md-switch-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: @gray-300;
  border-radius: 12px;
  transition: background 0.2s ease;
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: transform 0.2s ease;
  }
}

.md-switch-thumb {
  display: none;
}


.md-switch.switch-disabled {
  cursor: not-allowed;

  .md-switch-track {
    cursor: not-allowed;
  }
}


.filter-tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  border-bottom: 1px solid @gray-100;
}

.filter-tabs-left {
  display: flex;
  gap: 4px;
}

.filter-tab {
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: @gray-500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover {
    background: @gray-100;
  }

  &.active {
    background: @blue-light;
    color: @blue;
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


.table-container {
  min-height: 280px;

  overflow-x: auto;
  overflow-y: auto;

  scrollbar-gutter: stable;


  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  -ms-overflow-style: -ms-autohiding-scrollbar;

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
    }
  }


  &:hover {
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;

      &:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    }
  }
}

.md-table {
  min-width: max-content;
  border-collapse: collapse;

  thead {
    tr {
      border-bottom: 1px solid @gray-200;
      background: @gray-50;
    }

    th {
      text-align: center;
      padding: 12px 20px;
      font-size: 13px;
      font-weight: 500;
      color: @gray-700;
      letter-spacing: 0.3px;
      border-bottom: 2px solid @gray-200;
      user-select: none;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid @gray-100;
      transition: background 0.2s ease;

      &:hover {
        background: @gray-50;
      }

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 12px 20px;
      font-size: 13px;
      color: @gray-700;
      text-align: center;
    }
  }
}

.text-muted {
  color: @gray-500;
}

.text-mono {
  font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

.text-truncate {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.task-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.badge-bid_adjust {
    background: @blue-light;
    color: @blue;
  }

  &.badge-block {
    background: @red-light;
    color: @red;
  }

  &.badge-budget_boost {
    background: @green-light;
    color: @green;
  }
}


.value-change {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.old-value {
  color: @gray-500;
  text-decoration: line-through;
}

.new-value {
  font-weight: 500;


  &.value-up {
    color: @green;
  }


  &.value-down {
    color: @red;
  }


  &:not(.value-up):not(.value-down) {
    color: @gray-600;
  }
}

.rule-condition {
  font-size: 12px;
  color: @gray-700;
  font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  fill: @gray-300;
}

.blocked-badge {
  display: inline-block;
  padding: 3px 10px;
  background: @gray-200;
  color: @gray-500;
  border-radius: 4px;
  font-size: 12px;
}


.stop-btn {
  padding: 4px 12px;
  border: 1px solid @red;
  background: white;
  color: @red;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: @red;
    color: white;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}


.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: @gray-500;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    opacity: 0.3;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}


.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid @gray-100;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-info {
  font-size: 13px;
  color: @gray-500;
}

.page-size-select {
  padding: 4px 8px;
  border: 1px solid @gray-300;
  border-radius: 4px;
  font-size: 13px;
  color: @gray-700;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: @gray-400;
  }

  &:focus {
    outline: none;
    border-color: @blue;
  }
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
    fill: @gray-500;
  }

  &:hover:not(:disabled) {
    background: @gray-100;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.page-info {
  font-size: 13px;
  color: @gray-700;
  min-width: 60px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.page-input {
  width: 45px;
  padding: 4px 6px;
  border: 1px solid @gray-300;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
  color: @gray-700;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: @gray-400;
  }

  &:focus {
    outline: none;
    border-color: @blue;
  }


  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  & {
    -moz-appearance: textfield;
  }
}


:deep(.el-loading-mask) {
  border-radius: 0 0 12px 12px;
  background: rgba(255, 255, 255, 0.8);
}


@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}


.download-log-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid @gray-300;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  color: @gray-600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  &:hover {
    background: @blue-light;
    border-color: @blue;
    color: @blue;
  }

  &:active {
    transform: translateY(1px);
  }
}


.running-log-container {
  max-height: 418px;
  overflow-y: auto;
  padding: 16px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: @gray-100;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: @gray-300;
    border-radius: 4px;

    &:hover {
      background: @gray-500;
    }
  }

  .empty-state {
    text-align: center;

    svg {
      width: 64px;
      height: 64px;
      fill: @gray-300;
      margin-bottom: 16px;
    }

    p {
      margin: 8px 0;
      color: @gray-500;
      font-size: 14px;

      &.text-muted {
        font-size: 12px;
        color: @gray-400;
      }
    }
  }

  .running-logs-list {
    font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
  }

  .log-entry {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.15s ease;

    &:hover {
      background: @gray-50;
    }

    &.log-level-error {
      background: #fff5f5;

      &:hover {
        background: #fed7d7;
      }
    }

    &.log-level-warning {
      background: #fffaf0;

      &:hover {
        background: #feebc8;
      }
    }
  }

  .log-timestamp {
    color: @gray-400;
    flex-shrink: 0;
  }

  .log-level {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    flex-shrink: 0;

    &.level-badge-info {
      background: @blue-light;
      color: @blue;
    }

    &.level-badge-success {
      background: @green-light;
      color: @green;
    }

    &.level-badge-warning {
      background: #fff3e0;
      color: #e65100;
    }

    &.level-badge-error {
      background: @red-light;
      color: @red;
    }

    &.level-badge-dryrun {
      background: #e3f2fd;
      color: #1565c0;
    }

    &.level-badge-task {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    &.level-badge-campaign {
      background: #e8f5e9;
      color: #2e7d32;
    }

    &.level-badge-source {
      background: #fff3e0;
      color: #e65100;
    }
  }

  .log-prefix {
    color: @gray-600;
    font-weight: 500;
  }

  .log-message {
    color: @gray-700;
    word-break: break-word;
  }
}
</style>
