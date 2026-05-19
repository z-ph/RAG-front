import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch, type Ref } from 'vue'
import { getBatchUploadTask } from '../services/documents'
import { ElMessage } from 'element-plus'

/**
 * 批量上传任务轮询 Hook
 * @param taskId 任务ID
 * @param enabled 是否启用轮询（可选，默认为true）
 */
export function useBatchUploadTaskPolling(taskId: Ref<string | null>, enabled?: Ref<boolean>) {
  const queryClient = useQueryClient()
  
  // 是否应该轮询（状态为COMPLETED或FAILED时停止）
  const shouldPoll = ref(true)
  
  const query = useQuery({
    queryKey: ['batch-upload-task', taskId],
    queryFn: () => getBatchUploadTask(taskId.value!),
    enabled: computed(() => !!taskId.value && (enabled?.value ?? true) && shouldPoll.value),
    refetchInterval: computed(() => shouldPoll.value ? 2000 : false), // 2秒轮询一次
  })
  
  // 监听任务状态，停止轮询
  watch(
    () => query.data.value?.data?.status,
    (status) => {
      if (status === 'COMPLETED' || status === 'FAILED') {
        shouldPoll.value = false
        
        // 任务完成时刷新文档列表
        queryClient.invalidateQueries({ queryKey: ['documents'] })
        
        if (status === 'COMPLETED') {
          const task = query.data.value?.data
          ElMessage.success(`批量上传完成: 成功 ${task?.successCount}个, 失败 ${task?.failureCount}个`)
        } else {
          ElMessage.error('批量上传任务失败')
        }
      }
    }
  )
  
  // 手动停止轮询
  const stopPolling = () => {
    shouldPoll.value = false
  }
  
  // 重新开始轮询
  const startPolling = () => {
    shouldPoll.value = true
    query.refetch()
  }
  
  return {
    task: computed(() => query.data.value?.data),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isPolling: computed(() => shouldPoll.value && !!taskId.value),
    progress: computed(() => {
      const task = query.data.value?.data
      if (!task) return 0
      if (task.status === 'COMPLETED') return 100
      if (task.status === 'FAILED') return -1
      const processed = task.successCount + task.failureCount
      return Math.round((processed / task.totalFiles) * 100)
    }),
    statusText: computed(() => {
      const task = query.data.value?.data
      if (!task) return '等待中'
      switch (task.status) {
        case 'PENDING':
          return '等待中'
        case 'PROCESSING':
          return '处理中'
        case 'COMPLETED':
          return '已完成'
        case 'FAILED':
          return '失败'
        default:
          return '未知'
      }
    }),
    stopPolling,
    startPolling,
    refetch: query.refetch,
  }
}
