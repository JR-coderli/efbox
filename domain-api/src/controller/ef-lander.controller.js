const efLanderService = require('../service/ef-lander.service')
const { captureLanderScreenshot } = require('../services/ef-lander-screenshot.service')
const { updateRemotePreviewUrl } = require('../services/ef-remote.service')

/**
 * ef-归因系统 落地页截图控制器（独立于现有 lander.controller）。
 */
class EfLanderController {
  /**
   * 批量按 lander_id 取截图（列表展示用）
   * body: { lander_ids: [1,2,3] }
   * 返回: { code:0, data: { "1": {screenshot_url, screenshot_status}, ... } }
   */
  async batchGetScreenshots(ctx) {
    const { lander_ids = [] } = ctx.request.body || {}
    const ids = Array.isArray(lander_ids) ? lander_ids.filter((id) => id != null) : []
    const map = await efLanderService.batchGetByLanderIds(ids)
    ctx.body = { code: 0, message: 'ok', data: map }
  }

  /**
   * 触发单个 lander 截图（同步等待结果）
   * body: { lander_id, lander_url }
   */
  async triggerScreenshot(ctx) {
    const { lander_id, lander_url } = ctx.request.body || {}
    if (lander_id == null || !lander_url) {
      ctx.body = { code: 1, message: '缺少 lander_id 或 lander_url' }
      return
    }

    const result = await captureLanderScreenshot({ landerId: lander_id, landerUrl: lander_url })
    if (result.success) {
      ctx.body = {
        code: 0,
        message: '截图成功',
        data: { screenshot_url: result.screenshot_url, preview_url: result.preview_url }
      }
    } else {
      ctx.body = {
        code: 1,
        message: '截图失败: ' + (result.error || '未知错误'),
        data: { error: result.error }
      }
    }
  }
  /**
   * 供对方系统调用的截图接口（对方新建 lander 后回调）
   * api-key 验证（public.ef-lander.router.js），body: { id, url }
   * 流程：拼 eflp 签名 → puppeteer 截图 → 更新本地 ef_lander_screenshots
   *      → 回调对方 /landers/update-preview 写入 ab_landers.preview_url
   */
  async publicScreenshot(ctx) {
    const { id, url } = ctx.request.body || {}
    const landerId = Number(id)
    const landerUrl = String(url || '').trim()

    if (!Number.isInteger(landerId) || landerId <= 0) {
      ctx.body = { code: 1, message: 'id 必须是大于 0 的整数' }
      return
    }
    if (!/^https?:\/\//i.test(landerUrl)) {
      ctx.body = { code: 1, message: 'url 必须以 http:// 或 https:// 开头' }
      return
    }

    const result = await captureLanderScreenshot({ landerId, landerUrl })
    if (result.success) {
      ctx.body = {
        code: 0,
        message: '截图成功',
        data: {
          preview_url: result.preview_url                 // 完整地址（已写入对方 ab_landers.preview_url）
        }
      }
    } else {
      ctx.body = { code: 1, message: '截图失败: ' + (result.error || '未知错误'), data: { error: result.error } }
    }
  }

  /**
   * 手动上传截图（覆盖现有截图）
   * multipart 表单：文件字段名 screenshot；文本字段 lander_id（必填）、lander_url（可选，仅记录）
   */
  async uploadScreenshot(ctx) {
    const { lander_id, lander_url } = ctx.request.body || {}
    const file = ctx.file

    if (lander_id == null) {
      ctx.body = { code: 1, message: '缺少 lander_id' }
      return
    }
    if (!file) {
      ctx.body = { code: 1, message: '请选择要上传的图片' }
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.mimetype)) {
      ctx.body = { code: 1, message: '只支持 JPG、PNG、GIF、WebP 格式的图片' }
      return
    }

    try {
      const relativePath = `/uploads/ef_lander_screenshots/${file.filename}`
      await efLanderService.upsertScreenshot({
        landerId: lander_id,
        landerUrl: lander_url || null,
        screenshotUrl: relativePath,
        status: 'success'
      })

      // 顺带回写对方 ab_landers.preview_url（失败不影响本地结果）
      const remote = await updateRemotePreviewUrl({ landerId: lander_id, screenshotUrl: relativePath })

      ctx.body = { code: 0, message: '上传成功', data: { screenshot_url: relativePath, preview_url: remote.preview_url } }
    } catch (error) {
      ctx.body = { code: 1, message: '上传失败: ' + error.message }
    }
  }
}

module.exports = new EfLanderController()
