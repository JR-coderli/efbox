import { defineStore } from 'pinia'
import { LOGIN_TOKEN } from '@/global/constants'
import router from '@/router'
import { accountLoginRequest, getUserInfoById, getUserMenusByRoleId, accountRegisterRequest } from '@/services/login/login'
import { localCache } from '@/utils/cache'
import { ElMessage } from 'element-plus'
import { mapMenusToPermissions, mapMenusToRoutes, resetFirstMenu } from '@/utils/map-menus'
import useMainStore from '../main/main'


function sortMenusBySort(menus) {
  if (!Array.isArray(menus)) return []
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
  // 默认按数据库返回的顺序（sort 字段）排序，不再读取本地自定义顺序
  return sortMenusBySort(menus)
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
      const roleId = loginResult.data.roleId // 登录接口直接返回，用于并行拉取菜单
      this.token = loginResult.data.token


      localCache.setCache(LOGIN_TOKEN, this.token) // 缓存token


      // 角色/菜单全集 与后续请求互不依赖，先并行发出（失败不阻塞登录）
      const entirePromise = useMainStore().fetchEntireDataAction().catch(() => {})

      // 菜单请求需要 roleId：优先用登录接口直接返回的 roleId（与用户信息并行），
      // 老后端没有 roleId 时退回串行（等用户信息返回后取 role.id），绝不能发 /role/undefined/menu
      let userMenusData
      if (roleId) {
        const [userInfoResult, userMenusResult] = await Promise.all([
          getUserInfoById(id),
          getUserMenusByRoleId(roleId)
        ])
        this.userInfo = userInfoResult.data
        userMenusData = userMenusResult.data
      } else {
        const userInfoResult = await getUserInfoById(id)
        this.userInfo = userInfoResult.data
        const userMenusResult = await getUserMenusByRoleId(this.userInfo.role.id)
        userMenusData = userMenusResult.data
      }

      const userInfo = this.userInfo
      this.userMenus = applyCustomMenuOrder(userMenusData, userInfo.role.id)


      const permissions = mapMenusToPermissions(this.userMenus)
      this.permissions = permissions


      localCache.setCache('userInfo', userInfo)
      localCache.setCache('userMenus', this.userMenus)

      await entirePromise


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
      router.push('/main')
    },


    async loadLocalCacheAction() {

      const token = localCache.getCache(LOGIN_TOKEN)
      const userInfo = localCache.getCache('userInfo')
      const userMenus = localCache.getCache('userMenus')
      if (token && userInfo) { // 有 token 和 userInfo 说明用户已登录

        this.token = token
        this.userInfo = userInfo



        // 菜单 与 角色/菜单全集 互不依赖，并行请求
        try {
          const [userMenusResult] = await Promise.all([
            getUserMenusByRoleId(userInfo.role.id),
            useMainStore().fetchEntireDataAction().catch(() => {})
          ])
          this.userMenus = applyCustomMenuOrder(userMenusResult.data, userInfo.role.id)
          localCache.setCache('userMenus', this.userMenus)
        } catch (err) {
          console.warn('获取菜单失败，使用本地缓存:', err)
          if (userMenus) {
            this.userMenus = applyCustomMenuOrder(userMenus, userInfo.role.id)
          }
          // 菜单失败时角色/菜单全集可能也没拉到，兜底再拉一次
          useMainStore().fetchEntireDataAction().catch(() => {})
        }


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