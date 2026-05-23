import apiClient from '../core/apiClient'
import type { AxiosResponse } from 'axios'
import type { Result } from '../types/api'
import type { Document, DocumentsResponse, DocumentHealth, BatchUploadTask, BatchUploadParams } from '../types/document'

/**
 * 获取文档列表
 */
export async function getDocuments(): Promise<Result<DocumentsResponse>> {
  const response = await apiClient.get('/api/documents') as AxiosResponse<DocumentsResponse>
  // 后端直接返回数据（非 Result 包装格式），手动包装成 Result 格式
  return {
    code: 1,
    data: response.data,
    msg: 'success'
  }
}

/**
 * 单文件上传
 */
export async function uploadDocument(file: File): Promise<Result<Document>> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post('/api/documents/upload', formData) as AxiosResponse<any>
  // 打印完整的原始响应报文，用于调试
  console.log('=== /api/documents/upload 原始响应报文 (未处理) ===')
  console.log('HTTP Status:', response.status)
  console.log('HTTP StatusText:', response.statusText)
  console.log('Response Headers:', response.headers)
  console.log('Response Data (原始):', response.data)
  console.log('=====================================')

  return response.data
}

/**
 * 批量上传文档
 */
export async function batchUploadDocuments(params: BatchUploadParams): Promise<Result<{ taskId: string }>> {
  const formData = new FormData()

  // 添加文件
  params.files.forEach((file) => {
    formData.append('files', file)
  })

  // 添加可选参数
  if (params.knowledgeBase) {
    formData.append('knowledgeBase', params.knowledgeBase)
  }
  if (params.category) {
    formData.append('category', params.category)
  }
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => {
      formData.append('tags', tag)
    })
  }

  const response = await apiClient.post('/api/documents/batch-upload', formData) as AxiosResponse<any>
  // 打印完整的原始响应报文，用于调试
  console.log('=== /api/documents/batch-upload 原始响应报文 (未处理) ===')
  console.log('HTTP Status:', response.status)
  console.log('HTTP StatusText:', response.statusText)
  console.log('Response Headers:', response.headers)
  console.log('Response Data (原始):', response.data)
  console.log('=====================================')

  // 后端返回 data 为 taskId 字符串，包装成 Result<{ taskId: string }> 格式
  return {
    code: response.data.code ?? 1,
    data: { taskId: response.data.data },
    msg: response.data.msg || 'success'
  }
}

/**
 * 获取批量上传任务状态
 */
export async function getBatchUploadTask(taskId: string): Promise<Result<BatchUploadTask>> {
  const response = await apiClient.get(`/api/documents/batch-upload/${taskId}`) as AxiosResponse<any>
  // 打印完整的原始响应报文，用于调试
  console.log(`=== /api/documents/batch-upload/${taskId} 原始响应报文 (未处理) ===`)
  console.log('HTTP Status:', response.status)
  console.log('HTTP StatusText:', response.statusText)
  console.log('Response Headers:', response.headers)
  console.log('Response Data (原始):', response.data)
  console.log('=====================================')

  return response.data
}

/**
 * 删除文档
 */
export async function deleteDocument(documentId: string): Promise<Result<void>> {
  const response = await apiClient.delete(`/api/documents/${documentId}`) as AxiosResponse<any>
  // 打印完整的原始响应报文，用于调试
  console.log(`=== DELETE /api/documents/${documentId} 原始响应报文 (未处理) ===`)
  console.log('HTTP Status:', response.status)
  console.log('HTTP StatusText:', response.statusText)
  console.log('Response Headers:', response.headers)
  console.log('Response Data (原始):', response.data)
  console.log('=====================================')

  return response.data
}

/**
 * 获取文档服务健康状态
 */
export async function getDocumentHealth(): Promise<Result<DocumentHealth>> {
  const response = await apiClient.get('/api/documents/health') as AxiosResponse<string>
  // 后端直接返回字符串（非 Result 包装格式），手动包装成 Result 格式
  return {
    code: 1,
    data: { status: 'healthy', message: response.data },
    msg: 'success'
  }
}