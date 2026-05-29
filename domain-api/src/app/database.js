require('dotenv').config()
const mysql = require('mysql2')


const isProd = process.env.NODE_ENV === 'production'

const dbConfig = {
  host: isProd ? process.env.PROD_DB_HOST : process.env.DEV_DB_HOST,
  port: isProd ? process.env.PROD_DB_PORT : process.env.DEV_DB_PORT,
  database: isProd ? process.env.PROD_DB_DATABASE : process.env.DEV_DB_DATABASE,
  user: isProd ? process.env.PROD_DB_USER : process.env.DEV_DB_USER,
  password: isProd ? process.env.PROD_DB_PASSWORD : process.env.DEV_DB_PASSWORD,
  connectionLimit: 5,
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