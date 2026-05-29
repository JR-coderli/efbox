const KoaRouter = require('@koa/router')
const { create, createDomainsFile, createLandingPageFile, createAvatar, uploadUserAvatar } = require('../controller/file.controller')
const { handleAvatar, handleAvatar3, handleAvatar4, handleAvatar5 } = require('../middleware/file.middleware')
const { verifyAuth } = require('../middleware/login.middleware')


const fileRouter = new KoaRouter({ prefix: '/file' })



fileRouter.post('/avatar', verifyAuth, handleAvatar3, createAvatar)


fileRouter.post('/user-avatar/:userId', verifyAuth, handleAvatar3, uploadUserAvatar)


fileRouter.post('/landingpage_preview/:landingpageId', verifyAuth, handleAvatar, create)




fileRouter.post('/domains', verifyAuth, handleAvatar4, createDomainsFile)

fileRouter.post('/landingpage', verifyAuth, handleAvatar5, createLandingPageFile)


module.exports = fileRouter
