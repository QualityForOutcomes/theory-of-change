import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        // Ensure CORS-like headers for dev
        configure: (proxy, _options) => {
          // Reflect the requesting origin to avoid port mismatches (5173 vs 5174)
          proxy.on('proxyRes', (proxyRes, req) => {
            const origin = req.headers['origin'] || 'http://localhost:5173';
            proxyRes.headers['Access-Control-Allow-Origin'] = origin;
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
          });
        },
      },
    },
  },
})
