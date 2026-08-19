-- ============================================================
-- 新增二级菜单：ef-归因系统 → 数据面板
-- 对应前端路由 /main/ef-tracker/datapanel（datapanel.vue）
-- 兼容 MySQL 5.7；执行前请确认 menu 表自增值仍为 87（即 86 之后无新增菜单）
-- ============================================================

-- 1. 插入菜单（放在「归因总览」之后，sort=2；原 2~7 顺次后移）
INSERT INTO `menu` (`id`, `name`, `type`, `icon`, `parentId`, `url`, `permission`, `sort`, `createAt`, `updateAt`, `directLink`)
VALUES (87, '数据面板', 2, NULL, 79, '/main/ef-tracker/datapanel', NULL, 2, NOW(), NOW(), 0);

-- 2. 同级原有菜单排序后移（sort 无唯一约束，顺序执行即可）
UPDATE `menu` SET `sort` = 8 WHERE `id` = 81; -- 错误日志   7 → 8
UPDATE `menu` SET `sort` = 7 WHERE `id` = 84; -- 转化回传   6 → 7
UPDATE `menu` SET `sort` = 6 WHERE `id` = 82; -- LP点击     5 → 6
UPDATE `menu` SET `sort` = 5 WHERE `id` = 83; -- LP访问     4 → 5
UPDATE `menu` SET `sort` = 4 WHERE `id` = 80; -- 媒体点击   3 → 4
UPDATE `menu` SET `sort` = 3 WHERE `id` = 85; -- 落地页列表 2 → 3

-- 3. 授权给「技术员」角色（role 1，与其它 ef-归因系统菜单一致）
INSERT INTO `role_menu` (`roleId`, `menuId`, `createAt`, `updateAt`)
VALUES (1, 87, NOW(), NOW());
