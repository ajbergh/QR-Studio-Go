import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode === 'development',
    target: 'es2022',
  },
  define: {
    __WAILS_MODE__: JSON.stringify(process.env.WAILS_BUILD === 'true'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      wailsjs: path.resolve(__dirname, './wailsjs'),
    },
  },
}));
