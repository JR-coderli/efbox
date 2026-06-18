
const server = require('./app')
const { SERVER_PORT } = require('./config/server')
require('./utils/handle-error')


// 全局错误处理：捕获未处理的 Promise 拒绝和未捕获异常
// 仅记录日志便于排查，不退出进程，避免单个任务异常影响整个 domain-api 服务
process.on('unhandledRejection', (reason, promise) => {
  console.error('[全局] 未处理的 Promise 拒绝:', reason)
})
process.on('uncaughtException', (error) => {
  console.error('[全局] 未捕获的异常:', error?.stack || error?.message || error)
})


const { startLanderSync } = require('./tasks/lander-sync.task')
const { startRetryFailed } = require('./services/lander-screenshot.service')
const landerService = require('./service/lander.service')
const landerReplacementService = require('./service/lander-replacement.service')


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
    const resetCount = await landerReplacementService.resetStuckReplacements()
    if (resetCount > 0) {
      console.log(`[启动清理] 已将 ${resetCount} 个未完成的批量替换任务标记为中断`)
    }
  } catch (error) {
    console.error('[启动清理] 清理未完成替换任务失败:', error)
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


require('./tasks/lander-sync.task').startLanderSync().catch(err => {
  console.error('[LanderSync] 启动失败，数据库不可用:', err.message)
}) // 会检查数据库开关，决定是否启动





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