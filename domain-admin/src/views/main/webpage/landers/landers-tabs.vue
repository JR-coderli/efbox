<template>
  <div class="tabs-page">
    <!-- 顶部 Tab 菜单栏（落地页自己的风格：白卡片 + 圆角胶囊按钮 + 系统图标，区别于日志页的下划线式）。
         页面入口由「网页管理 > landers列表」菜单项控制，进到页面后两个 Tab 人人都可用：
         有落地页列表菜单权限的角色自动获得 eftracker 落地页查看入口（各自按钮权限仍按权限码独立控制） -->
    <div class="tab-bar">
      <div
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-item"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <img class="tab-icon" :src="tab.icon" :alt="tab.label" />
        <span class="tab-label">{{ tab.label }}</span>
      </div>
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
import clickflareIcon from '@/assets/img/clickflare-icon.png'

// eftracker 图标：内联 SVG data URI（深色圆角方块 + EF 字样，与 clickflare 图标同规格）
const eftrackerIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231e293b' rx='8'/%3E%3Ctext x='32' y='44' font-family='Arial, sans-serif' font-size='28' font-weight='bold' fill='white' text-anchor='middle'%3EEF%3C/text%3E%3C/svg%3E"

const route = useRoute()
const router = useRouter()

// Tab 定义：key 用于 ?tab= 参数
const TABS = [
  { key: 'clickflare', label: 'clickflare落地页', icon: clickflareIcon },
  { key: 'eftracker', label: 'eftracker落地页', icon: eftrackerIcon }
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
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin: 8px 8px 0;
  padding: 8px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #5f6368;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;

  .tab-icon {
    display: block;
    width: 22px;
    height: 22px;
    border-radius: 5px;
  }

  &:hover {
    background-color: #f1f3f4;
    color: #202124;
  }

  &.is-active {
    background-color: #1a73e8;
    color: #fff;
    box-shadow: 0 1px 4px rgba(26, 115, 232, 0.4);

    &:hover {
      background-color: #1765cc;
      color: #fff;
    }
  }
}

.panel-holder {
  flex: 1;
  min-height: 0;
}
</style>
