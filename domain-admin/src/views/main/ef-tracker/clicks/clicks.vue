<template>
  <div class="tabs-page">
    <!-- 顶部 Tab 菜单栏（Material 风格：等宽分栏、选中蓝字+底部蓝色指示条、浅灰分隔线）。
         页面入口由「媒体点击」菜单项控制，进到页面后三个 Tab 人人都可用 -->
    <div class="tab-bar">
      <div
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-item"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >{{ tab.label }}</div>
    </div>

    <!-- 三个面板分属各自文件：懒挂载（首次切到才渲染，onMounted 才发请求）
         + v-show 保活（切走不销毁，切回保留筛选/分页状态、不重复请求） -->
    <clicks-panel v-if="visited.clicks" v-show="activeTab === 'clicks'" />
    <conversions-panel v-if="visited.conversions" v-show="activeTab === 'conversions'" />
    <error-logs-panel v-if="visited.errors" v-show="activeTab === 'errors'" />
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ClicksPanel from './clicks-panel.vue'
import ConversionsPanel from '../conversions/conversions.vue'
import ErrorLogsPanel from '../error-logs/error-logs.vue'

const route = useRoute()
const router = useRouter()

// Tab 定义：key 用于 ?tab= 参数
const TABS = [
  { key: 'clicks', label: '媒体点击' },
  { key: 'conversions', label: '转化回传' },
  { key: 'errors', label: '错误日志' }
]

const TAB_KEYS = TABS.map((t) => t.key)

// ?tab= 参数 → 合法 tab key；非法值/缺省 → 回退第一个 Tab
function normalizeTab(tab) {
  return TAB_KEYS.includes(tab) ? tab : 'clicks'
}

const activeTab = ref(normalizeTab(route.query.tab))
const visited = reactive({ clicks: false, conversions: false, errors: false })
visited[activeTab.value] = true

function switchTab(tab) {
  if (!tab || tab === activeTab.value) return
  activeTab.value = tab
  visited[tab] = true
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
    }
  }
)
</script>

<style lang="less" scoped>
.tabs-page {
  min-height: 100%;
}

.tab-bar {
  display: flex;
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
  border-bottom: 3px solid #e8eaed;
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
</style>
