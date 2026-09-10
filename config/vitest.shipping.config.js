import { defineConfig } from 'vitest/config';

// 這幾天才新增的 shipping 模組單元測試，獨立於專案原有的 API 測試（見 config/vitest.config.js），
// 用 npm run test:unit 執行
export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: ['test/unit/shipping/**/*.test.js'],
    hookTimeout: 10000,
  },
});
