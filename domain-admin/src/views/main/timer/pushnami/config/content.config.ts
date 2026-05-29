/**
 * Pushnami 页面配置
 */
const contentConfig = {
  pageName: 'pushnami',
  header: {
    title: 'Pushnami 自动化任务管理',
    subtitle: '管理和监控自动化广告投放任务'
  },

  taskTypeMap: {
    bid_adjust: 'Bid 调整',
    block: 'Block',
    budget_boost: 'Budget 放量'
  },

  statusMap: {
    started: '执行中',
    completed: '已完成',
    failed: '失败',
    interrupted: '已中断',
    stopped: '已停止'
  },

  filterTabs: [
    { label: '全部', value: '' },
    { label: 'Bid 调整', value: 'bid_adjust' },
    { label: 'Block', value: 'block' },
    { label: 'Budget 放量', value: 'budget_boost' }
  ],

  operationLogColumns: [
    { label: '脚本 ID', prop: 'execution_id', key: 'execution_id', width: '70', class: 'text-mono' },

    { label: '类型', prop: 'task_type', key: 'task_type', width: '70', slotName: 'task_type', required: true },
    { label: 'Campaign Name', prop: 'campaign_name', key: 'campaign_name', width: '120', slotName: 'campaign_name' },
    { label: 'Campaign Spent', prop: 'total_spend', key: 'total_spend', width: '110', slotName: 'total_spend' },
    { label: 'Source ID', prop: 'entity_id', key: 'entity_id', width: '65', class: 'text-mono' },
    { label: 'Conversions', prop: 'conversions', key: 'conversions', width: '80', slotName: 'conversions' },
    { label: 'Clicks', prop: 'clicks', key: 'clicks', width: '70', slotName: 'clicks' },
    { label: 'Spent', prop: 'spent', key: 'spent', width: '70', slotName: 'spent' },
    { label: 'CPA', prop: 'cpa', key: 'cpa', width: '70', slotName: 'cpa' },
    { label: 'Target CPA', prop: 'target_cpa', key: 'target_cpa', width: '80', slotName: 'target_cpa' },
    { label: '操作内容', prop: 'operation', key: 'operation', width: '110', slotName: 'operation', required: true },
    { label: '触发规则', prop: 'rule_condition', key: 'rule_condition', width: '200', class: 'rule-condition', defaultHidden: true },
    { label: '操作时间', prop: 'created_at', key: 'created_at', width: '160', slotName: 'created_at' }
  ],

  executionLogColumns: [
    { label: 'ID', prop: 'id', width: '50', class: 'text-muted' },
    { label: '任务类型', prop: 'task_type', width: '70', slotName: 'task_type' },
    { label: '状态', prop: 'status', width: '70', slotName: 'status' },
    { label: 'Campaigns', prop: 'campaigns_processed', width: '60', class: 'text-mono' },

    { label: '操作数', prop: 'actions_taken', width: '60', class: 'text-mono' },
    { label: '错误', prop: 'errors', width: '60', slotName: 'errors' },
    { label: '消息', prop: 'message', slotName: 'message' },
    { label: '开始时间', prop: 'started_at', width: '160', slotName: 'started_at' },
    { label: '完成时间', prop: 'completed_at', width: '160', slotName: 'completed_at' },
    { label: '日志文件', prop: 'log_file_name', width: '80', slotName: 'log_file' },
    { label: '操作', prop: 'operation', width: '80', slotName: 'operation' }
  ],

  logViewTypes: {
    operation: '操作记录',
    execution: '脚本记录',
    running: '运行日志'
  },

  pagination: {
    page: 1,
    pageSize: 10
  }
}

export default contentConfig
