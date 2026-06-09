import lpRequest from '@/services/request/lp-request'
import { LP_API_URL } from '@/services/request/config'

/**
 * 获取所有支持的类型
 */
export function getLpTypes() {
  return lpRequest({
    url: '/api/projects/types',
    method: 'get'
  })
}

/**
 * 获取所有项目列表（按主题分组）
 * @param {string} type - 项目类型 (s2-1 | s2-mt-2)
 */
export function getLpProjectsList(type = 's2-1') {
  return lpRequest({
    url: '/api/projects',
    method: 'get',
    params: { type }
  })
}

/**
 * 创建新主题
 * @param {Object} data - { type: string, name: string }
 */
export function createLpTheme(data) {
  return lpRequest({
    url: '/api/projects/theme',
    method: 'post',
    data
  })
}

/**
 * 创建新版本
 * @param {Object} data - { type: string, theme: string, version: string }
 */
export function createLpVersion(data) {
  return lpRequest({
    url: '/api/projects/version',
    method: 'post',
    data
  })
}

/**
 * 上传项目文件
 * @param {FormData} formData - 包含 type, theme, version, files 的表单数据
 */
export function uploadLpProject(formData) {
  return lpRequest({
    url: '/api/projects/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 删除主题
 * @param {string} type - 项目类型
 * @param {string} name - 主题名称
 */
export function deleteLpTheme(type, name) {
  return lpRequest({
    url: `/api/projects/theme/${type}/${name}`,
    method: 'delete'
  })
}

/**
 * 删除版本
 * @param {string} type - 项目类型
 * @param {string} theme - 主题名称
 * @param {string} version - 版本名称
 */
export function deleteLpVersion(type, theme, version) {
  return lpRequest({
    url: `/api/projects/version/${type}/${theme}/${version}`,
    method: 'delete'
  })
}

/**
 * 获取版本文件列表
 * @param {string} type - 项目类型
 * @param {string} theme - 主题名称
 * @param {string} version - 版本名称
 */
export function getLpVersionFiles(type, theme, version) {
  return lpRequest({
    url: `/api/projects/files/${type}/${theme}/${version}`,
    method: 'get'
  })
}

/**
 * 下载项目为ZIP
 * @param {string} type - 项目类型
 * @param {string} theme - 主题名称
 * @param {string} version - 版本名称
 */
export function downloadLpProject(type, theme, version) {
  return `${LP_API_URL}/api/projects/download/${type}/${theme}/${version}`
}

/**
 * 插入 Cloak 到项目
 * @param {Object} data - { cloakTheme: string, targetType: string, targetTheme: string, targetVersion: string }
 */
export function insertCloakToProject(data) {
  return lpRequest({
    url: '/api/projects/cloak/insert',
    method: 'post',
    data
  })
}

/**
 * 获取可用的 Cloak 列表
 * @param {string} cloakType - cloak 类型 (默认 'cloak')
 */
export function getCloakList(cloakType = 'cloak') {
  return lpRequest({
    url: '/api/projects/cloak/list',
    method: 'get',
    params: { type: cloakType }
  })
}
