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


/**
 * Gift LP(礼品清单页)接口(对应 domain-api src/router/lp.router.js 的 /gift/* 路由)
 * 静态页部署在 pro2.winrab.com/s2/1/ecomlistical/, 数据表 lp_gift_products / lp_gift_page_config
 */

// 产品列表(按 sort 排序)
export function getGiftProducts() {
  return hyRequest.get({ url: '/lp/manage/gift/products' })
}

// 新增产品
export function createGiftProduct(data) {
  return hyRequest.post({ url: '/lp/manage/gift/products', data })
}

// 更新产品
export function updateGiftProduct(id, data) {
  return hyRequest.patch({ url: `/lp/manage/gift/products/${id}`, data })
}

// 删除产品
export function removeGiftProduct(id) {
  return hyRequest.delete({ url: `/lp/manage/gift/products/${id}` })
}

// 拖拽排序 { products: [{id, sort}] }
export function updateGiftSort(products) {
  return hyRequest.patch({ url: '/lp/manage/gift/products-sort', data: { products } })
}

// 批量统一正文字号 { size: '24px', group_type?: 1|2 }
export function unifyGiftFontSize(data) {
  return hyRequest.post({ url: '/lp/manage/gift/unify-fontsize', data })
}

// 页面配置
export function getGiftConfig() {
  return hyRequest.get({ url: '/lp/manage/gift/config' })
}

export function updateGiftConfig(data) {
  return hyRequest.patch({ url: '/lp/manage/gift/config', data })
}
