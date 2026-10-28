/**
 * 执行 lp 相关建表 SQL(本地/生产均可)
 * 用法: node scripts/lp-setup-tables.js
 */
const fs = require('fs')
const path = require('path')
const connection = require('../src/app/database')

async function main() {
  const sqlPath = path.join(__dirname, '..', 'src', 'sql', 'create_lp_tables.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  // 按分号切分逐条执行(跳过注释行)
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/--.*$/gm, '').trim())
    .filter(Boolean)

  for (const stmt of statements) {
    const [result] = await connection.query(stmt)
    const head = stmt.replace(/\s+/g, ' ').slice(0, 60)
    console.log('OK:', head, result.affectedRows !== undefined ? `(affected ${result.affectedRows})` : '')
  }

  // 校验
  const [tables] = await connection.query("SHOW TABLES LIKE 'lp_%'")
  const [count] = await connection.query('SELECT COUNT(*) AS c FROM lp_products')
  const [menus] = await connection.query("SELECT id, name, url FROM menu WHERE url = '/main/webpage/lp-products'")
  console.log('\nlp_ 开头的表:', tables.map((t) => Object.values(t)[0]))
  console.log('lp_products 现有行数:', count[0].c)
  console.log('菜单:', menus)
  process.exit(0)
}

main().catch((err) => {
  console.error('执行失败:', err.message)
  process.exit(1)
})
