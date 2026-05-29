const systemConfigService = require('../service/system-config.service')
const landerSyncTask = require('../tasks/lander-sync.task')

class SystemConfigController {
  /**
   * 获取配置
   */
  async get(ctx, next) {
    const { key } = ctx.params

    const value = await systemConfigService.get(key, null)

    ctx.body = {
      code: 0,
      message: '获取配置成功',
      data: { key, value }
    }
  }

  /**
   * 设置配置
   */
  async set(ctx, next) {
    const { key } = ctx.params
    const { value } = ctx.request.body

    await systemConfigService.set(key, value)

    ctx.body = {
      code: 0,
      message: '设置配置成功',
      data: { key, value }
    }
  }

  /**
   * 批量获取配置
   */
  async getMultiple(ctx, next) {
    const { keys } = ctx.query

    if (!keys) {
      ctx.body = {
        code: 1,
        message: '请指定要获取的配置键'
      }
      return
    }

    const keyArray = keys.split(',')
    const defaults = {}
    keyArray.forEach(key => {
      defaults[key] = null
    })

    const configs = await systemConfigService.getMultiple(defaults)

    ctx.body = {
      code: 0,
      message: '获取配置成功',
      data: configs
    }
  }

  /**
   * 批量设置配置
   */
  async setMultiple(ctx, next) {
    const { configs } = ctx.request.body

    if (!configs || typeof configs !== 'object') {
      ctx.body = {
        code: 1,
        message: '请提供有效的配置对象'
      }
      return
    }

    await systemConfigService.setMultiple(configs)

    ctx.body = {
      code: 0,
      message: '设置配置成功',
      data: configs
    }
  }

  /**
   * 获取 Lander 相关配置
   */
  async getLanderConfig(ctx, next) {
    const configs = await systemConfigService.getMultiple({
      'lander.auto_sync.enabled': false,  // 默认关闭
      'lander.auto_sync.interval': 30     // 默认30分钟
    })

    ctx.body = {
      code: 0,
      message: '获取配置成功',
      data: configs
    }
  }

  /**
   * 设置 Lander 相关配置
   */
  async setLanderConfig(ctx, next) {
    const { auto_sync_enabled, auto_sync_interval } = ctx.request.body

    const configs = {}

    if (typeof auto_sync_enabled === 'boolean') {
      configs['lander.auto_sync.enabled'] = auto_sync_enabled
    }

    if (typeof auto_sync_interval === 'number') {
      configs['lander.auto_sync.interval'] = auto_sync_interval
    }

    if (Object.keys(configs).length === 0) {
      ctx.body = {
        code: 1,
        message: '请提供有效的配置参数'
      }
      return
    }


    await systemConfigService.setMultiple(configs)

    let message = '设置成功'


    if (typeof auto_sync_enabled === 'boolean') {
      if (auto_sync_enabled) {

        const timer = await landerSyncTask.startLanderSync()
        if (timer) {
          message = '已开启自动同步'
          console.log('[系统配置] 自动同步已开启')
        } else {
          message = '设置成功（等待下次重启后端生效）'
        }
      } else {

        landerSyncTask.stopLanderSync()
        message = '已关闭自动同步'
        console.log('[系统配置] 自动同步已关闭')
      }
    }


    if (typeof auto_sync_enabled !== 'boolean' && typeof auto_sync_interval === 'number') {
      const wasSyncing = landerSyncTask.isSyncing()
      landerSyncTask.stopLanderSync()
      await landerSyncTask.startLanderSync(undefined, false)  // 不立即同步，仅更新间隔
      if (wasSyncing) {
        message = '设置成功（正在同步中，新间隔将在下次执行后生效）'
      } else {
        message = `同步间隔已更新为 ${auto_sync_interval} 分钟`
      }
      console.log('[系统配置] 同步间隔已更新，定时器已重启')
    }

    ctx.body = {
      code: 0,
      message,
      data: configs
    }
  }
}

module.exports = new SystemConfigController()
