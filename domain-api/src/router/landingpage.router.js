const KoaRouter = require('@koa/router')
const { create, list, remove, update, showLandPreview, uploadPreview } = require('../controller/landingpage.controller')
const { verifyAuth } = require('../middleware/login.middleware')
const { handleAvatar6 } = require('../middleware/file.middleware')


const landRouter = new KoaRouter({ prefix: '/landingpage' })




landRouter.post('/', verifyAuth, create)

landRouter.get('/preview/:landingId/:picName', showLandPreview)

landRouter.post('/list', verifyAuth, list)

landRouter.delete('/:landingId', verifyAuth, remove)

landRouter.patch('/:landingId', verifyAuth, update)

landRouter.post('/:landingId/preview', verifyAuth, handleAvatar6, uploadPreview)

module.exports = landRouter