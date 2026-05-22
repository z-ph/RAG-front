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
| 会话 ID 生成 | 前端生成（浏览器指纹+时间戳） | 不依赖后端分配，避免首次传 null |
| 会话过期 | 30 分钟 TTL + 时间戳 | 对齐后端 `rag.session-ttl-seconds:1800` |

---

## 追加：2025-05-20 深入修复记录

### 4. Bug：停止后无法发送新消息和清空会话

**问题**：点击停止后，`isGenerating` 一直为 `true`，导致发送被 `if (isGenerating.value) return` 拦截，清空按钮 `:disabled="isGenerating"` 灰色。

**根因**：`stopGeneration()` 只设了 `isLoading = false`，没有设 `isGenerating.value = false`。这个状态原本依赖 catch 块来重置，但如果 SSE 流在 abort 前已自然结束，catch 块不执行。

**解决**：在 `stopGeneration()` 和 `clearConversation()` 中直接设置 `isGenerating.value = false`，不依赖异常传递。

### 5. conversationId 改为前端自生成

**需求变更**：不再首次传 `null`，不再保存后端返回的 conversationId。前端自己生成唯一 ID（浏览器指纹 + 时间戳），保存到 localStorage。

**新增**：`services/rag.ts` 中 `generateConversationId()` 函数：
```typescript
// 浏览器指纹：userAgent + screen + language + hardwareConcurrency
// 哈希后取 6 位 + 时间戳
// 格式：conv-a3f2b1-mpdmtm6n
```

**改动**：`hooks/useRagConversation.ts`
- `persistConversationId(id)` → `ensureConversationId()`（检查过期 → 复用或生成）
- `onStart` 回调不再保存后端 ID
- `clearConversation` 清理 localStorage 中的 ID 和时间戳

### 6. conversationId 过期机制

**需求**：存的时候加时间戳，判断是否过期。过期时间参考后端代码。

**后端配置**：`ConversationMemoryService.java` 第 28 行
```java
@Value("${rag.session-ttl-seconds:1800}") long sessionTtlSeconds
```
默认 **1800 秒 = 30 分钟**。

**实现**：
- 存储时同时存 `rag-conversation-ts`（时间戳）
- `ensureConversationId()` 检查 `Date.now() - ts < 30 * 60 * 1000`
- 未过期 → 复用；已过期 → 清理旧数据，生成新 ID
- 每次发送成功后刷新时间戳（活跃会话不断期）

### 7. Bug：取消请求返回 404

**问题**：点击停止后 Network 面板显示 `POST /conversations/{id}/cancel` 返回 404。
```json
{"error":"未找到任务","message":"该会话当前没有进行中的生成任务"}
```

**根因**：`stopGeneration` 先 `controller.abort()` 断开本地 SSE，再发 cancel 请求。后端检测到连接断开已自动停止生成，cancel 到达时任务已不存在。

**解决**：`cancelConversation()` 中把 404 视为正常（"已停止，无需取消"），不抛错。
```typescript
if (response.status === 404) return
```

### 8. Bug：流正常结束后 AI 对话仍显示加载中

**问题**：不使用停止按钮时，后端返回完所有数据后，AI 对话框一直显示三个跳动的点（加载动画），不消失。

**根因**：SSE 流正常结束时（`reader.read()` 返回 `done: true`），while 循环退出，但如果没有收到 `complete` SSE 事件，`onComplete` 回调不触发，`isLoading` 保持 `true`。

**解决**：while 循环退出后兜底调用 `handlers.onComplete()`：
```typescript
// 流结束时确保调用 onComplete
handlers.onComplete()
```

### 9. Bug：delta 内容不显示（关键）

**问题**：Network 面板能看到后端返回的 delta 数据（如"根据已上传文档无法回答该问题"），但页面上 AI 对话框始终空白。

**诊断过程**：
1. 怀疑 Vue 响应式问题 → 改用 `reactive()` 包裹消息对象 → 无效
2. 怀疑 `reader.read()` 的 `done` 判断过早 → 改为先处理 value 再判断 done → 无效
3. 添加 `console.log` 诊断 → 发现 `[SSE line]` 有输出，但 `[SSE event]` 和 `[SSE data parsed]` 无输出

**真正根因**：后端 SSE 格式是非标准的——

| | 标准 SSE | 实际后端 |
|---|---|---|
| event 行 | `event: delta` | `event:delta`（无空格） |
| delta data | `data: {"content":"根据"}` | `data:根据`（纯文本，非 JSON） |

原代码 `.startsWith('event: ')` 和 `.startsWith('data: ')` 要求冒号后有空格，全部匹配失败。所有数据行被静默跳过。delta 的 data 是纯文本（逐字推送），`JSON.parse("根据")` 直接抛错，被 `catch {}` 吞掉。

**任何一行 delta 数据都没有被处理过**。

**解决**：
```typescript
// 不再要求空格
if (trimmed.startsWith('event:')) { ... }
if (trimmed.startsWith('data:')) { ... }

// JSON 解析失败时，当作纯文本 delta 内容
catch {
    if (currentEvent === 'delta') {
        handlers.onDelta(raw)  // raw = "根据" / "已" / "上传" ...
    }
}
```

### 10. 最终文件状态

```
src/
├── core/
│   └── apiClient.ts          [修改] 统一 token key，解决合并冲突
├── services/
│   └── rag.ts                [新增] RAG API + generateConversationId + 纯文本 SSE 兼容
├── hooks/
│   └── useRagConversation.ts [新增] 会话管理 + 过期检测 + reactive 消息对象
├── components/chat/
│   ├── ChatHealth.vue        [新增] 健康状态指示器
│   ├── ChatInput.vue         [新增] 输入组件
│   ├── ChatMessages.vue      [新增] 消息列表
│   └── ChatSources.vue       [新增] 来源列表
├── pages/(nav)/
│   └── index.page.vue        [修改] 主聊天页面
└── .env                      [新增] VITE_BACK_API 配置
```

### 11. 技术经验总结

| 教训 | 说明 |
|------|------|
| **先用 console.log 诊断** | 不要假设代码逻辑正确——实锤证据来自日志 |
| **Vue 响应式陷阱** | 普通对象 vs reactive() vs ref<T[]> 代理行为不一致，修改 reactive() 包装的对象最可靠 |
| **Stream reader done 陷阱** | `reader.read()` 可能同时返回数据 + done，必须先处理数据再判断 done |
| **SSE 格式兼容** | 不同后端实现可能不遵循标准 SSE 格式（空格、JSON vs 纯文本），解析必须容错 |
| **不要靠异常传递状态** | `isGenerating` 的状态不应依赖 catch 块，直接在业务逻辑中设置 |
| **HTTP 404 可能是正常语义** | "该会话当前没有进行中的生成任务" = 已经停止了，不是错误 |
 
---

## 面试亮点：核心技术挑战与解决方案

> 以下三个 Bug 修复过程展示了深层调试能力和对技术栈原理的理解，可作为面试介绍点。

### 技术栈总览

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3.5 Composition API（`<script setup>`） |
| 响应式系统 | `ref` / `reactive` / Vue Proxy |
| 构建工具 | Vite 8（代理转发 / 环境变量） |
| 流式通信 | Server-Sent Events（SSE） + `fetch` + `ReadableStream` |
| HTTP 客户端 | Axios（标准请求）+ 原生 `fetch`（SSE 流） |
| 状态管理 | `@tanstack/vue-query`（登录态）、Pinia（未使用，页面级 ref 管理） |
| UI 组件库 | Element Plus |
| 后端通信 | Spring Boot REST API |

### 亮点 1：Vue 3 响应式系统陷阱——"为什么停止按钮点了 UI 不变"

**问题**：点击停止后，AI 对话框的三个跳动点（`class="dot"`）不消失，`isGenerating` 状态卡死，导致无法发送新消息和清空会话。

**排查**：三次迭代，层层递进——

| 迭代 | 猜想 | 方案 | 结果 |
|------|------|------|------|
| 1 | 服务端 cancel 阻塞了本地 abort | 调换顺序：先 abort 再 cancel | 部分改善，仍不稳定 |
| 2 | `err.name === 'AbortError'` 类型检查不匹配浏览器差异 | 泛化为标记位判断 | 仍失败 |
| 3 | `console.log` 发现回调确实执行了，但 DOM 不更新 | 怀疑 Vue 响应式 | **找到根因** |

**根因**：Vue 3 的 `ref<T[]>` 对数组元素的行为——

```typescript
const aiMessage = { isLoading: true }  // 普通 JS 对象
messages.value.push(aiMessage)          // 推入响应式数组
```

Vue 创建 reactive proxy 包裹数组，但 `aiMessage` 变量仍指向**原始对象**。所有回调（`onDelta`、`onComplete`）直接修改原始对象 `aiMessage.isLoading = false`，Vue 的 Proxy `set` trap **不触发**，依赖追踪失效，DOM 不更新。

**解决方案演进**：
```
v1: messages.value.find(m => m.id === currentAiMessageId) → 从响应式数组取代理
v2: reactive<ChatMessage>({ ... }) → 对象本身就是响应式代理，push 到数组后不会丢失代理
```

**面试要点**：
- 展示对 Vue 3 `Proxy` 响应式原理的深层理解（不下于源码级）
- 区分 `ref` vs `reactive` 的适用场景
- 表明在调试中使用了 `console.log` 分层诊断的方法论

---

### 亮点 2：`fetch` 流式读取的死数据——"数据明明到了，为什么全是空白"

**问题**：Network 面板清楚显示后端返回了 22KB 的 SSE 数据，包含 event、sources、delta 等内容。但 AI 对话框始终空白，Console 无任何报错。

**排查**：同样分层诊断——

| 层 | 检查项 | 结果 |
|----|--------|------|
| 响应式层 | `reactive()` 包裹 + DOM 模板 | 无效果，排除 |
| 读取层 | `reader.read()` 的 `done` 判断 | 优化后仍无效，排除 |
| 解析层 | **加 `console.log`** → 发现只输出了 `[SSE line]`，没有 `[SSE event]` | ⚠️ 解析阶段根本没进入 |

**根因（双重）**：

```typescript
// 原代码期望的标准 SSE 格式
if (line.startsWith('event: '))   // 要求 "event: " 后面有空格
if (line.startsWith('data: '))    // 要求 "data: " 后面有空格

// 实际后端发出的格式
event:delta                       // 冒号后无空格！
data:根据                         // 不是 JSON，是纯文本逐字推送！
```

两个检查全部静默跳过。`data:根据` 即使匹配到，`JSON.parse("根据")` 也会抛错，被 `catch {}` 吞掉。

**解决方案**：
```typescript
// 1. 格式兼容——不要求空格
if (trimmed.startsWith('event:')) { ... }
if (trimmed.startsWith('data:')) { ... }

// 2. JSON 失败时降级为纯文本 delta 内容
catch {
    if (currentEvent === 'delta') {
        handlers.onDelta(raw)  // raw = "根据" / "已" / "上传" ...
    }
}
```

**面试要点**：
- "Network 有数据但页面没反应" 是经典断点问题，展示**分层诊断**思路
- 展示**防御性编程**——不假设第三方数据格式规范
- 补充分层诊断流程图说明思路结构

---

### 亮点 3：`reader.read()` 的时序 Bug——"while 循环 break 早了"

**问题**：HTTP 响应体一次返回完整 SSE 数据时（常见于 fast connection），while 循环在第一次迭代就退出，数据从未被处理。

**根因**：`reader.read()` 的返回值结构是 `{ value, done }`。当所有数据在一个 chunk 到达时，返回值是 `{ value: <全部数据>, done: true }`。

原代码：
```typescript
const { done, value } = await reader.read()
if (done) break           // ← 先判断 done，value 里的数据被丢弃！
buffer += decoder.decode(value, { stream: true })
// ... 处理数据
```

**修复**：
```typescript
const { done, value } = await reader.read()
if (value) {
    buffer += decoder.decode(value, { stream: true })
    // ... 处理数据
}
if (done) break           // ← 处理完数据再判断退出
```

**面试要点**：
- 展示对 Web Streams API（`ReadableStream`、`reader.read()`）的掌握
- 说明逐 chunk 读取 vs 完整响应的边界处理经验

---

### 调试方法论总结

```
发现 Bug
  ↓
提出猜想（1-2 个最可能的原因）
  ↓
用最小改动验证（console.log / 临时注释 / 硬编码数据）
  ↓
排除一个猜想 → 提出新猜想 → 验证 → 定位根因
  ↓
修复 → 验证 → 记录
```

**核心原则**：不要猜，要**验证**。加一行 `console.log` 比改三遍代码更高效。

---

## 追加：2026-05-21 对话与修复记录

### 12. 重构：消除 `rag.ts` 中的 `baseURL` 重复定义

**问题**：用户指出 `rag.ts` 中 `getBaseURL()` 函数重复定义了 `baseURL` 逻辑（`import.meta.env.DEV ? '/asdfasdf' : import.meta.env.VITE_BACK_API`），而 `core/config.ts` 已经维护了一份 `apiClientConfig.baseURL`。两处定义造成维护隐患——修改环境地址需要改两个地方。

**根因**：初始开发时为绕过 axios 拦截器而直接用 `fetch`，顺手在 `rag.ts` 里内联了 baseURL 逻辑，没有复用已有的 `config.ts`。

**解决**：
```typescript
// ❌ 之前：rag.ts 内部重复定义
function getBaseURL(): string {
  return import.meta.env.DEV ? '/asdfasdf' : (import.meta.env.VITE_BACK_API as string)
}

// ✅ 之后：从 config.ts 统一导入
import { apiClientConfig } from '../core/config'

// 4 处 `${getBaseURL()}/api/rag/...` → `${apiClientConfig.baseURL}/api/rag/...`
```

**改进点**：
- `rag.ts` 删除了 `getBaseURL()` 函数，改为导入 `apiClientConfig`
- `baseURL` 只在 `core/config.ts` 维护一份，消除了配置不一致的风险
- 同时将 `generateConversationId()` 从 `rag.ts` 移除（会话 ID 管理已移到 hook 层）

### 13. 重构：`useRagConversation.ts` 会话管理优化

**变更**：
- `conversationId` 初始值从 `localStorage.getItem(CONVERSATION_KEY)` 改为 `null`——会话 ID 不再在 hook 初始化时读取，而是在 `sendMessage` 时通过 `getStoredConversationId()` 按需读取
- `ensureConversationId()` 拆分为 `getStoredConversationId()`（纯读）+ `persistConversationId()`（写），职责更清晰
- 新增 `finishMessage()` 辅助函数，集中处理"结束 AI 消息"的 4 步操作（`isLoading=false`、`isGenerating=false`、清理 controller、清空 messageId），消除了 `stopGeneration`、`clearConversation`、`onComplete`、`onError` 中的重复代码
- AI 消息对象 push 后立即从响应式数组取代理：`const msg = messages.value[messages.value.length - 1]`，确保后续 `onDelta`/`onSources` 修改的是 Vue Proxy 对象

### 14. Bug：消息列表流式更新时不自动滚到底部

**问题**：`ChatMessages.vue` 中 `watch` 只监听 `props.messages.length`（消息数量变化），但流式追加内容（`onDelta` 更新 `msg.content`）和来源补全（`onSources` 更新 `msg.sources`）都不会改变数组 length，导致新内容出现时页面不自动滚动。

**解决**：
```typescript
// ❌ 之前：只监听长度
watch(() => props.messages.length, () => scrollToBottom())

// ✅ 之后：组合监听 length + content + sources
watch(
  () => {
    const last = props.messages[props.messages.length - 1]
    return `${props.messages.length}|${last?.content ?? ''}|${last?.sources?.length ?? 0}`
  },
  () => scrollToBottom(),
)
```

### 15. Bug：conversationId 行为回退（commit 9cbcb8c 撤销了 7b5f06b）

**问题**：commit `7b5f06b` 实现了前端自生成 `conversationId`（浏览器指纹+时间戳），但后续 commit `9cbcb8c`（"解决pr里的问题"）删除了 `generateConversationId()`，回退到由后端 `onStart(id)` 分配并保存到 localStorage。前端生成 ID 的功能完全丢失，`7b5f06b` 的 commit message 具有误导性——该实现已被后续 commit 撤销。

**回退后的行为**：
- `conversationId` 初始值为 `null`（不是 localStorage）
- 首次发送传 `null` 给后端，等后端在 `start` 事件中返回 ID
- `onStart(id)` 调用 `persistConversationId(id)` 保存后端分配的 ID
- `getStoredConversationId()` 读取未过期的 ID 或返回 `null`

**恢复后的行为**（`7b5f06b` 原始设计）：
- 前端在发送前通过 `ensureConversationId()` 自生成 ID
- `conversationId` 初始值从 localStorage 读取（恢复续接）
- `onStart` 不再保存后端返回的 ID（`_id: string` 忽略）
- 过期机制保留：30 分钟 TTL，每次发送刷新时间戳

**修复**：
- `rag.ts`：恢复 `generateConversationId()` 函数
- `AskStreamParams.conversationId` 类型从 `string | null` 改回 `string`
- `useRagConversation.ts`：
  - 恢复 `import { generateConversationId }` 导入
  - `conversationId` 初始值恢复为 `localStorage.getItem(CONVERSATION_KEY)`
  - `getStoredConversationId()` + `persistConversationId()` 合并回 `ensureConversationId()`
  - `sendMessage` 中调用 `ensureConversationId()` 后传 `conversationId.value!`
  - `onStart(_id: string)` 不再保存后端 ID

---

## 今日（5-21）对话记录

### 对话 1：消除 baseURL 重复定义

| 角色 | 内容摘要 |
|------|----------|
| **用户** | 指出 `rag.ts` 的 `import.meta.env.VITE_BACK_API` 应从 `core/config.ts` 导入，不要重复编码，只在 config.ts 维护一份 baseURL |
| **助手** | 将 `rag.ts` 中的 `getBaseURL()` 删除，改为 `import { apiClientConfig } from '../core/config'`，4 处 URL 拼接统一替换为 `${apiClientConfig.baseURL}` |

### 对话 2：更新任务记录（多次）

| 角色 | 内容摘要 |
|------|----------|
| **用户** | 要求将今日对话和技术栈写入 person-b-task-record.md |
| **助手** | 探索会话历史、读取代码变更、整理今日三项改动（§12-14）并追加到文件 |

---

## 今日（5-21）涉及的技术栈

| 技术 | 用途 |
|------|------|
| **Vue 3 Composition API** | `<script setup>` + `ref` / `reactive` 响应式状态管理 |
| **Vue 响应式系统（Proxy）** | `ref<T[]>` 数组代理 vs 原始对象引用；watch 深层依赖追踪组合 |
| **Vite 环境变量** | `import.meta.env.DEV`、`import.meta.env.VITE_BACK_API`、代理转发 |
| **TypeScript** | 类型接口定义、联合类型 `string \| null` |
| **原生 Fetch API** | 绕过 axios 拦截器处理 SSE 流和非标准响应格式 |
| **ReadableStream / TextDecoder** | 流式读取 SSE 数据，逐 chunk 解码 |
| **Server-Sent Events (SSE)** | 事件驱动通信，处理 start/delta/sources/complete/cancelled/error |
| **localStorage** | 会话 ID 和时间戳持久化、过期检测 |
| **AbortController** | 中断 fetch 请求，实现停止生成功能 |
| **模块化重构** | 消除重复定义，统一配置单入口（config.ts） |

### 本日修改文件清单

```
src/
├── core/
│   └── config.ts              [无变更] 统一 baseURL 来源
├── services/
│   └── rag.ts                  [修改] 删除 getBaseURL()/generateConversationId，改从 config.ts 导入
├── hooks/
│   └── useRagConversation.ts   [修改] 拆分会话读取/写入、新增 finishMessage()、响应式代理取值
└── components/chat/
    └── ChatMessages.vue         [修改] watch 从监听 length 改为组合监听 length+content+sources
```
