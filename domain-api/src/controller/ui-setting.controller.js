const uiSettingService = require('../service/ui-setting.service')

class UiSettingController {

  // GET /ui_settings/columns/:pageKey
  async getColumnSettings(ctx, next) {
    const { pageKey } = ctx.params
    const userId = ctx.user.id

    const settings = await uiSettingService.getColumnSettings(userId, pageKey)

    ctx.body = {
      code: 0,
      message: '获取列设置成功',
      data: { columns: settings }
    }
  }

  // PUT /ui_settings/columns/:pageKey  body: { columns: [{key, visible}] }
  async saveColumnSettings(ctx, next) {
    const { pageKey } = ctx.params
    const userId = ctx.user.id
    const columns = ctx.request.body?.columns

    if (!Array.isArray(columns)) {
      ctx.body = { code: -1, message: 'columns 必须是数组' }
      return
    }

    // 只保留必要字段，防止脏数据入库
    const cleaned = columns.map(c => ({
      key: String(c?.key ?? '').slice(0, 100),
      visible: c?.visible !== false
    })).filter(c => c.key)

    await uiSettingService.saveColumnSettings(userId, pageKey, cleaned)

    ctx.body = {
      code: 0,
      message: '保存列设置成功',
      data: { columns: cleaned }
    }
  }

  // DELETE /ui_settings/columns/:pageKey
  async removeColumnSettings(ctx, next) {
    const { pageKey } = ctx.params
    const userId = ctx.user.id

    await uiSettingService.removeColumnSettings(userId, pageKey)

    ctx.body = {
      code: 0,
      message: '重置列设置成功'
    }
  }
}

module.exports = new UiSettingController()
