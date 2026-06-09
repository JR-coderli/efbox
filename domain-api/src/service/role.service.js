const connection = require('../app/database')
const menuService = require('./menu.service')

class RoleService {

  async getAllAncestorIds(menuIds) {
    if (!menuIds || menuIds.length === 0) return []


    const wholeMenu = await menuService.wholeMenu()


    const parentMap = new Map()
    const menuMap = new Map()

    function buildMap(menus, parentId = null) {
      for (const menu of menus) {
        parentMap.set(menu.id, parentId)
        menuMap.set(menu.id, menu)
        if (menu.children && menu.children.length > 0) {
          buildMap(menu.children, menu.id)
        }
      }
    }
    buildMap(wholeMenu)


    const ancestorIds = new Set()
    for (const menuId of menuIds) {
      let currentId = menuId
      while (currentId) {
        ancestorIds.add(currentId)
        currentId = parentMap.get(currentId)
      }
    }

    return Array.from(ancestorIds)
  }

  async create(role) {


    const statement = 'INSERT INTO `role` SET ?;' 


    const [result] = await connection.query(statement, [role]) 
    return result
  }

  

  async assignMenu(roleId, menuIds) {

    const deleteStatement = 'DELETE FROM `role_menu` WHERE roleId = ?;'
    await connection.query(deleteStatement, [roleId])


    const insertStatement = 'INSERT INTO `role_menu` (roleId, menuId) VALUES (?, ?);'
    for (const menuId of menuIds) {
      await connection.query(insertStatement, [roleId, menuId])
    }
  }


  async createNew(name, intro, menuList) {
    const statement = 'INSERT INTO `role` (name, intro) VALUES (?, ?);'


    const [result] = await connection.query(statement, [name, intro])

    const roleId = result.insertId


    const completeMenuIds = await this.getAllAncestorIds(menuList)


    const insertStatement = 'INSERT INTO `role_menu` (roleId, menuId) VALUES (?, ?);'
    for (const menuId of completeMenuIds) {
      await connection.query(insertStatement, [roleId, menuId])
    }
  }


  async remove(id) {
    const statement = 'DELETE FROM `role` WHERE id = ?;'
    await connection.execute(statement, [id])
  }


  async update(roleId, name, intro, menuList) {

    if (name && intro) {
      await connection.execute('UPDATE `role` SET name = ?, intro = ? WHERE id = ?;', [name, intro, roleId])
    } else if (name && !intro) {
      await connection.execute('UPDATE `role` SET name = ? WHERE id = ?;', [name, roleId])
    } else {
      await connection.execute('UPDATE `role` SET intro = ? WHERE id = ?;', [intro, roleId])
    }


    if (menuList) {

      const completeMenuIds = await this.getAllAncestorIds(menuList)


      const deleteStatement = 'DELETE FROM `role_menu` WHERE roleId = ?;'
      await connection.query(deleteStatement, [roleId])


      const insertStatement = 'INSERT INTO `role_menu` (roleId, menuId) VALUES (?, ?);'
      for (const menuId of completeMenuIds) {
        await connection.query(insertStatement, [roleId, menuId])
      }
    }
  }

  

  async getRoleMenu(roleId) {

    const getMenuIdsStatement = 'SELECT rm.roleId, JSON_ARRAYAGG(rm.menuId) menuIds FROM `role_menu` rm WHERE rm.roleId = ? GROUP BY rm.roleId;'
    const [roleMenus] = await connection.query(getMenuIdsStatement, [roleId])
    const menuIds = roleMenus[0]?.menuIds || []


    const wholeMenu = await menuService.wholeMenu()



    function filterMenu(menu) {
      const newMenu = []
      for (const item of menu) {

        if (item.children) {
          item.children = filterMenu(item.children)
        }




        const hasPermission = menuIds.includes(item.id)
        const hasSelectedChildren = item.children && item.children.length > 0

        if (hasPermission || hasSelectedChildren) {
          newMenu.push(item)
        }
      }

      return newMenu
    }
    const finalMenu = filterMenu(wholeMenu)

    return finalMenu
  }


  async list(name, offset, size, start, end) {


    const createAtStart = start ?? '2001-01-01 13:27:00'
    const createAtEnd = end ?? '2099-01-01 13:28:00' 


    const listStatement = 'SELECT * FROM `role` WHERE name LIKE ? AND createAt >= ? AND createAt < ? LIMIT ? OFFSET ?;'

    const allCountStatement = 'SELECT COUNT(*) AS allCount FROM `role`;'
    
    try {
      const [result1] = await connection.execute(listStatement, [`%${name}%`, createAtStart, createAtEnd, size, offset])

      const result2 = result1.length
      const [result3] = await connection.query(allCountStatement)

      const result = [result1, result2, result3]
      return result
    } catch (error) {
      console.log(error)
    }
  }


}

module.exports = new RoleService()