import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El build se genera dentro de backend/public para que PHP sirva todo junto.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8000', '/img': 'http://localhost:8000', '/uploads': 'http://localhost:8000' },
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: false,
    assetsDir: 'assets',
    target: 'es2019',
    cssCodeSplit: true,
  },
});
