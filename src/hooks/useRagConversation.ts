import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  askStream,
  cancelConversation,
  deleteConversation,
  generateConversationId,
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
  const conversationId = ref<string | null>(
    localStorage.getItem(CONVERSATION_KEY),
  )
  const isGenerating = ref(false)
  const abortController = ref<AbortController | null>(null)
  let currentAiMessageId: string | null = null

  /** 确保拥有有效的会话 ID：未过期则复用，否则生成新 ID */
  function ensureConversationId() {
    if (conversationId.value) return

    const storedId = localStorage.getItem(CONVERSATION_KEY)
    const storedTs = localStorage.getItem(CONVERSATION_TS_KEY)

    // 已存且未过期 → 复用
    if (storedId && storedTs) {
      const age = Date.now() - parseInt(storedTs, 10)
      if (age < SESSION_TTL_MS) {
        conversationId.value = storedId
        return
      }
      // 已过期，清理旧数据
      localStorage.removeItem(CONVERSATION_KEY)
      localStorage.removeItem(CONVERSATION_TS_KEY)
    }

    // 未存或已过期 → 生成新 ID
    const id = generateConversationId()
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

    // 首次发送时自动生成/复用前端唯一 ID，并检查过期
    ensureConversationId()
    // 每次发送都刷新时间戳，活跃会话不会因超时被前端误判过期
    localStorage.setItem(CONVERSATION_TS_KEY, String(Date.now()))

    try {
      await askStream(
        {
          question,
          conversationId: conversationId.value!,
          maxResults: 5,
        },
        {
          onStart(_id: string) {
            // 不再保存后端返回的 conversationId，前端自行管理
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
