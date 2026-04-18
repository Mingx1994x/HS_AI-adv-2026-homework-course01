# FEATURES.md

## 功能完成狀態

| 功能區塊 | 狀態 | 說明 |
|---------|------|------|
| 使用者認證 | ✅ 完成 | 註冊、登入、JWT、個人資料 |
| 商品瀏覽 | ✅ 完成 | 商品列表（分頁）、商品詳情 |
| 購物車（訪客） | ✅ 完成 | Session ID 雙模式支援 |
| 購物車（已登入） | ✅ 完成 | JWT Bearer 模式 |
| 結帳與訂單建立 | ✅ 完成 | 含庫存扣減 Transaction |
| 訂單查詢 | ✅ 完成 | 列表 + 詳情 |
| 綠界 ECPay AIO 金流 | ✅ 完成 | 本地端主動 QueryTradeInfo 驗證 |
| 後台商品管理 | ✅ 完成 | CRUD + 商品刪除保護 |
| 後台訂單管理 | ✅ 完成 | 查看 + 狀態篩選（僅讀） |
| 模擬付款 | ❌ 已移除 | 由綠界金流取代 |
| 訪客購物車合併 | ❌ 未實作 | 登入後不自動合併 |
| 訂單取消/退款 | ❌ 未實作 | 無對應 API |

---

## 使用者認證

**檔案**：`src/routes/authRoutes.js`

### 行為描述

**註冊（POST /api/auth/register）**

接受 `email`、`password`、`name`。Email 格式驗證使用 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`，密碼至少 6 字元。密碼以 bcrypt 雜湊（生產 10 輪，測試 1 輪）。成功建立使用者後，同時回傳 JWT Token，無需再次登入。重複 Email 回傳 409 CONFLICT。

**登入（POST /api/auth/login）**

接受 `email`、`password`。以 bcrypt compare 驗證。成功回傳使用者資訊（不含密碼雜湊）與 JWT Token。密碼錯誤回傳 401。

**個人資料（GET /api/auth/profile）**

需 JWT Bearer Token。回傳目前使用者的 id、email、name、role、created_at。

### 端點規格

| 端點 | 必填欄位 | 選填欄位 | 成功回應 |
|------|---------|---------|---------|
| POST /register | email, password, name | - | 201: { user, token } |
| POST /login | email, password | - | 200: { user, token } |
| GET /profile | - | - | 200: user object |

### 錯誤情境

| 情境 | 狀態碼 | error |
|------|--------|-------|
| 缺少必填欄位 | 400 | VALIDATION_ERROR |
| Email 格式錯誤 | 400 | VALIDATION_ERROR |
| 密碼少於 6 字元 | 400 | VALIDATION_ERROR |
| Email 已被使用 | 409 | CONFLICT |
| 密碼錯誤 | 401 | UNAUTHORIZED |
| 無 Token 或 Token 無效 | 401 | UNAUTHORIZED |

---

## 商品瀏覽

**檔案**：`src/routes/productRoutes.js`

### 行為描述

**商品列表（GET /api/products）**

公開端點，無需認證。支援分頁查詢，預設 page=1、limit=10，最大 limit=100。回傳商品陣列與 pagination 物件（`{ page, limit, total, totalPages }`）。依 `created_at` 降冪排列。

**商品詳情（GET /api/products/:id）**

公開端點。回傳單一商品完整資訊，含 description、stock、image_url。id 不存在回傳 404。

### 端點規格

| 端點 | 查詢參數 | 成功回應 |
|------|---------|---------|
| GET /api/products | page（預設1）, limit（預設10, 最大100）| 200: { products[], pagination } |
| GET /api/products/:id | - | 200: product object |

### 分頁回應結構

```json
{
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "totalPages": 1
    }
  },
  "error": null,
  "message": "取得商品列表成功"
}
```

---

## 購物車

**檔案**：`src/routes/cartRoutes.js`

### 行為描述

**雙模式認證機制**

購物車支援兩種擁有者識別方式：
- **已登入使用者**：Authorization Bearer Token → 使用 `user_id` 識別購物車
- **訪客**：X-Session-Id Header → 使用 `session_id` 識別購物車

兩組資料完全獨立，**不自動合併**。前端自動生成並儲存 UUID 作為 session ID（`flower_session_id`），每次請求均附帶。

**加入購物車（POST /api/cart）**

接受 `productId`、`quantity`（整數，需 > 0）。若購物車中已存在此商品，**累加數量**（不新增列）。加入前驗證：商品是否存在 + 目前購物車數量 + 新增數量 <= 商品庫存。超出庫存回傳 400 STOCK_INSUFFICIENT。

**查看購物車（GET /api/cart）**

回傳購物車商品列表，每項包含商品詳情（名稱、價格、圖片）與數量。同時回傳 `total`（總金額 = 各商品 price × quantity 加總）。

**更新數量（PATCH /api/cart/:itemId）**

接受 `quantity`（正整數）。驗證新數量 <= 商品現有庫存。只有購物車擁有者可更新（確認 user_id 或 session_id 匹配）。

**移除商品（DELETE /api/cart/:itemId）**

只有購物車擁有者可移除。itemId 不存在或不屬於當前擁有者回傳 404。

### 端點規格

| 端點 | 認證 | Body / 查詢 | 成功回應 |
|------|------|------------|---------|
| GET /api/cart | JWT 或 Session | - | 200: { items[], total } |
| POST /api/cart | JWT 或 Session | productId, quantity | 200: { id, product_id, quantity } |
| PATCH /api/cart/:itemId | JWT 或 Session | quantity | 200: 更新後的 item |
| DELETE /api/cart/:itemId | JWT 或 Session | - | 200: 成功訊息 |

### 錯誤情境

| 情境 | 狀態碼 | error |
|------|--------|-------|
| 商品不存在 | 404 | NOT_FOUND |
| 庫存不足 | 400 | STOCK_INSUFFICIENT |
| Cart Item 不存在或不屬於當前使用者 | 404 | NOT_FOUND |
| 無認證資訊（無 JWT 且無 X-Session-Id） | 401 | UNAUTHORIZED |

---

## 訂單建立與管理

**檔案**：`src/routes/orderRoutes.js`

### 行為描述

**建立訂單（POST /api/orders）**

需 JWT 認證（訪客不可下訂）。接受收件人資訊（name、email、address）。

建立流程：
1. 驗證三個收件人欄位均非空
2. 查詢使用者購物車（需非空）
3. 驗證所有商品庫存充足
4. 計算總金額（各商品 price × quantity 加總）
5. **原子交易**（`db.transaction()`）：
   - 建立 orders 記錄（status: 'pending'）
   - 建立 order_items（快照商品名稱與價格）
   - 扣減每個商品的 stock
   - 清空使用者購物車
6. 回傳訂單詳情（含商品列表）

訂單號格式：`ORD-YYYYMMDD-XXXXX`（XXXXX 為 UUID 前 5 字元）

**訂單列表（GET /api/orders）**

回傳當前使用者所有訂單，依建立時間降冪。不含 order_items（僅摘要）。

**訂單詳情（GET /api/orders/:id）**

回傳單一訂單完整資訊，含 order_items 列表。確認訂單屬於當前使用者，否則回傳 404（不洩漏其他人的訂單存在）。

### 端點規格

| 端點 | 認證 | Body | 成功回應 |
|------|------|------|---------|
| POST /api/orders | JWT | recipientName, recipientEmail, recipientAddress | 201: 訂單詳情（含 items） |
| GET /api/orders | JWT | - | 200: 訂單列表 |
| GET /api/orders/:id | JWT | - | 200: 訂單詳情（含 items） |

### 訂單狀態機

訂單狀態由綠界金流 QueryTradeInfo 驗證結果決定，不再支援前端手動切換：

```
pending  →  paid    （QueryTradeInfo TradeStatus='1'）
         →  failed  （QueryTradeInfo TradeStatus 非 '1'）

paid     →  （終態，不再變更）
failed   →  （終態，不再變更）
```

### 錯誤情境

| 情境 | 狀態碼 | error |
|------|--------|-------|
| 收件人欄位缺失 | 400 | VALIDATION_ERROR |
| 購物車為空 | 400 | CART_EMPTY |
| 任一商品庫存不足 | 400 | STOCK_INSUFFICIENT |
| 訂單不存在或不屬於當前使用者 | 404 | NOT_FOUND |
| 訂單狀態非 pending | 400 | INVALID_STATUS |
| 無認證 | 401 | UNAUTHORIZED |

---

---

## 綠界 ECPay AIO 金流

**檔案**：`src/services/ecpayService.js`、`src/routes/paymentRoutes.js`

### 行為描述

本專案使用綠界全方位金流（AIO）作為收款方式。由於僅部署於本地端，無法接收綠界伺服器端的 ReturnURL 非同步通知，因此採用「瀏覽器回轉 OrderResultURL + 主動查詢 QueryTradeInfo」的架構驗證付款結果。

**啟動付款（GET /payment/ecpay/start/:orderId）**

確認訂單存在且狀態為 `'pending'`，計算 AIO 表單所需的所有參數（包含 CheckMacValue），渲染 `payment-redirect.ejs`（無版型的獨立 HTML），以 JavaScript 自動送出 POST 表單至綠界測試環境（`payment-stage.ecpay.com.tw`）。若訂單狀態不是 pending，直接 redirect 回訂單詳情頁。

關鍵 AIO 參數：
- `MerchantTradeNo`：由 `order_no` 去除連字號組成（例 `ORD20241115ABCDE`，16 字元 ≤ 20 上限）
- `TotalAmount`：訂單 `total_amount`（整數，台幣）
- `ItemName`：所有商品「商品名稱 x 數量」以 `#` 串接，自動截斷至 390 字元避免 CheckMacValue 計算錯誤
- `ReturnURL`：`BASE_URL/api/payment/notify`（本地無法接收，保留備用）
- `OrderResultURL`：`BASE_URL/payment/ecpay/result`（瀏覽器跳轉，本地可接收）
- `CustomField1`：訂單 `id`（UUID），用於 OrderResultURL 時識別訂單

**接收付款結果（POST /payment/ecpay/result）**

即 OrderResultURL。綠界完成付款後，將瀏覽器以 form POST 導向此端點。處理流程：
1. 以 timing-safe 比較驗證 ECPay CheckMacValue，驗證失敗則靜默導向訂單列表
2. 主動呼叫 `QueryTradeInfo` API 向綠界確認付款狀態（防止 OrderResultURL 偽造）
3. `TradeStatus === '1'` → 更新訂單 `status = 'paid'`，並儲存 `ecpay_trade_no`、`payment_type`、`paid_at`
4. 其他 → 更新訂單 `status = 'failed'`
5. Redirect 至 `/orders/:id?payment=success|fail`
6. 若 QueryTradeInfo 呼叫失敗（網路逾時等），回退至 OrderResultURL body 中的 `RtnCode` 判斷

**ReturnURL 備用端點（POST /api/payment/notify）**

本地開發時綠界無法呼叫此端點，但保留完整實作供日後部署至公開環境使用。驗證 CheckMacValue 後依 `RtnCode === '1'` 更新訂單狀態，回應純文字 `1|OK`（HTTP 200）。

**CheckMacValue 計算（ecpayService.js）**

依綠界 AIO SHA256 協議：
1. 過濾掉 `CheckMacValue` 欄位
2. 依 key 名稱小寫字母序排列
3. 拼接為 `HashKey=...&k1=v1&...&HashIV=...`
4. ECPay 特殊 URL encode（`encodeURIComponent` + `%20→+` + `~→%7e` + lowercase + .NET 字元還原）
5. SHA256 雜湊並轉大寫

驗證時使用 `crypto.timingSafeEqual` 防止 timing attack。

**QueryTradeInfo**

向 `payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5` 發送 POST（form-urlencoded），帶 `MerchantID`、`MerchantTradeNo`、`TimeStamp`（Unix 秒數）。回應為 URL-encoded 字串，解析後需驗證 `CheckMacValue`，再讀取 `TradeStatus` 欄位（`'1'` 為付款成功）。

### 路由規格

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /payment/ecpay/start/:orderId | 建立 AIO 表單並自動跳轉綠界 |
| POST | /payment/ecpay/result | OrderResultURL：驗證並更新訂單狀態 |
| POST | /api/payment/notify | ReturnURL 備用（本地無法接收） |

### 測試方式（staging 環境）

- 信用卡號：`4311-9522-2222-2222`
- 安全碼：任意三碼（例 `222`）
- 有效期：任意未來月份
- 3D Secure 驗證碼：`1234`

---

## 後台商品管理

**檔案**：`src/routes/adminProductRoutes.js`

### 行為描述

所有端點需 JWT Bearer Token 且 role 為 'admin'，否則回傳 403。

**商品列表（GET /api/admin/products）**

支援 `page`、`limit` 分頁。回傳所有商品（含庫存為 0 的商品）。

**新增商品（POST /api/admin/products）**

必填：`name`（非空字串）、`price`（整數 > 0）、`stock`（整數 >= 0）。選填：`description`、`image_url`。自動生成 UUID 為 id。

**更新商品（PUT /api/admin/products/:id）**

可更新 `name`、`price`、`stock`、`description`、`image_url` 中的任意欄位。至少需傳一個欄位。自動更新 `updated_at`。

**刪除商品（DELETE /api/admin/products/:id）**

若該商品有 status 為 'pending' 的訂單存在，**禁止刪除**，回傳 409 CONFLICT（保護待付款訂單的資料完整性）。否則刪除商品記錄。

注意：已完成或失敗訂單的 order_items 有商品名稱/價格快照，不依賴 FK，刪除不影響歷史訂單。

### 端點規格

| 端點 | 必填 Body | 選填 Body | 成功回應 |
|------|---------|---------|---------|
| GET /api/admin/products | - | page, limit | 200: paginated products |
| POST /api/admin/products | name, price, stock | description, image_url | 201: 新商品 |
| PUT /api/admin/products/:id | （至少一個欄位）| name, price, stock, description, image_url | 200: 更新後商品 |
| DELETE /api/admin/products/:id | - | - | 200: 成功 |

### 錯誤情境

| 情境 | 狀態碼 | error |
|------|--------|-------|
| 缺少必填欄位 | 400 | VALIDATION_ERROR |
| price 非正整數 | 400 | VALIDATION_ERROR |
| stock 為負數 | 400 | VALIDATION_ERROR |
| 商品不存在 | 404 | NOT_FOUND |
| 有 pending 訂單，無法刪除 | 409 | CONFLICT |
| 非管理員 | 403 | FORBIDDEN |

---

## 後台訂單管理

**檔案**：`src/routes/adminOrderRoutes.js`

### 行為描述

**所有訂單列表（GET /api/admin/orders）**

需管理員身份。支援：
- `page`、`limit` 分頁（預設 page=1, limit=10）
- `status` 篩選（`pending` | `paid` | `failed`）；不傳則列出全部

依建立時間降冪排列。

**訂單詳情（GET /api/admin/orders/:id）**

回傳訂單完整資訊，包含下單使用者資訊（name、email）與 order_items 列表。

### 端點規格

| 端點 | 查詢參數 | 成功回應 |
|------|---------|---------|
| GET /api/admin/orders | page, limit, status（選填） | 200: { orders[], pagination } |
| GET /api/admin/orders/:id | - | 200: 訂單 + 使用者 + items |

---

## 前端功能

### 首頁（public/js/pages/index.js）

- 頁面載入時呼叫 `GET /api/products?page=1&limit=9` 載入商品
- 每頁顯示 9 個商品，有下一頁/上一頁按鈕
- 「加入購物車」按鈕觸發 `POST /api/cart`
- 加入成功後更新導覽列購物車數量徽章（`header-init.js`）
- 使用 Vue 3 `createApp()` 管理商品列表狀態

### 結帳頁（public/js/pages/checkout.js）

- 頁面載入時確認已登入（否則導向 `/login`）
- 載入購物車商品與總金額
- 表單驗證：收件人姓名、Email 格式、地址均必填
- 提交後呼叫 `POST /api/orders`，成功後導向 `/payment/ecpay/start/:id` 進行綠界付款

### 後台商品管理（public/js/pages/admin-products.js）

- Modal 式介面，共用新增/編輯表單
- 刪除前顯示確認對話框
- 每次操作完成後自動重新載入列表
- 表單驗證：商品名稱必填、price 需 > 0

### 認證狀態管理（public/js/auth.js）

| 方法 | 說明 |
|------|------|
| `Auth.getToken()` | 取得 localStorage `flower_token` |
| `Auth.setToken(token)` | 儲存 token |
| `Auth.getUser()` | 取得使用者物件（JSON.parse） |
| `Auth.setUser(user)` | 儲存使用者物件 |
| `Auth.getSessionId()` | 取得或自動生成 UUID session ID |
| `Auth.isLoggedIn()` | 確認 token 存在 |
| `Auth.isAdmin()` | 確認 `user.role === 'admin'` |
| `Auth.logout()` | 清除 token 和 user，保留 session ID |

### API 呼叫封裝（public/js/api.js）

`apiFetch(url, options)` 自動附帶：
- `Authorization: Bearer <token>`（有 token 時）
- `X-Session-Id: <sessionId>`（固定附帶）
- `Content-Type: application/json`

回應 401 時，自動清除 token 並導向 `/login`。
