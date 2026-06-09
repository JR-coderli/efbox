const isDev = process.env.NODE_ENV === 'development'

module.exports = {
  APP_ID: isDev ? process.env.DEV_FEISHU_APP_ID : process.env.PROD_FEISHU_APP_ID,
  APP_SECRET: isDev ? process.env.DEV_FEISHU_APP_SECRET : process.env.PROD_FEISHU_APP_SECRET,
  ENCRYPT_KEY: isDev ? process.env.DEV_FEISHU_ENCRYPT_KEY : process.env.PROD_FEISHU_ENCRYPT_KEY,
  VERIFICATION_TOKEN: isDev ? process.env.DEV_FEISHU_VERIFICATION_TOKEN : process.env.PROD_FEISHU_VERIFICATION_TOKEN
}
