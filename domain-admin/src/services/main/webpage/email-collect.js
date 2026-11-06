import axios from 'axios'

// 邮箱收集数据来自外部独立服务，不经过 domain-admin 后端，这里单独创建 axios 实例
const EMAIL_API_URL = 'https://s3.rapidsupplys.com'

const emailRequest = axios.create({
  baseURL: EMAIL_API_URL,
  timeout: 15000
})

/**
 * 获取邮箱收集列表（服务端分页）
 * @param {Object} params { page, limit, with_names, mid/tid/oid/lid(精确id), media_name 等(名称模糊) }
 * @returns { count, list, page, pages, size, total }
 *   count 当前页条数 / list 当前页数据 / page 当前页码 / pages 总页数 / size 每页条数 / total 总记录数
 * 每条记录包含: id, email, lander_url, created_at 等字段;
 * with_names=true 时(2026-11-06)额外带 names: { media, tracker, offer, lander, advertiser }
 *   = mid/tid/oid/lid 对应名称 + offer 所属广告主名(与 /query 家族同款); 无归因的光杆邮箱为空串
 * 维度筛选(2026-11-06): mid/tid/oid/lid 精确 id(非数字 400) 或 media_name/tracker_name/
 *   lander_name/offer_name 名称模糊(ILIKE), 多个同时给出取交集
 */
export function getEmailList(params = {}) {
  return emailRequest
    .get('/email/list', { params })
    .then((res) => res.data)
    .catch((err) => Promise.reject(err))
}
