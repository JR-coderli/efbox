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
  const isTerra = (entityName || '').toLowerCase() === 'terra'
  const config = isTerra ? terraConfig : eflowConfig
  const transporter = isTerra ? terraTransporter : eflowTransporter
  const senderTitle = isTerra ? 'Terra Invoice' : 'Eflow Invoice'

  return {
    transporter,
    senderTitle,
    user: config.user,
    to: isProd ? process.env.PROD_MAIL_TO : process.env.DEV_MAIL_TO,
    bcc: isProd ? process.env.PROD_MAIL_BCC : process.env.DEV_MAIL_BCC
  }
}

module.exports = { getMailConfig }
