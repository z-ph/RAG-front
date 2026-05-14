# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
# 开发流程:

git fetch: 拉取远程仓库的最新代码
git checkout origin/main: 切换到远程仓库的 main 分支
git switch -c xxx : 创建并切换到新的分支
commit ..... : 进行开发
git fetch origin && git merge origin/main: 拉取远程仓库的最新代码并合并到当前分支
git push origin xxx: 推送当前分支到远程仓库
提 PR
require review: 请求review
merge: 合并 PR
delete: 删除分支


# 技术栈
构建工具 VITE 8
框架 Vue 3
UI组件库 Element Plus
图标 @element-plus/icons-vue
路由 vue router + unplugin vue router
远程状态管理 tanstack query vue
客户端状态管理 pinia 持久化中间件 pinia-plugin-persistedstate
SSE工具 VueUse
git hook,提交时自动类型检查