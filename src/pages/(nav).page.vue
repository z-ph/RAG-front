<script setup lang="ts">
import { ElCard, ElIcon } from 'element-plus'
import { House, Document, User } from '@element-plus/icons-vue';
</script>
<template>
    <header>
        <el-card>{{ $route.meta.title }}</el-card>
    </header>
    <main>
        <router-view></router-view>
    </main>
    <footer>
        <el-icon size="24" @click="$router.push({ name: '/(nav)/' })" class="pointer">
            <House />
        </el-icon>
        <el-icon size="24" @click="$router.push({ name: '/(nav)/document' })" class="pointer">
            <Document />
        </el-icon>
        <el-icon size="24" @click="$router.push({ name: '/(nav)/auth' })" class="pointer">
            <User />
        </el-icon>
    </footer>
</template>
<style scoped>
header {
    justify-self: flex-start;
    flex-grow: 0;
}

footer {
    justify-self: flex-end;
    flex-grow: 0;
    display: flex;
    justify-content: space-around;
}

main {
    flex-grow: 1;
    overflow-x: hidden;
    width: 100%;
}

.pointer {
    cursor: pointer;
}
</style>