
const server = require('./app')
const { SERVER_PORT } = require('./config/server')
require('./utils/handle-error')


const { startLanderSync } = require('./tasks/lander-sync.task')
const { startRetryFailed } = require('./services/lander-screenshot.service')
const landerService = require('./service/lander.service')


const pushnamiRunner = require('./service/pushnami-runner.service')
const pushnamiService = require('./service/pushnami.service')


server.listen(SERVER_PORT, async () => {
  console.log('url_cms服务器启动成功~, 运行在' + SERVER_PORT + "端口")


  try {
    const resetCount = await landerService.resetStuckProcessingRecords(30)
    if (resetCount > 0) {
      console.log(`[启动清理] 已重置 ${resetCount} 个卡住的截图任务，可以点击"触发截图"重新处理`)
    }
  } catch (error) {
    console.error('[启动清理] 清理 processing 记录失败:', error)
  }


  try {
    const resetCount = await pushnamiService.resetStuckRunningRecords()
    if (resetCount > 0) {
      console.log(`[Pushnami 启动清理] 已将 ${resetCount} 个"执行中"状态的脚本记录更新为"中断"`)
    }
  } catch (error) {
    console.error('[Pushnami 启动清理] 清理执行中记录失败:', error)
  }


  console.log('[Pushnami] Pushnami 服务已就绪，等待前端调用执行任务')
})


require('./tasks/lander-sync.task').startLanderSync() // 会检查数据库开关，决定是否启动





process.on('SIGINT', async () => {
  console.log('\n[Server] 收到退出信号，正在关闭服务...')
  await pushnamiRunner.shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n[Server] 收到终止信号，正在关闭服务...')
  await pushnamiRunner.shutdown()
  process.exit(0)
})