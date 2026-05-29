<template>
  <div class="main-header">
    <div class="menu-icon" @click="handleMenuIconClick">
      <svg viewBox="0 0 24 24">
        <!-- 折叠状态：显示汉堡菜单图标 -->
        <path v-if="isFold" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        <!-- 展开状态：显示左箭头图标 -->
        <path v-else d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
      </svg>
    </div>
    <div class="content">
      <header-crumb />
      <div class="content-right">
        <header-recent />
        <header-info />
      </div>
    </div>
  </div>
</template>

<script setup>
import HeaderInfo from './c-cpns/header-info.vue'
import HeaderCrumb from './c-cpns/header-crumb.vue'
import HeaderRecent from './c-cpns/header-recent.vue'


const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  },
  isFold: {
    type: Boolean,
    default: false
  }
})


const emit = defineEmits(['foldChange'])


function handleMenuIconClick() {

  emit('foldChange', !props.isFold)
}
</script>

<style lang="less" scoped>
.main-header {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  background-color: #fff;
  border-bottom: 1px solid #e8eaed;

  .menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    color: #5f6368;

    svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    &:hover {
      background-color: #f1f3f4;
    }
  }

  .content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 1;
    padding: 0 18px;
    min-width: 0;

    .content-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }
}


@media (max-width: 768px) {
  .main-header {
    .content {
      padding: 0 12px;


      :deep(.header-crumb) {
        display: none;
      }
    }
  }
}


@media (max-width: 480px) {
  .main-header {
    .menu-icon {
      width: 36px;
      height: 36px;
    }

    .content {
      padding: 0 8px;
    }
  }
}
</style>
