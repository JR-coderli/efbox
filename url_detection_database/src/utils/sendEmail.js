const nodemailer = require('nodemailer');
const getTimeStr = require('./getTimeStr');
const config = require('../config');


const transporter = nodemailer.createTransport({
  host: "smtp.qiye.aliyun.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
})


async function sendMail(html, mailType = 'alert') {

  // mailType: alert=异常即时告警 / daily=08:00 检测日报 / domainList=08:00 域名清单日报
  const senderTitle =
    mailType === 'daily' ? '[网页监控] 报告 08:00'
    : mailType === 'domainList' ? '[网页监控] 域名清单 08:00'
    : `${config.mail.title} - ${getTimeStr()}`;

  const subject =
    mailType === 'daily' ? '网页监控日报'
    : mailType === 'domainList' ? '域名清单日报'
    : '网页监控报告';

  const mailOptions = {
    from: `"${senderTitle}" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO,
    bcc: [process.env.MAIL_BCC],
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('邮件已发送');
  } catch (err) {
    console.error('邮件发送失败:', err);
  }
}

module.exports = sendMail