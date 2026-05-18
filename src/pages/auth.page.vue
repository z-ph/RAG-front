<template>
  <el-card>
    <el-form @submit.prevent="handleLogin" :model="form" :rules="rules">
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" placeholder="请输入密码" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLogin } from '../hooks/auth'
import { ElForm, ElFormItem, ElInput, ElButton, ElCard } from 'element-plus'
const router = useRouter()

const { form, mutation } = useLogin()
const loading = mutation.isPending

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}
async function handleLogin() {
  await mutation.mutateAsync(form)
  router.push({ name: '/' })
}
</script>

<style scoped></style>
