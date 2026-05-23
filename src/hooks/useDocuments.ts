import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { 
  getDocuments, 
  uploadDocument, 
  deleteDocument, 
  getDocumentHealth,
  batchUploadDocuments 
} from '../services/documents'
import type { BatchUploadParams, DocumentsResponse } from '../types/document'
import { ElMessage } from 'element-plus'

/**
 * 文档列表查询 Hook
 * @param enabled 是否启用查询（可选，用于控制未登录时不请求）
 */
export function useDocuments(enabled?: Ref<boolean>) {
  const query = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
    enabled: enabled ?? computed(() => true), // 默认启用，但可以控制
  })

  // 文档总数
  const total = computed(() => (query.data.value?.data as DocumentsResponse | undefined)?.total || 0)

  return {
    documents: computed(() => (query.data.value?.data as DocumentsResponse | undefined)?.documents || []),
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * 单文件上传 Hook
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      ElMessage.success('上传成功')
      // 刷新文档列表
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: any) => {
      // 解析后端返回的 HTTP 错误响应
      let errorMsg = '上传失败'
      
      // Axios HTTP 错误（如 400/500）
      if (error.response?.data) {
        const data = error.response.data
        if (data.error) {
          errorMsg = data.error
        } else if (data.message) {
          errorMsg = data.message
        } else if (typeof data === 'string') {
          errorMsg = data
        }
      } else if (error.message) {
        errorMsg = error.message
      }
      
      ElMessage.error(errorMsg)
    },
  })
  
  return {
    upload: mutation.mutate,
    uploadAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
  }
}

/**
 * 批量上传 Hook
 */
export function useBatchUpload() {
  const mutation = useMutation({
    mutationFn: (params: BatchUploadParams) => batchUploadDocuments(params),
onSuccess: (result) => {
      ElMessage.success(`批量上传任务已创建，任务ID: ${result.data.taskId}`)
    },
    onError: (error: any) => {
      // 解析后端返回的 HTTP 错误响应
      let errorMsg = '批量上传失败'
      
      if (error.response?.data) {
        const data = error.response.data
        if (data.error) {
          errorMsg = data.error
        } else if (data.message) {
          errorMsg = data.message
        } else if (typeof data === 'string') {
          errorMsg = data
        }
      } else if (error.message) {
        errorMsg = error.message
      }
      
      ElMessage.error(errorMsg)
    },
  })
  
return {
    batchUpload: mutation.mutate,
    batchUploadAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
    taskId: computed(() => mutation.data?.value?.data?.taskId),
  }
}

/**
 * 删除文档 Hook
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      ElMessage.success('删除成功')
      // 刷新文档列表
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: any) => {
      // 解析后端返回的 HTTP 错误响应
      let errorMsg = '删除失败'
      
      if (error.response?.data) {
        const data = error.response.data
        if (data.error) {
          errorMsg = data.error
        } else if (data.message) {
          errorMsg = data.message
        } else if (typeof data === 'string') {
          errorMsg = data
        }
      } else if (error.message) {
        errorMsg = error.message
      }
      
      ElMessage.error(errorMsg)
    },
  })
  
  return {
    delete: mutation.mutate,
    deleteAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  }
}

/**
 * 文档健康状态 Hook
 * @param enabled 是否启用查询（可选，用于控制未登录时不请求）
 */
export function useDocumentHealth(enabled?: Ref<boolean>) {
  const query = useQuery({
    queryKey: ['document-health'],
    queryFn: getDocumentHealth,
    refetchInterval: enabled ? computed(() => enabled.value ? 30000 : false) : 30000,
    enabled: enabled ?? computed(() => true),
  })
  
  return {
    health: computed(() => query.data.value?.data),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
