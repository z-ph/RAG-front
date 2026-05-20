# 人B 任务开发记录

## 任务来源

`tasks/rag-front-3-person-split.md` — 三人分工文档

## 负责范围

- **页面**：`/`（聊天首页）
- **文件**：
  - `src/pages/(nav)/index.page.vue`（修改）
  - `src/features/chat/**`（可选）
  - `src/components/chat/**`（新增）
  - `src/hooks/useRagConversation.ts`（新增）
  - `src/services/rag.ts`（新增）

## 任务要求

### 1. 接入 4 个接口
- `POST /api/rag/ask/stream` — SSE 流式对话
- `POST /api/rag/conversations/{conversationId}/cancel` — 停止生成
- `DELETE /api/rag/conversations/{conversationId}` — 清空会话
- `GET /api/rag/health` — 健康检查

### 2. 处理 6 种 SSE 事件
`start` / `delta` / `sources` / `complete` / `cancelled` / `error`

### 3. 实现聊天页 UI
输入框、发送按钮、停止按钮、清空会话按钮、消息列表、来源列表、健康状态

### 4. 实现会话管理
- 请求体字段：`question`、`conversationId`、`maxResults`
- 首次发送无 `conversationId` 时传 `null`
- 收到 `start` 后保存后端返回的 `conversationId`
- `localStorage` 持久化 `conversationId`
- 停止生成调用 cancel 接口
- 清空会话调用 delete 接口

## 验收标准

| 标准 | 结果 |
|------|------|
| 未登录可直接在 `/` 聊天 | ✅ |
| 聊天走流式返回 | ✅ |
| 回答可增量渲染 | ✅ |
| `sources` 可展示 | ✅ |
| `conversationId` 以后端返回为准 | ✅ |
| 停止生成有效 | ✅ |
| 清空会话有效 | ✅ |
| 健康状态可显示 | ✅ |

---

## 对话流程

### 1. 环境准备阶段

**问题**：点击发送消息报 502 错误
- **原因**：`.env` 文件未配置，后端未启动
- **解决**：
  1. 创建 `.env` 文件（复制自 `.env.example`），设置 `VITE_BACK_API=http://47.242.178.207:8080`
  2. 后端接口在后端项目中（`E:\LearnWeb\RAG\RAG`，Spring Boot 项目），需要 Java 21 环境
  3. 后端实际部署在服务器 `47.242.178.207:8080`

**确认后端接口路径**：
- 打开 `RAG/RAG/src/.../RagController.java`，确认 4 个接口路径与任务文档一致
- `@PostMapping("/ask/stream")` → `/api/rag/ask/stream`
- `@PostMapping("/conversations/{conversationId}/cancel")` → cancel
- `@DeleteMapping("/conversations/{conversationId}")` → delete
- `@GetMapping("/health")` → health

### 2. Bug：健康接口返回格式不一致

**问题**：后端 `/health` 返回纯文本 `"RAG 服务运行正常"`，不是 `Result<T>` 格式
- `apiClient` 的响应拦截器检查 `response.data.code != 1`，纯文本无 `code` 字段，导致抛错
- `cancelConversation` 和 `deleteConversation` 返回的也是纯文本，有同样问题

**解决**：`services/rag.ts` 中 `getHealth`、`cancelConversation`、`deleteConversation` 全部改为原生 `fetch` 调用，绕过 axios 拦截器。同时提取 `getBaseURL()` 和 `getAuthHeaders()` 共用函数。

### 3. Bug：停止按钮不生效（多次迭代）

**第一次修复**：`stopGeneration()` 中先调 cancel API 再 abort 本地流，改为先 abort 后异步 cancel。

**第二次修复**：catch 块中 `err.name === 'AbortError'` 判断在很多浏览器不命中（`reader.read()` 被 abort 时抛 TypeError 而非 AbortError），改为更通用的检查。

**第三次修复**：`aiMessage.isLoading = false` 修改原始对象，Vue 响应式系统检测不到变化，`v-if="msg.isLoading"` 控制的 dot 动画不消失。
- **根因**：`currentAiMessage = aiMessage` 存储了原始 JS 对象引用，不是 Vue 的响应式代理
- **解决**：`stopGeneration()` 中通过 `messages.value.find(m => m.id === currentAiMessageId)` 从响应式数组中获取代理对象，再修改其属性

**最终方案架构**：
```
发送消息
  ↓
sendMessage() → 创建 aiMessage → push 到 messages 数组 → 存储 ID
  ↓
SSE 流式接收
  ↓
用户点击"停止"
  ↓
stopGeneration()
  ├── 通过 messages.value[响应式代理] 找到消息对象
  ├── aiMsg.content = ''      (清空内容)
  ├── aiMsg.isLoading = false  (停止 dot 动画)
  ├── currentAiMessageId = null (标记已处理)
  └── controller.abort()       (断开 SSE)
  ↓
SSE 抛异常 → catch 块检查 currentAiMessageId === null → 静默返回
```

### 4. Bug：apiClient.ts token key 不一致

**问题**：`apiClient.ts` 读取 `localStorage.getItem("token")`，但 `utils/token.ts` 定义的 key 是 `RAG-token`
**解决**：统一为 `getToken()`（读取 `RAG-token`）

### 5. Git 提交整理

- 清理混入提交的 session JSON 文件（`.sisyphus/`）
- 拆分为 4 个原子提交：
  1. `feat(chat): add RAG API service and conversation management hook` — 服务层+钩子
  2. `feat(chat): add chat UI components` — 4 个 Vue 组件
  3. `feat(chat): rewrite index page into full chat interface` — 页面集成
  4. `chore: ignore .sisyphus session files` — gitignore 更新
- 推送到 origin/dev，创建 PR

---

## 最终文件结构

```
src/
├── core/
│   └── apiClient.ts          [修改] 统一 token key
├── services/
│   └── rag.ts                [新增] RAG API 服务层
├── hooks/
│   └── useRagConversation.ts [新增] 会话管理 Hook
├── components/chat/
│   ├── ChatHealth.vue        [新增] 健康状态指示器
│   ├── ChatInput.vue         [新增] 输入框组件
│   ├── ChatMessages.vue      [新增] 消息列表组件
│   └── ChatSources.vue       [新增] 来源列表组件
├── pages/(nav)/
│   └── index.page.vue        [修改] 主聊天页面
├── utils/
│   └── token.ts              [人A] Token 工具
└── .env                      [新增] 后端地址配置
```

## 关键技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| SSE 实现 | `fetch` + `ReadableStream` | POST 请求，axios 对 streaming 支持不足 |
| 响应格式不一致 | 绕过 apiClient 直接用 fetch | 后端部分接口返回纯文本而非 `Result<T>` |
| 停止机制 | 直接操作响应式数组中的消息对象 | Vue Proxy 才能触发 DOM 更新 |
| 会话 ID 持久化 | `localStorage` key=`rag-conversation-id` | 简单可靠，与 token 存储方式一致 |
| 健康轮询 | `setInterval` 30 秒 | 轻量检测，组件卸载时清理 |
