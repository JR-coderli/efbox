const workspaceService = require('../service/workspace.service')
const clickflareConfig = require('../config/clickflare')

class WorkspaceController {
  /**
   * 手动触发工作区同步
   */
  async sync(ctx, next) {
    try {

      const response = await fetch(`${clickflareConfig.baseURL}${clickflareConfig.endpoints.workspaces}`, {
        method: 'GET',
        headers: {
          'api-key': clickflareConfig.apiKey,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} - ${response.statusText}`)
      }

      const workspaces = await response.json()
      console.log(`[工作区同步] 从 API 获取到 ${workspaces.length} 条数据`)


      const transformedWorkspaces = workspaces.map(item => ({
        workspace_id: item._id,
        name: item.name
      }))


      const syncResult = await workspaceService.syncWorkspaces(transformedWorkspaces)

      ctx.body = {
        code: 0,
        message: '同步成功',
        data: syncResult
      }
    } catch (error) {
      console.error('[工作区同步] 失败:', error)
      ctx.body = {
        code: 1,
        message: '同步失败',
        error: error.message
      }
    }
  }

  /**
   * 获取工作区列表
   */
  async list(ctx, next) {
    try {
      const list = await workspaceService.list()

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: { list }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }
}

module.exports = new WorkspaceController()
