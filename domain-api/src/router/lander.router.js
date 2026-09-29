const KoaRouter = require('@koa/router')
const path = require('path')
const { verifyAuth, verifyAuthOptional } = require('../middleware/login.middleware')
const { list, get, sync, syncStatus, screenshotStats, remove, triggerScreenshot, getScreenshotConfig, updateScreenshotConfig, uploadScreenshot, toggleFavorite, getFavorites } = require('../controller/lander.controller')
const multer = require('@koa/multer')


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/lander_screenshots')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'lander_' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

const landerRouter = new KoaRouter({ prefix: '/lander' })


landerRouter.post('/list', verifyAuthOptional, list)

// 收藏相关路由：必须在 /:landerKey 之前注册，否则 GET /lander/favorites 会被参数路由匹配成 landerKey="favorites"
landerRouter.post('/favorite/toggle', verifyAuthOptional, toggleFavorite)
landerRouter.get('/favorites', verifyAuthOptional, getFavorites)


landerRouter.get('/:landerKey', verifyAuth, get)


landerRouter.post('/sync', verifyAuth, sync)

// 无鉴权内部同步入口(仿 /domains/internal 惯例), 供 url_detection_database 替换前同步用:
// 脚本的 checkLanderExists 查的是本地 cf_landers 镜像, 镜像过期会把"实际在用"误判成
// "未使用"而跳过替换(2026-09-23 kervalix 事件)。处理器会等同步完成才返回。
landerRouter.post('/internal/sync', sync)


landerRouter.get('/sync/status', verifyAuth, syncStatus)


landerRouter.get('/screenshot/stats', verifyAuth, screenshotStats)


landerRouter.post('/screenshot/trigger', verifyAuth, triggerScreenshot)


landerRouter.get('/screenshot/config', verifyAuth, getScreenshotConfig)


landerRouter.post('/screenshot/config', verifyAuth, updateScreenshotConfig)


landerRouter.post('/:landerKey/screenshot', verifyAuth, upload.single('screenshot'), uploadScreenshot)


landerRouter.delete('/:landerKey', verifyAuth, remove)

module.exports = landerRouter
