import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import VueRouter from 'unplugin-vue-router/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const randomString = '/asdfasdf'
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      VueRouter({
        routesFolder: 'src/pages',
        extensions: ['.page.vue'],
        dts: "./src/typed-router.d.ts",
      }),
      vue()
    ],
    server: {
      proxy: {
        [randomString]: {
          target: env.VITE_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(randomString, '')
        }
      }
    }
  }
})
