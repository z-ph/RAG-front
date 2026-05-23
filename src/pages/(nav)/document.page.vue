<template>
  <div class="document-page">
    <!-- 未登录提示 -->
    <el-card v-if="!isLoggedIn" class="login-prompt">
      <el-result icon="warning" title="请先登录后查看和管理文档">
        <template #extra>
          <el-button type="primary" @click="goToLogin">去登录</el-button>
        </template>
      </el-result>
    </el-card>

    <!-- 登录后的文档管理界面 -->
    <div v-else class="document-content">
      <!-- 健康状态 -->
      <el-card class="health-card">
        <div class="health-status">
          <span class="health-label">服务状态</span>
          <div class="health-tag-container">
            <transition name="fade" mode="out-in">
              <div v-if="!health" key="loading" class="health-loading">
                <el-icon class="loading-icon" :size="14"><Loading /></el-icon>
                <span class="loading-text">检测中...</span>
              </div>
              <el-tag :type="healthTagType" v-else key="result" size="default" effect="light">
                {{ health.status === 'healthy' ? '正常' : '异常' }}
              </el-tag>
            </transition>
          </div>
        </div>
      </el-card>

      <!-- 上传区域 -->
      <el-card class="upload-card">
        <div class="upload-section">
          <!-- 单文件上传 -->
          <div class="single-upload">
            <el-upload
              :auto-upload="false"
              :on-change="handleSingleFileChange"
              :show-file-list="false"
              accept=".pdf,.doc,.docx,.txt,.md"
            >
              <el-button type="primary" :loading="isUploading">
                <el-icon><Upload /></el-icon>
                单文件上传
              </el-button>
            </el-upload>
          </div>

          <!-- 批量上传按钮 -->
          <div class="batch-upload-trigger">
            <el-button type="success" @click="showBatchUploadDialog = true">
              <el-icon><Upload /></el-icon>
              批量上传文件
            </el-button>
          </div>
        </div>

        <!-- 批量上传弹窗 -->
        <el-dialog
          v-model="showBatchUploadDialog"
          :title="batchDialogTitle"
          width="600px"
          :close-on-click-modal="batchDialogView === 'select' || batchDialogView === 'result'"
          :close-on-press-escape="batchDialogView === 'select' || batchDialogView === 'result'"
          :show-close="batchDialogView === 'select' || batchDialogView === 'result'"
          @close="handleBatchDialogClose"
        >
          <!-- 选择文件视图 -->
          <div v-if="batchDialogView === 'select'" class="batch-upload-zone">
            <!-- 拖拽上传区域 -->
            <div
              class="upload-dropzone"
              :class="{ 'drag-over': isDragOver }"
              @click="triggerFileSelect"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                style="display: none"
                @change="handleFileSelect"
              />
              <div class="dropzone-content">
                <el-icon :size="40"><Upload /></el-icon>
                <p class="dropzone-title">点击或拖拽文件到此处上传</p>
                <p class="dropzone-hint">支持 PDF、DOC、DOCX、TXT、MD 格式</p>
              </div>
            </div>

            <!-- 待上传文件列表 -->
            <div v-if="pendingFiles.length > 0" class="pending-file-list">
              <div class="file-list-header">
                <span class="file-list-title">
                  待上传文件 ({{ validFileCount }}/{{ pendingFiles.length }})
                </span>
                <span v-if="invalidFileCount > 0" class="invalid-hint">
                  {{ invalidFileCount }} 个文件格式不支持
                </span>
              </div>

              <div class="file-items">
                <div
                  v-for="(fileItem, index) in pendingFiles"
                  :key="`${fileItem.name}-${index}`"
                  class="file-item"
                  :class="{ 'file-invalid': !fileItem.isValid }"
                >
                  <div class="file-main">
                    <el-icon :size="18"><Document /></el-icon>
                    <span class="file-name" :title="fileItem.name">{{ fileItem.name }}</span>
                    <span class="file-size">{{ formatFileSize(fileItem.size) }}</span>
                    <el-tag v-if="!fileItem.isValid" type="danger" size="small" effect="plain">
                      {{ fileItem.error }}
                    </el-tag>
                    <el-tag v-else-if="fileItem.status === 'uploading'" type="warning" size="small" effect="plain">
                      上传中...
                    </el-tag>
                    <el-tag v-else-if="fileItem.status === 'success'" type="success" size="small" effect="plain">
                      成功
                    </el-tag>
                    <el-tag v-else-if="fileItem.status === 'error'" type="danger" size="small" effect="plain">
                      {{ fileItem.error || '失败' }}
                    </el-tag>
                  </div>
                  <el-button
                    v-if="fileItem.status !== 'uploading'"
                    type="danger"
                    link
                    size="small"
                    @click.stop="removePendingFile(index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                  <el-icon v-else class="uploading-icon" :size="16"><Loading /></el-icon>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="file-actions">
                <el-button size="default" @click="clearAllPendingFiles">
                  <el-icon><Delete /></el-icon>
                  全部清空
                </el-button>
                <el-button
                  type="primary"
                  size="default"
                  :loading="isBatchUploading"
                  :disabled="validFileCount === 0"
                  @click="uploadAllFiles"
                >
                  <el-icon><Upload /></el-icon>
                  全部上传 ({{ validFileCount }}个)
                </el-button>
              </div>
            </div>
          </div>

          <!-- 进度视图 -->
          <div v-else-if="batchDialogView === 'progress'" class="task-progress-view">
            <div class="task-status-center">
              <el-icon :size="48" color="#e6a23c" class="rotating-icon"><Loading /></el-icon>
              <div class="task-status-title">{{ taskStatusText }}</div>
              <div class="task-status-subtitle">正在处理上传任务，请稍候...</div>
            </div>

            <el-progress
              :percentage="taskProgress"
              :status="progressStatus"
              :stroke-width="16"
              :show-text="true"
            />

            <!-- 实时处理统计 -->
            <div class="task-stats-bar">
              <div class="task-stat-item">
                <span class="stat-label">成功</span>
                <span class="stat-value success-text">{{ currentTask?.successCount || 0 }}</span>
              </div>
              <div class="task-stat-item">
                <span class="stat-label">失败</span>
                <span class="stat-value error-text">{{ currentTask?.failureCount || 0 }}</span>
              </div>
              <div class="task-stat-item">
                <span class="stat-label">总数</span>
                <span class="stat-value">{{ currentTask?.totalFiles || 0 }}</span>
              </div>
            </div>

            <!-- 实时文件处理列表 -->
            <div v-if="currentTask?.results && currentTask.results.length > 0" class="realtime-results">
              <div class="realtime-results-header">
                <span>文件处理状态 ({{ currentTask.results.length }}/{{ currentTask.totalFiles }})</span>
              </div>
              <div class="realtime-results-list">
                <div
                  v-for="result in currentTask.results"
                  :key="result.originalFilename"
                  class="realtime-result-item"
                  :class="{ 'result-success': result.success, 'result-failed': !result.success }"
                >
                  <div class="result-file-info">
                    <el-icon v-if="result.success" color="#67c23a"><CircleCheckFilled /></el-icon>
                    <el-icon v-else color="#f56c6c"><CircleCloseFilled /></el-icon>
                    <span class="result-file-name" :title="result.originalFilename">
                      {{ result.originalFilename }}
                    </span>
                  </div>
                  <el-tag
                    :type="result.success ? 'success' : 'danger'"
                    size="small"
                    effect="plain"
                  >
                    {{ result.success ? '成功' : formatErrorMessage(result.errorMessage) }}
                  </el-tag>
                </div>
              </div>
            </div>

            <div class="task-progress-actions">
              <el-button @click="stopPolling" type="warning" size="small">
                停止轮询
              </el-button>
            </div>
          </div>

          <!-- 结果视图 -->
          <div v-else-if="batchDialogView === 'result'" class="task-result-view">
            <div class="task-status-center">
              <el-icon v-if="currentTask?.status === 'COMPLETED' && (currentTask?.failureCount || 0) === 0" :size="48" color="#67c23a"><CircleCheckFilled /></el-icon>
              <el-icon v-else-if="currentTask?.status === 'COMPLETED'" :size="48" color="#e6a23c"><CircleCheckFilled /></el-icon>
              <el-icon v-else :size="48" color="#f56c6c"><CircleCloseFilled /></el-icon>
              <div class="task-status-title">
                {{ currentTask?.status === 'COMPLETED' ? '上传完成' : '上传失败' }}
              </div>
              <div class="task-status-subtitle">
                成功 <span class="success-text">{{ currentTask?.successCount || 0 }}</span> 个，
                失败 <span class="error-text">{{ currentTask?.failureCount || 0 }}</span> 个，
                共 {{ currentTask?.totalFiles || 0 }} 个
              </div>
            </div>

            <!-- 成功文件列表 -->
            <div v-if="currentTask?.results?.some((r: any) => r.success)" class="success-files-section">
              <div class="section-header success-section-header">
                <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
                <span>成功文件 ({{ currentTask?.successCount || 0 }})</span>
              </div>
              <div class="result-file-list">
                <div
                  v-for="result in currentTask.results.filter((r: any) => r.success)"
                  :key="result.originalFilename"
                  class="result-file-item result-file-success"
                >
                  <el-icon color="#67c23a" :size="16"><CircleCheckFilled /></el-icon>
                  <span class="result-file-name" :title="result.originalFilename">
                    {{ result.originalFilename }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 失败文件列表 -->
            <div v-if="currentTask?.results?.some((r: any) => !r.success)" class="failed-files-section">
              <div class="section-header failed-section-header">
                <el-icon color="#f56c6c"><CircleCloseFilled /></el-icon>
                <span>失败文件 ({{ currentTask?.failureCount || 0 }})</span>
              </div>
              <div class="result-file-list">
                <div
                  v-for="result in currentTask.results.filter((r: any) => !r.success)"
                  :key="result.originalFilename"
                  class="result-file-item result-file-failed"
                >
                  <el-icon color="#f56c6c" :size="16"><CircleCloseFilled /></el-icon>
                  <div class="failed-file-info">
                    <span class="result-file-name" :title="result.originalFilename">
                      {{ result.originalFilename }}
                    </span>
                    <el-tooltip
                      :content="result.errorMessage || '上传失败'"
                      placement="top"
                      :show-after="500"
                    >
                      <span class="failed-reason">
                        {{ formatErrorMessage(result.errorMessage) }}
                      </span>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 结果视图底部按钮 -->
          <template v-if="batchDialogView === 'result'" #footer>
            <div class="dialog-footer">
              <el-button type="primary" @click="finishBatchUpload">
                <el-icon><CircleCheckFilled /></el-icon>
                完成
              </el-button>
            </div>
          </template>
        </el-dialog>
      </el-card>

      <!-- 文档列表 -->
      <el-card class="document-list-card">
        <div class="document-list-header">
          <h3>文档列表 (共 {{ total }} 个)</h3>
<el-button
            type="primary"
            link
            :icon="Refresh"
            :loading="isFetchingDocuments"
            @click="() => refetchDocuments()"
          >
            刷新
          </el-button>
        </div>
        
<el-table v-loading="isLoadingDocuments" :data="documents" style="width: 100%">
          <el-table-column prop="documentId" label="文档ID" min-width="200" show-overflow-tooltip />
          <el-table-column prop="filename" label="文件名" min-width="150" show-overflow-tooltip />
          <el-table-column prop="segmentCount" label="片段数" width="100" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button 
                type="danger" 
                size="small" 
                :loading="checkIsDeleting(row.documentId)"
                @click="handleDelete(row.documentId, row.filename)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ElCard, 
  ElButton, 
  ElUpload, 
  ElIcon, 
  ElResult, 
  ElTag, 
  ElTable, 
  ElTableColumn, 
  ElDialog,
  ElTooltip,
  ElProgress,
  ElMessageBox,
} from 'element-plus'
import { Upload, Refresh, Document, Delete, Loading, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { vLoading } from 'element-plus'
import { getToken } from '../../utils/token'
import { 
  useDocuments, 
  useUploadDocument, 
  useDeleteDocument,
  useBatchUpload,
  useDocumentHealth,
} from '../../hooks/useDocuments'
import { useBatchUploadTaskPolling } from '../../hooks/useBatchUploadTaskPolling'
import type { BatchUploadParams } from '../../types/document'

const router = useRouter()

// 登录状态
const isLoggedIn = computed(() => !!getToken())

// 跳转到登录页
const goToLogin = () => {
  router.push({ name: '/(nav)/auth' })
}

// 文档列表 - 只在登录状态下请求
const { 
  documents, 
  total, 
  isLoading: isLoadingDocuments, 
  isFetching: isFetchingDocuments,
  refetch: refetchDocuments,
} = useDocuments(isLoggedIn)

// 健康状态 - 只在登录状态下请求
const { health } = useDocumentHealth(isLoggedIn)
const healthTagType = computed(() => {
  if (!health.value) return 'info'
  return health.value.status === 'healthy' ? 'success' : 'danger'
})

// 单文件上传
const { upload: uploadSingleFile, isUploading } = useUploadDocument()
const handleSingleFileChange = async (uploadFile: any) => {
  if (uploadFile?.raw) {
    await uploadSingleFile(uploadFile.raw)
  }
}

// 批量上传
const { batchUploadAsync, isUploading: isBatchUploading, taskId } = useBatchUpload()

// 文件选择和拖拽
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

// 待上传文件列表
interface PendingFile {
  name: string
  size: number
  raw: File
  isValid: boolean
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

const showBatchUploadDialog = ref(false)

// 弹窗视图状态: select(选择文件) / progress(进度) / result(结果)
const batchDialogView = computed(() => {
  if (!currentTaskId.value) return 'select'
  const status = currentTask.value?.status
  if (status === 'COMPLETED' || status === 'FAILED') return 'result'
  return 'progress'
})

// 弹窗动态标题
const batchDialogTitle = computed(() => {
  switch (batchDialogView.value) {
    case 'select': return '批量上传文件'
    case 'progress': return '批量上传中...'
    case 'result': return currentTask.value?.status === 'COMPLETED' ? '上传完成' : '上传失败'
    default: return '批量上传文件'
  }
})

const pendingFiles = ref<PendingFile[]>([])
const batchUploadParams = ref<BatchUploadParams>({
  files: [],
  knowledgeBase: '',
  category: '',
  tags: [],
})

// 支持格式
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md']

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化错误信息：截断过长的错误（如502 HTML），提取关键信息
const formatErrorMessage = (errorMessage?: string | null): string => {
  if (!errorMessage) return '上传失败'

  // 如果错误信息包含HTML（如502 Bad Gateway），提取关键错误类型
  if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html')) {
    // 尝试提取HTTP状态码
    const statusMatch = errorMessage.match(/(\d{3})\s+(\w+)/)
    if (statusMatch) {
      return `${statusMatch[1]} ${statusMatch[2]}`
    }
    return '服务异常'
  }

  // 如果错误信息过长，截断显示
  const maxLength = 20
  if (errorMessage.length > maxLength) {
    return errorMessage.substring(0, maxLength) + '...'
  }

  return errorMessage
}

// 校验文件格式
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { isValid: false, error: '格式不支持' }
  }
  return { isValid: true }
}

// 添加文件到列表
const addFiles = (files: FileList | null) => {
  if (!files) return
  const newFiles: PendingFile[] = Array.from(files).map(file => {
    const validation = validateFile(file)
    return {
      name: file.name,
      size: file.size,
      raw: file,
      isValid: validation.isValid,
      status: 'pending',
      error: validation.error,
    }
  })
  pendingFiles.value.push(...newFiles)
}

// 触发文件选择
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  addFiles(target.files)
  // 重置 input 以便重复选择相同文件
  target.value = ''
}

// 拖拽事件
const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  addFiles(event.dataTransfer?.files ?? null)
}

// 删除单个文件
const removePendingFile = (index: number) => {
  pendingFiles.value.splice(index, 1)
}

// 清空全部文件
const clearAllPendingFiles = () => {
  pendingFiles.value = []
}

// 弹窗关闭处理
const handleBatchDialogClose = () => {
  if (batchDialogView.value === 'result') {
    // 结果视图关闭时，清空所有状态
    currentTaskId.value = null
    pendingFiles.value = []
    return
  }

  // 选择视图：如果所有文件都已上传完成，则清空
  const allProcessed = pendingFiles.value.every(f => f.status === 'success' || f.status === 'error')
  if (allProcessed && pendingFiles.value.length > 0) {
    pendingFiles.value = []
  }
}

// 完成批量上传，关闭弹窗并清空状态
const finishBatchUpload = () => {
  showBatchUploadDialog.value = false
  currentTaskId.value = null
  pendingFiles.value = []
}

// 计算有效/无效文件数
const validFileCount = computed(() => pendingFiles.value.filter(f => f.isValid).length)
const invalidFileCount = computed(() => pendingFiles.value.filter(f => !f.isValid).length)

// 全部上传
const uploadAllFiles = async () => {
  const validFiles = pendingFiles.value.filter(f => f.isValid)
  if (validFiles.length === 0) return

  // 标记为上传中
  validFiles.forEach(f => { f.status = 'uploading' })

  try {
    const params: BatchUploadParams = {
      ...batchUploadParams.value,
      files: validFiles.map(f => f.raw),
    }
    await batchUploadAsync(params)

    // 上传成功，更新状态
    if (taskId.value) {
      currentTaskId.value = taskId.value
    }
  } catch (error) {
    // 上传失败，更新状态
    validFiles.forEach(f => {
      f.status = 'error'
      f.error = '上传失败'
    })
    console.error('批量上传失败:', error)
  }
}

// 批量上传任务轮询
const currentTaskId = ref<string | null>(null)
const {
  task: currentTask,
  progress: taskProgress,
  statusText: taskStatusText,
  stopPolling,
} = useBatchUploadTaskPolling(currentTaskId)

// 监听任务状态变化
watch(
  () => currentTask.value?.status,
  (status) => {
    // 任务完成后，更新文件列表中的状态
    if (status === 'COMPLETED' || status === 'FAILED') {
      const results = currentTask.value?.results
      if (results && results.length > 0) {
        // 根据后端结果更新每个文件的状态
        results.forEach((result: any) => {
          const file = pendingFiles.value.find(f => f.name === result.originalFilename)
          if (file) {
            file.status = result.success ? 'success' : 'error'
            if (!result.success && result.errorMessage) {
              file.error = result.errorMessage
            }
          }
        })
      }
    }
  }
)

const progressStatus = computed(() => {
  if (!currentTask.value) return undefined
  if (currentTask.value.status === 'COMPLETED') return 'success'
  if (currentTask.value.status === 'FAILED') return 'exception'
  return undefined
})

// 删除文档
const { deleteAsync } = useDeleteDocument()
const deletingIds = ref<Set<string>>(new Set())

// 自定义isDeleting方法，支持按ID判断
const checkIsDeleting = (documentId: string) => deletingIds.value.has(documentId)

const handleDelete = async (documentId: string, filename: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档 "${filename}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    deletingIds.value.add(documentId)
    await deleteAsync(documentId)
    deletingIds.value.delete(documentId)
  } catch {
    // 用户取消删除
  }
}

definePage({
  meta: {
    title: "文档管理",
  }
})
</script>

<style scoped>
.document-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
}

.login-prompt {
  margin-top: 100px;
}

.document-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-x: hidden;
}

.health-card, .upload-card, .task-progress-card, .document-list-card {
  margin-bottom: 20px;
  overflow-x: hidden;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-section {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

/* 批量上传拖拽区域 */
.batch-upload-zone {
  flex: 1;
  min-width: 300px;
}

.upload-dropzone {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--el-fill-color-light);
}

.upload-dropzone:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-fill-color);
}

.upload-dropzone.drag-over {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-regular);
}

.dropzone-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.dropzone-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

/* 待上传文件列表 */
.pending-file-list {
  margin-top: 16px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.file-list-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.invalid-hint {
  font-size: 13px;
  color: var(--el-color-danger);
}

.file-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
  transition: background-color 0.2s ease;
}

.file-item:hover {
  background-color: var(--el-fill-color);
}

.file-item.file-invalid {
  background-color: var(--el-color-danger-light-9);
}

.file-item.file-invalid:hover {
  background-color: var(--el-color-danger-light-8);
}

.file-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.file-size {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.uploading-icon {
  color: var(--el-color-primary);
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 操作按钮 */
.file-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 弹窗进度视图 */
.task-progress-view,
.task-result-view {
  padding: 20px 0;
}

.task-status-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.task-status-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.task-status-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.rotating-icon {
  animation: rotating 2s linear infinite;
}

.task-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.task-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.success-text {
  color: var(--el-color-success);
}

.error-text {
  color: var(--el-color-danger);
}

.task-progress-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 实时处理结果列表 */
.realtime-results {
  margin-top: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}

.realtime-results-header {
  padding: 10px 16px;
  background-color: var(--el-fill-color-light);
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.realtime-results-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
}

.realtime-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background-color 0.2s ease;
}

.realtime-result-item:last-child {
  margin-bottom: 0;
}

.result-success {
  background-color: var(--el-color-success-light-9);
}

.result-failed {
  background-color: var(--el-color-danger-light-9);
}

.result-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.result-file-name {
  font-size: 13px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* 统计栏 */
.task-stats-bar {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 16px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

/* 结果视图中的成功/失败文件区域 */
.success-files-section,
.failed-files-section {
  margin-top: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.success-section-header {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.failed-section-header {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.result-file-list {
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
}

.result-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.result-file-success {
  background-color: var(--el-color-success-light-9);
}

.result-file-failed {
  background-color: var(--el-color-danger-light-9);
}

.failed-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.failed-reason {
  font-size: 12px;
  color: var(--el-color-danger);
  cursor: help;
}

.dialog-footer {
  display: flex;
  justify-content: center;
}

/* 任务进度 */
.task-progress {
  padding: 20px;
}

.task-info {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.document-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 表格自适应宽度 */
.document-list-card .el-table {
  width: 100%;
}

/* 文档ID列在小屏幕时隐藏或缩短 */
.document-list-card .el-table .el-table__body-wrapper {
  overflow-x: auto;
}

/* 健康状态区域 */
.health-status {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
}

.health-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.health-tag-container {
  min-width: 60px;
  height: 24px;
  display: flex;
  align-items: center;
}

.health-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.loading-icon {
  animation: rotating 1.5s linear infinite;
}

/* 内容淡入淡出过渡，避免闪烁 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
