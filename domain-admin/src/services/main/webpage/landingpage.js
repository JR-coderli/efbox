import hyRequest from '@/services/request'

/**
 * 创建着陆页
 */
export function createLandingPage(data) {
  return hyRequest.post({
    url: '/landingpage',
    data
  })
}

/**
 * 获取着陆页列表
 */
export function getLandingPageList(queryInfo) {
  return hyRequest.post({
    url: '/landingpage/list',
    data: queryInfo
  })
}

/**
 * 删除着陆页
 */
export function deleteLandingPage(id) {
  return hyRequest.delete({
    url: `/landingpage/${id}`
  })
}

/**
 * 更新着陆页
 */
export function updateLandingPage(id, data) {
  return hyRequest.patch({
    url: `/landingpage/${id}`,
    data
  })
}

/**
 * 上传落地页预览图
 */
export function uploadLandingPreview(landingId, file) {
  const formData = new FormData()
  formData.append('preview_image', file)

  return hyRequest.post({
    url: `/landingpage/${landingId}/preview`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
