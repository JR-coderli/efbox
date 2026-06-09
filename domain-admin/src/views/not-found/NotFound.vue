<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="not-found-text">
        <h1 class="error-code">404</h1>
        <h2 class="not-found-title">抱歉，页面走丢了</h2>
        <p class="not-found-desc">你访问的页面不存在或已被移除，请检查地址是否正确</p>
        <div class="not-found-actions">
          <el-button type="primary" size="large" @click="goHome">返回首页</el-button>
          <el-button size="large" @click="goBack">返回上页</el-button>
        </div>
      </div>
      <img src="@/assets/img/notfound.gif" alt="页面未找到" class="not-found-img" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/main')
}

function goBack() {
  router.back()
}
</script>

<style lang="less" scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #fff;
  padding: 40px 48px;
  box-sizing: border-box;
  overflow: hidden;

  .not-found-content {
    display: flex;
    align-items: center;
    gap: 80px;
    max-width: 900px;
    width: 100%;
  }

  .not-found-text {
    flex: 1;
    min-width: 0;
  }

  .error-code {
    font-size: 72px;
    font-weight: 700;
    color: #4a8af4;
    margin: 0 0 8px;
    line-height: 1;
  }

  .not-found-title {
    font-size: 20px;
    font-weight: 500;
    color: #1f2937;
    margin: 0 0 12px;
  }

  .not-found-desc {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 32px;
    line-height: 1.6;
  }

  .not-found-actions {
    display: flex;
    gap: 12px;
  }

  .not-found-img {
    width: 480px;
    height: auto;
    flex-shrink: 0;
  }
}


@media screen and (max-width: 768px) {
  .not-found {
    padding: 32px 20px;

    .not-found-content {
      flex-direction: column-reverse;
      gap: 32px;
      text-align: center;
    }

    .not-found-text {
      align-items: center;
    }

    .error-code {
      font-size: 56px;
    }

    .not-found-img {
      width: 300px;
    }

    .not-found-actions {
      justify-content: center;
    }
  }
}
</style>
