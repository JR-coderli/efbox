/**
 * 执行 lp 相关建表 SQL(本地/生产均可)
 * 用法: node scripts/lp-setup-tables.js
 */
const fs = require('fs')
const path = require('path')
const connection = require('../src/app/database')

// zorfell 电商LP + 清单页LP v6(gift) + 清单页LP v7(gift7) 三套表
const SQL_FILES = ['create_lp_tables.sql', 'create_lp_gift_tables.sql', 'create_lp_gift7_tables.sql']

async function main() {
  for (const file of SQL_FILES) {
    const sqlPath = path.join(__dirname, '..', 'src', 'sql', file)
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    // 按分号切分逐条执行(跳过注释行)
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.replace(/--.*$/gm, '').trim())
      .filter(Boolean)

    console.log(`\n===== ${file} =====`)
    for (const stmt of statements) {
      const [result] = await connection.query(stmt)
      const head = stmt.replace(/\s+/g, ' ').slice(0, 60)
      console.log('OK:', head, result.affectedRows !== undefined ? `(affected ${result.affectedRows})` : '')
    }
  }

  // 增量迁移: 老库补列(MySQL 5.7 不支持 ADD COLUMN IF NOT EXISTS, 先查 information_schema)
  const [cols] = await connection.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lp_gift_products' AND COLUMN_NAME = 'media_style'"
  )
  if (cols.length === 0) {
    await connection.query("ALTER TABLE lp_gift_products ADD COLUMN `media_style` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '媒体显示样式(内联CSS)' AFTER `media_url`")
    console.log('\n迁移: lp_gift_products 已新增 media_style 列')
  } else {
    console.log('\n迁移: media_style 列已存在, 跳过')
  }

  // 校验
  const [tables] = await connection.query("SHOW TABLES LIKE 'lp_%'")
  const [count] = await connection.query('SELECT COUNT(*) AS c FROM lp_products')
  const [giftCount] = await connection.query('SELECT COUNT(*) AS c FROM lp_gift_products')
  const [gift7Count] = await connection.query('SELECT COUNT(*) AS c FROM lp_gift7_products')
  const [menus] = await connection.query("SELECT id, name, url FROM menu WHERE url = '/main/webpage/lp-products'")
  console.log('\nlp_ 开头的表:', tables.map((t) => Object.values(t)[0]))
  console.log('lp_products 现有行数:', count[0].c)
  console.log('lp_gift_products 现有行数:', giftCount[0].c)
  console.log('lp_gift7_products 现有行数:', gift7Count[0].c)
  console.log('菜单:', menus)
  process.exit(0)
}

main().catch((err) => {
  console.error('执行失败:', err.message)
  process.exit(1)
})
