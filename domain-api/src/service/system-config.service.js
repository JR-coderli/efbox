const connection = require('../app/database')

class SystemConfigService {
  /**
   * 获取配置值
   * @param {string} key 配置键
   * @param {any} defaultValue 默认值
   * @returns {any} 配置值
   */
  async get(key, defaultValue = null) {
    const [rows] = await connection.execute(
      'SELECT `config_value` FROM `system_config` WHERE `config_key` = ?',
      [key]
    )

    if (rows.length === 0) {
      return defaultValue
    }

    const value = rows[0].config_value


    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  /**
   * 设置配置值
   * @param {string} key 配置键
   * @param {any} value 配置值
   */
  async set(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

    await connection.query(
      `INSERT INTO \`system_config\` (\`config_key\`, \`config_value\`) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`config_value\` = VALUES(\`config_value\`), \`updated_at\` = NOW()`,
      [key, stringValue]
    )

    return value
  }

  /**
   * 获取多个配置
   * @param {object} defaults 默认值对象 { key: defaultValue }
   * @returns {object} 配置对象
   */
  async getMultiple(defaults = {}) {
    const keys = Object.keys(defaults)
    if (keys.length === 0) return {}

    const placeholders = keys.map(() => '?').join(',')
    const [rows] = await connection.execute(
      `SELECT \`config_key\`, \`config_value\` FROM \`system_config\` WHERE \`config_key\` IN (${placeholders})`,
      keys
    )

    const result = { ...defaults }

    for (const row of rows) {
      try {
        result[row.config_key] = JSON.parse(row.config_value)
      } catch {
        result[row.config_key] = row.config_value
      }
    }

    return result
  }

  /**
   * 批量设置配置
   * @param {object} configs 配置对象 { key: value }
   */
  async setMultiple(configs) {
    const promises = Object.entries(configs).map(([key, value]) => this.set(key, value))
    await Promise.all(promises)
    return configs
  }
}

module.exports = new SystemConfigService()
