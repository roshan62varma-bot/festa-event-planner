import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the Express API runs on 8787 (`npm run dev`) and Vite proxies to it.
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
    coverage: {
      include: ['shared/**', 'server/**', 'src/**'],
      exclude: ['server/index.js', 'src/main.jsx'],
    },
  },
});
