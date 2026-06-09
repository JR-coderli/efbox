/**
 * Clickflare API 配置
 */
module.exports = {
  baseURL: 'https://public-api.clickflare.io',
  apiKey: '406561a67ff45389757647c936537da98f6c89a11776566dbe6efc8241c357f9.da59c8abbd8fbf4af7c3a5c72612d871a30273fa',
  endpoints: {
    landers: '/api/landings',
    offers: '/api/offers',
    report: '/api/report',
    workspaces: '/api/workspaces'
  },
  sync: {
    intervalMinutes: 30 // 同步间隔（分钟）
  },
  screenshot: {
    dir: './uploads/lander_screenshots', // 截图保存目录
    maxConcurrent: 3, // 最多同时处理的截图任务数
    timeout: 30000, // 页面加载超时时间（毫秒）
    viewportWidth: 375, // 移动端视口宽度
    viewportHeight: 667, // 移动端视口高度
    query: '?w=1' // 截图时URL后拼接的查询字符串
  }
}
