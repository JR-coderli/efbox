import hyRequest from '@/services/request'

/**
 * LP 产品管理接口(对应 domain-api src/router/lp.router.js)
 */

// 产品列表(按 sort 排序)
export function getLpProducts() {
  return hyRequest.get({ url: '/lp/manage/products' })
}

// 新增产品
export function createLpProduct(data) {
  return hyRequest.post({ url: '/lp/manage/products', data })
}

// 更新产品
export function updateLpProduct(id, data) {
  return hyRequest.patch({ url: `/lp/manage/products/${id}`, data })
}

// 删除产品
export function removeLpProduct(id) {
  return hyRequest.delete({ url: `/lp/manage/products/${id}` })
}

// 拖拽排序 { products: [{id, sort}] }
export function updateLpSort(products) {
  return hyRequest.patch({ url: '/lp/manage/products-sort', data: { products } })
}

// 页面配置
export function getLpConfig() {
  return hyRequest.get({ url: '/lp/manage/config' })
}

export function updateLpConfig(data) {
  return hyRequest.patch({ url: '/lp/manage/config', data })
}

// 媒体上传(FormData, 字段名 media)
export function uploadLpMedia(formData) {
  return hyRequest.upload({ url: '/lp/manage/upload', data: formData })
}
