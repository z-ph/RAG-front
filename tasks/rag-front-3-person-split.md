# RAG-front 三人分工

## 人 A

### 负责

- 页面：`/auth`
- 文件：
  - `src/App.vue`
  - `src/main.ts`
  - `src/router/index.ts`
  - `src/core/config.ts`
  - `src/core/apiClient.ts`
  - `src/pages/auth.page.vue`

### 要做什么

1. 配置路由
- `/`
- `/auth`
- `/documents`

2. 封装请求层
- `VITE_API_BASE_URL`
- 自动注入 `Authorization: Bearer <token>`
- 统一错误处理
- 兼容两种返回：
  - `Result<T>`
  - 直接 JSON

3. 实现 token 工具
- `getToken`
- `setToken`
- `clearToken`
- `isLoggedIn`

4. 实现登录页
- 调 `POST /api/auth/login`
- 成功写入 `localStorage.rag_token`
- 成功跳转 `/`
- 失败提示错误

5. 实现全局导航
- 聊天
- 文档管理
- 登录
- 退出

6. 实现全局 401 处理
- 清 token
- 跳 `/auth`

### 验收标准

- 未登录可访问 `/`
- 未登录可访问 `/auth`
- 未登录可访问 `/documents`
- 登录成功后跳转 `/`
- `localStorage.rag_token` 写入正确
- 刷新页面后 token 可继续使用
- 401 后自动清 token 并跳 `/auth`

---

## 人 B

### 负责

- 页面：`/`
- 文件：
  - `src/pages/index.page.vue`
- 可新建：
  - `src/features/chat/**`
  - `src/components/chat/**`
  - `src/hooks/useRagConversation.ts`
  - `src/services/rag.ts`

### 要做什么

1. 接入接口
- `POST /api/rag/ask/stream`
- `POST /api/rag/conversations/{conversationId}/cancel`
- `DELETE /api/rag/conversations/{conversationId}`
- `GET /api/rag/health`

2. 处理 SSE 事件
- `start`
- `sources`
- `delta`
- `complete`
- `cancelled`
- `error`

3. 实现聊天页
- 输入框
- 发送按钮
- 停止按钮
- 清空会话按钮
- 消息列表
- 来源列表
- 健康状态

4. 实现会话管理
- 请求体字段：
  - `question`
  - `conversationId`
  - `maxResults`
- 首次发送无 `conversationId` 时传 `null`
- 收到 `start` 后保存后端返回的 `conversationId`
- 本地持久化 `conversationId`
- 停止生成调用 cancel 接口
- 清空会话调用 delete 接口

### 验收标准

- 未登录可直接在 `/` 聊天
- 聊天走流式返回
- 回答可增量渲染
- `sources` 可展示
- `conversationId` 以后端返回为准
- 停止生成有效
- 清空会话有效
- 健康状态可显示

---

## 人 C

### 负责

- 页面：`/documents`
- 文件：
  - `src/pages/documents.page.vue`
- 可新建：
  - `src/features/documents/**`
  - `src/components/documents/**`
  - `src/hooks/useDocuments.ts`
  - `src/services/documents.ts`

### 要做什么

1. 处理未登录态
- 页面可打开
- 未登录显示“请先登录后查看和管理文档”
- 提供去登录入口
- 未登录不请求文档接口

2. 接入接口
- `GET /api/documents`
- `POST /api/documents/upload`
- `POST /api/documents/batch-upload`
- `GET /api/documents/batch-upload/{taskId}`
- `DELETE /api/documents/{documentId}`
- `GET /api/documents/health`

3. 实现登录态文档页
- 拉取文档列表
- 拉取文档健康状态
- 展示总数
- 展示字段：
  - `documentId`
  - `filename`
  - `segmentCount`

4. 实现单文件上传
- 选择文件
- 调 `POST /api/documents/upload`
- 成功后刷新列表
- 403 提示无权限

5. 实现批量上传
- 选择多个文件
- 调 `POST /api/documents/batch-upload`
- 支持参数：
  - `files`
  - `knowledgeBase`
  - `category`
  - `tags`
- 成功后拿到 `taskId`

6. 实现任务轮询
- 轮询 `GET /api/documents/batch-upload/{taskId}`
- 展示字段：
  - `taskId`
  - `status`
  - `totalFiles`
  - `successCount`
  - `failureCount`
  - `results`
  - `errorMessage`
  - `createdTime`
  - `completedTime`
- `status` 为 `COMPLETED` 或 `FAILED` 时停止轮询
- 任务结束后刷新列表

7. 实现删除文档
- 二次确认
- 调 `DELETE /api/documents/{documentId}`
- 成功后刷新列表

### 验收标准

- 未登录可打开 `/documents`
- 未登录不请求文档接口
- 未登录只显示登录引导
- 登录后可拉取文档列表
- 单文件上传可用
- 批量上传可用
- 批量任务可轮询到完成态
- 删除可用
- 健康状态可显示
