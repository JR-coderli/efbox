/**
 * 生成 API Key 的辅助脚本
 * 运行方式: node scripts/generate-api-key.js
 */
const crypto = require('crypto')

function generateApiKey(length = 40) {

  const randomBytes = crypto.randomBytes(length)
  const apiKey = randomBytes.toString('base64')
    .replace(/[+/=]/g, '')  // 移除特殊字符
    .substring(0, length)   // 截取指定长度

  return apiKey
}


console.log('=== 公开接口 API Key 生成器 ===\n')

const apiKey1 = generateApiKey(40)
const apiKey2 = generateApiKey(40)

console.log('单个密钥配置:')
console.log(`PUBLIC_API_KEY = '${apiKey1}'\n`)

console.log('或多个密钥配置:')
console.log(`PUBLIC_API_KEY = ['${apiKey1}', '${apiKey2}']\n`)

console.log('环境变量方式:')
console.log(`PUBLIC_API_KEY=${apiKey1}\n`)

console.log('请将生成的密钥复制到.env 文件中')
