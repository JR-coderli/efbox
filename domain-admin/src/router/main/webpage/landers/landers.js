// 落地页列表合并页：tab 壳组件（clickflare落地页 / eftracker落地页），面板为同目录 landers.vue 和 ef-tracker 侧 landers.vue
export default {
  path: '/main/webpage/landers',
  component: () => import('@/views/main/webpage/landers/landers-tabs.vue'),
  meta: { title: "落地页列表" }
}
