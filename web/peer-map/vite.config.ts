import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@location-emitter/packet': path.resolve(__dirname, '../../shared/packet/src/index.ts'),
      '@location-emitter/mesh': path.resolve(__dirname, '../../shared/mesh/src/index.ts'),
    },
  },
  server: { port: 5173 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'manifest.webmanifest'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z0-9.-]+\.tile\.openstreetmap\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 160, maxAgeSeconds: 43200 },
            },
          },
          {
            urlPattern: /^https:\/\/[a-z0-9.-]+\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'carto-tiles',
              expiration: { maxEntries: 160, maxAgeSeconds: 43200 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
