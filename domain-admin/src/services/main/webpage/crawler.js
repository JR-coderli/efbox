import hyRequest from '@/services/request'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN } from '@/global/constants'
import { BASE_URL } from '@/services/request/config'

/**
 * 创建爬虫任务
 */
export function createCrawlerTask(data) {
  return hyRequest.post({
    url: '/crawler/task',
    data
  })
}

/**
 * 查询任务状态
 */
export function getCrawlerTaskStatus(id) {
  return hyRequest.get({
    url: `/crawler/task/${id}`
  })
}

/**
 * 获取任务列表
 */
export function getCrawlerTaskList(params) {
  return hyRequest.get({
    url: '/crawler/tasks',
    params
  })
}

/**
 * 删除任务
 */
export function deleteCrawlerTask(id) {
  return hyRequest.delete({
    url: `/crawler/task/${id}`
  })
}

/**
 * 获取下载 URL（携带 token）
 */
export function getDownloadUrl(taskFolder) {
  const token = localCache.getCache(LOGIN_TOKEN)
  return `${BASE_URL}/crawler/download/${taskFolder}?token=${token}`
}

/**
 * 获取预览 URL（不需要 token，静态文件公开访问）
 */
export function getPreviewUrl(taskFolder) {
  return `${BASE_URL}/crawler/preview/${taskFolder}/index.html`
}
