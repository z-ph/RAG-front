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

/** 来源信息（适配后端返回格式） */
export interface Source {
  filename: string
  /** 显示标题，优先取 excerpt 中解析的标题，否则用 filename */
  title: string
  url?: string
  content?: string
  relevanceScore?: number
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
              case 'sources': {
                const rawSources: unknown[] = Array.isArray(data) ? data : (data.sources ?? [])
                const mapped = rawSources.map((s: unknown) => {
                  const item = s as Record<string, unknown>
                  const excerpt = String(item.excerpt ?? '')

                  // 从 excerpt 中提取【段落关键词：xxx】作为更具体的描述
                  const keywordsMatch = excerpt.match(/【段落关键词：(.+?)】/)
                  // 从 excerpt 中提取【标题：xxx】作为文档标题
                  const titleMatch = excerpt.match(/【标题：(.+?)】/)

                  const filename = String(item.filename ?? '')
                  const keywords = keywordsMatch?.[1]
                  const docTitle = titleMatch?.[1]

                  // 优先用关键词（更具体），其次用文档标题，最后用文件名
                  const displayTitle = keywords
                    ? `${filename} — ${keywords}`
                    : (docTitle ?? filename) || '未知来源'

                  return {
                    filename,
                    title: displayTitle,
                    url: item.url as string | undefined,
                    content: excerpt,
                    relevanceScore: item.relevanceScore as number | undefined,
                  }
                })
                handlers.onSources(mapped)
                break
              }
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

function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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

export async function deleteConversation(conversationId: string) {
  const response = await fetch(
    `${apiClientConfig.baseURL}/api/rag/conversations/${conversationId}`,
    { method: 'DELETE', headers: { ...getAuthHeaders() } },
  )
  if (!response.ok) {
    throw new Error(`删除会话失败: HTTP ${response.status}`)
  }
}

export async function getHealth() {
  try {
    const response = await fetch(`${apiClientConfig.baseURL}/api/rag/health`)
    const text = await response.text()
    return { status: text.includes('正常') ? 'ok' : 'error' }
  } catch {
    return { status: 'error' }
  }
}
