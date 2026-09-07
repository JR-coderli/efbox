const KoaRouter = require('@koa/router')
const { inheritByRecord, inherit, resolve } = require('../controller/domain-purpose-inherit.controller')
const { verifyAuth } = require('../middleware/login.middleware')

// 域名 purpose 继承（两侧替换全部成功后备用域名标签改为危险域名标签）触发接口。
// 独立路由文件，由 router/index.js 自动扫描注册，不改动任何现有路由。
const domainPurposeInheritRouter = new KoaRouter({ prefix: '/domain-purpose-inherit' })

// 按替换记录 ID 触发（自动继承失败后的补偿入口）
domainPurposeInheritRouter.post('/by-record', verifyAuth, inheritByRecord)

// 按域名对直接触发
domainPurposeInheritRouter.post('/inherit', verifyAuth, inherit)

// 两侧终态裁决（url_detection_database 两侧替换发完后兜底调用，无鉴权同 internal 惯例）
domainPurposeInheritRouter.post('/resolve', resolve)

module.exports = domainPurposeInheritRouter
