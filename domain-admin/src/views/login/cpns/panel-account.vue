<template>
  <div class="panel-account">
    <el-form
      :model="account"
      :rules="accountRules"
      ref="formRef"
      class="login-form"
      @submit.prevent="onEnter"
    >
      <el-form-item prop="name">
        <el-input
          v-model="account.name"
          placeholder="账号"
          size="large"
          class="google-input"
          @keyup.enter="onEnter"
        >
          <template #prefix>
            <el-icon class="input-icon"><User /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item prop="password">
        <el-input
          v-model="account.password"
          type="password"
          placeholder="密码"
          size="large"
          show-password
          class="google-input"
          @keyup.enter="onEnter"
        >
          <template #prefix>
            <el-icon class="input-icon"><Lock /></el-icon>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import useLoginStore from '@/stores/login/login'
import { localCache } from '@/utils/cache'

const CACHE_NAME = 'name'
const CACHE_PASSWORD = 'password'


const md5 =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6ImNvZGVyd2h5IiwiaWF0'
const md6 = '1Uw9AwLspAxz3Fvz5yNoqjzQl0Kirzs4rlbf61E5L'
let userName = localCache.getCache(CACHE_NAME) ?? ''
let userPassword = localCache.getCache(CACHE_PASSWORD) ?? ''
const userName2 = userName.split(md5)[userName.split(md5).length - 1]
const userPassword2 = userPassword.split(md6)[userPassword.split(md6).length - 1]

const emit = defineEmits(['submit'])
function onEnter() {
  emit('submit')
}


const account = reactive({
  name: userName2 ? userName2 : '',
  password: userPassword2 ? userPassword2 : ''
})


const accountRules = {
  name: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度为3~20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^[a-z0-9]{3,}$/,
      message: '密码必须是3位以上的数字或字母',
      trigger: 'blur'
    }
  ]
}


const formRef = ref()
const loginStore = useLoginStore()

function loginAction(isRemPwd) {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      const name = account.name
      const password = account.password

      try {
        await loginStore.loginAccountAction({ name, password })
        if (isRemPwd) {
          localCache.setCache('name', account.name)
          localCache.setCache('password', account.password)
        } else {
          localCache.removeCache('name')
          localCache.removeCache('password')
        }
      } catch (error) {
        ElMessage.error('登录失败，请重试')
      }
    } else {
      ElMessage.error('帐号或密码不符合规则')
    }
  })
}

defineExpose({
  loginAction
})
</script>

<style lang="less" scoped>
.panel-account {
  width: 100%;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.el-form-item__error) {
    font-size: 12px;
    color: #ef4444;
    margin-top: 6px;
  }
}

.google-input {
  :deep(.el-input__wrapper) {
    border-radius: 8px;
    border: 1px solid #d1d5db;
    box-shadow: none;
    padding: 4px 12px;
    background-color: #fff;
    transition: border-color 0.2s ease;
    height: 44px;

    &:hover {
      border-color: #3b82f6;
    }

    &.is-focus {
      border-color: #3b82f6;
    }

    &.is-error {
      border-color: #ef4444;

      &:hover,
      &.is-focus {
        border-color: #ef4444;
      }
    }

    .el-input__inner {
      color: #1f2937;
      font-size: 14px;

      &::placeholder {
        color: #9ca3af;
      }
    }

    .el-input__prefix {
      display: flex;
      align-items: center;
    }

    .el-input__suffix {
      display: flex;
      align-items: center;
    }
  }

  .input-icon {
    font-size: 16px;
    color: #6b7280;
  }

  :deep(.el-input__password) {
    color: #6b7280;
    font-size: 16px;
    cursor: pointer;

    &:hover {
      color: #3b82f6;
    }
  }
}


@media (max-width: 480px) {
  .login-form {
    :deep(.el-form-item) {
      margin-bottom: 16px;
    }
  }

  .google-input {
    :deep(.el-input__wrapper) {
      height: 42px;
      padding: 4px 12px;
      border-radius: 6px;

      .el-input__inner {
        font-size: 14px;
      }
    }

    .input-icon {
      font-size: 15px;
    }
  }
}
</style>