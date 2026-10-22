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


// 发件邮箱配置表：key 即开票主体 sender_mail 字段的可选值
const senderConfigs = {
  eflow: { config: eflowConfig, transporter: eflowTransporter, senderTitle: 'Eflow Invoice' },
  terra: { config: terraConfig, transporter: terraTransporter, senderTitle: 'Terra Invoice' }
}

// 解析发件邮箱标识：优先用主体配置的 sender_mail，未配置（历史数据）按主体名称前缀兜底
function resolveSenderKey(senderMail, entityName) {
  const configured = String(senderMail || '').trim().toLowerCase()
  if (senderConfigs[configured]) return configured

  const normalized = String(entityName || '').toLowerCase().replace(/\s+/g, '')
  if (normalized.startsWith('terra')) return 'terra'
  if (normalized.startsWith('eflow')) return 'eflow'
  return null
}

// entity: 开票主体记录（含 sender_mail / name）
// 未解析到发件邮箱时返回 null，由调用方提示错误，不默认发送（避免主体与发件邮箱张冠李戴）
function getMailConfig(entity) {
  const key = resolveSenderKey(entity?.sender_mail, entity?.name)
  if (!key) return null

  const { config, transporter, senderTitle } = senderConfigs[key]
  return {
    transporter,
    senderTitle,
    user: config.user,
    bcc: isProd ? process.env.PROD_MAIL_BCC : process.env.DEV_MAIL_BCC
  }
}

module.exports = { getMailConfig }
