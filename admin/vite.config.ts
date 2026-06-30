import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function resolveBackendUrl(mode: string): string {
  const env = loadEnv(mode, process.cwd(), '')
  return env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://localhost:5000'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const backendUrl = resolveBackendUrl(mode)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
