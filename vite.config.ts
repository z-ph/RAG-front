import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const randomString = '/asdfasdf'
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
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
