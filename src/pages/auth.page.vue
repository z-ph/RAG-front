<template>
    <div class="login-container">
        <div class="login-card">
            <h1 class="title">登录</h1>
            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <label for="username">用户名</label>
                    <input id="username" v-model="form.username" type="text" placeholder="请输入用户名"
                        autocomplete="username" />
                </div>
                <div class="form-group">
                    <label for="password">密码</label>
                    <input id="password" v-model="form.password" type="password" placeholder="请输入密码"
                        autocomplete="current-password" />
                </div>
                <button type="submit" class="login-btn" :disabled="loading">
                    {{ loading ? '登录中...' : '登录' }}
                </button>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '../core/apiClient'

const router = useRouter()
const loading = ref(false)

const form = reactive({
    username: '',
    password: ''
})
interface res<T> {
    data: T
    msg: string
    code: number
}
const handleLogin = async () => {
    if (!form.username || !form.password) {
        alert('请输入用户名和密码')
        return
    }

    loading.value = true
    try {
        const res = await apiClient.post('/api/auth/login', {
            username: form.username,
            password: form.password
        }) as { data: res<string> }
        localStorage.setItem('token', res.data.data)
        router.push('/')
    } catch (error) {
        alert('登录失败，请重试')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #f5f7fa;
}

.login-card {
    width: 360px;
    padding: 40px 32px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.title {
    margin: 0 0 28px;
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    color: #1a1a1a;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    color: #4a4a4a;
}

.form-group input {
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

.form-group input:focus {
    border-color: #409eff;
}

.login-btn {
    width: 100%;
    padding: 12px;
    margin-top: 8px;
    font-size: 15px;
    font-weight: 500;
    color: #fff;
    background: #409eff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.login-btn:hover {
    background: #66b1ff;
}

.login-btn:disabled {
    background: #a0cfff;
    cursor: not-allowed;
}
</style>
