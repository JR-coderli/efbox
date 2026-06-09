import hyRequest from '@/services/request'

/**
 * 获取分类列表
 */
export function getCategoriesList() {
  return hyRequest.get({
    url: '/categories'
  })
}

/**
 * 创建分类
 */
export function createCategory(data) {
  return hyRequest.post({
    url: '/categories',
    data
  })
}

/**
 * 删除分类
 */
export function deleteCategory(id) {
  return hyRequest.delete({
    url: `/categories/${id}`
  })
}

/**
 * 更新分类排序
 */
export function updateCategorySort(categories) {
  return hyRequest.patch({
    url: '/categories/sort',
    data: { categories }
  })
}
