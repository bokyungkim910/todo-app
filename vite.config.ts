import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // Capacitor 호환성을 위한 설정
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    // Capacitor live reload 설정
    host: true,
    port: 5173,
    strictPort: true,
  },
  // 모바일에서 상대 경로 사용
  base: './',
})
