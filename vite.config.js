// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['kokoro-js'],
  },
  test: {
    environment: 'jsdom',
  },
});
