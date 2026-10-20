import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the Express API runs on 8787 and Vite proxies to it (`npm run dev` starts both).
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
      // Entry points only wire modules together; types.js and env.d.ts contain no runtime code.
      exclude: ['server/index.js', 'src/main.jsx', 'shared/types.js', 'src/env.d.ts'],
      // The build fails if coverage drops below these floors.
      thresholds: { statements: 95, branches: 88, functions: 94, lines: 95 },
    },
  },
});
