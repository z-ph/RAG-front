/**
 * 文档相关类型定义
 */

/**
 * 文档实体
 */
export interface Document {
  documentId: string
  filename: string
  segmentCount: number
  // 可能还有其他字段，根据实际API返回扩展
}

/**
 * 文档健康状态
 */
export interface DocumentHealth {
  status: 'healthy' | 'unhealthy'
  message?: string
}

/**
 * 批量上传任务状态
 */
export type BatchUploadTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/**
 * 批量上传任务结果项
 */
export interface BatchUploadResult {
  filename: string
  success: boolean
  documentId?: string
  errorMessage?: string
}

/**
 * 批量上传任务
 */
export interface BatchUploadTask {
  taskId: string
  status: BatchUploadTaskStatus
  totalFiles: number
  successCount: number
  failureCount: number
  results: BatchUploadResult[]
  errorMessage?: string
  createdTime: string
  completedTime?: string
}

/**
 * 批量上传参数
 */
export interface BatchUploadParams {
  files: File[]
  knowledgeBase?: string
  category?: string
  tags?: string[]
}