<template>
  <div class="tabs-page">
    <!-- 顶部 Tab 菜单栏（Material 风格，与 ef-归因系统「媒体点击」页一致）。
         页面入口由「网页管理 > landers列表」菜单项控制，进到页面后两个 Tab 人人都可用：
         有落地页列表菜单权限的角色自动获得 eftracker 落地页查看入口（各自按钮权限仍按权限码独立控制） -->
    <div class="tab-bar">
      <div
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-item"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >{{ tab.label }}</div>
    </div>

    <!-- 两个面板分属各自文件：懒挂载（首次切到才渲染，onMounted 才发请求）
         + v-show 保活（切走不销毁，切回保留筛选/分页状态、不重复请求）。
         panel-holder 撑满剩余高度，保证面板内部 height:100% 的滚动布局不塌 -->
    <div class="panel-holder" v-if="visited.clickflare" v-show="activeTab === 'clickflare'">
      <clickflare-panel />
    </div>
    <div class="panel-holder" v-if="visited.eftracker" v-show="activeTab === 'eftracker'">
      <eftracker-panel />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { localCache } from '@/utils/cache'
import ClickflarePanel from './landers.vue'
import EftrackerPanel from '@/views/main/ef-tracker/landers/landers.vue'

const route = useRoute()
const router = useRouter()

// Tab 定义：key 用于 ?tab= 参数
const TABS = [
  { key: 'clickflare', label: 'clickflare落地页' },
  { key: 'eftracker', label: 'eftracker落地页' }
]

const TAB_KEYS = TABS.map((t) => t.key)

// 记住用户最后一次所在的 Tab（localStorage，跨会话保留）：
// 再次从菜单进入落地页列表且 URL 未指定 ?tab= 时，直接回到上次离开的 Tab
const LAST_TAB_KEY = 'landers_tabs_last_tab'
function readLastTab() {
  const saved = localCache.getCache(LAST_TAB_KEY)
  return TAB_KEYS.includes(saved) ? saved : 'clickflare'
}

// ?tab= 参数 → 合法 tab key；优先级：URL 显式指定 > 上次记住的 > 第一个 Tab
function normalizeTab(tab) {
  return TAB_KEYS.includes(tab) ? tab : readLastTab()
}

const activeTab = ref(normalizeTab(route.query.tab))
localCache.setCache(LAST_TAB_KEY, activeTab.value)
const visited = reactive({ clickflare: false, eftracker: false })
visited[activeTab.value] = true

function switchTab(tab) {
  if (!tab || tab === activeTab.value) return
  activeTab.value = tab
  visited[tab] = true
  localCache.setCache(LAST_TAB_KEY, tab) // 记住最后一次选择的 Tab
  // 同步到 ?tab=（replace 不产生历史记录；刷新/分享链接/旧路径 redirect 都能还原 Tab）
  router.replace({ query: { ...route.query, tab } })
}

// 浏览器前进/后退改变 ?tab= 时跟随切换
watch(
  () => route.query.tab,
  (tab) => {
    const t = normalizeTab(tab)
    if (t !== activeTab.value) {
      activeTab.value = t
      visited[t] = true
      localCache.setCache(LAST_TAB_KEY, t)
    }
  }
)
</script>

<style lang="less" scoped>
.tabs-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  flex-shrink: 0;
  margin: 8px 8px 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.tab-item {
  position: relative;
  flex: 1;
  height: 48px;
  line-height: 48px;
  text-align: center;
  font-size: 14px;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  color: #5f6368;
  cursor: pointer;
  user-select: none;
  border-bottom: 3px solid transparent;
  transition: color 0.2s;

  &:not(:last-child) {
    border-right: 1px solid #e8eaed;
  }

  &:hover {
    color: #202124;
  }

  &.is-active {
    color: #1a73e8;
    font-weight: 500;
    border-bottom-color: #1a73e8;

    &:hover {
      color: #1a73e8;
    }
  }
}

.panel-holder {
  flex: 1;
  min-height: 0;
}
</style>
