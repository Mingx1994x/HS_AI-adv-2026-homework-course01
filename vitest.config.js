import { defineConfig, defaultExclude } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    // test/integration/** 有自己的 vitest.integration.config.js（獨立 :memory: DB），
    // 這裡明確排除，避免被這份預設設定（npm test / npm run test:unit）意外掃到、共用 process.env
    exclude: [...defaultExclude, 'test/integration/**'],
    sequence: {
      files: [
        'tests/auth.test.js',
        'tests/products.test.js',
        'tests/cart.test.js',
        'tests/orders.test.js',
        'tests/adminProducts.test.js',
        'tests/adminOrders.test.js',
      ],
    },
    hookTimeout: 10000,
  },
});
