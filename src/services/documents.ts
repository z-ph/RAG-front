import apiClient from '../core/apiClient'
import type { AxiosResponse } from 'axios'
import type { Result } from '../types/api'
import type { Document, DocumentHealth, BatchUploadTask, BatchUploadParams } from '../types/document'
import { USE_MOCK_DATA } from '../core/config'

// 根据配置导入Mock服务
import * as mockDocuments from './documents.mock'

// 包装函数：根据配置选择使用真实API或Mock数据
function chooseApi<T>(realApi: () => Promise<T>, mockApi: () => Promise<T>): Promise<T> {
  if (USE_MOCK_DATA) {
    return mockApi()
  }
  return realApi()
}

/**
 * 获取文档列表
 */
export async function getDocuments(): Promise<Result<Document[]>> {
  return chooseApi(
    async () => {
      const response = await apiClient.get('/api/documents') as AxiosResponse<Result<Document[]>>
      return response.data
    },
    () => mockDocuments.getDocuments()
  )
}

/**
 * 单文件上传
 */
export async function uploadDocument(file: File): Promise<Result<Document>> {
  return chooseApi(
    async () => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }) as AxiosResponse<Result<Document>>
      
      return response.data
    },
    () => mockDocuments.uploadDocument(file)
  )
}

/**
 * 批量上传文档
 */
export async function batchUploadDocuments(params: BatchUploadParams): Promise<Result<{ taskId: string }>> {
  return chooseApi(
    async () => {
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
      
      const response = await apiClient.post('/api/documents/batch-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }) as AxiosResponse<Result<{ taskId: string }>>
      
      return response.data
    },
    () => mockDocuments.batchUploadDocuments(params)
  )
}

/**
 * 获取批量上传任务状态
 */
export async function getBatchUploadTask(taskId: string): Promise<Result<BatchUploadTask>> {
  return chooseApi(
    async () => {
      const response = await apiClient.get(`/api/documents/batch-upload/${taskId}`) as AxiosResponse<Result<BatchUploadTask>>
      return response.data
    },
    () => mockDocuments.getBatchUploadTask(taskId)
  )
}

/**
 * 删除文档
 */
export async function deleteDocument(documentId: string): Promise<Result<void>> {
  return chooseApi(
    async () => {
      const response = await apiClient.delete(`/api/documents/${documentId}`) as AxiosResponse<Result<void>>
      return response.data
    },
    () => mockDocuments.deleteDocument(documentId)
  )
}

/**
 * 获取文档服务健康状态
 */
export async function getDocumentHealth(): Promise<Result<DocumentHealth>> {
  return chooseApi(
    async () => {
      const response = await apiClient.get('/api/documents/health') as AxiosResponse<Result<DocumentHealth>>
      return response.data
    },
    () => mockDocuments.getDocumentHealth()
  )
}