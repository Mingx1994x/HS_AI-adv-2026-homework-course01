# ARCHITECTURE.md

## 目錄結構

```
project-root/
├── CLAUDE.md                    # Claude Code 專案快速參考
├── app.js                       # Express 應用程式設定（middleware、路由掛載）
├── server.js                    # 伺服器入口點（驗證 JWT_SECRET、監聽 port）
├── generate-openapi.js          # 從 JSDoc 產生 openapi.json
├── package.json                 # 依賴與 npm scripts
├── database.sqlite              # SQLite 資料庫主檔案（WAL 模式）
├── .env                         # 環境變數（不納入版控）
├── .env.example                 # 環境變數範本
│
├── config/
│   ├── swagger.config.js        # OpenAPI 3.0 設定（安全機制、伺服器 URL）
│   ├── vitest.config.js         # 單元測試設定（循序、固定順序）
│   ├── vitest.integration.config.js  # 整合測試設定（獨立 :memory: DB）
│   └── playwright.config.js     # E2E 測試設定（testDir/outputDir 以絕對路徑釘回專案根目錄）
│
├── src/
│   ├── database.js              # DB 初始化、schema 建立、種子資料
│   ├── utils/
│   │   └── shipping.js          # 運費計算：純函式模組，不依賴 DB，可獨立單元測試
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT Bearer Token 驗證；解碼後注入 req.user
│   │   ├── adminMiddleware.js   # RBAC：確認 req.user.role === 'admin'
│   │   ├── sessionMiddleware.js # 從 X-Session-Id header 注入 req.sessionId
│   │   └── errorHandler.js     # 全域錯誤處理；隱藏內部錯誤訊息
│   ├── services/
│   │   └── ecpayService.js      # 綠界 ECPay 工具：CheckMacValue、AIO 表單組建、QueryTradeInfo
│   └── routes/
│       ├── authRoutes.js        # POST /api/auth/register|login, GET /api/auth/profile
│       ├── productRoutes.js     # GET /api/products（公開列表與詳情）
│       ├── adminProductRoutes.js # CRUD /api/admin/products（管理員）
│       ├── cartRoutes.js        # CRUD /api/cart（雙模式：JWT 或 session）
│       ├── orderRoutes.js       # /api/orders（建立、查看）
│       ├── adminOrderRoutes.js  # GET /api/admin/orders（管理員查看）
│       ├── paymentRoutes.js     # 綠界付款啟動、OrderResultURL、ReturnURL 備用
│       └── pageRoutes.js        # 伺服器渲染頁面路由（EJS）
│
├── views/
│   ├── layouts/
│   │   ├── front.ejs            # 前台版面（引入 Vue3、樣式、頁首/頁尾）
│   │   └── admin.ejs            # 後台版面（管理員側邊欄）
│   ├── pages/
│   │   ├── index.ejs            # 首頁
│   │   ├── product-detail.ejs   # 商品詳情
│   │   ├── cart.ejs             # 購物車
│   │   ├── checkout.ejs         # 結帳
│   │   ├── payment-redirect.ejs # 自動送出表單至綠界（無版型）
│   │   ├── login.ejs            # 登入/註冊
│   │   ├── orders.ejs           # 訂單列表
│   │   ├── order-detail.ejs     # 訂單詳情
│   │   ├── admin/
│   │   │   ├── products.ejs     # 後台商品管理
│   │   │   └── orders.ejs       # 後台訂單管理
│   │   └── 404.ejs              # 404 錯誤頁
│   └── partials/
│       ├── head.ejs             # meta、Tailwind CSS 引入
│       ├── header.ejs           # 前台導覽列（含認證狀態）
│       ├── footer.ejs           # 頁腳
│       ├── admin-header.ejs     # 後台頂部列
│       ├── admin-sidebar.ejs    # 後台側邊欄
│       └── notification.ejs    # Toast 通知容器
│
├── public/
│   ├── css/
│   │   ├── input.css            # Tailwind 入口 + 自訂色彩 CSS 變數
│   │   └── output.css           # 編譯後 CSS（不納入版控）
│   ├── js/
│   │   ├── api.js               # apiFetch()：統一 API 呼叫，自動附帶 Auth header
│   │   ├── auth.js              # Auth 物件：token/user/sessionId 的讀寫與驗證
│   │   ├── header-init.js       # 頁面載入後初始化購物車數量徽章與使用者資訊
│   │   ├── notification.js      # Toast 通知系統（showNotification(msg, type)）
│   │   └── pages/               # 各頁面的 Vue/JS 邏輯
│   │       ├── index.js         # 首頁：商品列表、分頁、加入購物車
│   │       ├── product-detail.js
│   │       ├── cart.js
│   │       ├── checkout.js      # 結帳：驗證收件資訊、送出訂單、跳轉綠界付款
│   │       ├── login.js
│   │       ├── orders.js
│   │       ├── order-detail.js
│   │       ├── admin-products.js # 後台商品 CRUD（Modal 介面）
│   │       └── admin-orders.js
│
└── test/
    ├── unit/                    # npm test / npm run test:unit（真實 database.sqlite）
    │   ├── setup.js             # 測試輔助：getAdminToken()、registerUser()
    │   ├── auth.test.js
    │   ├── products.test.js
    │   ├── cart.test.js
    │   ├── orders.test.js
    │   ├── adminProducts.test.js
    │   ├── adminOrders.test.js
    │   └── shipping.test.js     # 純函式測試，不碰資料庫
    ├── integration/             # npm run test:integration（獨立 :memory: DB）
    │   ├── setup.js
    │   └── checkout.test.js
    └── e2e/                     # npm run test:e2e（Playwright，需先啟動專案）
        └── checkout-payment.spec.js
```

---

## 啟動流程

```
npm start
  │
  ├─ css:build → 編譯 Tailwind CSS 至 public/css/output.css
  │
  └─ node server.js
       │
       ├─ dotenv.config()          載入 .env
       ├─ 驗證 process.env.JWT_SECRET  缺少則立即拋錯終止
       ├─ require('./app')          建立 Express app
       │    ├─ 設定 EJS 樣板引擎
       │    ├─ CORS（允許 FRONTEND_URL）
       │    ├─ JSON / urlencoded body parser
       │    ├─ sessionMiddleware    注入 req.sessionId
       │    ├─ 掛載 API routes
       │    ├─ 掛載 page routes
       │    ├─ 404 handler（API → JSON，Page → 404.ejs）
       │    └─ errorHandler         全域錯誤
       └─ app.listen(PORT || 3001)
```

---

## 請求處理 Middleware 鏈

```
Request
  │
  ├─ cors()                      # 允許跨域（FRONTEND_URL）
  ├─ express.json()              # 解析 JSON body
  ├─ express.urlencoded()        # 解析 form body
  ├─ sessionMiddleware           # X-Session-Id → req.sessionId
  │
  ├─ API Routes 判斷：
  │   ├─ 公開路由（無額外 middleware）
  │   │    └─ GET /api/products, GET /api/products/:id
  │   │
  │   ├─ authMiddleware（JWT 驗證，注入 req.user）
  │   │    └─ GET /api/auth/profile
  │   │    └─ POST /api/orders, GET /api/orders, GET /api/orders/:id
  │   │    └─ PATCH /api/orders/:id/pay
  │   │
  │   ├─ authMiddleware + adminMiddleware（JWT 驗證 + 角色為 admin）
  │   │    └─ 所有 /api/admin/* 路由
  │   │
  │   └─ dualAuth（cart 路由自定義：JWT Bearer 或 X-Session-Id）
  │        └─ GET/POST/PATCH/DELETE /api/cart, /api/cart/:itemId
  │
  └─ errorHandler（全域，任何 next(err) 觸發）
```

---

## API 路由總覽表

### 認證（/api/auth）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | /api/auth/register | 無 | 使用者註冊 |
| POST | /api/auth/login | 無 | 使用者登入 |
| GET | /api/auth/profile | JWT | 取得目前使用者資料 |

### 商品（/api/products）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | /api/products | 無 | 商品列表（分頁） |
| GET | /api/products/:id | 無 | 商品詳情 |

### 管理員商品（/api/admin/products）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | /api/admin/products | JWT + Admin | 商品列表（管理員視角） |
| POST | /api/admin/products | JWT + Admin | 新增商品 |
| PUT | /api/admin/products/:id | JWT + Admin | 更新商品 |
| DELETE | /api/admin/products/:id | JWT + Admin | 刪除商品 |

### 購物車（/api/cart）— 雙模式認證

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | /api/cart | JWT 或 Session | 查看購物車（可帶 `method`/`isExpress`/`address` query 試算運費） |
| POST | /api/cart | JWT 或 Session | 加入購物車 |
| PATCH | /api/cart/:itemId | JWT 或 Session | 更新商品數量 |
| DELETE | /api/cart/:itemId | JWT 或 Session | 移除商品 |

### 訂單（/api/orders）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | /api/orders | JWT | 從購物車建立訂單（含運費計算，`shippingMethod`/`isExpress` 選填，偏遠地區依 `recipientAddress` 自動判斷） |
| GET | /api/orders | JWT | 使用者訂單列表 |
| GET | /api/orders/:id | JWT | 訂單詳情 |

### 付款（綠界 ECPay）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | /payment/ecpay/start/:orderId | 無（依 orderId 存取） | 建立 AIO 表單並自動跳轉綠界 |
| POST | /payment/ecpay/result | 無（CheckMacValue 驗證） | OrderResultURL：驗證並更新訂單狀態 |
| POST | /api/payment/notify | 無（CheckMacValue 驗證） | ReturnURL 備用（本地無法接收） |

### 管理員訂單（/api/admin/orders）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | /api/admin/orders | JWT + Admin | 所有訂單列表（可篩選） |
| GET | /api/admin/orders/:id | JWT + Admin | 訂單詳情（含使用者資訊） |

---

## 統一回應格式

所有 API 均回傳以下 JSON 結構：

```json
{
  "data": {},
  "error": null,
  "message": "人類可讀訊息（繁體中文）"
}
```

- **成功**：`data` 為回傳資料，`error` 為 `null`
- **失敗**：`data` 為 `null`，`error` 為錯誤碼字串

### HTTP 狀態碼

| 狀態碼 | 情境 |
|--------|------|
| 200 | GET / PATCH 成功 |
| 201 | POST 建立成功 |
| 400 | 驗證失敗（欄位缺失、格式錯誤、庫存不足） |
| 401 | 未認證（無 token、token 無效/過期） |
| 403 | 無權限（非管理員） |
| 404 | 資源不存在 |
| 409 | 衝突（重複 email、刪除有待付款訂單的商品） |
| 500 | 伺服器內部錯誤 |

### 錯誤碼（`error` 欄位值）

| 錯誤碼 | 說明 |
|--------|------|
| `VALIDATION_ERROR` | 輸入驗證失敗 |
| `UNAUTHORIZED` | 認證失敗 |
| `FORBIDDEN` | RBAC 失敗 |
| `NOT_FOUND` | 資源不存在 |
| `CONFLICT` | 資料衝突 |
| `STOCK_INSUFFICIENT` | 庫存不足 |
| `CART_EMPTY` | 購物車為空 |
| `INVALID_STATUS` | 訂單狀態不符（如已付款不能再付款） |
| `INTERNAL_ERROR` | 伺服器錯誤（通用） |

---

## 認證與授權機制

### JWT 認證（authMiddleware.js）

- **演算法**：HS256
- **有效期**：7 天（`expiresIn: '7d'`）
- **Payload**：`{ userId, email, role }`
- **Header 格式**：`Authorization: Bearer <token>`
- **驗證**：使用 `process.env.JWT_SECRET`；失敗回傳 401
- **注入**：驗證成功後，將 decoded payload 注入 `req.user`

### 雙模式認證（cartRoutes.js 自定義 dualAuth）

購物車路由支援兩種認證模式，優先順序如下：

1. **JWT Bearer Token（已登入使用者）**：若 Authorization header 存在且有效，使用 `req.user.userId` 作為擁有者識別
2. **X-Session-Id Header（訪客）**：若無 JWT，使用 sessionMiddleware 注入的 `req.sessionId` 作為訪客購物車 key

注意：**系統不自動合併訪客購物車**。使用者登入後，訪客購物車資料不會自動轉移至帳號下。

### RBAC（adminMiddleware.js）

- 在 `authMiddleware` 之後執行
- 確認 `req.user.role === 'admin'`
- 否則回傳 403 `FORBIDDEN`

### 前端認證狀態（public/js/auth.js）

| 資料 | localStorage Key | 說明 |
|------|-----------------|------|
| JWT Token | `flower_token` | 登入後儲存 |
| 使用者資訊 | `flower_user` | JSON stringify 後儲存 |
| Session ID | `flower_session_id` | UUID，首次訪問自動生成 |

`apiFetch()`（api.js）每次請求自動附上：
- `Authorization: Bearer <token>`（已登入）
- `X-Session-Id: <sessionId>`（每次都附上）

當 API 回傳 401，前端自動清除 token 並重導向 `/login`。

---

## 資料庫 Schema

### users 表

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID |
| email | TEXT | UNIQUE NOT NULL | 使用者 Email |
| password_hash | TEXT | NOT NULL | bcrypt 雜湊（生產環境 10 輪，測試 1 輪） |
| name | TEXT | NOT NULL | 顯示名稱 |
| role | TEXT | NOT NULL DEFAULT 'user', CHECK IN ('user','admin') | 角色 |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | 建立時間（ISO 8601） |

### products 表

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID |
| name | TEXT | NOT NULL | 商品名稱 |
| description | TEXT | - | 描述（可為 NULL） |
| price | INTEGER | NOT NULL CHECK(price > 0) | 售價（單位：分） |
| stock | INTEGER | NOT NULL DEFAULT 0 CHECK(stock >= 0) | 庫存數量 |
| image_url | TEXT | - | 圖片 URL（可為 NULL） |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | - |
| updated_at | TEXT | NOT NULL DEFAULT datetime('now') | - |

**注意**：`price` 雖單位設計為 cents，但本專案實際以整數呈現台幣金額（1680 = NT$1,680）。

### cart_items 表

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID |
| session_id | TEXT | - | 訪客 session（可為 NULL） |
| user_id | TEXT | FK → users(id) | 登入使用者（可為 NULL） |
| product_id | TEXT | NOT NULL, FK → products(id) | 商品 |
| quantity | INTEGER | NOT NULL DEFAULT 1 CHECK(quantity > 0) | 數量 |

同一商品加入購物車時，若已存在則 **累加數量**，不新增列。

### orders 表

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID |
| order_no | TEXT | UNIQUE NOT NULL | 人類可讀訂單號（格式：`ORD-YYYYMMDD-XXXXX`） |
| user_id | TEXT | NOT NULL, FK → users(id) | 下單使用者 |
| recipient_name | TEXT | NOT NULL | 收件人姓名 |
| recipient_email | TEXT | NOT NULL | 收件人 Email |
| recipient_address | TEXT | NOT NULL | 收件地址 |
| total_amount | INTEGER | NOT NULL | 訂單總金額（商品小計 + 運費，分） |
| shipping_fee | INTEGER | NOT NULL DEFAULT 0 | 運費（依 `src/utils/shipping.js` 計算） |
| status | TEXT | NOT NULL DEFAULT 'pending', CHECK IN ('pending','paid','failed') | 狀態 |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | - |
| ecpay_trade_no | TEXT | - | 綠界交易編號（付款成功後填入） |
| payment_type | TEXT | - | 付款方式（如 `Credit_CreditCard`） |
| paid_at | TEXT | - | 付款時間（台灣時間，格式 `yyyy/MM/dd HH:mm:ss`） |

> `ecpay_trade_no`、`payment_type`、`paid_at`、`shipping_fee` 欄位均由資料庫 migration 在伺服器啟動時以冪等方式新增，舊資料不受影響。

### order_items 表

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID |
| order_id | TEXT | NOT NULL, FK → orders(id) | 所屬訂單 |
| product_id | TEXT | NOT NULL | 商品 ID（歷史參考，不作 FK 強制） |
| product_name | TEXT | NOT NULL | **快照**：下單時的商品名稱 |
| product_price | INTEGER | NOT NULL | **快照**：下單時的商品售價 |
| quantity | INTEGER | NOT NULL | 購買數量 |

`product_name` 和 `product_price` 是下單當時的快照，不受商品後續異動影響。

---

## 資料流

### 購物車到訂單的完整資料流

```
使用者加入購物車
  │
  ├─ POST /api/cart { productId, quantity }
  ├─ dualAuth 判斷擁有者（user_id 或 session_id）
  ├─ 查詢商品是否存在 + 庫存是否充足
  ├─ 若購物車已有此商品 → UPDATE quantity（累加）
  └─ 否則 → INSERT cart_items

使用者結帳
  │
  ├─ POST /api/orders { recipientName, recipientEmail, recipientAddress, shippingMethod?, isExpress? }
  ├─ authMiddleware（需登入）
  ├─ 查詢使用者所有 cart_items JOIN products
  ├─ 驗證購物車非空 + 所有商品庫存足夠
  ├─ 計算商品小計 → isRemoteAddress(recipientAddress) 自動判斷偏遠地區
  ├─ calculateShippingFee(subtotal, { method, isRemoteArea, isExpress })（src/utils/shipping.js）
  │
  └─ db.transaction()（原子操作）
       ├─ INSERT orders（status: 'pending', total_amount = 小計 + 運費, shipping_fee）
       ├─ INSERT order_items（快照每個商品名稱與價格）
       ├─ UPDATE products SET stock = stock - quantity（扣庫存）
       └─ DELETE cart_items（清空購物車）

綠界付款流程
  │
  ├─ GET /payment/ecpay/start/:orderId
  │    ├─ 查詢訂單（需 status = 'pending'）
  │    ├─ buildAioParams()：組合 AIO 表單參數 + generateCheckMacValue()
  │    └─ render payment-redirect.ejs → 瀏覽器自動 POST 至綠界付款頁
  │
  ├─ （使用者在綠界完成付款）
  │
  └─ POST /payment/ecpay/result（OrderResultURL，瀏覽器 redirect）
       ├─ verifyCheckMacValue()（timing-safe，失敗則 redirect 回訂單列表）
       ├─ queryTradeInfo(merchantTradeNo)（主動查詢確認 TradeStatus）
       ├─ TradeStatus='1' → UPDATE orders SET status='paid', ecpay_trade_no, payment_type, paid_at
       ├─ 其他 → UPDATE orders SET status='failed'
       └─ redirect /orders/:id?payment=success|fail
```

---

## 第三方整合

### 已實作

| 整合 | 使用方式 |
|------|---------|
| JWT（jsonwebtoken） | POST /api/auth/login\|register 回傳 token |
| bcrypt | 使用者密碼雜湊與驗證 |
| swagger-jsdoc | 從 JSDoc 產生 openapi.json |
| 綠界 ECPay AIO | `src/services/ecpayService.js`：CheckMacValue（SHA256）、AIO 表單建立、QueryTradeInfo 主動查詢 |

**綠界整合技術說明**：

- 使用 Node.js 內建 `crypto`（SHA256）與 `fetch`（HTTP 請求），無需額外套件
- CheckMacValue 計算採用 AIO 協議的 `ecpayUrlEncode`（`encodeURIComponent` + `%20→+` + `~→%7e` + lowercase + .NET 字元還原），與 AES 協議不同，不可混用
- 本地開發採 OrderResultURL（瀏覽器 redirect）替代 ReturnURL（Server-to-Server），再以 QueryTradeInfo 二次確認，解決 localhost 無法接收 ECPay 通知的限制
- `ECPAY_ENV=staging` 對應測試環境；改為 `production` 自動切換正式端點與帳號

---

## 資料庫設定

- **模式**：WAL（Write-Ahead Logging），提升並發讀取效能
- **外鍵**：已啟用（`PRAGMA foreign_keys = ON`）
- **檔案**：`database.sqlite`（主檔）、`database.sqlite-shm`、`database.sqlite-wal`（WAL 輔助）
- **種子資料**：伺服器每次啟動時，若管理員帳號不存在，自動建立；8 個預設花卉商品也會自動種入
