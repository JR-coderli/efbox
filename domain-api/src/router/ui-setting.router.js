const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const {
  getColumnSettings,
  saveColumnSettings,
  removeColumnSettings
} = require('../controller/ui-setting.controller')


const uiSettingRouter = new KoaRouter({ prefix: '/ui_settings' })

// 获取当前用户在某页面的列设置
uiSettingRouter.get('/columns/:pageKey', verifyAuth, getColumnSettings)

// 保存（不存在则插入）
uiSettingRouter.put('/columns/:pageKey', verifyAuth, saveColumnSettings)

// 重置（删除记录）
uiSettingRouter.delete('/columns/:pageKey', verifyAuth, removeColumnSettings)


module.exports = uiSettingRouter
