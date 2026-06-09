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
    permissions: [],
    routeRemovers: [] // 移除动态路由的函数列表
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
      routes.forEach(route => {
        const remove = router.addRoute('main', route)
        this.routeRemovers.push(remove)
      })



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


    async loadLocalCacheAction() {

      const token = localCache.getCache(LOGIN_TOKEN)
      const userInfo = localCache.getCache('userInfo')
      const userMenus = localCache.getCache('userMenus')
      if (token && userInfo) { // 有 token 和 userInfo 说明用户已登录

        this.token = token
        this.userInfo = userInfo



        try {
          const userMenusResult = await getUserMenusByRoleId(userInfo.role.id)
          this.userMenus = applyCustomMenuOrder(userMenusResult.data, userInfo.role.id)
          localCache.setCache('userMenus', this.userMenus)
        } catch (err) {
          console.warn('获取菜单失败，使用本地缓存:', err)
          if (userMenus) {
            this.userMenus = applyCustomMenuOrder(userMenus, userInfo.role.id)
          }
        }


        const mainStore = useMainStore()
        mainStore.fetchEntireDataAction()


        const permissions = mapMenusToPermissions(this.userMenus)
        this.permissions = permissions


        resetFirstMenu()


        this.routeRemovers.forEach(remove => remove())
        this.routeRemovers = []
        const routes = mapMenusToRoutes(this.userMenus)
        routes.forEach(route => {
          const remove = router.addRoute('main', route)
          this.routeRemovers.push(remove)
        })
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