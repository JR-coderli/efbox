import axios from 'axios'

// ef-tracker 数据来自外部系统的 query 只读接口，不经过 domain-admin 后端，这里单独创建 axios 实例。
// host 统一：https://s3.rapidsupplys.com
const QUERY_API_URL = 'https://s3.rapidsupplys.com'

const queryRequest = axios.create({
  baseURL: QUERY_API_URL,
  timeout: 15000
})

// 通用 GET：所有参数都是可选的（page/size/keyword/tz/date/start/end + 各表精确过滤）。
// 返回统一信封：{ total, page, size, pages, count, tz, list }
function query(path, params = {}) {
  return queryRequest
    .get(path, { params })
    .then((res) => res.data)
    .catch((err) => Promise.reject(err))
}

// conversions 表的字段名是 Go 结构体字段名（首字母大写驼峰），与其它表不一致。
// 这里映射成小写蛇形，保持页面渲染逻辑统一。
function normalizeConversion(item) {
  return {
    id: item.ID,
    system_click_id: item.SystemClickID,
    media_click_id: item.MediaClickID,
    mid: item.MID,
    tid: item.TID,
    payout: item.Payout,
    should_postback: item.ShouldPostback,
    media_postback_url: item.MediaPostbackURL,
    http_status_code: item.HTTPStatusCode,
    response_body: item.ResponseBody,
    created_at: item.CreatedAt,
    posted_at: item.PostedAt
  }
}

// 1. 媒体/系统点击 —— system_clicks
export function getClicks(params = {}) {
  return query('/query/clicks', params)
}

// 2. 系统错误日志 —— system_error_logs
export function getErrorLogs(params = {}) {
  return query('/query/error-logs', params)
}

// 3. LP → Offer 点击 —— system_lp_clicks
export function getLpClicks(params = {}) {
  return query('/query/lp-clicks', params)
}

// 4. LP 着陆流水 —— system_lp_visit_logs
export function getLpVisitLogs(params = {}) {
  return query('/query/lp-visit-logs', params)
}

// 5. 转化/媒体回传 —— system_conversions（字段名归一化）
export async function getConversions(params = {}) {
  const res = await query('/query/conversions', params)
  if (res && Array.isArray(res.list)) {
    res.list = res.list.map(normalizeConversion)
  }
  return res
}

// 6. 落地页 LP —— ab_landers
export function getLanders(params = {}) {
  return query('/query/landers', params)
}
