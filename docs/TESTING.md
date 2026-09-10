# TESTING.md

## 測試分層

所有測試都放在 `test/` 底下，依測試層級分成三個獨立目錄，各自有獨立的執行方式與設定：

| 目錄 | 層級 | 執行指令 | 設定檔 | 對象 |
|------|------|---------|--------|------|
| `test/unit/` | 單元測試 | `npm test` / `npm run test:unit` | `config/vitest.config.js` | API endpoint（用 `server.js` 匯出的 `app`，共用真正的 `database.sqlite`）+ 純函式（運費計算） |
| `test/integration/` | 整合測試 | `npm run test:integration` | `config/vitest.integration.config.js` | 完整下單流程，使用獨立的 `:memory:` SQLite，不影響真正的 DB |
| `test/e2e/` | E2E 測試 | `npm run test:e2e` | `config/playwright.config.js` | 透過瀏覽器實際操作 UI，串接綠界（ECPay）測試環境完成付款 |

三者互不相依、互不共用 process 內的資料庫連線，`config/vitest.config.js` 的 `include` 只掃 `test/unit/**`，不會誤跑到另外兩個目錄。

---

## 單元測試（`test/unit/`）

**框架**：Vitest + supertest
**設定檔**：`config/vitest.config.js`
**重要特性**：
- **循序執行**（`fileParallelism: false`）：測試檔案不可並行，避免資料庫競爭
- **全域 API**：啟用 `globals: true`，可直接使用 `describe`、`it`、`expect` 無需 import
- **Hook 超時**：10 秒（`hookTimeout: 10000`）
- **固定執行順序**：auth → products → cart → orders → adminProducts → adminOrders

### 測試檔案表

| 檔案 | 測試對象 | 主要涵蓋範圍 |
|------|---------|------------|
| `test/unit/setup.js` | 輔助函式 | `getAdminToken()`、`registerUser()` |
| `test/unit/auth.test.js` | `/api/auth/*` | 註冊（成功/重複）、登入（成功/失敗）、取得個人資料 |
| `test/unit/products.test.js` | `/api/products` | 商品列表分頁、商品詳情、404 |
| `test/unit/cart.test.js` | `/api/cart` | 訪客模式、已登入模式、庫存驗證、累加行為 |
| `test/unit/orders.test.js` | `/api/orders` | 建立訂單、空購物車錯誤、訂單查詢、模擬付款 |
| `test/unit/adminProducts.test.js` | `/api/admin/products` | CRUD、刪除保護、403 非管理員 |
| `test/unit/adminOrders.test.js` | `/api/admin/orders` | 訂單列表（含篩選）、訂單詳情 |
| `test/unit/shipping.test.js` | `src/utils/shipping.js` | 運費計算純函式，不碰資料庫、不啟動 app |

### 執行順序與依賴關係

```
config/vitest.config.js sequence:
  1. test/unit/auth.test.js           ← 最先執行，建立基礎使用者
  2. test/unit/products.test.js       ← 僅讀取，無依賴
  3. test/unit/cart.test.js           ← 需要 products 存在（種子資料）
  4. test/unit/orders.test.js         ← 需要 cart 功能可用
  5. test/unit/adminProducts.test.js  ← 需要 admin token
  6. test/unit/adminOrders.test.js    ← 需要已建立的訂單資料
     （test/unit/shipping.test.js 為純函式測試，不依賴執行順序）
```

**依賴關係說明**：
- `orders.test.js` 依賴 `cart.test.js` 執行後確認購物車功能正常（但各自使用新 user）
- `adminOrders.test.js` 依賴測試過程中建立的訂單（透過 `orders.test.js`）
- 所有測試共用同一個 `database.sqlite`，測試後不自動還原資料

### 輔助函式（test/unit/setup.js）

#### `getAdminToken()`

```javascript
async function getAdminToken() {
  const res = await request(app).post('/api/auth/login').send({
    email: process.env.ADMIN_EMAIL || 'admin@hexschool.com',
    password: process.env.ADMIN_PASSWORD || '12345678',
  });
  return res.body.data.token;
}
```

取得管理員 JWT Token，用於需要管理員身份的測試。

#### `registerUser(overrides)`

```javascript
async function registerUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
  };
  const userData = { ...defaults, ...overrides };
  const res = await request(app).post('/api/auth/register').send(userData);
  return { token: res.body.data.token, user: res.body.data.user };
}
```

自動生成唯一 email（使用時間戳）的測試使用者，避免重複衝突。

### 撰寫新單元測試的步驟

#### 1. 建立測試檔案

```javascript
// test/unit/yourFeature.test.js
import request from 'supertest';
import app from '../../server.js';  // server.js 匯出 app

describe('Your Feature', () => {
  let token;

  beforeAll(async () => {
    // 取得所需 token
    const { token: t } = await registerUser();
    token = t;
  });

  it('should do something', async () => {
    const res = await request(app)
      .get('/api/your-route')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.error).toBeNull();
    expect(res.body.data).toBeDefined();
  });
});
```

#### 2. 在 config/vitest.config.js 加入執行順序

```javascript
// config/vitest.config.js
sequence: {
  files: [
    'test/unit/auth.test.js',
    'test/unit/products.test.js',
    // ...現有檔案
    'test/unit/yourFeature.test.js',  // ← 加入適當位置
  ]
}
```

#### 3. 測試購物車（訪客模式）

```javascript
it('should add to cart as guest', async () => {
  const sessionId = 'test-session-' + Date.now();

  const res = await request(app)
    .post('/api/cart')
    .set('X-Session-Id', sessionId)
    .send({ productId: existingProductId, quantity: 1 })
    .expect(200);

  expect(res.body.data.quantity).toBe(1);
});
```

#### 4. 測試需要管理員的端點

```javascript
describe('Admin endpoint', () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('should return 403 for regular user', async () => {
    const { token } = await registerUser();
    await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('should work for admin', async () => {
    await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
```

### 常見陷阱

#### 1. Email 重複導致測試失敗

測試中建立使用者必須使用唯一 Email，直接使用 `registerUser()` 輔助函式（自動加時間戳）。**不要** 在多個測試中寫死相同 Email。

```javascript
// ❌ 錯誤
await request(app).post('/api/auth/register').send({ email: 'test@test.com', ... });

// ✅ 正確
const { token } = await registerUser();
```

#### 2. 並行執行導致資料庫衝突

**絕對不要** 將 `fileParallelism` 改為 `true`，本專案測試共享同一個資料庫，並行執行必然導致競爭條件。

#### 3. 測試依賴執行順序

若將新測試放在錯誤位置，可能找不到前面測試建立的資料。注意：

- 需要種子商品 → 放在 `products.test.js` 之後
- 需要已存在的訂單 → 放在 `orders.test.js` 之後

#### 4. 購物車狀態殘留

訂單建立後會清空購物車。若測試先建立訂單，後續測試的購物車可能是空的。每個需要購物車的測試應自行加入商品。

#### 5. server.js 的 JWT_SECRET 驗證

測試啟動 app 前，需確保 `.env` 存在且 `JWT_SECRET` 已設定，否則 server.js 會拋錯而非匯出 app。

```bash
# 確認 .env 存在
cp .env.example .env
# 並設定 JWT_SECRET
```

#### 6. supertest 與 app 的引入方式

```javascript
import request from 'supertest';
import app from '../../server.js';   // server.js 用 module.exports = app

// 注意：server.js 同時啟動 listen()，測試時 supertest 會接管 port
// 不會與另一個正在運行的 server 衝突（supertest 使用隨機 port）
```

---

## 整合測試（`test/integration/`）

**框架**：Vitest + supertest
**設定檔**：`config/vitest.integration.config.js`（`include: ['test/integration/**/*.test.js']`）
**與單元測試的差異**：`test/integration/setup.js` 在 require app 之前就把 `process.env.DATABASE_PATH` 指向 `:memory:`，完全不會碰到專案真正的 `database.sqlite`，因此可以獨立執行、互不干擾。

| 檔案 | 涵蓋範圍 |
|------|---------|
| `test/integration/setup.js` | 建立記憶體 DB 的 app 實例、`registerUser()`、`getProduct()`、`setProductStock()` |
| `test/integration/checkout.test.js` | 加入購物車 → 建立訂單 → 運費/總額計算，驗證多個模組串起來的完整下單流程 |

新增整合測試檔案時，統一放在 `test/integration/`，`config/vitest.integration.config.js` 的 glob 會自動抓到，不需要額外設定執行順序。

---

## E2E 測試（`test/e2e/`）

**框架**：Playwright（`@playwright/test`）
**設定檔**：`config/playwright.config.js`（`testDir`/`outputDir` 用絕對路徑釘回專案根目錄的 `test/e2e`、`test-results`，因為 Playwright 預設會把這兩個路徑解析成相對於設定檔自己所在的資料夾）
**重要前提**：假設 `http://localhost:3001` 已經是啟動好的專案（`npm start` 或 `npm run dev:server`），設定檔**不會**自動啟動另一個測試伺服器。

| 檔案 | 涵蓋範圍 |
|------|---------|
| `test/e2e/checkout-payment.spec.js` | 登入 → 隨機加入商品到購物車 → 結帳 → 綠界測試環境網路ATM（台灣土地銀行）付款 → 驗證訂單「已付款」/`status === 'paid'` |

**注意事項**：
- 帳密使用預先存在資料庫的測試帳號：`admin@hexschool.com` / `12345678`
- 測試開始時會先用 API 清空該帳號購物車裡的殘留項目，確保每次執行都是乾淨狀態
- ECPay 為測試環境網域 `payment-stage.ecpay.com.tw` / `pay-stage.ecpay.com.tw`，純模擬交易不會產生實際金流
- 付款完成後的截圖存到 `.playwright-mcp/screen_shot/`（已在 `.gitignore` 中排除）

---

## 執行測試

```bash
# 單元測試（test/unit/**，循序、非互動）
npm test
npm run test:unit          # 與 npm test 等價，明確指定 test/unit 目錄

# 單一單元測試檔案
npx vitest run test/unit/auth.test.js

# 整合測試（test/integration/**，獨立 :memory: DB）
npm run test:integration

# E2E 測試（test/e2e/**，需先自行啟動 http://localhost:3001）
npm run test:e2e

# 觀察模式（檔案改動自動重跑，僅適用單元測試）
npx vitest
```

**注意**：`npm test` 使用 `vitest run`（非互動、一次性執行）。若使用 `npx vitest`（無 run）則進入觀察模式，測試檔案順序仍由 `config/vitest.config.js` 控制。
