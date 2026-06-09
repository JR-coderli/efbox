const dotenv = require('dotenv')
dotenv.config()


const NODE_ENV = process.env.NODE_ENV || 'development'
const isProd = NODE_ENV === 'production'

const SERVER_HOST = isProd ? process.env.PROD_SERVER_HOST : process.env.DEV_SERVER_HOST
const SERVER_PORT = isProd ? process.env.PROD_SERVER_PORT : process.env.DEV_SERVER_PORT


const OUTPUT_BASE_URL = isProd
  ? `${SERVER_HOST}/api`  // 线上: https://tools.eflow-media.com/api
  : `${SERVER_HOST}:${SERVER_PORT}`  // 本地: http://localhost:8001


const LP_SCREENSHOTS_BASE_URL = isProd
  ? process.env.PROD_LP_SCREENSHOTS_BASE_URL
  : process.env.DEV_LP_SCREENSHOTS_BASE_URL

module.exports = {
  SERVER_HOST,
  SERVER_PORT,
  NODE_ENV,
  OUTPUT_BASE_URL,  // 发票输出地址前缀
  LP_SCREENSHOTS_BASE_URL,  // Lander 截图预览地址前缀
  DEV_CHROME_PATH: process.env.DEV_CHROME_PATH,
  PROD_CHROME_PATH: process.env.PROD_CHROME_PATH,
  DEV_SOFFICE_PATH: process.env.DEV_SOFFICE_PATH,
  PROD_SOFFICE_PATH: process.env.PROD_SOFFICE_PATH
}
