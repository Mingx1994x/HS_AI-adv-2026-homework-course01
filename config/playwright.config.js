const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

const ROOT_DIR = path.resolve(__dirname, '..');

// 這份設定假設 http://localhost:3001 已經是啟動好的專案（npm start / npm run dev:server），
// 因此不設定 webServer 自動啟動，避免另外開一個測試伺服器與現有伺服器搶 port 或共用不同的 DB 連線狀態。
//
// testDir / outputDir 用絕對路徑釘回專案根目錄：Playwright 預設會把這兩個路徑解析成
// 相對於「這份設定檔自己所在的資料夾」，這份設定放在 config/ 底下，若寫成相對路徑
// 會變成去找 config/test/e2e、輸出到 config/test-results，因此需要明確指回根目錄。
module.exports = defineConfig({
  testDir: path.join(ROOT_DIR, 'test/e2e'),
  outputDir: path.join(ROOT_DIR, 'test-results'),
  timeout: 120 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
