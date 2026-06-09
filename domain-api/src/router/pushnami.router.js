/**
 * Pushnami 自动化任务路由
 */
const Router = require('@koa/router')
const pushnamiController = require('../controller/pushnami.controller.js')

const pushnamiRouter = new Router({ prefix: '/pushnami' })


pushnamiRouter.get('/operation-log', pushnamiController.getOperationLogs)
pushnamiRouter.post('/operation-log', pushnamiController.recordOperation)


pushnamiRouter.get('/check-cooldown', pushnamiController.checkCooldown)


pushnamiRouter.get('/execution-log', pushnamiController.getExecutionLogs)
pushnamiRouter.post('/execution-log', pushnamiController.recordExecution)
pushnamiRouter.put('/execution-log/:id', pushnamiController.updateExecution)


pushnamiRouter.get('/config', pushnamiController.getConfig)
pushnamiRouter.put('/config', pushnamiController.updateConfig)


pushnamiRouter.get('/stats', pushnamiController.getStats)


pushnamiRouter.post('/trigger/:task', pushnamiController.triggerTask)


pushnamiRouter.get('/service-status', pushnamiController.getServiceStatus)


pushnamiRouter.get('/tasks-status', pushnamiController.getTasksStatus)


pushnamiRouter.post('/stop', pushnamiController.stopExecution)
pushnamiRouter.get('/check-stop', pushnamiController.checkStopSignal)
pushnamiRouter.post('/mark-stopped', pushnamiController.markAsStopped)


pushnamiRouter.post('/cancel-scheduled', pushnamiController.cancelScheduledTask)


pushnamiRouter.post('/close-browser', pushnamiController.closeBrowser)


pushnamiRouter.get('/health', pushnamiController.checkHealth)


pushnamiRouter.get('/running-logs', pushnamiController.getRunningLogs)


pushnamiRouter.get('/download-log/:id', pushnamiController.downloadLog)

module.exports = pushnamiRouter
