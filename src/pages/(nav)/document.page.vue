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
    <div v-else class="flex flex-col gap-5">
      <!-- 健康状态 -->
      <el-card>
        <div class="flex items-center gap-3 min-h-8">
          <span class="text-sm">服务状态</span>
          <transition name="fade" mode="out-in">
            <div v-if="!health" key="loading" class="flex items-center gap-1.5 text-gray text-sm">
              <el-icon class="loading-icon" :size="14"><Loading /></el-icon>
              <span>检测中...</span>
            </div>
            <el-tag :type="healthTagType" v-else key="result" size="default" effect="light">
              {{ health.status === 'healthy' ? '正常' : '异常' }}
            </el-tag>
          </transition>
        </div>
      </el-card>

      <!-- 上传区域 -->
      <el-card>
        <div class="flex flex-wrap gap-5">
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
              <div class="flex flex-col items-center gap-2 text-gray">
                <el-icon :size="40"><Upload /></el-icon>
                <p class="text-base font-medium m-0">点击或拖拽文件到此处上传</p>
                <p class="text-sm m-0">支持 PDF、DOC、DOCX、TXT、MD 格式</p>
              </div>
            </div>

            <!-- 待上传文件列表 -->
            <div v-if="pendingFiles.length > 0" class="mt-4">
              <div class="flex justify-between items-center mb-3 px-1">
                <span class="text-sm font-medium">
                  待上传文件 ({{ validFileCount }}/{{ pendingFiles.length }})
                </span>
                <span v-if="invalidFileCount > 0" class="text-sm text-danger">
                  {{ invalidFileCount }} 个文件格式不支持
                </span>
              </div>

              <div class="flex flex-col gap-2">
                <div
                  v-for="(fileItem, index) in pendingFiles"
                  :key="`${fileItem.name}-${index}`"
                  class="file-item"
                  :class="{ 'file-invalid': !fileItem.isValid }"
                >
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <el-icon :size="18"><Document /></el-icon>
                    <span class="text-sm truncate flex-1" :title="fileItem.name">{{ fileItem.name }}</span>
                    <span class="text-xs text-gray whitespace-nowrap">{{ formatFileSize(fileItem.size) }}</span>
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
              <el-row justify="end" class="mt-4 pt-4" style="border-top: 1px solid var(--el-border-color-lighter)">
                <el-col>
                  <el-space>
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
                  </el-space>
                </el-col>
              </el-row>
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
            <el-row justify="center" :gutter="40" class="mt-4">
              <el-col :span="8" class="text-center">
                <div class="el-statistic">
                  <div class="el-statistic__content text-success text-xl font-bold">
                    {{ currentTask?.successCount || 0 }}
                  </div>
                  <div class="el-statistic__title text-sm text-gray">成功</div>
                </div>
              </el-col>
              <el-col :span="8" class="text-center">
                <div class="el-statistic">
                  <div class="el-statistic__content text-danger text-xl font-bold">
                    {{ currentTask?.failureCount || 0 }}
                  </div>
                  <div class="el-statistic__title text-sm text-gray">失败</div>
                </div>
              </el-col>
              <el-col :span="8" class="text-center">
                <div class="el-statistic">
                  <div class="el-statistic__content text-xl font-bold">
                    {{ currentTask?.totalFiles || 0 }}
                  </div>
                  <div class="el-statistic__title text-sm text-gray">总数</div>
                </div>
              </el-col>
            </el-row>

            <!-- 实时文件处理列表 -->
            <el-card v-if="currentTask?.results && currentTask.results.length > 0" class="mt-5" shadow="never">
              <template #header>
                <span>文件处理状态 ({{ currentTask.results.length }}/{{ currentTask.totalFiles }})</span>
              </template>
              <div class="realtime-results-list">
                <div
                  v-for="result in currentTask.results"
                  :key="result.originalFilename"
                  class="flex justify-between items-center p-2 rounded mb-1"
                  :class="result.success ? 'result-success' : 'result-failed'"
                >
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <el-icon v-if="result.success" color="#67c23a"><CircleCheckFilled /></el-icon>
                    <el-icon v-else color="#f56c6c"><CircleCloseFilled /></el-icon>
                    <span class="text-sm truncate flex-1" :title="result.originalFilename">
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
            </el-card>

            <div class="text-center mt-5">
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
            <el-card
              v-if="currentTask?.results?.some((r: any) => r.success)"
              class="mt-4"
              shadow="never"
              :body-style="{ padding: '8px', backgroundColor: 'var(--el-color-success-light-9)' }"
            >
              <template #header>
                <div class="flex items-center gap-2 text-success">
                  <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
                  <span>成功文件 ({{ currentTask?.successCount || 0 }})</span>
                </div>
              </template>
              <div class="result-file-list">
                <div
                  v-for="result in currentTask.results.filter((r: any) => r.success)"
                  :key="result.originalFilename"
                  class="flex items-center gap-2 p-1 rounded mb-1 result-file-success"
                >
                  <el-icon color="#67c23a" :size="16"><CircleCheckFilled /></el-icon>
                  <span class="text-sm truncate flex-1" :title="result.originalFilename">
                    {{ result.originalFilename }}
                  </span>
                </div>
              </div>
            </el-card>

            <!-- 失败文件列表 -->
            <el-card
              v-if="currentTask?.results?.some((r: any) => !r.success)"
              class="mt-4"
              shadow="never"
              :body-style="{ padding: '8px', backgroundColor: 'var(--el-color-danger-light-9)' }"
            >
              <template #header>
                <div class="flex items-center gap-2 text-danger">
                  <el-icon color="#f56c6c"><CircleCloseFilled /></el-icon>
                  <span>失败文件 ({{ currentTask?.failureCount || 0 }})</span>
                </div>
              </template>
              <div class="result-file-list">
                <div
                  v-for="result in currentTask.results.filter((r: any) => !r.success)"
                  :key="result.originalFilename"
                  class="flex items-center gap-2 p-1 rounded mb-1 result-file-failed"
                >
                  <el-icon color="#f56c6c" :size="16"><CircleCloseFilled /></el-icon>
                  <div class="flex-1 min-w-0 flex flex-col">
                    <span class="text-sm truncate" :title="result.originalFilename">
                      {{ result.originalFilename }}
                    </span>
                    <el-tooltip
                      :content="result.errorMessage || '上传失败'"
                      placement="top"
                      :show-after="500"
                    >
                      <span class="text-xs text-danger cursor-help">
                        {{ formatErrorMessage(result.errorMessage) }}
                      </span>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 结果视图底部按钮 -->
          <template v-if="batchDialogView === 'result'" #footer>
            <div class="text-center">
              <el-button type="primary" @click="finishBatchUpload">
                <el-icon><CircleCheckFilled /></el-icon>
                完成
              </el-button>
            </div>
          </template>
        </el-dialog>
      </el-card>

      <!-- 文档列表 -->
      <el-card>
        <div class="flex justify-between items-center mb-5">
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
  ElRow,
  ElCol,
  ElSpace,
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
/* 页面容器 */
.document-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.login-prompt {
  margin-top: 100px;
}

/* === 通用布局工具类（替代 Tailwind） === */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.gap-1\.5 { gap: 6px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-5 { gap: 20px; }
.mt-4 { margin-top: 16px; }
.mt-5 { margin-top: 20px; }
.mb-3 { margin-bottom: 12px; }
.mb-5 { margin-bottom: 20px; }
.pt-4 { padding-top: 16px; }
.px-1 { padding: 0 4px; }
.p-1 { padding: 4px; }
.p-2 { padding: 8px; }
.text-sm { font-size: 14px; }
.text-xs { font-size: 12px; }
.text-base { font-size: 16px; }
.text-xl { font-size: 20px; }
.text-center { text-align: center; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.min-w-0 { min-width: 0; }
.flex-1 { flex: 1; }
.whitespace-nowrap { white-space: nowrap; }
.text-gray { color: var(--el-text-color-secondary); }
.text-success { color: var(--el-color-success); }
.text-danger { color: var(--el-color-danger); }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 600; }
.m-0 { margin: 0; }
.rounded { border-radius: 4px; }
.min-h-8 { min-height: 32px; }
.cursor-help { cursor: help; }

/* 模拟 el-statistic 样式（未导入组件，需自定义） */
.el-statistic {
  text-align: center;
}
.el-statistic__content {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.5;
}
.el-statistic__title {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

/* 拖拽上传区域 */
.upload-dropzone {
  border: 2px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background-color: var(--el-fill-color-light);
}

.upload-dropzone:hover,
.upload-dropzone.drag-over {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

/* 文件列表项 */
.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--el-border-radius-small);
  background-color: var(--el-fill-color-light);
}

.file-item.file-invalid {
  background-color: var(--el-color-danger-light-9);
}

/* 进度与结果视图 */
.task-status-center {
  text-align: center;
  margin-bottom: 24px;
}

.task-status-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-top: 12px;
}

.task-status-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.success-text {
  color: var(--el-color-success);
  font-weight: 500;
}

.error-text {
  color: var(--el-color-danger);
  font-weight: 500;
}

.rotating-icon,
.loading-icon,
.uploading-icon {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 结果分区滚动 */
.result-file-list,
.realtime-results-list {
  max-height: 150px;
  overflow-y: auto;
}

/* 成功/失败背景色 */
.result-file-success,
.result-success {
  background-color: var(--el-color-success-light-9);
}

.result-file-failed,
.result-failed {
  background-color: var(--el-color-danger-light-9);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
