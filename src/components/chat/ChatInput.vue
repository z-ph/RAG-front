<script setup lang="ts">
import { ref } from 'vue'
import { ElButton } from 'element-plus'

const props = defineProps<{
  isGenerating: boolean
}>()

const emit = defineEmits<{
  send: [question: string]
  stop: []
  clear: []
}>()

const input = ref('')

function handleSend() {
  const text = input.value.trim()
  if (!text || props.isGenerating) return
  emit('send', text)
  input.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="chat-input">
    <div class="input-row">
      <textarea
        v-model="input"
        class="input-box"
        placeholder="输入你的问题..."
        :disabled="isGenerating"
        @keydown="handleKeydown"
      />
    </div>
    <div class="action-row">
      <ElButton
        size="small"
        :disabled="isGenerating"
        @click="$emit('clear')"
      >
        清空会话
      </ElButton>
      <div class="right-actions">
        <ElButton
          v-if="isGenerating"
          type="danger"
          @click="$emit('stop')"
        >
          停止
        </ElButton>
        <ElButton
          v-else
          type="primary"
          :disabled="!input.trim()"
          @click="handleSend"
        >
          发送
        </ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  border-top: 1px solid #e4e7ed;
  padding: 12px 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-row {
  width: 100%;
}
.input-box {
  width: 100%;
  min-height: 48px;
  max-height: 120px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
  box-sizing: border-box;
}
.input-box:focus {
  border-color: #409eff;
}
.input-box:disabled {
  background: #f5f7fa;
  cursor: not-allowed;
}
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.right-actions {
  display: flex;
  gap: 8px;
}
</style>
