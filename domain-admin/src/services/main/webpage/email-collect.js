import axios from 'axios'

// 邮箱收集数据来自外部独立服务，不经过 domain-admin 后端，这里单独创建 axios 实例
const EMAIL_API_URL = 'https://s3.rapidsupplys.com'

const emailRequest = axios.create({
  baseURL: EMAIL_API_URL,
  timeout: 15000
})

/**
 * 获取邮箱收集列表
 * 接口返回结构: { count, list: [...], total }
 * 每条记录包含: id, email, lander_url, created_at 等字段
 */
export function getEmailList() {
  return emailRequest
    .get('/email/list')
    .then((res) => res.data)
    .catch((err) => Promise.reject(err))
}
