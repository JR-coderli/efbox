<template>
  <div class="lp-products">
    <el-tabs v-model="activeTab" class="lp-tabs">
      <el-tab-pane label="电商LP(zorfell)" name="zorfell">
        <LpZorfellPanel />
      </el-tab-pane>
      <el-tab-pane label="礼品清单LP(43490)" name="gift" lazy>
        <LpGiftPanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LpZorfellPanel from './c-cpns/LpZorfellPanel.vue'
import LpGiftPanel from './c-cpns/LpGiftPanel.vue'

const activeTab = ref('zorfell')
</script>

<style scoped>
.lp-tabs :deep(.el-tabs__header) { margin-bottom: 8px; }
</style>
