// ef-落地页列表已合并进「网页管理 > 落地页列表」的 Tab 容器（landers-tabs.vue），此路由仅保留旧地址跳转
export default {
  path: '/main/ef-tracker/landers',
  redirect: { path: '/main/webpage/landers', query: { tab: 'eftracker' } }
}
