import axios from 'axios'
import { BASE_URL, TIMEOUT } from './config'
import { LOGIN_TOKEN } from '@/global/constants'
import { localCache } from '@/utils/cache'

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
      res => res,
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

