const connection = require('../app/database')

// 页面级 UI 设置（目前仅列设置），按 用户 + 页面 唯一存储
class UiSettingService {

  // 获取某用户在某页面的列设置；无记录返回 null
  async getColumnSettings(userId, pageKey) {
    const [rows] = await connection.execute(
      'SELECT columns_json FROM ui_column_settings WHERE user_id = ? AND page_key = ?',
      [userId, pageKey]
    )
    if (rows.length === 0) return null
    try {
      return JSON.parse(rows[0].columns_json)
    } catch {
      return null
    }
  }

  // 保存列设置（不存在则插入，存在则更新）
  async saveColumnSettings(userId, pageKey, columns) {
    const columnsJson = JSON.stringify(columns || [])
    const [result] = await connection.execute(
      `INSERT INTO ui_column_settings (user_id, page_key, columns_json)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE columns_json = VALUES(columns_json)`,
      [userId, pageKey, columnsJson]
    )
    return { affectedRows: result.affectedRows }
  }

  // 删除列设置（重置用）
  async removeColumnSettings(userId, pageKey) {
    const [result] = await connection.execute(
      'DELETE FROM ui_column_settings WHERE user_id = ? AND page_key = ?',
      [userId, pageKey]
    )
    return { affectedRows: result.affectedRows }
  }
}

module.exports = new UiSettingService()
