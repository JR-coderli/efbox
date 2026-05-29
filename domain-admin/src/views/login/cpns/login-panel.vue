<template>
  <div class="login-panel">
    <!-- Logo 区域 -->
    <div class="logo-section">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="#1f2937" stroke-width="1.5" fill="none"/>
          <path d="M6 8H8M6 11H8" stroke="#1f2937" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="16" cy="9" r="1.5" fill="#3b82f6"/>
          <path d="M12 17L10 19H8V21H16V19H14L12 17Z" fill="#1f2937"/>
        </svg>
      </div>
      <h1 class="title">网页管理系统</h1>
      <p class="subtitle">请输入您的账号密码登录</p>
    </div>

    <!-- 登录表单卡片 -->
    <div class="card">
      <panel-account ref="accountRef" @submit="handleLoginBtnClick" />
    </div>

    <!-- 底部区域 -->
    <div class="controls">
      <label class="checkbox-wrapper">
        <input type="checkbox" v-model="isRemPwd" class="checkbox" />
        <span class="checkbox-label">记住密码</span>
      </label>
      <a href="javascript:;" class="forgot-link">忘记密码？</a>
    </div>

    <!-- 登录按钮 -->
    <button class="login-btn" @click="handleLoginBtnClick" :disabled="isLoading">
      <span v-if="!isLoading">登录</span>
      <span v-else>登录中...</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import PanelAccount from './panel-account.vue'
import { localCache } from '@/utils/cache'


const activeName = ref('account')

const isRemPwd = ref(localCache.getCache('isRemPwd') ?? false)

const accountRef = ref()

const isLoading = ref(false)

watch(isRemPwd, (newValue) => {
  localCache.setCache('isRemPwd', newValue)
})


async function handleLoginBtnClick() {
  if (activeName.value === 'account') {
    isLoading.value = true
    try {
      await accountRef.value?.loginAction(isRemPwd.value)
    } finally {
      isLoading.value = false
    }
  }
}
</script>

<style lang="less" scoped>
.login-panel {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.logo-section {
  text-align: center;
  margin-bottom: 28px;

  .logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    margin-bottom: 16px;

    svg {
      width: 36px;
      height: 36px;
    }
  }

  .title {
    margin: 0 0 8px 0;
    font-size: 26px;
    font-weight: 600;
    color: #1f2937;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  }

  .subtitle {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
  }
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 28px 24px;
  border: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 2px;

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;

    .checkbox {
      position: relative;
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
      appearance: none;
      border: 1px solid #d1d5db;
      border-radius: 3px;
      transition: all 0.2s ease;

      &:checked {
        background: #3b82f6;
        border-color: #3b82f6;

        &::after {
          content: '';
          position: absolute;
          left: 4px;
          top: 1px;
          width: 3px;
          height: 7px;
          border: solid #fff;
          border-width: 0 1.5px 1.5px 0;
          transform: rotate(45deg);
        }
      }

      &:hover {
        border-color: #3b82f6;
      }
    }

    .checkbox-label {
      margin-left: 8px;
      font-size: 14px;
      color: #4b5563;
    }
  }

  .forgot-link {
    font-size: 14px;
    color: #3b82f6;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: #2563eb;
      text-decoration: underline;
    }
  }
}

.login-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:active:not(:disabled) {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}


@media (max-width: 768px) {
  .login-panel {
    max-width: 100%;
  }

  .logo-section {
    margin-bottom: 24px;

    .logo {
      width: 56px;
      height: 56px;
      margin-bottom: 14px;

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .title {
      font-size: 24px;
    }

    .subtitle {
      font-size: 13px;
    }
  }

  .card {
    padding: 24px 20px;
  }

  .login-btn {
    height: 44px;
  }
}

@media (max-width: 480px) {
  .logo-section {
    margin-bottom: 20px;

    .logo {
      width: 52px;
      height: 52px;
      margin-bottom: 12px;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .title {
      font-size: 22px;
    }

    .subtitle {
      font-size: 13px;
    }
  }

  .card {
    padding: 20px 16px;
  }

  .controls {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;

    .forgot-link {
      align-self: flex-end;
    }
  }

  .login-btn {
    height: 44px;
    font-size: 15px;
  }
}
</style>