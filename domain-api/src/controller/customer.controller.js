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


  // ===== 客户附件查看授权 =====

  // 给用户授权某客户全部附件 POST /customers/:customerId/grant
  // 权限：需 system:customers:grant（前端列可见性同样由该权限控制）
  async grantAttachment(ctx, next) {
    const { customerId } = ctx.params
    const { user_id } = ctx.request.body || {}

    if (!user_id) {
      ctx.body = { code: -1, message: '缺少用户ID' }
      return
    }

    const grantPermission = await customerService.hasGrantPermission(ctx.user.id)
    if (!grantPermission) {
      ctx.body = { code: -1, message: '没有用户授权权限' }
      return
    }

    await customerService.grantAttachment(Number(user_id), Number(customerId), ctx.user.id)

    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'customer',
      'update',
      `授权附件查看: customerId=${customerId}, 授权给 userId=${user_id}`,
      null,
      { customerId, grantedTo: user_id }
    )

    const grantedUsers = await customerService.getGrantedUsers(Number(customerId))
    ctx.body = {
      code: 0,
      message: '授权成功',
      data: { grantedUsers }
    }
  }


  // 撤销授权 DELETE /customers/:customerId/grant/:userId
  async revokeAttachment(ctx, next) {
    const { customerId, userId } = ctx.params

    const grantPermission = await customerService.hasGrantPermission(ctx.user.id)
    if (!grantPermission) {
      ctx.body = { code: -1, message: '没有用户授权权限' }
      return
    }

    const result = await customerService.revokeAttachment(Number(userId), Number(customerId))

    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'customer',
      'update',
      `撤销附件查看授权: customerId=${customerId}, 撤销 userId=${userId}`,
      null,
      { customerId, revokedFrom: userId }
    )

    const grantedUsers = await customerService.getGrantedUsers(Number(customerId))
    ctx.body = {
      code: 0,
      message: result.affectedRows > 0 ? '已撤销授权' : '该用户本无授权',
      data: { grantedUsers }
    }
  }


  // 某客户当前已授权用户 GET /customers/:customerId/grants
  async getGrants(ctx, next) {
    const { customerId } = ctx.params
    const grantedUsers = await customerService.getGrantedUsers(Number(customerId))
    ctx.body = {
      code: 0,
      message: '查询授权成功',
      data: { grantedUsers }
    }
  }


  // 可授权用户简表 GET /customers/grant/users（授权气泡里选人用）
  async grantUserList(ctx, next) {
    const grantPermission = await customerService.hasGrantPermission(ctx.user.id)
    if (!grantPermission) {
      ctx.body = { code: -1, message: '没有用户授权权限' }
      return
    }

    const users = await customerService.getGrantableUsers(ctx.user.id)
    ctx.body = {
      code: 0,
      message: '用户列表',
      data: { list: users }
    }
  }
}

module.exports = new CustomerController()