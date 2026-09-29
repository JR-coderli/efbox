-- 域名替换过程日志表: 记录替换/复核/二次核验的全过程事件流(不只最终结果)。
-- 与 cf_lander_url_replacements(替换任务的执行记录与终态)互补:
--   那张表记"替换任务本身"的结果, 这张表记"脚本侧流程"的每一步。
-- 事件类型(event): replace_start / backup_selected / sync / cf_result / ef_result /
--   both_unused / verdict / notice / verify_start / verify_result / verify_call
-- detail 为 JSON 字符串(各事件的上下文参数)。
-- ⚠️ 线上 MySQL 5.7: domain 用 VARCHAR(190) 保证 utf8mb4 下索引不超 767 字节限制。
CREATE TABLE IF NOT EXISTS domain_replacement_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  domain VARCHAR(190) NOT NULL COMMENT '危险域名(hostname)',
  event VARCHAR(50) NOT NULL COMMENT '事件类型',
  round TINYINT UNSIGNED NULL COMMENT '第几轮异常(1-3), 系统级事件为空',
  detail TEXT COMMENT '事件描述(面向用户的中文)或 JSON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_domain (domain),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  COMMENT='域名替换过程日志(url_detection_database 写入)';
