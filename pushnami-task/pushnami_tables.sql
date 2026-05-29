-- Pushnami 自动化任务相关数据表

-- 1. Pushnami 操作记录表
CREATE TABLE IF NOT EXISTS `pushnami_operation_log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `task_type` VARCHAR(50) NOT NULL COMMENT '任务类型: bid_adjust/block/budget_boost',
  `entity_type` VARCHAR(20) NOT NULL COMMENT '实体类型: source/campaign',
  `entity_id` VARCHAR(100) NOT NULL COMMENT '实体ID (Source ID 或 Campaign ID)',
  `campaign_name` VARCHAR(255) DEFAULT NULL COMMENT 'Campaign 名称',
  `old_value` DECIMAL(10, 2) DEFAULT NULL COMMENT '修改前的值',
  `new_value` DECIMAL(10, 2) DEFAULT NULL COMMENT '修改后的值',
  `rule_condition` VARCHAR(255) DEFAULT NULL COMMENT '匹配的规则条件',
  `conversions` INT DEFAULT NULL COMMENT '转化数',
  `cpa` DECIMAL(10, 2) DEFAULT NULL COMMENT 'CPA 值',
  `total_spend` DECIMAL(10, 2) DEFAULT NULL COMMENT '每日总花费',
  `daily_spend_limit` DECIMAL(10, 2) DEFAULT NULL COMMENT '每日花费限额',
  `target_cpa` DECIMAL(10, 2) DEFAULT NULL COMMENT '目标 CPA',
  `is_dry_run` TINYINT(1) DEFAULT 0 COMMENT '是否为 Dry Run 模式',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_task_entity` (`task_type`, `entity_type`, `entity_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pushnami 操作记录表';

-- 2. Pushnami 任务执行日志表
CREATE TABLE IF NOT EXISTS `pushnami_execution_log` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `task_type` VARCHAR(50) NOT NULL COMMENT '任务类型: bid_adjust/block/budget_boost/all',
  `status` VARCHAR(20) NOT NULL COMMENT '状态: started/completed/failed',
  `campaigns_processed` INT DEFAULT 0 COMMENT '处理的 Campaign 数量',
  `sources_processed` INT DEFAULT 0 COMMENT '处理的 Source 数量',
  `actions_taken` INT DEFAULT 0 COMMENT '执行的操作数量',
  `errors` INT DEFAULT 0 COMMENT '错误数量',
  `message` TEXT DEFAULT NULL COMMENT '执行消息',
  `started_at` DATETIME NOT NULL COMMENT '开始时间',
  `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
  INDEX `idx_task_type` (`task_type`),
  INDEX `idx_started_at` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pushnami 任务执行日志表';

-- 3. Pushnami 配置表
CREATE TABLE IF NOT EXISTS `pushnami_config` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `config_key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  `config_value` TEXT NOT NULL COMMENT '配置值 (JSON 格式)',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '配置描述',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pushnami 配置表';

-- 4. 插入默认配置
INSERT INTO `pushnami_config` (`config_key`, `config_value`, `description`) VALUES
('task_switch', '{"bid_adjust": true, "block": true, "budget_boost": true}', '任务开关'),
('bid_adjust_rules', '{"rules": [{"minCpa": 7, "maxCpa": null, "newBid": 0.10}, {"minCpa": 5, "maxCpa": 7, "newBid": 0.12}, {"minCpa": 4, "maxCpa": 5, "newBid": 0.15}, {"minCpa": null, "maxCpa": 2.8, "newBid": 0.18}, {"minCpa": 2.8, "maxCpa": 4, "newBid": 0.16}], "intervalMinutes": 180, "cooldownMinutes": 100}', 'Bid 调整规则'),
('block_rules', '{"threshold": 15, "intervalMinutes": 1440, "cooldownMinutes": 1440}', 'Block 规则'),
('budget_boost_rules', '{"spendThreshold": 0.5, "multiplier": 2, "intervalMinutes": 1440, "cooldownMinutes": 1440}', 'Budget 放量规则')
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);
