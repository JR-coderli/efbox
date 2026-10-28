/**
 * LP 公开域名守卫
 *
 * 用途:zorfell.com 是专门暴露给投放 LP 页面调用接口的公开域名,
 * 该域名上一律只放行 /lp/ 前缀的公开接口,其余路径(后台登录、
 * 管理接口、上传目录等)全部返回 404,避免后台管理系统在公开域名上暴露。
 *
 * 其他域名(后台管理域名)不做任何限制,行为与没有此中间件时完全一致。
 */

// LP 公开域名(支持子域名,如 cdn.zorfell.com)
const LP_PUBLIC_DOMAIN = 'zorfell.com'

// 该域名上允许访问的路径前缀
// /lp/        —— LP 产品数据公开接口(public.lp.router.js)
// /lp/uploads —— LP 媒体文件(图片/视频)
// 注意 /lp/manage(后台管理接口)虽也在 /lp/ 下,但在公开域名上一律禁止
const LP_ALLOWED_PREFIXES = ['/lp/']
const LP_DENIED_PREFIXES = ['/lp/manage']


function getHostname(ctx) {
  // 部署在反向代理后面时,原始域名通常在 x-forwarded-host;取第一个并去掉端口
  const forwarded = ctx.get('x-forwarded-host')
  const host = (forwarded || ctx.host || '').split(',')[0].trim().toLowerCase()
  return host.split(':')[0]
}


function isLpPublicDomain(hostname) {
  return hostname === LP_PUBLIC_DOMAIN || hostname.endsWith('.' + LP_PUBLIC_DOMAIN)
}


function isPathAllowed(path) {
  if (LP_DENIED_PREFIXES.some((prefix) => path.startsWith(prefix))) return false
  return LP_ALLOWED_PREFIXES.some((prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix))
}


function lpHostGuard(ctx, next) {
  const hostname = getHostname(ctx)
  if (isLpPublicDomain(hostname) && !isPathAllowed(ctx.path)) {
    ctx.status = 404
    ctx.body = 'Not Found'
    return Promise.resolve()
  }
  return next()
}


module.exports = lpHostGuard
