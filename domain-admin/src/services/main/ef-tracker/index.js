import axios from 'axios'
import hyRequest from '@/services/request'

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
  // with_names=true 时返回的名称映射；此表字段是大写驼峰，key 兼容大小写
  const rawNames = item.Names || item.names
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
    posted_at: item.PostedAt,
    names: rawNames
      ? {
          media: rawNames.media ?? rawNames.Media ?? '',
          tracker: rawNames.tracker ?? rawNames.Tracker ?? ''
        }
      : null
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

// 批量硬删除错误日志（POST /error-logs/delete，删了不可恢复）
// ids: number[]  →  返回 { deleted: number }（实际删除行数；不存在的 id 不影响计数）
export function deleteErrorLogs(ids = []) {
  return queryRequest.post('/error-logs/delete', { ids }).then((res) => res.data)
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

// 批量替换 LP url 子串（域名迁移/路径改写）。POST 到外部系统（与 /query 同 host）。
// payload: { old(必填), new(可选,默认删除), ids(可选,默认全表), dry_run(可选,预演不写库) }
// 预演返回 { dry_run, count, list:[{id,before,after}] }；正式执行返回 { dry_run:false, affected }
export function replaceLanderUrl(payload) {
  return queryRequest
    .post('/landers/replace-url', payload)
    .then((res) => res.data)
}

// ============================================================
// 以下走本地 domain-admin 后端（hyRequest），用于 ef-归因系统 落地页截图（方案 B）
// 与上面的 /query 外部接口无关，互不影响。
// ============================================================

/**
 * 批量按 lander id 取已缓存的截图（列表展示用）
 * @param {number[]} landerIds  当前页所有 lander 的 id
 * @returns { code, data: { [lander_id]: { screenshot_url, screenshot_status } } }
 */
export function getEfLanderScreenshots(landerIds = []) {
  return hyRequest.post({
    url: '/ef-lander/screenshots/batch',
    data: { lander_ids: landerIds }
  })
}

/**
 * 触发单个 lander 截图（手动按钮，后端同步等待 puppeteer 完成）
 * @param {number} landerId   ab_landers 的 id
 * @param {string} landerUrl  ab_landers 的 url（裸 url，签名由后端拼）
 * @returns { code, data: { screenshot_url } }
 */
export function triggerEfLanderScreenshot(landerId, landerUrl) {
  return hyRequest.post({
    url: '/ef-lander/screenshot',
    data: { lander_id: landerId, lander_url: landerUrl },
    timeout: 60000 // puppeteer 截图较慢，给 60s
  })
}

/**
 * 手动上传截图（覆盖现有截图）
 * @param {FormData} formData  含字段：screenshot(文件)、lander_id、lander_url
 */
export function uploadEfLanderScreenshot(formData) {
  return hyRequest.post({
    url: '/ef-lander/screenshot/upload',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

