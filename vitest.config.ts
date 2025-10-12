import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage'
    },
    globals: true,
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@': `${rootDir}lib`
    }
  }
});
