<template>
  <div class="login">
    <login-panel></login-panel>
  </div>
</template>

<script setup>
import LoginPanel from './cpns/login-panel.vue';
</script>

<style lang="less" scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background: #f0f2f5;
}


@media (max-width: 768px) {
  .login {
    padding: 20px;
    align-items: flex-start;
    padding-top: 8vh;
  }
}

@media (max-width: 480px) {
  .login {
    padding: 16px;
    padding-top: 6vh;
  }
}
</style>
