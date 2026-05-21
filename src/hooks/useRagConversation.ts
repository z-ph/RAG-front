import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  askStream,
  cancelConversation,
  deleteConversation,
  type Source,
} from '../services/rag'

const CONVERSATION_KEY = 'rag-conversation-id'
const CONVERSATION_TS_KEY = 'rag-conversation-ts'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 分钟，对齐后端 rag.session-ttl-seconds:1800

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isLoading?: boolean
}

export function useRagConversation() {
  const messages = ref<ChatMessage[]>([])
  const conversationId = ref<string | null>(null)
  const isGenerating = ref(false)
  const abortController = ref<AbortController | null>(null)
  let currentAiMessageId: string | null = null

  function getStoredConversationId(): string | null {
    const storedId = localStorage.getItem(CONVERSATION_KEY)
    const storedTs = localStorage.getItem(CONVERSATION_TS_KEY)
    if (storedId && storedTs) {
      const age = Date.now() - parseInt(storedTs, 10)
      if (age < SESSION_TTL_MS) {
        return storedId
      }
      // 已过期，清理
      localStorage.removeItem(CONVERSATION_KEY)
      localStorage.removeItem(CONVERSATION_TS_KEY)
    }
    return null
  }

  function persistConversationId(id: string) {
    conversationId.value = id
    localStorage.setItem(CONVERSATION_KEY, id)
    localStorage.setItem(CONVERSATION_TS_KEY, String(Date.now()))
  }

  function finishMessage(errorMessage?: string) {
    if (currentAiMessageId) {
      const aiMsg = messages.value.find(m => m.id === currentAiMessageId)
      if (aiMsg) {
        aiMsg.isLoading = false
        if (errorMessage !== undefined) {
          aiMsg.content = errorMessage
        }
      }
    }
    isGenerating.value = false
    abortController.value = null
    currentAiMessageId = null
  }

  function clearConversationId() {
    conversationId.value = null
    localStorage.removeItem(CONVERSATION_KEY)
    localStorage.removeItem(CONVERSATION_TS_KEY)
  }

  async function sendMessage(question: string) {
    if (!question.trim() || isGenerating.value) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    }
    messages.value.push(userMessage)

    const aiMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      isLoading: true,
    }
    messages.value.push(aiMessage)
    // 从响应式数组中取代理对象，后续所有修改都通过它，确保 Vue 检测变化
    const msg = messages.value[messages.value.length - 1]
    currentAiMessageId = aiMessage.id

    isGenerating.value = true
    const controller = new AbortController()
    abortController.value = controller

    // 从 localStorage 读取未过期的会话 ID，没有则传 null 让后端分配
    const effectiveId = getStoredConversationId()

    try {
      await askStream(
        {
          question,
          conversationId: effectiveId,       // 首次为 null，后续为复用 ID
          maxResults: 5,
        },
        {
          onStart(id: string) {
            persistConversationId(id)         // 保存后端分配的 ID
          },
          onDelta(content: string) {
            msg.content += content
          },
          onSources(sources: Source[]) {
            msg.sources = sources
          },
          onComplete() {
            finishMessage()
          },
          onCancelled() {
            finishMessage()
          },
          onError(message: string) {
            finishMessage(message || '请求失败')
            ElMessage.error(message || '请求失败')
          },
        },
        controller.signal,
      )
    } catch (err: unknown) {
      // 如果 currentAiMessageId 已被 stopGeneration 清掉，说明是主动停止
      if (currentAiMessageId === null) {
        isGenerating.value = false
        return
      }
      finishMessage('网络错误，请重试')
      ElMessage.error('网络错误，请重试')
    }
  }

  async function stopGeneration() {
    const controller = abortController.value
    if (!controller) return

    finishMessage()
    controller.abort()

    // 通知服务端停止生成（尽最大努力，不阻塞）
    if (conversationId.value) {
      cancelConversation(conversationId.value).catch(() => {})
    }
  }

  async function clearConversation() {
    if (conversationId.value) {
      try {
        await deleteConversation(conversationId.value)
      } catch {
        // 删除失败时仍清空本地状态
      }
    }
    finishMessage()
    messages.value = []
    clearConversationId()
  }

  return {
    messages,
    conversationId,
    isGenerating,
    sendMessage,
    stopGeneration,
    clearConversation,
  }
}
