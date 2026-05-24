<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getHealth } from '../../services/rag'

const status = ref<'online' | 'offline' | 'checking'>('checking')
const statusText = {
  online: '服务正常',
  offline: '服务离线',
  checking: '检查中...',
}

let timer: ReturnType<typeof setInterval> | null = null

async function checkHealth() {
  try {
    const health = await getHealth()
    status.value = health.status === 'ok' || health.status === 'healthy' ? 'online' : 'offline'
  } catch {
    status.value = 'offline'
  }
}

onMounted(() => {
  checkHealth()
  timer = setInterval(checkHealth, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="chat-health" :class="status">
    <span class="dot" />
    <span class="label">{{ statusText[status] }}</span>
  </div>
</template>

<style scoped>
.chat-health {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}
.chat-health.online {
  color: #67c23a;
  background: #f0f9eb;
}
.chat-health.offline {
  color: #f56c6c;
  background: #fef0f0;
}
.chat-health.checking {
  color: #909399;
  background: #f4f4f5;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.online .dot {
  background: #67c23a;
}
.offline .dot {
  background: #f56c6c;
}
.checking .dot {
  background: #909399;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
