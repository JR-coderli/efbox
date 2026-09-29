-- 存量表升级: 给 domain_replacement_logs 增加"轮次"列(第几轮异常, 1-3; 系统级事件为空)
-- 线上 MySQL 5.7 兼容。
ALTER TABLE domain_replacement_logs
  ADD COLUMN round TINYINT UNSIGNED NULL COMMENT '第几轮异常(1-3), 系统级事件为空' AFTER event;
