-- 改造变现通知表：去掉 domain/status 限制，改为存原始 JSON
-- 先加 payload 列
ALTER TABLE `domain_monetstatus_notice` ADD COLUMN `payload` JSON DEFAULT NULL AFTER `id`;

-- 把已有数据的 domain/status 合并到 payload 里（可选，有旧数据才需要）
-- UPDATE domain_monetstatus_notice SET payload = JSON_OBJECT('domain', domain, 'status', status) WHERE payload IS NULL;

-- 删掉旧的 domain/status 列
ALTER TABLE `domain_monetstatus_notice` DROP COLUMN `domain`;
ALTER TABLE `domain_monetstatus_notice` DROP COLUMN `status`;
