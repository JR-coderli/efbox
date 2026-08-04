const connection = require('../app/database')

/**
 * ef-归因系统 落地页截图缓存表（ef_lander_screenshots）的数据访问层。
 * 与现有 cf_landers / cf_lander_previews 完全独立，互不影响。
 */
class EfLanderService {
  /**
   * 批量按 lander_id 取截图信息
   * @param {number[]} landerIds
   * @returns {Promise<Object>} { [lander_id]: { screenshot_url, screenshot_status } }
   */
  async batchGetByLanderIds(landerIds) {
    if (!Array.isArray(landerIds) || landerIds.length === 0) return {}

    // 手工展开占位符，配合 execute（execute 下 IN (?) 不会自动展开数组）
    const placeholders = landerIds.map(() => '?').join(',')
    const [rows] = await connection.execute(
      `SELECT lander_id, screenshot_url, screenshot_status
       FROM ef_lander_screenshots
       WHERE lander_id IN (${placeholders})`,
      landerIds
    )

    const map = {}
    for (const r of rows) {
      map[r.lander_id] = {
        screenshot_url: r.screenshot_url,
        screenshot_status: r.screenshot_status
      }
    }
    return map
  }

  /**
   * 写入或更新一条截图记录（按 lander_id 唯一）
   * 不保留 screenshot_path：旧图不删除，DB 行只指向最新一张图。
   */
  async upsertScreenshot({ landerId, landerUrl, screenshotUrl, status, error = null }) {
    const statement = `
      INSERT INTO ef_lander_screenshots
        (lander_id, lander_url, screenshot_url, screenshot_status, screenshot_error)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        lander_url = VALUES(lander_url),
        screenshot_url = VALUES(screenshot_url),
        screenshot_status = VALUES(screenshot_status),
        screenshot_error = VALUES(screenshot_error),
        updated_at = NOW()
    `
    await connection.execute(statement, [landerId, landerUrl, screenshotUrl, status, error])
  }
}

module.exports = new EfLanderService()
