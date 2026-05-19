import type { Result } from '../types/api'
import type { Document, DocumentHealth, BatchUploadTask, BatchUploadParams } from '../types/document'

// Mock数据用于测试
const mockDocuments: Document[] = [
  { documentId: 'doc-001', filename: '测试文档1.pdf', segmentCount: 10 },
  { documentId: 'doc-002', filename: '技术文档.docx', segmentCount: 25 },
  { documentId: 'doc-003', filename: '产品说明.md', segmentCount: 8 },
]

let mockTaskId = 'task-001'
let mockTaskIndex = 0

/**
 * 获取文档列表 (Mock)
 */
export async function getDocuments(): Promise<Result<Document[]>> {
  return {
    data: mockDocuments,
    code: 1,
    msg: 'success'
  }
}

/**
 * 单文件上传 (Mock)
 */
export async function uploadDocument(file: File): Promise<Result<Document>> {
  const newDoc: Document = {
    documentId: `doc-${Date.now()}`,
    filename: file.name,
    segmentCount: Math.floor(Math.random() * 20) + 1,
  }
  mockDocuments.push(newDoc)
  return {
    data: newDoc,
    code: 1,
    msg: 'success'
  }
}

/**
 * 批量上传文档 (Mock)
 */
export async function batchUploadDocuments(_params: BatchUploadParams): Promise<Result<{ taskId: string }>> {
  mockTaskId = `task-${Date.now()}`
  mockTaskIndex = 0
  return {
    data: { taskId: mockTaskId },
    code: 1,
    msg: 'success'
  }
}

/**
 * 获取批量上传任务状态 (Mock)
 */
export async function getBatchUploadTask(taskId: string): Promise<Result<BatchUploadTask>> {
  const totalFiles = 3
  const progress = Math.min(mockTaskIndex, totalFiles)
  
  const task: BatchUploadTask = {
    taskId,
    status: mockTaskIndex >= totalFiles ? 'COMPLETED' : 'PROCESSING',
    totalFiles,
    successCount: progress,
    failureCount: 0,
    results: [],
    createdTime: new Date().toISOString(),
    completedTime: mockTaskIndex >= totalFiles ? new Date().toISOString() : undefined,
  }
  
  // 模拟进度推进
  if (mockTaskIndex < totalFiles) {
    mockTaskIndex++
  }
  
  return {
    data: task,
    code: 1,
    msg: 'success'
  }
}

/**
 * 删除文档 (Mock)
 */
export async function deleteDocument(documentId: string): Promise<Result<void>> {
  const index = mockDocuments.findIndex(d => d.documentId === documentId)
  if (index > -1) {
    mockDocuments.splice(index, 1)
  }
  return {
    data: undefined as void,
    code: 1,
    msg: 'success'
  }
}

/**
 * 获取文档服务健康状态 (Mock)
 */
export async function getDocumentHealth(): Promise<Result<DocumentHealth>> {
  return {
    data: { status: 'healthy', message: '服务正常运行' },
    code: 1,
    msg: 'success'
  }
}