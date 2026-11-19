require('dotenv').config()
const mysql = require('mysql2')


const isProd = process.env.NODE_ENV === 'production'

const dbConfig = {
  host: isProd ? process.env.PROD_DB_HOST : process.env.DEV_DB_HOST,
  port: isProd ? process.env.PROD_DB_PORT : process.env.DEV_DB_PORT,
  database: isProd ? process.env.PROD_DB_DATABASE : process.env.DEV_DB_DATABASE,
  user: isProd ? process.env.PROD_DB_USER : process.env.DEV_DB_USER,
  password: isProd ? process.env.PROD_DB_PASSWORD : process.env.DEV_DB_PASSWORD,
  // 2026-11-19 登录卡顿修复: 池上限 5 → 20。
  // 全项目 33 个文件共用本池, 线上定时任务(域名检测/截图/爬虫/同步/报表)的慢查询
  // 会把 5 个连接占满 → 登录 SQL 排队等连接(表现为"点登录卡住一会"), 本地无并发任务所以快。
  // 20 对 MySQL 默认 max_connections=151 很安全; 若仍慢, 下一步查长任务(processlist)。
  connectionLimit: 20,
  dateStrings: true // dateStrings: true 会让 DATETIME / DATE / TIMESTAMP 字段直接返回字符串，而不是 JS Date 对象
}


const connectionPool = mysql.createPool(dbConfig)



connectionPool.getConnection((err, connection) => {


  if (err) {
    console.log('连接数据库失败~', err)
    return
  }

  connection.connect(err => { 
    if (err) {
      console.log('和数据库交互失败', err)
    } else {
      console.log('和数据库交互成功, 可以操作数据库~')
    }
  })
})



const connection = connectionPool.promise()

module.exports = connection