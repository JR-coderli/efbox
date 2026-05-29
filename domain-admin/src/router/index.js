import { LOGIN_TOKEN } from '@/global/constants'
import { localCache } from '@/utils/cache'
import { firstMenu, resetFirstMenu } from '@/utils/map-menus'
import { createRouter, createWebHashHistory } from 'vue-router'
import useLoginStore from '@/stores/login/login'

const router = createRouter({
  history: createWebHashHistory(),

  routes: [
    {
      path: "/",
      redirect: '/main'
    },
    {
      path: '/login',
      component: () => import('../views/login/login.vue'),
      meta: { title: "登录" }
    },
    {
      name: 'main',
      path: '/main',
      component: () => import('../views/main/main.vue'),
      children: [
        {
          path: 'profile',
          component: () => import('../views/main/profile/profile.vue'),
          meta: { title: '个人信息' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)',
      component: () => import('../views/not-found/NotFound.vue')
    }
  ]
})


router.beforeEach(async (to, from) => {
  const token = localCache.getCache(LOGIN_TOKEN)


  if (to.path === '/login' && token) {

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp >= currentTime) {

        const loginStore = useLoginStore()
        resetFirstMenu()
        loginStore.loadLocalCacheAction()

        return firstMenu?.url || '/main'
      }
    } catch (err) {

      localCache.removeCache(LOGIN_TOKEN)
    }
  }


  if (to.path.startsWith('/main') && !token) {
    return '/login'
  }


  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) // 解析JWT的payload部分
      const currentTime = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < currentTime) {
        ElMessage({
          message: '登录过期, 请重新登录',
          type: 'warning',
          duration: 1300,
          showClose: true
        })
        await new Promise(resolve => setTimeout(resolve, 1300))
        localCache.removeCache(LOGIN_TOKEN)
        return '/login'
      }
    } catch (err) {
      ElMessage({
        message: "登录信息解析失败, 请重新登录",
        type: 'error',
        duration: 1500,
        showClose: true
      })
      await new Promise(resolve => setTimeout(resolve, 1300))
      localCache.removeCache(LOGIN_TOKEN)
      return '/login'
    }
  }


  if (to.path === '/main') {
    return firstMenu?.url
  }


  if (to.meta.title) {
    document.title = to.meta.title
  } else {
    document.title = "网页管理系统"
  }
})

export default router
