import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  // tên repo của bạn:
  const repoBase = '/H-th-ng-ch-m-i-m-Speaking---Ti-ng-Anh-Ms-H-ng/'

  const definedEnv = {
    'import.meta.env.VITE_APPS_SCRIPT_URL': JSON.stringify(env.VITE_APPS_SCRIPT_URL ?? ''),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY ?? '')
  }

  return {
    base: repoBase,
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') }
    },
    define: definedEnv,
    server: { host: '0.0.0.0', port: 5173 },
    build: { outDir: 'dist' }
  }
})
