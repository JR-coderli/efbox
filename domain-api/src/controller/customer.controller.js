const customerService = require('../service/customer.service')
const operationLogService = require('../service/operation-log.service')

class CustomerController {

  async create(ctx, next) {

    const customerInfo = ctx.request.body


    await customerService.create(customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'customer',
      'create',
      `新增客户: ${customerInfo.full_name || customerInfo.short_name || ''}`,
      null,
      { fullName: customerInfo.full_name, shortName: customerInfo.short_name }
    )


    ctx.body = {
      code: 0,
      message: '新增客户信息成功~'
    }
  }


  async remove(ctx, next) {

    const { customerId } = ctx.params


    try {
      await customerService.remove(customerId)
    } catch (error) {
      if (error.code === 'HAS_ATTACHMENTS') {
        ctx.body = {
          code: -1,
          message: error.message
        }
        return
      }
      throw error
    }


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'customer',
      'delete',
      `删除客户 customerId: ${customerId}`,
      null,
      null
    )


    ctx.body = {
      code: 0,
      message: '已删除'
    }
  }


  async update(ctx, next) {

    const { customerId } = ctx.params

    const customerInfo = ctx.request.body

    await customerService.update(customerId, customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'customer',
      'update',
      `修改客户 customerId: ${customerId}`,
      null,
      customerInfo
    )


    ctx.body = {
      code: 0,
      message: '更新成功'
    }
  }


  async list(ctx, next) {

    const customerInfo = ctx.request.body


    const result = await customerService.list(customerInfo)
    ctx.body = {
      code: 0,
      message: '客户列表',
      data: {
        list: result.data,
        allCount: result.totalCount
      }
    }
  }




  async updateRemark(ctx, next) {

    const { customerId } = ctx.params

    const customerInfo = ctx.request.body

    await customerService.updateRemark(customerId, customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'customer',
      'update',
      `修改客户备注 customerId: ${customerId}`,
      null,
      { remark: customerInfo.remark }
    )


    ctx.body = {
      code: 0,
      message: '更新备注成功'
    }
  }


  async updatePayCycleDays(ctx, next) {

    const { customerId } = ctx.params

    const customerInfo = ctx.request.body

    await customerService.updatePayCycleDays(customerId, customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'customer',
      'update',
      `修改客户付款周期 customerId: ${customerId}`,
      null,
      { paymentCycleDays: customerInfo.payment_cycle_days }
    )


    ctx.body = {
      code: 0,
      message: '更新付款周期成功'
    }
  }
}

module.exports = new CustomerController()