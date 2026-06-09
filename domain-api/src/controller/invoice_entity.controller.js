const invoiceEntityService = require('../service/invoice_entity.service')
const operationLogService = require('../service/operation-log.service')

class InvoiceEntityController {

  async create(ctx, next) {

    const entityInfo = ctx.request.body


    const insertId = await invoiceEntityService.create(entityInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'invoice_entity',
      'create',
      `新增附件主体: ${entityInfo.name || ''}`,
      null,
      entityInfo
    )


    ctx.body = {
      code: 0,
      message: '新增附件主体成功~',
      data: { insertId }
    }
  }


  async remove(ctx, next) {

    const { entityId } = ctx.params


    await invoiceEntityService.remove(entityId)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'invoice_entity',
      'delete',
      `删除附件主体 entityId: ${entityId}`,
      null,
      null
    )


    ctx.body = {
      code: 0,
      message: '删除附件主体成功~'
    }
  }


  async update(ctx, next) {

    const { entityId } = ctx.params

    const entityInfo = ctx.request.body

    await invoiceEntityService.update(entityId, entityInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'invoice_entity',
      'update',
      `修改附件主体 entityId: ${entityId}`,
      null,
      entityInfo
    )


    ctx.body = {
      code: 0,
      message: '更新成功'
    }
  }


  async list(ctx, next) {

    const entityInfo = ctx.request.body


    const result = await invoiceEntityService.list(entityInfo)
    ctx.body = {
      code: 0,
      message: '附件主体列表',
      data: {
        list: result.data,
        allCount: result.totalCount
      }
    }
  }


  async setTop(ctx, next) {
    const { id } = ctx.request.body


    const entity = await invoiceEntityService.getById(id)

    await invoiceEntityService.setTop(id)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'invoice_entity',
      'update',
      `置顶附件主体: ${entity?.name || ''}`,
      null,
      { id, name: entity?.name }
    )

    ctx.body = {
      code: 0,
      message: '置顶成功'
    }
  }


  async getTop(ctx, next) {
    const result = await invoiceEntityService.getTop()
    ctx.body = {
      code: 0,
      data: result
    }
  }
}

module.exports = new InvoiceEntityController()
