/**
 * ef-tracker 外部系统写接口封装（QUERY_API.md 第七节）。
 * 独立小模块：只在截图/上传成功后回写对方 ab_landers.preview_url，失败记日志不阻断本地流程。
 */
const efTrackerConfig = require('../config/ef-tracker')
const { LP_SCREENSHOTS_BASE_URL } = require('../config/server')

/**
 * 回写对方 ab_landers.preview_url
 * @param {{landerId:number, screenshotUrl:string}} param0  screenshotUrl 为相对路径（/uploads/ef_lander_screenshots/xxx.jpg）
 * @returns {Promise<{success:boolean, preview_url?:string, error?:string}>}
 */
async function updateRemotePreviewUrl({ landerId, screenshotUrl }) {
  // 对方接口要求 preview_url 必须以 http(s):// 开头，这里拼成本系统对外可访问的完整地址
  const fullUrl = `${LP_SCREENSHOTS_BASE_URL}${screenshotUrl.startsWith('/') ? '' : '/'}${screenshotUrl}`

  try {
    const response = await fetch(`${efTrackerConfig.baseURL}${efTrackerConfig.endpoints.updatePreview}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: landerId, preview_url: fullUrl }),
      timeout: 15000
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status} - ${body.slice(0, 200)}`)
    }

    console.log(`[ef-lander] 已回写对方 preview_url: lander_id=${landerId}`)
    return { success: true, preview_url: fullUrl }
  } catch (error) {
    // 本地 ef_lander_screenshots 已更新，列表有本地兜底，回写失败不影响主流程
    console.error(`[ef-lander] 回写对方 preview_url 失败: lander_id=${landerId}`, error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { updateRemotePreviewUrl }
