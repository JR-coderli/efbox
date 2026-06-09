const axios = require('axios');
const domainsService = require('../service/domains.service');
const { ALI_EMAIL, ALI_EMAIL_PASSWORD } = require('../config/server')
const nodemailer = require('nodemailer');



async function checkUrl(url, retries = 3) {
  let isValid = false;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.head(url, {
        timeout: 5000, // 设置超时时间
      });


      isValid = (response.status >= 200 && response.status < 400) || (response.status >= 300 && response.status < 400);
      if (isValid) {

        break; // 如果检测成功，退出循环
      }
    } catch (error) {


    }
  }
  if (!isValid) {

  }
  return isValid; // 返回最终的检测结果
}


const transporter = nodemailer.createTransport({
    host: 'smtp.qiye.aliyun.com', // 阿里云邮箱的 SMTP 服务器
    port: 465, // 端口号
    secure: true, // 使用 SSL 加密
    auth: {
        user: ALI_EMAIL, // 阿里云邮箱地址
        pass: ALI_EMAIL_PASSWORD // 阿里云邮箱授权码
    }
});




const handleCheckUrl = async (ctx) => {
  const { url, domainId } = ctx.request.body;
  const isValid = await checkUrl(url);

  if (!isValid) {
    ctx.body = { message: `URL 检测成功: ${url}`, isValid };
  } else {

    ctx.body = { message: `URL 检测失败: ${url} 无效`, isValid };
  }
  
}


const handleSendEmail = async (ctx) => {
  const { to, subject, text } = ctx.request.body;

  const mailOptions = {
    from: ALI_EMAIL, // 发件人地址
    to, // 收件人地址
    subject, // 邮件主题
    text, // 邮件内容
  };

  try {
    await transporter.sendMail(mailOptions);
    ctx.body = { message: '邮件发送成功' };

  } catch (error) {
    ctx.body = { message: '邮件发送失败', error: error.message };

  }
}


module.exports = {
  handleCheckUrl,
  handleSendEmail
}