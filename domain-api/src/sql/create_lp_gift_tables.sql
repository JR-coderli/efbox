-- ============================================================
-- LP 礼品清单页(Gift LP)相关表
-- 供 zorfell.com/lp/gift/products 公开接口与后台管理页使用
-- 对应已投放静态页 pro2.winrab.com/s2/1/ecomlistical/v5/
-- ============================================================

-- Gift LP 产品表(每行一个产品板块)
CREATE TABLE IF NOT EXISTS `lp_gift_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序号,越小越靠前(全局排序,渲染时按分组分段)',
  `group_type` tinyint NOT NULL DEFAULT 1 COMMENT '分组: 1=主列表(带编号) 2=New Arrivals(无编号)',
  `title` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '板块标题(.smb-section-title 文本)',
  `product_name` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'CTA按钮完整文案(如 Learn More About X »)',
  `media_type` tinyint NOT NULL DEFAULT 1 COMMENT '媒体类型: 1=图片 2=视频',
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '媒体地址: LP相对路径(images/x.jpg)或本服务路径(/lp/uploads/x.mp4)',
  `content` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '板块正文HTML(.smb-section-main 原始innerHTML)',
  `link` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '跳转链接(Goto onclick 的 cf/click 地址)',
  `sold_out` tinyint(1) NOT NULL DEFAULT 0 COMMENT '售罄: 1=CTA按钮加 sold-out-button 样式',
  `enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 1=显示 0=隐藏',
  `createAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `sort`(`sort` ASC) USING BTREE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Gift LP产品' ROW_FORMAT = DYNAMIC;


-- Gift LP 页全局配置表(单行,id=1)
CREATE TABLE IF NOT EXISTS `lp_gift_page_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '页面大标题(h1)',
  `hero_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '头图地址(LP相对路径或绝对地址)',
  `intro_html` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '导语区HTML(header内头图之后的多个<p>)',
  `createAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Gift LP页全局配置' ROW_FORMAT = DYNAMIC;


-- 初始化配置空行(如已有则跳过, 内容由导入脚本填充)
INSERT IGNORE INTO `lp_gift_page_config` (`id`) VALUES (1);
