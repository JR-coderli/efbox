import hyRequest from '@/services/request'

/**
 * 获取 Lander 配置
 */
export function getLanderConfig() {
  return hyRequest.get({
    url: '/system/config/lander'
  })
}

/**
 * 设置 Lander 配置
 */
export function setLanderConfig(data) {
  return hyRequest.post({
    url: '/system/config/lander',
    data
  })
}
