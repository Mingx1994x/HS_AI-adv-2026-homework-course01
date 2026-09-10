# DEVELOPMENT.md

## 環境變數表

| 變數 | 用途 | 必要性 | 預設值 |
|------|------|--------|--------|
| `JWT_SECRET` | JWT HS256 簽名金鑰 | **必填**（缺少無法啟動） | 無 |
| `PORT` | Express 監聽 port | 選填 | `3001` |
| `NODE_ENV` | 環境識別（影響 bcrypt rounds） | 選填 | 無 |
| `BASE_URL` | 伺服器基礎 URL | 選填 | `http://localhost:3001` |
| `FRONTEND_URL` | CORS 允許的前端 URL | 選填 | `http://localhost:5173` |
| `ADMIN_EMAIL` | 種子管理員帳號 Email | 選填 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | 種子管理員密碼 | 選填 | `12345678` |
| `ECPAY_MERCHANT_ID` | 綠界金流商店代號 | **必填**（金流功能） | `3002607`（測試） |
| `ECPAY_HASH_KEY` | 綠界金流 Hash Key | **必填**（金流功能） | `pwFHCqoQZGmho4w6`（測試） |
| `ECPAY_HASH_IV` | 綠界金流 Hash IV | **必填**（金流功能） | `EkRm7iFT261dpevs`（測試） |
| `ECPAY_ENV` | 綠界環境（`staging` 或 `production`） | 選填 | `staging` |

**重要**：`NODE_ENV=test` 時，bcrypt salt rounds 降為 1（加速測試）；生產環境為 10。

---

## 命名規則對照表

### 資料庫

| 對象 | 規則 | 範例 |
|------|------|------|
| 表名 | 小寫英文，描述性 | `users`, `cart_items`, `order_items` |
| 欄位名 | `snake_case` | `user_id`, `product_name`, `created_at` |
| 主鍵 | `TEXT` 型別，UUID 值 | `id TEXT PRIMARY KEY` |
| 外鍵 | `{table_singular}_id` | `user_id`, `product_id`, `order_id` |
| 時間戳 | ISO 8601，SQLite `datetime('now')` | `created_at`, `updated_at` |

### API

| 對象 | 規則 | 範例 |
|------|------|------|
| URL 路徑 | `kebab-case` | `/api/auth`, `/api/admin/orders` |
| 查詢參數 | `camelCase` | `?page=1&limit=10&status=pending` |
| Request Body 欄位 | `camelCase` | `recipientName`, `productId`, `imageUrl` |
| Response Body 欄位 | `snake_case`（對應 DB） | `user_id`, `total_amount`, `created_at` |
| 錯誤碼（error 欄位） | `UPPER_SNAKE_CASE` | `VALIDATION_ERROR`, `NOT_FOUND` |

### 後端程式碼

| 對象 | 規則 | 範例 |
|------|------|------|
| 路由檔案 | `camelCase` + `Routes` 後綴 | `authRoutes.js`, `adminOrderRoutes.js` |
| Middleware 檔案 | `camelCase` + `Middleware` 後綴 | `authMiddleware.js`, `sessionMiddleware.js` |
| 函式名 | `camelCase` | `getAdminToken()`, `registerUser()` |
| 常數 | `UPPER_SNAKE_CASE` | 無特別使用，通常直接用 `process.env.*` |

### 前端程式碼

| 對象 | 規則 | 範例 |
|------|------|------|
| 頁面 JS 檔案 | `kebab-case`，對應 EJS 頁面名 | `admin-products.js`, `product-detail.js` |
| Vue 資料/方法 | `camelCase` | `products`, `currentPage`, `addToCart()` |
| localStorage key | `snake_case`，`flower_` 前綴 | `flower_token`, `flower_user`, `flower_session_id` |
| CSS 自訂變數 | `kebab-case`，`--color-` 前綴 | `--color-rose-primary`, `--color-text-primary` |
| EJS 樣板檔案 | `kebab-case` | `product-detail.ejs`, `admin-orders.ejs` |

---

## 模組系統說明

本專案使用 **CommonJS（require/module.exports）**，非 ES Modules。

```javascript
// 正確：CommonJS
const express = require('express');
const { getDb } = require('../database');
module.exports = router;

// 錯誤：不要使用 ESM
import express from 'express';  // ❌
export default router;          // ❌
```

前端 JS（`public/js/`）為瀏覽器環境，直接掛載全域變數，不使用模組系統：

```javascript
// 前端全域物件範例（api.js, auth.js 都以全域方式暴露）
window.apiFetch = async function(url, options) { ... };
const Auth = { getToken() {...}, setToken() {...} };
```

---

## 新增 API 端點步驟

1. **選擇或新增路由檔案**（`src/routes/`）

   - 一般使用者功能 → `productRoutes.js`、`orderRoutes.js` 等
   - 管理員功能 → `adminProductRoutes.js`、`adminOrderRoutes.js`

2. **加入 middleware**

   ```javascript
   // 需要登入
   router.get('/some-route', authMiddleware, (req, res) => {...});

   // 需要管理員
   router.get('/admin/some-route', authMiddleware, adminMiddleware, (req, res) => {...});

   // 購物車雙模式（照 cartRoutes.js 的 dualAuth 模式）
   router.get('/cart', dualAuth, (req, res) => {...});
   ```

3. **加入 JSDoc 與 Swagger 標記**（維護 OpenAPI 文件）

   ```javascript
   /**
    * @swagger
    * /api/your-route:
    *   get:
    *     summary: 功能摘要
    *     tags: [TagName]
    *     security:
    *       - bearerAuth: []
    *     responses:
    *       200:
    *         description: 成功回應
    */
   router.get('/your-route', authMiddleware, handler);
   ```

4. **在 `app.js` 掛載路由**（若為新檔案）

   ```javascript
   const yourRoutes = require('./src/routes/yourRoutes');
   app.use('/api', yourRoutes);
   ```

5. **撰寫測試**（`test/unit/your.test.js`），並更新 `config/vitest.config.js` 的 `sequence.files`

---

## 新增 Middleware 步驟

1. 在 `src/middleware/` 新增 `yourMiddleware.js`

   ```javascript
   function yourMiddleware(req, res, next) {
     // 驗證邏輯
     if (條件不符) {
       return res.status(403).json({
         data: null,
         error: 'FORBIDDEN',
         message: '無權限存取'
       });
     }
     next();
   }
   module.exports = yourMiddleware;
   ```

2. 在路由中引入並使用

---

## 新增資料庫資料表步驟

1. 在 `src/database.js` 的 `CREATE TABLE` 區段新增 DDL

   ```javascript
   db.exec(`
     CREATE TABLE IF NOT EXISTS your_table (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       created_at TEXT NOT NULL DEFAULT (datetime('now'))
     );
   `);
   ```

2. 確保外鍵關係正確（已全局啟用 `foreign_keys = ON`）

3. 若需種子資料，在 `database.js` 的種子函式區段新增插入邏輯

4. 重新啟動伺服器後自動建立資料表（`CREATE TABLE IF NOT EXISTS`）

---

## JSDoc 格式說明與範例

所有路由 handler 應附上 Swagger JSDoc，以維護 OpenAPI 文件。

### 基本格式

```javascript
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 取得商品列表
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 頁碼
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: 每頁數量
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                     pagination:
 *                       type: object
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 */
```

### 需要認證的端點

```javascript
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: 建立訂單
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientName, recipientEmail, recipientAddress]
 *             properties:
 *               recipientName:
 *                 type: string
 *               recipientEmail:
 *                 type: string
 *               recipientAddress:
 *                 type: string
 *     responses:
 *       201:
 *         description: 訂單建立成功
 *       400:
 *         description: 購物車為空或庫存不足
 *       401:
 *         description: 未認證
 */
```

### 雙模式認證（購物車）

```javascript
/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: 取得購物車
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *       - sessionId: []
 */
```

---

## 計畫歸檔流程

功能開發時，應先建立計畫文件，完成後歸檔。

### 1. 計畫檔案命名格式

```
docs/plans/YYYY-MM-DD-<feature-name>.md
```

範例：
- `docs/plans/2026-04-18-cart-merge.md`
- `docs/plans/2026-05-01-ecpay-integration.md`

### 2. 計畫文件結構

```markdown
# 功能名稱

## User Story
As a <角色>, I want to <目標>, so that <原因>

## Spec（規格）
- 技術決策說明
- API 端點定義
- DB schema 異動
- 邊界條件

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
```

### 3. 功能完成後

1. 移至 `docs/plans/archive/`：
   ```bash
   mv docs/plans/2026-04-18-cart-merge.md docs/plans/archive/
   ```

2. 更新 `docs/FEATURES.md`：將功能狀態標記為 ✅ 完成，補充行為描述

3. 更新 `docs/CHANGELOG.md`：新增版本記錄

---

## 常見開發注意事項

### 價格欄位
`price`、`product_price`、`total_amount` 均為整數（cents 設計，實際呈現為台幣整數）。前端若需顯示千分位：

```javascript
const formatted = (price / 1).toLocaleString('zh-TW');  // 1680 → "1,680"
```

### 訂單交易安全
訂單建立必須用 `db.transaction()`，確保庫存扣減與訂單建立的原子性。不可分開執行。

### 測試環境的資料庫
測試使用同一個 `database.sqlite` 檔案。每次執行測試前，`setup.js` 不自動清空資料庫，各測試自行建立唯一 email 的使用者以避免衝突。

### EJS 樣板引入 Vue
前台頁面的 EJS layout（`views/layouts/front.ejs`）已引入 Vue 3 CDN，頁面 JS 可直接使用 `Vue.createApp()`。
