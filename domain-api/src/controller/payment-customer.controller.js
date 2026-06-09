const paymentCustomerService = require('../service/payment-customer.service')
const operationLogService = require('../service/operation-log.service')

class PaymentCustomerController {

  async create(ctx, next) {

    const customerInfo = ctx.request.body


    await paymentCustomerService.create(customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'payment_customer',
      'create',
      `新增付款客户: ${customerInfo.full_name || customerInfo.short_name || ''}`,
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


    await paymentCustomerService.remove(customerId)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'payment_customer',
      'delete',
      `删除付款客户 customerId: ${customerId}`,
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

    await paymentCustomerService.update(customerId, customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'payment_customer',
      'update',
      `修改付款客户 customerId: ${customerId}`,
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


    const result = await paymentCustomerService.list(customerInfo)
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

    await paymentCustomerService.updateRemark(customerId, customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'payment_customer',
      'update',
      `修改付款客户备注 customerId: ${customerId}`,
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

    await paymentCustomerService.updatePayCycleDays(customerId, customerInfo)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'payment_customer',
      'update',
      `修改付款客户付款周期 customerId: ${customerId}`,
      null,
      { paymentCycleDays: customerInfo.payment_cycle_days }
    )


    ctx.body = {
      code: 0,
      message: '更新付款周期成功'
    }
  }
}

module.exports = new PaymentCustomerController()
