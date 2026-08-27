import axios from 'axios'
import { BASE_URL, TIMEOUT } from './config'
import { LOGIN_TOKEN } from '@/global/constants'
import { localCache } from '@/utils/cache'
import { ElMessage } from 'element-plus'

// 未携带token(-1005)/无效或过期token(-1006)：清本地登录态并跳登录页
// -1005 多为登出/登录过渡期的残留请求，静默处理；-1006 提示用户重新登录
// 注意：不能 import '@/router'（router → login store → request 会形成循环依赖），直接改 hash 触发路由
function handleAuthFailed(code) {
  if (window.location.hash.includes('/login')) return // 已在登录页，不重复跳转

  localCache.removeCache(LOGIN_TOKEN)
  localCache.removeCache('userInfo')
  localCache.removeCache('userMenus')

  if (code === -1006) {
    ElMessage({
      message: '登录已失效，请重新登录',
      type: 'warning',
      duration: 2000,
      grouping: true
    })
  }

  window.location.hash = '#/login'
}

class HYRequest {

  constructor(baseURL, timeout=10000) {
    this.instance = axios.create({
      baseURL,
      timeout
    })

    this.instance.interceptors.request.use(config => {

      const token = localCache.getCache(LOGIN_TOKEN)
      if (token) {
        config.headers.Authorization = 'Bearer ' + token
      }
      return config
    })
    this.instance.interceptors.response.use(
      res => {
        // 统一处理鉴权失败响应（HTTP 200 + 业务错误码）
        const data = res?.data
        if (data && (data.code === -1005 || data.code === -1006)) {
          handleAuthFailed(data.code)
        }
        return res
      },
      err => {

        return Promise.reject(err)
      }
    )
  }


  request(config) {
    return new Promise((resolve, reject) => {
      this.instance.request(config).then(res => {
        resolve(res.data)
      }).catch(err => {
        reject(err)
      })
    })
  }


  get(config) {
    return this.request({ ...config, method: "get" })
  }


  post(config) {
    return this.request({ ...config, method: "post" })
  }


  put(config) {
    return this.request({ ...config, method: "put" })
  }


  patch(config) {
    return this.request({ ...config, method: "patch" })
  }


  delete(config) {
    return this.request({ ...config, method: "delete" })
  }


  upload(config) {
    return this.request({
      ...config,
      method: "post",
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

const hyRequest = new HYRequest(BASE_URL, TIMEOUT)

export default hyRequest

