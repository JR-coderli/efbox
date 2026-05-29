<template>
  <div class="header-recent" v-if="recentMenus.length > 0">
    <span class="recent-label">最近访问:</span>
    <div class="recent-list">
      <div
        v-for="item in recentMenus"
        :key="item.id"
        class="recent-item"
        :class="{ 'is-active': isActive(item) }"
        @click="handleClick(item)"
      >
        <span class="recent-icon">
          <component :is="getIcon(item.icon)" />
        </span>
        <span class="recent-name">{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import useLoginStore from '@/stores/login/login'
import {
  Monitor,
  Cpu,
  User,
  ChromeFilled,
  Setting,
  Tickets,
  Lock
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const loginStore = useLoginStore()
const userMenus = loginStore.userMenus


const iconMap = {
  Monitor,
  Cpu,
  User,
  ChromeFilled,
  Setting,
  Tickets,
  Lock
}

function getIcon(iconName) {
  return iconMap[iconName] || User
}


const recentMenus = ref([])
const MAX_RECENT = 3


function loadRecentMenus() {
  try {
    const stored = localStorage.getItem('recentMenus')
    if (stored) {
      const ids = JSON.parse(stored)
      const allMenus = getAllMenus(userMenus || [])
      return ids
        .map(id => allMenus.find(m => m.id === id))
        .filter(Boolean)
        .slice(0, MAX_RECENT)
    }
  } catch (e) {
    console.error('Failed to load recent menus:', e)
  }
  return []
}


function getAllMenus(menus) {
  const result = []
  menus.forEach(menu => {
    result.push(menu)
    if (menu.children && menu.children.length > 0) {
      result.push(...getAllMenus(menu.children))
    }
  })
  return result
}


function saveRecentMenus(ids) {
  try {
    localStorage.setItem('recentMenus', JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save recent menus:', e)
  }
}


function addRecentMenu(menu) {
  if (!menu || !menu.id) return

  const ids = recentMenus.value.map(m => m.id)

  const newIds = [menu.id, ...ids.filter(id => id !== menu.id)].slice(0, MAX_RECENT)
  const allMenus = getAllMenus(userMenus || [])
  recentMenus.value = newIds
    .map(id => allMenus.find(m => m.id === id))
    .filter(Boolean)

  saveRecentMenus(newIds)
}


function isActive(item) {
  return route.path === item.url
}


function handleClick(item) {
  if (item.url) {
    router.push(item.url)
  }
}


watch(() => route.path, (newPath) => {
  if (newPath) {
    const allMenus = getAllMenus(userMenus || [])
    const currentMenu = allMenus.find(m => m.url === newPath)
    if (currentMenu) {
      addRecentMenu(currentMenu)
    }
  }
}, { immediate: true })

onMounted(() => {
  recentMenus.value = loadRecentMenus()
})
</script>

<style lang="less" scoped>
.header-recent {
  display: flex;
  align-items: center;
  gap: 12px;

  .recent-label {
    font-size: 13px;
    color: #5f6368;
    white-space: nowrap;
  }

  .recent-list {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 16px;
    background-color: #f1f3f4;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      background-color: #e8eaed;
    }

    &.is-active {
      background-color: #e8f0fe;

      .recent-icon {
        color: #1a73e8;
      }

      .recent-name {
        color: #1a73e8;
        font-weight: 500;
      }
    }

    .recent-icon {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #5f6368;
    }

    .recent-name {
      font-size: 13px;
      color: #202124;
    }
  }
}


@media (max-width: 768px) {
  .header-recent {
    display: none;
  }
}
</style>
