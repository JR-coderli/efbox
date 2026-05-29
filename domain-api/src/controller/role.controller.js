const roleService = require("../service/role.service")
const operationLogService = require('../service/operation-log.service')

class RoleController {

  async create(ctx, next) {

    const role = ctx.request.body


    const result = await roleService.create(role)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'role',
      'create',
      `新增角色: ${role.name}`,
      null,
      { name: role.name, intro: role.intro }
    )


    ctx.body = {
      code: 0,
      message: '创建角色成功~',
      data: result
    }
  }


  async assignMenu(ctx, next) {

    const roleId = ctx.params.roleId
    const menuIds = ctx.request.body.menuIds


    await roleService.assignMenu(roleId, menuIds)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'role',
      'update',
      `分配角色权限 roleId: ${roleId}`,
      null,
      { menuIds }
    )


    ctx.body = {
      code: 0,
      message: '分配权限成功~'
    }
  }


  async createNew(ctx, next) {

    const { name, intro, menuList } = ctx.request.body


    const result = await roleService.createNew(name, intro, menuList)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'role',
      'create',
      `新增角色: ${name}`,
      null,
      { name, intro, menuCount: menuList?.length || 0 }
    )


    ctx.body = {
      code: 0,
      message: '创建角色成功~',
      data: result
    }
  }


  async remove(ctx, next) {

    const { roleId } = ctx.params


    await roleService.remove(roleId)


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'role',
      'delete',
      `删除角色 roleId: ${roleId}`,
      null,
      null
    )


    ctx.body = {
      code: 0,
      message: '删除角色成功'
    }
  }


  async update(ctx, next) {

    const { roleId } = ctx.params

    const { name, intro, menuList } = ctx.request.body


    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'role',
      'update',
      `修改角色: ${name}`,
      null,
      { name, intro, menuCount: menuList?.length || 0 }
    )


    await roleService.update(roleId, name, intro, menuList)

    ctx.body = {
      code: 0,
      message: '更新角色成功~'
    }
  }


  async detail(ctx, next) {

    const { roleId } = ctx.params


    const menu = await roleService.getRoleMenu(roleId)
    

    ctx.body = {
      code: 0,
      message: '获取当前角色的菜单树~',
      data: menu
    }
  }


  async list(ctx, next) {

    const { offset = 0, size = 10000000, name = '' } = ctx.request.body
    const createAt = ctx.request.body.createAt
    let createAtStart = undefined
    let createAtEnd = undefined

    if (createAt !== null && createAt !== undefined) {
      createAtStart = createAt[0]
      createAtEnd = createAt[1]
    }

    const result = await roleService.list(name, String(offset), String(size), createAtStart, createAtEnd)
    
    const [ list, totalCount, allCount ] = result

    for (const role of list) {
      const menuList = await roleService.getRoleMenu(role.id)
      role.menuList = menuList
    }



    ctx.body = {
      code: 0,
      message: '获取角色列表~',
      data: {
        list: list,
        totalCount: totalCount,
        allCount: allCount[0].allCount
      }
    }
  }
}

module.exports = new RoleController()