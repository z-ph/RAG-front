<template>
    <h1>hello 这里是/页面，index.page.vue</h1>
    <button @click="handleClick">跳转到auth</button>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter()
const handleClick = () => {
    router.push({ name: '/(nav)/auth' })
}
definePage({
  meta: {
    title: "首页",
  }
})
</script>
