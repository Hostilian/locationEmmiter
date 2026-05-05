import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@location-emitter/packet': path.resolve(__dirname, '../../shared/packet/src/index.ts'),
      '@location-emitter/mesh': path.resolve(__dirname, '../../shared/mesh/src/index.ts'),
    },
  },
  server: { port: 5173 },
});
