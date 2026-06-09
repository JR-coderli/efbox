<template>
  <div class="main">
    <!-- 移动端遮罩层 -->
    <div
      v-if="isMobile && !isFold"
      class="mobile-overlay"
      @click="handleFoleChange(true)"
    ></div>

    <el-container class="main-content">
      <!-- 侧边栏：移动端使用抽屉模式，桌面端使用固定模式 -->
      <el-aside
        :class="['main-aside', { 'is-mobile': isMobile, 'is-open': !isFold }]"
        :width="isFold ? '64px' : '240px'"
      >
        <main-menu
          :is-fold="isFold"
          :is-mobile-open="isMobile && !isFold"
          @menu-item-click="handleMenuItemClick"
        />
      </el-aside>
      <el-container>
        <el-header v-show="isHeaderVisible" height="51px" style="border-bottom: 1px solid #e8eaed;">
          <main-header :is-fold="isFold" :is-mobile="isMobile" @fold-change="handleFoleChange" />
        </el-header>
        <el-main><router-view /></el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import MainHeader from '@/components/main-header/main-header.vue'
import MainMenu from '@/components/main-menu/main-menu.vue'
import useMainStore from '@/stores/main/main'
import { localCache } from '@/utils/cache'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'


const mainStore = useMainStore()

const isHeaderVisible = computed(() => mainStore.isHeaderVisible)


const SIDEBAR_FOLD_KEY = 'main/sidebarFold'



const isFold = ref(localCache.getCache(SIDEBAR_FOLD_KEY) ?? false)
const isMobile = ref(false)


function checkMobile() {
  isMobile.value = window.innerWidth <= 768

  if (isMobile.value && !isFold.value) {
    isFold.value = true
  }
}

function handleFoleChange(flag) {
  isFold.value = flag

  localCache.setCache(SIDEBAR_FOLD_KEY, flag)
}


watch(isFold, (newVal) => {
  localCache.setCache(SIDEBAR_FOLD_KEY, newVal)
})


function handleMenuItemClick() {
  if (isMobile.value) {
    isFold.value = true
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style lang="less" scoped>
.main {
  height: 100%;
  position: relative;


  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 99;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .main-content {
    height: 100%;

    .main-aside {
      overflow: visible;
      background-color: transparent;
      transition: none;
      z-index: 100;


      &.is-mobile {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 100;
        width: 240px !important;
        transform: translateX(-100%);
        transition: transform 0.3s ease;

        &.is-open {
          transform: translateX(0);
        }
      }
    }

    .el-main {

      background-color: #fdfdfd;


      overflow-x: hidden;
      overflow-y: visible;
    }
  }
}


@media (min-width: 769px) {
  .main .mobile-overlay {
    display: none;
  }
}


@media (max-width: 768px) {
  .main {
    .main-content {
      .el-aside {
        width: 240px !important;
      }

      .el-header {
        padding: 0 12px;
      }

      .el-main {
        padding: 12px;
      }
    }
  }
}


@media (max-width: 480px) {
  .main {
    .main-content {
      .el-header {
        padding: 0 8px;
      }

      .el-main {
        padding: 8px;
      }
    }
  }
}
</style>
