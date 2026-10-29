import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'karol-learn',
        short_name: 'karol-learn',
        description: 'Kurze Lern-Sessions für AI Engineering und Forward Deployed Engineering.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f2f2f7',
        theme_color: '#f2f2f7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
        runtimeCaching: [
          { urlPattern: /inhalt\/index\.json$/, handler: 'NetworkFirst', options: { cacheName: 'inhalt' } },
          // Themenbilder: einmal geladen, danach offline aus dem Cache (Handy ohne Netz).
          {
            urlPattern: /inhalt\/bilder\/[a-z0-9-]+\.webp$/,
            handler: 'CacheFirst',
            options: { cacheName: 'themenbilder', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 90 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  server: { host: '127.0.0.1', port: 5180 },
  build: { target: 'es2022', sourcemap: false },
});
