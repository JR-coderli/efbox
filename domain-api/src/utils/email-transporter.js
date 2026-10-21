require('dotenv').config()
const nodemailer = require('nodemailer')

const isProd = process.env.NODE_ENV === 'production'


const eflowConfig = {
  user: 'notice@eflow-media.com',
  pass: 'e7Ac9Rc0qL5ij3NB'
}


const terraConfig = {
  user: process.env.TERRA_MAIL_USER,
  pass: process.env.TERRA_MAIL_PASS
}


function createTransporter(config) {
  return nodemailer.createTransport({
    host: "smtp.qiye.aliyun.com",
    port: 465,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass
    }
  })
}

const eflowTransporter = createTransporter(eflowConfig)
const terraTransporter = createTransporter(terraConfig)


function getMailConfig(entityName) {
  // 按主体名称前缀严格匹配发件邮箱（兼容 "Eflow 云汇" 之类带后缀的名称）
  // 未匹配到配置时返回 null，由调用方提示错误，不再默认按 Eflow 发送（避免主体与发件邮箱张冠李戴）
  const normalized = (entityName || '').toLowerCase().replace(/\s+/g, '')

  let config, transporter, senderTitle
  if (normalized.startsWith('terra')) {
    config = terraConfig
    transporter = terraTransporter
    senderTitle = 'Terra Invoice'
  } else if (normalized.startsWith('eflow')) {
    config = eflowConfig
    transporter = eflowTransporter
    senderTitle = 'Eflow Invoice'
  } else {
    return null
  }

  return {
    transporter,
    senderTitle,
    user: config.user,
    bcc: isProd ? process.env.PROD_MAIL_BCC : process.env.DEV_MAIL_BCC
  }
}

module.exports = { getMailConfig }
