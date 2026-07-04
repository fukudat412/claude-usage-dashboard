import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 30000,
    host: true, // Docker内からのアクセスを許可
    proxy: {
      '/api': 'http://localhost:30001',
    },
  },
  build: {
    outDir: 'build', // server.js が build/ を配信する
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
