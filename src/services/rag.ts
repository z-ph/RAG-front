import { getToken } from '../utils/token'
import { apiClientConfig } from '../core/config'

/**
 * 生成唯一会话 ID：浏览器指纹 + 时间戳
 * 指纹基于 navigator、screen 等环境特征，确保同一浏览器生成固定前缀
 */
export function generateConversationId(): string {
  const fp = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.language,
    navigator.hardwareConcurrency ?? '',
  ].join('|')

  let hash = 0
  for (let i = 0; i < fp.length; i++) {
    hash = ((hash << 5) - hash) + fp.charCodeAt(i)
    hash |= 0
  }
  const fpHash = Math.abs(hash).toString(36).slice(0, 6)
  const timestamp = Date.now().toString(36)

  return `conv-${fpHash}-${timestamp}`
}

export interface Source {
  title: string
  url?: string
  content?: string
}

export interface AskStreamParams {
  question: string
  conversationId: string
  maxResults?: number
}

export interface SSEEventHandlers {
  onStart: (conversationId: string) => void
  onDelta: (content: string) => void
  onSources: (sources: Source[]) => void
  onComplete: () => void
  onCancelled: () => void
  onError: (message: string) => void
}

export interface HealthStatus {
  status: string
  [key: string]: unknown
}

/**
 * 发送问题并通过 SSE 流式接收回答
 * 使用原生 fetch + ReadableStream 处理 POST 请求的 SSE 流
 */
export async function askStream(
  params: AskStreamParams,
  handlers: SSEEventHandlers,
  signal?: AbortSignal,
) {
  const response = await fetch(`${apiClientConfig.baseURL}/api/rag/ask/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      question: params.question,
      conversationId: params.conversationId,
      maxResults: params.maxResults ?? 5,
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = ''

  while (true) {
    const { done, value } = await reader.read()

    if (value) {
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // 兼容 event:xxx 和 event: xxx 两种格式
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim()
        } else if (trimmed.startsWith('data:')) {
          const raw = trimmed.slice(5).trim()
          try {
            const data = JSON.parse(raw)
            switch (currentEvent) {
              case 'start':
                handlers.onStart(data.conversationId)
                break
              case 'delta':
                handlers.onDelta(data.content ?? data ?? '')
                break
              case 'sources':
                handlers.onSources(Array.isArray(data) ? data : (data.sources ?? []))
                break
              case 'complete':
                handlers.onComplete()
                break
              case 'cancelled':
                handlers.onCancelled()
                break
              case 'error':
                handlers.onError(data.message || 'Unknown error')
                break
            }
          } catch {
            // data 不是 JSON，作为纯文本内容处理（对应 delta 逐字推送）
            if (currentEvent === 'delta') {
              handlers.onDelta(raw)
            }
          }
        }
      }
    }

    if (done) break
  }

  // 流结束时兜底重置状态，处理后端不显式发送 complete 事件的情况
  handlers.onComplete()
}

/** 获取认证头 */
function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** 停止 AI 生成 */
export async function cancelConversation(conversationId: string) {
  const response = await fetch(
    `${apiClientConfig.baseURL}/api/rag/conversations/${conversationId}/cancel`,
    { method: 'POST', headers: { ...getAuthHeaders() } },
  )
  // 404 表示后端已无进行中任务（SSE 断开时自动取消，或已提前结束），属正常情况
  if (response.status === 404) return
  if (!response.ok) {
    throw new Error(`取消生成失败: HTTP ${response.status}`)
  }
}

/** 删除会话 */
export async function deleteConversation(conversationId: string) {
  const response = await fetch(
    `${apiClientConfig.baseURL}/api/rag/conversations/${conversationId}`,
    { method: 'DELETE', headers: { ...getAuthHeaders() } },
  )
  if (!response.ok) {
    throw new Error(`删除会话失败: HTTP ${response.status}`)
  }
}

/** 获取 RAG 服务健康状态 */
export async function getHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${apiClientConfig.baseURL}/api/rag/health`)
    const text = await response.text()
    return { status: text.includes('正常') ? 'ok' : 'error' }
  } catch {
    return { status: 'error' }
  }
}
