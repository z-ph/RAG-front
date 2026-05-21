<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import ChatSources from './ChatSources.vue'
import type { ChatMessage } from '../../hooks/useRagConversation'

const props = defineProps<{
  messages: ChatMessage[]
}>()

const listRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

// 消息列表变化或最后一条消息流式更新时自动滚到底部
watch(
  () => {
    const last = props.messages[props.messages.length - 1]
    // 组合 length + content + sources，确保新增/流式追加/来源补全都能触发
    return `${props.messages.length}|${last?.content ?? ''}|${last?.sources?.length ?? 0}`
  },
  () => scrollToBottom(),
)
</script>

<template>
  <div ref="listRef" class="chat-messages">
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">💬</div>
      <p>开始你的 RAG 对话</p>
      <p class="empty-hint">在下方输入问题，AI 将结合知识库回答</p>
    </div>

    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message"
      :class="[msg.role, { loading: msg.isLoading }]"
    >
      <div class="avatar">
        {{ msg.role === 'user' ? 'U' : 'AI' }}
      </div>
      <div class="bubble">
        <div class="content">{{ msg.content }}</div>
        <div v-if="msg.isLoading" class="typing-indicator">
          <span class="dot" />
          <span class="dot" />
          <span class="dot" />
        </div>
        <ChatSources v-if="msg.sources && msg.sources.length > 0" :sources="msg.sources" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 8px;
}
.empty-icon {
  font-size: 48px;
}
.empty-hint {
  font-size: 13px;
}
.message {
  display: flex;
  gap: 12px;
  max-width: 85%;
}
.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.message.assistant {
  align-self: flex-start;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
}
.message.user .avatar {
  background: #409eff;
  color: #fff;
}
.message.assistant .avatar {
  background: #e6a23c;
  color: #fff;
}
.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}
.message.user .bubble {
  background: #ecf5ff;
  color: #303133;
  border-bottom-right-radius: 4px;
}
.message.assistant .bubble {
  background: #f5f7fa;
  color: #303133;
  border-bottom-left-radius: 4px;
}
.content {
  white-space: pre-wrap;
}
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}
.typing-indicator .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #909399;
  animation: typing-bounce 1.4s infinite ease-in-out;
}
.typing-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
