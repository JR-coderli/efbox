/**
 * ef-tracker 外部系统（query/写接口）配置。
 * host 与 domain-admin 的 ef-tracker service 保持一致，写接口文档见 QUERY_API.md。
 */
module.exports = {
  baseURL: 'https://s3.rapidsupplys.com',
  endpoints: {
    updatePreview: '/landers/update-preview'  // POST { id, preview_url } → 回写 ab_landers.preview_url
  }
}
