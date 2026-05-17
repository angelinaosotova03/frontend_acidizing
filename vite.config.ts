import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      '/api/v1/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/v1/predict': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v1/volumes': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
    },
  },
})
