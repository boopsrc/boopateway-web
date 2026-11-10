import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://192.168.0.7:31800'
  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          // O reconhecimento facial no parceiro pode demorar.
          timeout: 60_000,
          proxyTimeout: 60_000,
        },
      },
    },
    preview: { proxy: { '/api': { target, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } } },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
