import hyRequest from '@/services/request'

/**
 * 获取域名替换记录列表
 */
export function getReplacementList(offset = 0, size = 10) {
  return hyRequest.post({
    url: '/lander-replacement/list',
    data: { offset, size }
  })
}

/**
 * 获取替换记录详情
 */
export function getReplacementDetail(id) {
  return hyRequest.get({
    url: `/lander-replacement/detail/${id}`
  })
}

/**
 * 替换危险域名
 */
export function replaceDangerousDomain(domain, replacementDomain = 'www.baidu.com') {
  return hyRequest.post({
    url: '/lander-replacement/replace',
    data: { domain, replacement_domain: replacementDomain }
  })
}
