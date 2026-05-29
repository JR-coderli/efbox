<template>
  <div class="app">
    <el-config-provider :locale="zhCn">
      <router-view></router-view>
    </el-config-provider>
  </div>
</template>


<script setup>
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>


<style lang="less">
/* 全局样式：提升弹窗的层级 */
.el-image-viewer__wrapper {
  z-index: 10000 !important;
}

/* 消息确认框弹窗层级 - 设置为最高 */
.el-overlay.el-overlay--message-box {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 999999 !important;
}

.el-message-box__wrapper {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 1000000 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 确保弹窗在最顶层 */
.el-message-box {
  position: relative !important;
  z-index: 1000001 !important;
}
</style>

<style lang="less" scoped>
.app {
  width: 100vw;
  height: 100vh;
}
</style>