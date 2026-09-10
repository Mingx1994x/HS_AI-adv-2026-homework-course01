import { defineConfig } from 'vitest/config';

// 專案原有的 API 測試（test/unit/api/**，2026-04-07 init commit 就存在），是 npm test 的預設對象。
// 這些測試打真實的 app + database.sqlite，且互有資料依賴（見 sequence.files 的順序），不可平行執行。
export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: ['test/unit/api/**/*.test.js'],
    sequence: {
      files: [
        'test/unit/api/auth.test.js',
        'test/unit/api/products.test.js',
        'test/unit/api/cart.test.js',
        'test/unit/api/orders.test.js',
        'test/unit/api/adminProducts.test.js',
        'test/unit/api/adminOrders.test.js',
      ],
    },
    hookTimeout: 10000,
  },
});
