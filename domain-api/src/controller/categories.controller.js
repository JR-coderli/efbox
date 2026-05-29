const categoriesService = require('../service/categories.service')

class CategoriesController {

  async getAll(ctx, next) {
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1
    const result = await categoriesService.getAll(userId)
    ctx.body = {
      code: 0,
      message: '获取分类列表成功',
      data: result
    }
  }


  async create(ctx, next) {
    const { category_name, level, visibility } = ctx.request.body
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1

    if (!category_name) {
      ctx.body = {
        code: 1,
        message: '分类名称不能为空'
      }
      return
    }

    const result = await categoriesService.create(category_name, level || 1, userId, visibility || 'private')
    ctx.body = {
      code: 0,
      message: '创建分类成功',
      data: result
    }
  }


  async remove(ctx, next) {
    const { id } = ctx.params
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1


    const isOwner = await categoriesService.isOwner(id, userId)
    if (!isOwner) {
      ctx.body = {
        code: 1,
        message: '只能删除自己创建的分类'
      }
      return
    }


    const hasLandingPages = await categoriesService.checkHasLandingPages(id)
    if (hasLandingPages) {
      ctx.body = {
        code: 1,
        message: '该分类下还有落地页，请先删除落地页后再删除分类'
      }
      return
    }

    await categoriesService.remove(id, userId)
    ctx.body = {
      code: 0,
      message: '删除分类成功'
    }
  }


  async updateSort(ctx, next) {
    const { categories } = ctx.request.body
    const userId = ctx.user?.id || 1 // 从认证信息获取用户ID，默认为1

    if (!Array.isArray(categories) || categories.length === 0) {
      ctx.body = {
        code: 1,
        message: '参数错误'
      }
      return
    }

    await categoriesService.updateSort(categories, userId)
    ctx.body = {
      code: 0,
      message: '更新排序成功'
    }
  }
}

module.exports = new CategoriesController()
