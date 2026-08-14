-- 域名替换功能升级（线上 MySQL 5.7 执行）
-- 1. cf_lander_url_replacements 增加 target_system 列：
--    clickflare = 替换的是 Clickflare 系统的 Lander
--    eftracker  = 替换的是 ef-归因系统（ab_landers）的 Lander
--    存量记录全部是 Clickflare 替换，默认回填 'clickflare'
-- 2. 菜单「clickflare」改名为「域名替换」（menu 表 id=59，路径不变 /main/timer/clickflare）
ALTER TABLE `cf_lander_url_replacements`
  ADD COLUMN `target_system` varchar(20) NOT NULL DEFAULT 'clickflare'
  COMMENT '目标系统: clickflare / eftracker'
  AFTER `replacement_domain`;

UPDATE `menu` SET `name` = '域名替换' WHERE `id` = 59 AND `url` = '/main/timer/clickflare';
