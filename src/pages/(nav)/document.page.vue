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
          <span>服务状态:</span>
          <el-tag :type="healthTagType" v-if="health">
            {{ health.status === 'healthy' ? '正常' : '异常' }}
          </el-tag>
          <el-tag v-else type="info">检测中...</el-tag>
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

          <!-- 批量上传 -->
          <div class="batch-upload">
            <el-upload
              ref="batchUploadRef"
              :auto-upload="false"
              :on-change="handleBatchFileChange"
              multiple
              :show-file-list="false"
              accept=".pdf,.doc,.docx,.txt,.md"
            >
              <el-button type="success" :loading="isBatchUploading">
                <el-icon><Upload /></el-icon>
                批量上传
              </el-button>
            </el-upload>
            
            <!-- 批量上传参数 -->
            <el-dialog v-model="showBatchUploadDialog" title="批量上传参数" width="500px">
              <el-form>
                <el-form-item label="知识库">
                  <el-input v-model="batchUploadParams.knowledgeBase" placeholder="可选" />
                </el-form-item>
                <el-form-item label="分类">
                  <el-input v-model="batchUploadParams.category" placeholder="可选" />
                </el-form-item>
                <el-form-item label="标签">
                  <el-select v-model="batchUploadParams.tags" multiple placeholder="可选" allow-create filterable>
                    <el-option label="重要" value="important" />
                    <el-option label="技术" value="technical" />
                    <el-option label="业务" value="business" />
                  </el-select>
                </el-form-item>
                <el-form-item label="文件列表">
                  <div>{{ selectedFiles.length }} 个文件已选择</div>
                </el-form-item>
              </el-form>
              <template #footer>
                <el-button @click="showBatchUploadDialog = false">取消</el-button>
                <el-button type="primary" @click="executeBatchUpload" :loading="isBatchUploading">
                  开始上传
                </el-button>
              </template>
            </el-dialog>
          </div>
        </div>
      </el-card>

      <!-- 批量上传任务进度 -->
      <el-card v-if="currentTaskId" class="task-progress-card">
        <div class="task-progress">
          <h3>批量上传任务进度</h3>
          <el-progress :percentage="taskProgress" :status="progressStatus" />
          <div class="task-info">
            <div>状态: {{ taskStatusText }}</div>
            <div v-if="currentTask">
              成功: {{ currentTask.successCount }} | 失败: {{ currentTask.failureCount }} | 总数: {{ currentTask.totalFiles }}
            </div>
          </div>
          <el-button v-if="currentTask?.status === 'PROCESSING'" @click="stopPolling" type="warning" size="small">
            停止轮询
          </el-button>
        </div>
      </el-card>

      <!-- 文档列表 -->
      <el-card class="document-list-card">
        <div class="document-list-header">
          <h3>文档列表 (共 {{ total }} 个)</h3>
<el-button @click="() => refetchDocuments()" :loading="isFetchingDocuments" circle>
            <el-icon><Refresh /></el-icon>
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
import { ref, computed } from 'vue'
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
  ElForm, 
  ElFormItem, 
  ElInput, 
  ElSelect, 
  ElOption,
  ElProgress,
  ElMessageBox,
} from 'element-plus'
import { Upload, Refresh } from '@element-plus/icons-vue'
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
const selectedFiles = ref<File[]>([])
const showBatchUploadDialog = ref(false)
const batchUploadParams = ref<BatchUploadParams>({
  files: [],
  knowledgeBase: '',
  category: '',
  tags: [],
})

const handleBatchFileChange = (_uploadFile: any, uploadFiles: any[]) => {
  selectedFiles.value = uploadFiles.map(f => f.raw)
  batchUploadParams.value.files = selectedFiles.value
  showBatchUploadDialog.value = true
}

const executeBatchUpload = async () => {
  showBatchUploadDialog.value = false
  try {
    await batchUploadAsync(batchUploadParams.value)
    // 上传成功后，taskId会自动更新
    if (taskId.value) {
      currentTaskId.value = taskId.value
    }
  } catch (error) {
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
</style>
