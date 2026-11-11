import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'https://apipay.depois.click'
  // A câmera (getUserMedia) só existe em contexto seguro: no celular, via IP da rede, precisa de HTTPS.
  const https = env.VITE_HTTPS !== 'false'
  return {
    plugins: [react(), ...(https ? [basicSsl()] : [])],
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
