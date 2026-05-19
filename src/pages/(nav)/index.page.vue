<script setup lang="ts">
import ChatHealth from '../../components/chat/ChatHealth.vue'
import ChatMessages from '../../components/chat/ChatMessages.vue'
import ChatInput from '../../components/chat/ChatInput.vue'
import { useRagConversation } from '../../hooks/useRagConversation'

definePage({
  meta: {
    title: 'RAG 聊天',
  },
})

const { messages, isGenerating, sendMessage, stopGeneration, clearConversation } =
  useRagConversation()
</script>

<template>
  <div class="chat-page">
    <div class="chat-header">
      <ChatHealth />
    </div>
    <ChatMessages :messages="messages" />
    <ChatInput
      :is-generating="isGenerating"
      @send="(text: string) => sendMessage(text)"
      @stop="stopGeneration"
      @clear="clearConversation"
    />
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.chat-header {
  padding: 8px 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}
</style>
