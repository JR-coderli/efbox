-- ============================================================
-- LP 产品管理相关表
-- 供 zorfell.com/lp/products 公开接口与后台管理页使用
-- ============================================================

-- LP 页产品表(每行一个产品卡片)
CREATE TABLE IF NOT EXISTS `lp_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序号,越小越靠前',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '产品短名(CTA按钮/内链锚文本用)',
  `hook` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题钩子,标题 = name - hook',
  `p1` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '第一段文案(开头自动带产品名内链)',
  `p2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '第二段文案',
  `p3_pre` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '第三段前半(紧迫感文案,自动加🔥)',
  `p3_post` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '第三段后半(接产品名内链之后)',
  `discount` int NULL DEFAULT 50 COMMENT '折扣百分比(角标与按钮)',
  `rating` decimal(2,1) NULL DEFAULT 5.0 COMMENT '评分(默认5.0)',
  `media_type` tinyint NOT NULL DEFAULT 1 COMMENT '媒体类型: 1=图片 2=视频',
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '媒体地址: LP相对路径(images/x.webp)或本服务路径(/lp/uploads/x.mp4)',
  `enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 1=上架 0=下架',
  `createAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `sort`(`sort` ASC) USING BTREE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'LP页产品' ROW_FORMAT = DYNAMIC;


-- LP 页全局配置表(单行,id=1)
CREATE TABLE IF NOT EXISTS `lp_page_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '页面大标题(title/og/twitter/h1)',
  `subtitle` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '副标题(h2)',
  `banner_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '横幅图地址(LP相对路径)',
  `createAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'LP页全局配置' ROW_FORMAT = DYNAMIC;


-- 初始化配置行(如已有则跳过)
INSERT IGNORE INTO `lp_page_config` (`id`, `title`, `subtitle`, `banner_url`)
VALUES (1,
  '40+ Smart Products Solving Everyday Problems in Unexpected Ways',
  'Clever Finds You Don&#x27;t Want to Miss This Q4!',
  'images/banner.png');


-- 后台菜单: 网页管理(id=25)下新增"LP产品管理"二级菜单
INSERT INTO `menu` (`name`, `type`, `icon`, `parentId`, `url`, `permission`, `sort`)
SELECT 'LP产品管理', 2, NULL, 25, '/main/webpage/lp-products', NULL, 96
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `menu` WHERE `url` = '/main/webpage/lp-products');

-- 给 网页管理相关角色(技术员1/管理员2/设计6)授权新菜单
INSERT INTO `role_menu` (`roleId`, `menuId`)
SELECT r.id, m.id
FROM `role` r
JOIN `menu` m ON m.url = '/main/webpage/lp-products'
WHERE r.id IN (1, 2, 6)
  AND NOT EXISTS (SELECT 1 FROM `role_menu` rm WHERE rm.roleId = r.id AND rm.menuId = m.id);
