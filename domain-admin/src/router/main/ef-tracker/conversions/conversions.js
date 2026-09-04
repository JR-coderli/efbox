// 转化回传已合并进「媒体点击」合并页（clicks.vue 的 Tab 容器），此路由仅保留旧地址跳转
export default {
  path: '/main/ef-tracker/conversions',
  redirect: { path: '/main/ef-tracker/clicks', query: { tab: 'conversions' } }
}
