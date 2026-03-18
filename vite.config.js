import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // piper-tts-web is optional — loaded dynamically at runtime
      external: ['piper-tts-web'],
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'mammoth'],
    exclude: ['piper-tts-web'],
  },
});
