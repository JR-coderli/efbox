import axios from 'axios'
import { LP_API_URL } from './config.js'


const lpRequest = axios.create({
  baseURL: LP_API_URL,
  timeout: 60000 // 上传需要更长超时
})


lpRequest.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)


lpRequest.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('LP API Error:', message)
    return Promise.reject(error)
  }
)

export default lpRequest
