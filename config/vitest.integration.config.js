import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: ['test/integration/**/*.test.js'],
    hookTimeout: 10000,
    testTimeout: 15000,
  },
});
