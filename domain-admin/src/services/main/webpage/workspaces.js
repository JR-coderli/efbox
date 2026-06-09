import hyRequest from '@/services/request'

/**
 * 同步工作区
 */
export function syncWorkspaces() {
  return hyRequest.post({
    url: '/workspace/sync'
  })
}

/**
 * 获取工作区列表
 */
export function getWorkspaceList() {
  return hyRequest.get({
    url: '/workspace/list'
  })
}
