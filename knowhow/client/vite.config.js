import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        disable: process.env.NODE_ENV === 'development',
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\/api\/knowledge/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'knowledge-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
              }
            }
          ]
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'knowhow-icon.svg'],
        manifest: false
      })
    ],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: process.env.VITE_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('[Vite Proxy] Error:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('[Vite Proxy]', req.method, req.url, '->', proxyReq.path);
            });
          }
        }
      }
    },
    build: {
      sourcemap: true
    },
    define: {
      __DEV__: process.env.NODE_ENV !== 'production'
    }
  }
})
