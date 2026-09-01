const KoaRouter = require('@koa/router')
const { inheritByRecord, inherit } = require('../controller/domain-purpose-inherit.controller')
const { verifyAuth } = require('../middleware/login.middleware')

// 域名 purpose 继承（替换成功后备用域名标签改为危险域名标签）手动触发接口。
// 独立路由文件，由 router/index.js 自动扫描注册，不改动任何现有路由。
const domainPurposeInheritRouter = new KoaRouter({ prefix: '/domain-purpose-inherit' })

// 按替换记录 ID 触发（自动继承失败后的补偿入口）
domainPurposeInheritRouter.post('/by-record', verifyAuth, inheritByRecord)

// 按域名对直接触发
domainPurposeInheritRouter.post('/inherit', verifyAuth, inherit)

module.exports = domainPurposeInheritRouter
