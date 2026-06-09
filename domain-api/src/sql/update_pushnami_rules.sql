-- Pushnami 规则配置更新脚本
-- 更新 bid_adjust_rules 配置，添加 minConversions 字段

-- 删除旧配置
DELETE FROM pushnami_config WHERE config_key = 'bid_adjust_rules';

-- 插入完整规则配置（包含 minConversions）
INSERT INTO pushnami_config (config_key, config_value, description) VALUES
('bid_adjust_rules',
'{
  "rules": [
    {
      "minConversions": 1,
      "minCpa": 7,
      "maxCpa": null,
      "newBid": 0.10,
      "direction": "down"
    },
    {
      "minConversions": 1,
      "minCpa": 5,
      "maxCpa": 7,
      "newBid": 0.12,
      "direction": "down"
    },
    {
      "minConversions": 1,
      "minCpa": 4,
      "maxCpa": 5,
      "newBid": 0.15,
      "direction": "down"
    },
    {
      "minConversions": 3,
      "minCpa": null,
      "maxCpa": 2.8,
      "newBid": 0.18,
      "direction": "up"
    },
    {
      "minConversions": 3,
      "minCpa": 2.8,
      "maxCpa": 4,
      "newBid": 0.16,
      "direction": "up"
    }
  ],
  "intervalMinutes": 180,
  "cooldownMinutes": 100
}',
'Bid 调整规则（含 minConversions）');

-- 确保 block 规则存在
INSERT INTO pushnami_config (config_key, config_value, description) VALUES
('block_rules',
'{
  "threshold": 15,
  "intervalMinutes": 1440,
  "cooldownMinutes": 1440
}',
'Block 规则')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 确保 budget_boost 规则存在
INSERT INTO pushnami_config (config_key, config_value, description) VALUES
('budget_boost_rules',
'{
  "spendThreshold": 0.5,
  "intervalMinutes": 1440,
  "cooldownMinutes": 1440,
  "multiplier": 2
}',
'Budget 放量规则')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 确保任务开关存在
INSERT INTO pushnami_config (config_key, config_value, description) VALUES
('task_switch',
'{
  "bid_adjust": true,
  "block": true,
  "budget_boost": true
}',
'任务开关')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
