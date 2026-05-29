<template>
  <div class="login-page">
    <el-card class="login-card">
      <!-- Branding -->
      <div class="branding">
        <h1 class="app-name">RAG 知识库</h1>
        <p class="tagline">智能文档管理与知识检索平台</p>
      </div>

      <!-- Error display -->
      <el-alert
        v-if="errorMessage"
        type="error"
        :title="errorMessage"
        :closable="false"
        show-icon
        class="login-error"
      />

      <!-- Login form -->
      <el-form
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item prop="username" label="用户名">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            :disabled="loading"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password" label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            :disabled="loading"
            show-password
            size="large"
          />
        </el-form-item>

        <el-form-item class="submit-item">
          <el-button
            type="primary"
            :loading="loading"
            size="large"
            class="login-btn"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLogin } from '../../hooks/auth'
import { User, Lock } from '@element-plus/icons-vue'
import { ElForm, ElFormItem, ElInput, ElButton, ElCard, ElAlert } from 'element-plus'

const router = useRouter()
const { form, mutation } = useLogin()
const loading = mutation.isPending
const errorMessage = computed(() => mutation.error.value?.message ?? null)

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  await mutation.mutateAsync(form)
  router.push({ name: '/(nav)/' })
}

definePage({ meta: { title: '登录' } })
</script>

<style scoped>
/* ── Page layout ── */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24px 16px;
  background: var(--el-bg-color-page);
}

/* ── Card width ── */
.login-card {
  width: 100%;
  max-width: 400px;
}

/* ── Branding ── */
.branding {
  text-align: center;
  margin-bottom: 24px;
}

.app-name {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.tagline {
  margin: 0;
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-secondary);
}

/* ── Alert spacing ── */
.login-error {
  margin-bottom: 20px;
}

/* ── Submit ── */
.submit-item {
  margin-bottom: 0;
}

.login-btn {
  width: 100%;
}
</style>
