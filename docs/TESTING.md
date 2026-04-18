# TESTING.md

## 測試設定

**框架**：Vitest + supertest  
**設定檔**：`vitest.config.js`  
**重要特性**：
- **循序執行**（`fileParallelism: false`）：測試檔案不可並行，避免資料庫競爭
- **全域 API**：啟用 `globals: true`，可直接使用 `describe`、`it`、`expect` 無需 import
- **Hook 超時**：10 秒（`hookTimeout: 10000`）
- **固定執行順序**：auth → products → cart → orders → adminProducts → adminOrders

---

## 測試檔案表

| 檔案 | 測試對象 | 主要涵蓋範圍 |
|------|---------|------------|
| `tests/setup.js` | 輔助函式 | `getAdminToken()`、`registerUser()` |
| `tests/auth.test.js` | `/api/auth/*` | 註冊（成功/重複）、登入（成功/失敗）、取得個人資料 |
| `tests/products.test.js` | `/api/products` | 商品列表分頁、商品詳情、404 |
| `tests/cart.test.js` | `/api/cart` | 訪客模式、已登入模式、庫存驗證、累加行為 |
| `tests/orders.test.js` | `/api/orders` | 建立訂單、空購物車錯誤、訂單查詢、模擬付款 |
| `tests/adminProducts.test.js` | `/api/admin/products` | CRUD、刪除保護、403 非管理員 |
| `tests/adminOrders.test.js` | `/api/admin/orders` | 訂單列表（含篩選）、訂單詳情 |

---

## 執行順序與依賴關係

```
vitest.config.js sequence:
  1. tests/auth.test.js           ← 最先執行，建立基礎使用者
  2. tests/products.test.js       ← 僅讀取，無依賴
  3. tests/cart.test.js           ← 需要 products 存在（種子資料）
  4. tests/orders.test.js         ← 需要 cart 功能可用
  5. tests/adminProducts.test.js  ← 需要 admin token
  6. tests/adminOrders.test.js    ← 需要已建立的訂單資料
```

**依賴關係說明**：
- `orders.test.js` 依賴 `cart.test.js` 執行後確認購物車功能正常（但各自使用新 user）
- `adminOrders.test.js` 依賴測試過程中建立的訂單（透過 `orders.test.js`）
- 所有測試共用同一個 `database.sqlite`，測試後不自動還原資料

---

## 輔助函式（tests/setup.js）

### `getAdminToken()`

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

### `registerUser(overrides)`

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

---

## 撰寫新測試的步驟

### 1. 建立測試檔案

```javascript
// tests/yourFeature.test.js
import request from 'supertest';
import app from '../server.js';  // server.js 匯出 app

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

### 2. 在 vitest.config.js 加入執行順序

```javascript
// vitest.config.js
sequence: {
  setupFiles: [
    'tests/auth.test.js',
    'tests/products.test.js',
    // ...現有檔案
    'tests/yourFeature.test.js',  // ← 加入適當位置
  ]
}
```

### 3. 測試購物車（訪客模式）

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

### 4. 測試需要管理員的端點

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

---

## 常見陷阱

### 1. Email 重複導致測試失敗

測試中建立使用者必須使用唯一 Email，直接使用 `registerUser()` 輔助函式（自動加時間戳）。**不要** 在多個測試中寫死相同 Email。

```javascript
// ❌ 錯誤
await request(app).post('/api/auth/register').send({ email: 'test@test.com', ... });

// ✅ 正確
const { token } = await registerUser();
```

### 2. 並行執行導致資料庫衝突

**絕對不要** 將 `fileParallelism` 改為 `true`，本專案測試共享同一個資料庫，並行執行必然導致競爭條件。

### 3. 測試依賴執行順序

若將新測試放在錯誤位置，可能找不到前面測試建立的資料。注意：

- 需要種子商品 → 放在 `products.test.js` 之後
- 需要已存在的訂單 → 放在 `orders.test.js` 之後

### 4. 購物車狀態殘留

訂單建立後會清空購物車。若測試先建立訂單，後續測試的購物車可能是空的。每個需要購物車的測試應自行加入商品。

### 5. server.js 的 JWT_SECRET 驗證

測試啟動 app 前，需確保 `.env` 存在且 `JWT_SECRET` 已設定，否則 server.js 會拋錯而非匯出 app。

```bash
# 確認 .env 存在
cp .env.example .env
# 並設定 JWT_SECRET
```

### 6. supertest 與 app 的引入方式

```javascript
import request from 'supertest';
import app from '../server.js';   // server.js 用 module.exports = app

// 注意：server.js 同時啟動 listen()，測試時 supertest 會接管 port
// 不會與另一個正在運行的 server 衝突（supertest 使用隨機 port）
```

---

## 執行測試

```bash
# 執行所有測試
npm test

# 執行單一測試檔案
npx vitest run tests/auth.test.js

# 觀察模式（檔案改動自動重跑）
npx vitest
```

**注意**：`npm test` 使用 `vitest run`（非互動、一次性執行）。若使用 `npx vitest`（無 run）則進入觀察模式，測試檔案順序仍由 `vitest.config.js` 控制。
