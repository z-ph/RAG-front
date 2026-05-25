<script setup lang="ts">
import { ElIcon } from 'element-plus'
import { House, Document, User } from '@element-plus/icons-vue'

const tabs = [
  { route: '/(nav)/' as const, icon: House, label: '首页' },
  { route: '/(nav)/document' as const, icon: Document, label: '文档' },
  { route: '/(nav)/auth' as const, icon: User, label: '我的' },
] as const
</script>

<template>
  <header class="app-header">
    <h1 class="header-title">{{ $route.meta.title }}</h1>
  </header>

  <main class="app-main">
    <router-view />
  </main>

  <footer class="bottom-nav">
    <router-link
      v-for="tab in tabs"
      :key="tab.route"
      :to="{ name: tab.route }"
      class="nav-item"
      replace
    >
      <el-icon :size="22"><component :is="tab.icon" /></el-icon>
      <span class="nav-label">{{ tab.label }}</span>
    </router-link>
  </footer>
</template>

<style scoped>
/* ── Header ── */
.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* ── Main content ── */
.app-main {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Bottom nav ── */
.bottom-nav {
  flex-shrink: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  min-height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
}

.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 48px;
  padding: 4px 0;
  color: var(--el-text-color-secondary);
  text-decoration: none;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* Active indicator bar */
.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 24px;
  height: 2px;
  background: var(--el-color-primary);
  transform: translateX(-50%) scaleX(0);
  transition: transform 0.2s;
}

.nav-item.router-link-exact-active {
  color: var(--el-color-primary);
}

.nav-item.router-link-exact-active::before {
  transform: translateX(-50%) scaleX(1);
}

.nav-label {
  margin-top: 2px;
  font-size: 11px;
}

@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-item::before {
    transition: none;
  }
}
</style>
