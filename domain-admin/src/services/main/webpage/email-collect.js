import axios from 'axios'

// 邮箱收集数据来自外部独立服务，不经过 domain-admin 后端，这里单独创建 axios 实例
const EMAIL_API_URL = 'https://s3.rapidsupplys.com'

const emailRequest = axios.create({
  baseURL: EMAIL_API_URL,
  timeout: 15000
})

/**
 * 获取邮箱收集列表（服务端分页）
 * @param {Object} params { page: 页码(从1开始), limit: 每页条数(接口上限100) }
 * @returns { count, list, page, pages, size, total }
 *   count 当前页条数 / list 当前页数据 / page 当前页码 / pages 总页数 / size 每页条数 / total 总记录数
 * 每条记录包含: id, email, lander_url, created_at 等字段
 */
export function getEmailList(params = {}) {
  return emailRequest
    .get('/email/list', { params })
    .then((res) => res.data)
    .catch((err) => Promise.reject(err))
}
