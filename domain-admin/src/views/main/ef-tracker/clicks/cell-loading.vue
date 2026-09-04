<template>
  <!-- 行级加载占位单元格：旋转圆环 + Loading 文字（每个可见列渲染一份） -->
  <span class="cell-loading">
    <svg class="cell-loading-ring" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="42 14" stroke-linecap="round" />
    </svg>
    <span class="cell-loading-text">Loading</span>
  </span>
</template>

<script setup>
// 纯展示组件：由各列模板在 row.__skeleton 时渲染
</script>

<style lang="less" scoped>
.cell-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #9aa0a6;
}

.cell-loading-ring {
  width: 18px;
  height: 18px;
  animation: cell-spin 0.9s linear infinite;
}

.cell-loading-text {
  font-size: 13px;
  color: #5f6368;
}

@keyframes cell-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
