const KoaRouter = require('@koa/router')
const multer = require('@koa/multer')
const path = require('path')
const { verifyAuth } = require('../middleware/login.middleware')
const { batchGetScreenshots, triggerScreenshot, uploadScreenshot } = require('../controller/ef-lander.controller')

// 手动上传截图的存储配置（独立于 cf_landers 的 multer，存到 ef 自己的目录）
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/ef_lander_screenshots'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'ef_lander_' + uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage })

// ef-归因系统 落地页截图相关路由（独立于现有 /lander 路由）
// 文件名以 .router.js 结尾，会被 router/index.js 自动扫描挂载，无需改动任何现有文件。
const efLanderRouter = new KoaRouter({ prefix: '/ef-lander' })

// 批量按 lander_id 取截图（列表展示）
efLanderRouter.post('/screenshots/batch', verifyAuth, batchGetScreenshots)

// 触发单个 lander 截图（首次自动截图，手动按钮）
efLanderRouter.post('/screenshot', verifyAuth, triggerScreenshot)

// 手动上传截图（覆盖现有截图；之后想换图就走这个，不再自动重截）
efLanderRouter.post('/screenshot/upload', verifyAuth, upload.single('screenshot'), uploadScreenshot)

module.exports = efLanderRouter
