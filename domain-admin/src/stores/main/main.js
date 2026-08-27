import { getEntireMenus, getEntireRoles } from '@/services/main/main'
import { defineStore } from 'pinia'
import { postPageListData } from '@/services/main/system/system'
import { localCache } from '@/utils/cache'

const HEADER_VISIBLE_KEY = 'main/headerVisible'

const useMainStore = defineStore('main', {
  state: () => ({
    entireRoles: [],
    entireMenus: [],
    customersList: [],

    isHeaderVisible: localCache.getCache(HEADER_VISIBLE_KEY) ?? true
  }),
  actions: {
    async fetchEntireDataAction() {

      // 角色列表 与 菜单全集 互不依赖，并行请求
      const [rolesResult, menusResult] = await Promise.all([
        getEntireRoles(),
        getEntireMenus()
      ])



      // 错误响应（如 token 过期）没有 data.list：保持空数组，不抛错
      this.entireRoles = rolesResult?.data?.list || []
      this.entireMenus = menusResult?.data?.list || []

    },

    async postPageListAction(pageName, queryInfo, listType = "list") {
      const pageListResult = await postPageListData(pageName, queryInfo, listType)

      this.customersList = pageListResult?.data?.list || []

      return this.customersList
    },

    toggleHeaderVisible(visible) {
      this.isHeaderVisible = visible !== undefined ? visible : !this.isHeaderVisible
      localCache.setCache(HEADER_VISIBLE_KEY, this.isHeaderVisible)
    },
  }
})

export default useMainStore