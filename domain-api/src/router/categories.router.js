const KoaRouter = require('@koa/router')
const { getAll, create, remove, updateSort } = require('../controller/categories.controller')
const { verifyAuth } = require('../middleware/login.middleware')


const categoriesRouter = new KoaRouter({ prefix: '/categories' })


categoriesRouter.get('/', verifyAuth, getAll)
categoriesRouter.post('/', verifyAuth, create)
categoriesRouter.delete('/:id', verifyAuth, remove)
categoriesRouter.patch('/sort', verifyAuth, updateSort)

module.exports = categoriesRouter
