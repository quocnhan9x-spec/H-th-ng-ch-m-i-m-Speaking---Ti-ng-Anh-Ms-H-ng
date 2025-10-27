// vite.config.ts
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Đọc biến môi trường (ưu tiên VITE_* theo chuẩn Vite)
  const env = loadEnv(mode, process.cwd(), '')

  // ⚠️ PHẢI khớp 100% với tên repo GitHub của bạn
  const repoBase = '/H-th-ng-ch-m-i-m-Speaking---Ti-ng-Anh-Ms-H-ng/'

  // Expose 2 biến hay dùng (tùy code của bạn):
  // - VITE_APPS_SCRIPT_URL: URL Web App Apps Script
  // - VITE_GEMINI_API_KEY:  API key (nếu dùng)
  const definedEnv = {
    'import.meta.env.VITE_APPS_SCRIPT_URL': JSON.stringify(env.VITE_APPS_SCRIPT_URL ?? ''),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? '')
  }

  return {
    base: repoBase,                 // bắt buộc cho GitHub Pages
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src') // dùng '@/...' trong import
      }
    },
    define: definedEnv,             // đảm bảo có giá trị khi build CI
    server: {
      host: '0.0.0.0',
      port: 5173                    // mặc định của Vite (có thể đổi tùy bạn)
    },
    build: {
      outDir: 'dist'                // thư mục xuất build
    }
  }
})
