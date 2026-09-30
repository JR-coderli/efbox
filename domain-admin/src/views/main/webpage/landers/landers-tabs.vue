<template>
  <div class="tabs-page">
    <!-- 系统切换按钮不单独占一行：通过 #tabs 插槽嵌进各面板自己的搜索栏行里
         （搜索输入框 | 切换按钮 | 工具按钮）。每个面板只显示一个「去往对方系统」的
         带箭头按钮，不显示自身（人在本系统，自身按钮无意义）。
         页面入口由「网页管理 > landers列表」菜单项控制，进到页面后两侧人人可切：
         有落地页列表菜单权限的角色自动获得 eftracker 落地页查看入口（各自按钮权限仍按权限码独立控制） -->
    <!-- 两个面板分属各自文件：懒挂载（首次切到才渲染，onMounted 才发请求）
         + v-show 保活（切走不销毁，切回保留筛选/分页状态、不重复请求） -->
    <div class="panel-holder" v-if="visited.clickflare" v-show="activeTab === 'clickflare'">
      <clickflare-panel>
        <template #tabs>
          <div class="tab-bar">
            <div class="tab-item" title="切换到 eftracker 落地页" @click="switchTab('eftracker')">
              <img class="tab-icon" :src="eftrackerIcon" alt="eftracker" />
              <span class="tab-label">eftracker</span>
              <el-icon class="tab-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </template>
      </clickflare-panel>
    </div>
    <div class="panel-holder" v-if="visited.eftracker" v-show="activeTab === 'eftracker'">
      <eftracker-panel>
        <template #tabs>
          <div class="tab-bar">
            <div class="tab-item" title="切换到 clickflare 落地页" @click="switchTab('clickflare')">
              <el-icon class="tab-arrow"><ArrowLeft /></el-icon>
              <img class="tab-icon" :src="clickflareIcon" alt="clickflare" />
              <span class="tab-label">clickflare</span>
            </div>
          </div>
        </template>
      </eftracker-panel>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { localCache } from '@/utils/cache'
import ClickflarePanel from './landers.vue'
import EftrackerPanel from '@/views/main/ef-tracker/landers/landers.vue'
import clickflareIcon from '@/assets/img/clickflare-icon.png'

// eftracker 图标：内联 SVG data URI（深色圆角方块 + EF 字样，与 clickflare 图标同规格）
const eftrackerIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231e293b' rx='8'/%3E%3Ctext x='32' y='44' font-family='Arial, sans-serif' font-size='28' font-weight='bold' fill='white' text-anchor='middle'%3EEF%3C/text%3E%3C/svg%3E"

const route = useRoute()
const router = useRouter()

// Tab key 定义：用于 ?tab= 参数与 localStorage 记忆
const TAB_KEYS = ['clickflare', 'eftracker']

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

/* tab 胶囊组：嵌在面板搜索栏行内（#tabs 插槽），无需卡片容器和定位 */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 500;
  color: #5f6368;
  background: #fff;
  border: 1px solid #dadce0;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;

  .tab-icon {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }

  .tab-arrow {
    font-size: 14px;
  }

  &:hover {
    background-color: #f8f9fa;
    color: #1a73e8;
    border-color: #1a73e8;

    .tab-arrow {
      transform: translateX(1px);
    }
  }
}

.panel-holder {
  flex: 1;
  min-height: 0;
}
</style>
