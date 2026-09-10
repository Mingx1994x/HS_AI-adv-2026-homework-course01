import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    // 只掃 test/unit/**：test/integration/** 有自己的 vitest.integration.config.js（獨立 :memory: DB），
    // test/e2e/** 是 Playwright（npm run test:e2e）的測試，都不該被這份預設設定（npm test）掃到
    include: ['test/unit/**/*.test.js'],
    sequence: {
      files: [
        'test/unit/auth.test.js',
        'test/unit/products.test.js',
        'test/unit/cart.test.js',
        'test/unit/orders.test.js',
        'test/unit/adminProducts.test.js',
        'test/unit/adminOrders.test.js',
      ],
    },
    hookTimeout: 10000,
  },
});
