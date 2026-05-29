import { defineStore } from 'pinia'
import { LOGIN_TOKEN } from '@/global/constants'
import router from '@/router'
import { accountLoginRequest, getUserInfoById, getUserMenusByRoleId, accountRegisterRequest } from '@/services/login/login'
import { localCache } from '@/utils/cache'
import { ElMessage } from 'element-plus'
import { mapMenusToPermissions, mapMenusToRoutes, resetFirstMenu } from '@/utils/map-menus'
import useMainStore from '../main/main'


function sortMenusBySort(menus) {
  return menus.sort((a, b) => {
    if (a.sort !== b.sort) {
      return (a.sort || 0) - (b.sort || 0)
    }
    return a.id - b.id
  }).map(menu => {
    if (menu.children && menu.children.length > 0) {
      return { ...menu, children: sortMenusBySort(menu.children) }
    }
    return menu
  })
}


function applyCustomMenuOrder(menus, roleId) {
  const orderKey = `menu-order-${roleId}`
  const savedOrder = localStorage.getItem(orderKey)

  if (!savedOrder) {
    return sortMenusBySort(menus)
  }

  try {
    const order = JSON.parse(savedOrder)
    const menuMap = {}
    const childrenMap = {}

    menus.forEach(menu => {
      menuMap[menu.id] = menu
      if (menu.children && menu.children.length > 0) {
        childrenMap[menu.id] = [...menu.children]
      }
    })

    const sortedMenus = order
      .filter(item => menuMap[item.id])
      .map(item => {
        const menu = menuMap[item.id]
        if (childrenMap[item.id] && item.children && item.children.length > 0) {
          const children = childrenMap[item.id]
          const childMap = {}
          children.forEach(child => childMap[child.id] = child)

          menu.children = item.children
            .filter(childId => childMap[childId])
            .map(childId => childMap[childId])
        }
        return { ...menu }
      })


    menus.forEach(menu => {
      if (!order.find(item => item.id === menu.id)) {
        sortedMenus.push(menu)
      }
    })

    return sortedMenus
  } catch (e) {
    console.error('应用自定义排序失败:', e)
    return sortMenusBySort(menus)
  }
}

const useLoginStore = defineStore('login', {
  state: () => ({
    token: '',
    userInfo: {},
    userMenus: [],
    permissions: []
  }),
  actions: {

    logoutAction() {
      this.token = ''
      this.userInfo = {}
      this.userMenus = []
      this.permissions = []
    },


    async loginAccountAction(account) {

      localCache.removeCache(LOGIN_TOKEN)
      localCache.removeCache('userInfo')
      localCache.removeCache('userMenus')


      const loginResult = await accountLoginRequest(account)

      if (loginResult.message) {
        ElMessage({
          message: loginResult.message,
          type: 'warning',
          duration: 1300,
          showClose: true
        })

        return
      }

      const id = loginResult.data.id 
      this.token = loginResult.data.token


      localCache.setCache(LOGIN_TOKEN, this.token) // 缓存token


      const userInfoResult = await getUserInfoById(id)
      const userInfo = userInfoResult.data
      this.userInfo = userInfo




      const userMenusResult = await getUserMenusByRoleId(this.userInfo.role.id)
      const userMenus = userMenusResult.data

      this.userMenus = applyCustomMenuOrder(userMenus, this.userInfo.role.id)


      const permissions = mapMenusToPermissions(this.userMenus)
      this.permissions = permissions


      localCache.setCache('userInfo', userInfo)
      localCache.setCache('userMenus', this.userMenus)


      const mainStore = useMainStore()
      mainStore.fetchEntireDataAction()


      resetFirstMenu()


      const routes = mapMenusToRoutes(this.userMenus)
      routes.forEach(route => router.addRoute('main', route))



      ElMessage({
        message: '登录成功',
        type: 'success',
        duration: 1300,
        showClose: true
      })
      setTimeout(() => { 
        router.push("/main")
      }, 750);
    },


    loadLocalCacheAction() {

      const token = localCache.getCache(LOGIN_TOKEN)
      const userInfo = localCache.getCache('userInfo')
      const userMenus = localCache.getCache('userMenus')
      if (token && userInfo && userMenus) { // 满足这个条件说明用户已经登录了

        this.token = token
        this.userInfo = userInfo

        this.userMenus = applyCustomMenuOrder(userMenus, userInfo.role.id)


        const mainStore = useMainStore()
        mainStore.fetchEntireDataAction()


        const permissions = mapMenusToPermissions(this.userMenus)
        this.permissions = permissions


        resetFirstMenu()


        const routes = mapMenusToRoutes(this.userMenus)
        routes.forEach(route => router.addRoute('main', route))
      }
    },


    async registerAccountAction(account) {

      const registerresult = await accountRegisterRequest(account)
      if (registerresult.data) {
        return true
      } else {
        return registerresult.message
      }
    }
  }
})

export default useLoginStore