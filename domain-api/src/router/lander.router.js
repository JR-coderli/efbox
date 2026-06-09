const KoaRouter = require('@koa/router')
const path = require('path')
const { verifyAuth } = require('../middleware/login.middleware')
const { list, get, sync, syncStatus, screenshotStats, remove, triggerScreenshot, getScreenshotConfig, updateScreenshotConfig, uploadScreenshot } = require('../controller/lander.controller')
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


landerRouter.post('/list', list)


landerRouter.get('/:landerKey', verifyAuth, get)


landerRouter.post('/sync', verifyAuth, sync)


landerRouter.get('/sync/status', verifyAuth, syncStatus)


landerRouter.get('/screenshot/stats', verifyAuth, screenshotStats)


landerRouter.post('/screenshot/trigger', verifyAuth, triggerScreenshot)


landerRouter.get('/screenshot/config', verifyAuth, getScreenshotConfig)


landerRouter.post('/screenshot/config', verifyAuth, updateScreenshotConfig)


landerRouter.post('/:landerKey/screenshot', verifyAuth, upload.single('screenshot'), uploadScreenshot)


landerRouter.delete('/:landerKey', verifyAuth, remove)

module.exports = landerRouter
