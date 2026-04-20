import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@oil-qa-c/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@oil-qa-c/api': path.resolve(__dirname, '../../packages/api/src'),
      '@oil-qa-c/store': path.resolve(__dirname, '../../packages/store/src'),
      '@oil-qa-c/business': path.resolve(__dirname, '../../packages/business/src'),
      '@oil-qa-c/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@oil-qa-c/wasm-sdk': path.resolve(__dirname, '../../packages/wasm-sdk/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 本地开发默认把 /api 请求转发到 Spring Boot，避免前端直接命中 5173 导致 404。
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
