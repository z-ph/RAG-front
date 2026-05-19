<script setup lang="ts">
import { ref } from 'vue'
import type { Source } from '../../services/rag'

defineProps<{
  sources: Source[]
}>()

const expanded = ref(false)
</script>

<template>
  <div v-if="sources.length > 0" class="chat-sources">
    <button class="toggle-btn" @click="expanded = !expanded">
      来源 ({{ sources.length }})
      <span class="arrow" :class="{ open: expanded }">▶</span>
    </button>
    <div v-show="expanded" class="source-list">
      <a
        v-for="(src, idx) in sources"
        :key="idx"
        class="source-item"
        :href="src.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="source-index">{{ idx + 1 }}</span>
        <span class="source-title">{{ src.title }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.chat-sources {
  margin-top: 8px;
}
.toggle-btn {
  background: none;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.toggle-btn:hover {
  color: #409eff;
  border-color: #409eff;
}
.arrow {
  transition: transform 0.2s;
  font-size: 10px;
}
.arrow.open {
  transform: rotate(90deg);
}
.source-list {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #f5f7fa;
  text-decoration: none;
  font-size: 13px;
  color: #606266;
  transition: background 0.2s;
}
.source-item:hover {
  background: #ecf5ff;
  color: #409eff;
}
.source-index {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.source-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
