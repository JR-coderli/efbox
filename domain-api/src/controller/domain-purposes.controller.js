const domainPurposesService = require('../service/domain-purposes.service')

class DomainPurposesController {

  async getActive(ctx, next) {
    const result = await domainPurposesService.getAllActive()
    ctx.body = {
      code: 0,
      message: '获取成功',
      data: result
    }
  }


  async getAll(ctx, next) {
    const { offset = 0, size = 100 } = ctx.request.body
    const result = await domainPurposesService.getAll(offset, size)
    ctx.body = {
      code: 0,
      message: '获取成功',
      data: result
    }
  }


  async create(ctx, next) {
    const { name, sort_order } = ctx.request.body

    if (!name) {
      ctx.body = {
        code: 1,
        message: '用途名称不能为空'
      }
      return
    }

    const result = await domainPurposesService.create(name, sort_order)

    if (result && result.error) {
      ctx.body = {
        code: 1,
        message: result.error
      }
      return
    }

    ctx.body = {
      code: 0,
      message: '创建成功',
      data: result
    }
  }


  async update(ctx, next) {
    const { id } = ctx.params
    const { name, sort_order } = ctx.request.body

    const result = await domainPurposesService.update(id, name, sort_order)

    if (result && result.error) {
      ctx.body = {
        code: 1,
        message: result.error
      }
      return
    }

    ctx.body = {
      code: 0,
      message: '更新成功'
    }
  }


  async remove(ctx, next) {
    const { id } = ctx.params
    const result = await domainPurposesService.remove(id)

    if (result && result.error) {
      ctx.body = {
        code: 1,
        message: result.error
      }
      return
    }
    ctx.body = {
      code: 0,
      message: '删除成功'
    }
  }


  async toggleActive(ctx, next) {
    const { id } = ctx.params
    const { is_active } = ctx.request.body
    await domainPurposesService.toggleActive(id, is_active)
    ctx.body = {
      code: 0,
      message: '状态更新成功'
    }
  }
}

module.exports = new DomainPurposesController()
