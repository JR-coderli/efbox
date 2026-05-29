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


async function sendMail(html, isDaily = false) {

  const senderTitle = isDaily ? '[网页监控] 报告 08:00' : `${config.mail.title} - ${getTimeStr()}`;
  
  const mailOptions = {
    from: `"${senderTitle}" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO,
    bcc: [process.env.MAIL_BCC],
    subject: "网页监控报告",
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