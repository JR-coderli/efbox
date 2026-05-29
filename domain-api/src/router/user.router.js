const KoaRouter = require('@koa/router')
const { create, detail, list, remove, update, showAvatarImage } = require('../controller/user.controller')
const { verifyUser, handlePassword } = require('../middleware/user.middleware')
const { verifyAuth } = require('../middleware/login.middleware')


const userRouter = new KoaRouter({ prefix: '/cms_users' })




userRouter.post('/', verifyAuth, verifyUser, handlePassword, create)

userRouter.delete('/:userId', verifyAuth, remove)

userRouter.patch('/:userId', verifyAuth, update)

userRouter.get('/:userId', verifyAuth, detail)

userRouter.post('/list', verifyAuth, list)

userRouter.get('/avatar/:userId/:picName', showAvatarImage)

module.exports = userRouter
