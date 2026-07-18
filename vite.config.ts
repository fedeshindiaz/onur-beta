import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globIgnores: ['**/ocr/**'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: ['onur-mark.svg', 'onur-192.png', 'onur-512.png'],
      manifest: {
        name: 'ONUr Beta',
        short_name: 'ONUr',
        description: 'Herramienta profesional de entrenamiento vestíbulo-visual.',
        theme_color: '#123238',
        background_color: '#f4f7f6',
        display: 'standalone',
        lang: 'es',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'onur-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'onur-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'onur-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
