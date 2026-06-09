import hyRequest from '@/services/request'

/**
 * 获取 Lander 列表
 */
export function getLanderList(queryInfo) {
  return hyRequest.post({
    url: '/lander/list',
    data: queryInfo
  })
}

/**
 * 获取单个 Lander 详情
 */
export function getLander(landerKey) {
  return hyRequest.get({
    url: `/lander/${landerKey}`
  })
}

/**
 * 手动触发同步（设置更长超时时间）
 */
export function syncLander() {
  return hyRequest.post({
    url: '/lander/sync',
    timeout: 120000 // 同步操作可能需要较长时间，设置2分钟超时
  })
}

/**
 * 获取同步状态
 */
export function getSyncStatus() {
  return hyRequest.get({
    url: '/lander/sync/status'
  })
}

/**
 * 获取截图统计
 */
export function getScreenshotStats() {
  return hyRequest.get({
    url: '/lander/screenshot/stats'
  })
}

/**
 * 手动触发截图任务
 */
export function triggerScreenshot() {
  return hyRequest.post({
    url: '/lander/screenshot/trigger'
  })
}

/**
 * 获取截图配置
 */
export function getScreenshotConfig() {
  return hyRequest.get({
    url: '/lander/screenshot/config'
  })
}

/**
 * 更新截图配置
 */
export function updateScreenshotConfig(query) {
  return hyRequest.post({
    url: '/lander/screenshot/config',
    data: { query }
  })
}

/**
 * 删除 Lander（调用 Clickflare API）
 */
export function deleteLander(landerKey) {

  return hyRequest.delete({
    url: `https://public-api.clickflare.io/api/landings/${landerKey}`,
    headers: {
      'api-key': '406561a67ff45389757647c936537da98f6c89a11776566dbe6efc8241c357f9.da59c8abbd8fbf4af7c3a5c72612d871a30273fa'
    },

    baseURL: '',
    timeout: 30000
  })
}

/**
 * 上传截图
 */
export function uploadLanderScreenshot(landerKey, file) {
  const formData = new FormData()
  formData.append('screenshot', file)

  return hyRequest.post({
    url: `/lander/${landerKey}/screenshot`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 创建 Lander（调用 Clickflare API）
 */
export function createLander(data) {

  return hyRequest.post({
    url: 'https://public-api.clickflare.io/api/landings',
    data: data,
    headers: {
      'api-key': '406561a67ff45389757647c936537da98f6c89a11776566dbe6efc8241c357f9.da59c8abbd8fbf4af7c3a5c72612d871a30273fa'
    },

    baseURL: '',
    timeout: 30000
  })
}

/**
 * 更新 Lander（调用 Clickflare API）
 */
export function updateLander(landerId, data) {

  return hyRequest.patch({
    url: `https://public-api.clickflare.io/api/landings/${landerId}`,
    data: data,
    headers: {
      'api-key': '406561a67ff45389757647c936537da98f6c89a11776566dbe6efc8241c357f9.da59c8abbd8fbf4af7c3a5c72612d871a30273fa'
    },

    baseURL: '',
    timeout: 30000
  })
}

/**
 * 根据域名查询url包含该域名的lander列表
 */
export function getLandersByDomain(domain, offset = 0, size = 10) {
  return hyRequest.post({
    url: '/lander/list',
    data: { url: domain, offset, size, sort_by: 'cf_created_at', sort_order: 'desc' }
  })
}

/**
 * 批量替换 Lander URL 中的域名
 * @param {string} domain - 要替换的域名
 * @param {string} replacementDomain - 替换后的域名
 * @param {string} workspaceType - 工作区类型: 'all', 'public', 'private'
 */
export function batchReplaceLanderUrl(domain, replacementDomain, workspaceType = 'all') {
  return hyRequest.post({
    url: '/lander-replacement/replace',
    data: { domain, replacement_domain: replacementDomain, workspace_type: workspaceType }
  })
}

/**
 * 预览批量替换（不执行实际替换，只返回匹配的 lander 和替换后的 URL）
 */
export function previewBatchReplace(domain, replacementDomain, workspaceType = 'all', offset = 0, size = 100) {
  return hyRequest.post({
    url: '/lander-replacement/preview',
    data: { domain, replacement_domain: replacementDomain, workspace_type: workspaceType, offset, size }
  })
}

/**
 * 获取批量替换任务进度
 */
export function getBatchReplaceProgress(recordId) {
  return hyRequest.get({
    url: `/lander-replacement/progress/${recordId}`
  })
}

