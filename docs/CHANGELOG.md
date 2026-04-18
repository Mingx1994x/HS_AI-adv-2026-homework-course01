# CHANGELOG.md

所有重要變更將記錄於此文件。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)。

---

## [未發布]

### 待實作
- 訪客購物車登入後自動合併
- 訂單取消 / 退款功能

---

## [1.1.0] — 2026-04-18

### 新增
- **綠界 ECPay AIO 金流串接**：實作完整的本地端金流流程，含 CheckMacValue 計算（SHA256）、AIO 表單建立、OrderResultURL 接收與 QueryTradeInfo 主動驗證
- `src/services/ecpayService.js`：ECPay 核心工具模組，包含 `ecpayUrlEncode`、`generateCheckMacValue`、`verifyCheckMacValue`（timing-safe）、`buildAioParams`、`queryTradeInfo`
- `src/routes/paymentRoutes.js`：付款相關路由，掛載於 `/payment/ecpay/start/:orderId`、`/payment/ecpay/result`、`/api/payment/notify`
- `views/pages/payment-redirect.ejs`：無版型自動送出表單，瀏覽器完成渲染後立即 POST 至綠界付款頁面
- orders 資料表新增三個欄位：`ecpay_trade_no`（綠界交易編號）、`payment_type`（付款方式）、`paid_at`（付款時間）；以冪等 `ALTER TABLE` migration 自動新增，不影響既有資料

### 變更
- **結帳流程**：訂單建立成功後，改由前端導向 `/payment/ecpay/start/:id`，取代原先直接進入訂單詳情的行為
- **訂單詳情頁**：待付款訂單的「付款成功 / 付款失敗」模擬按鈕，改為「前往付款（綠界）」連結

### 移除
- 前端模擬付款邏輯：`order-detail.js` 的 `simulatePay`、`handlePaySuccess`、`handlePayFail` 函式

### 技術決策
- 本地開發環境無法接收綠界 ReturnURL（Server-to-Server），改用 OrderResultURL（瀏覽器 redirect）接收付款結果，再主動呼叫 QueryTradeInfo 二次驗證，不依賴 form body 中的 RtnCode 作為唯一依據
- `MerchantTradeNo` 由 `order_no` 去除連字號組成（例 `ORD20241115ABCDE`），確保 ≤ 20 字元且純英數
- QueryTradeInfo 失敗時有回退機制：改以 OrderResultURL form body 的 `RtnCode` 判斷，避免網路異常導致使用者體驗中斷

---

## [1.0.0] — 2026-04-18

### 新增
- **使用者認證**：JWT 認證、使用者註冊/登入、個人資料查詢
- **商品瀏覽**：商品列表（分頁）、商品詳情
- **購物車**：雙模式認證（JWT + Session ID）、訪客與登入購物車、庫存驗證、數量累加
- **訂單管理**：從購物車建立訂單（原子交易）、訂單列表與詳情、模擬付款（success/fail）
- **後台商品管理**：CRUD 操作、刪除保護（pending 訂單存在時禁止刪除）
- **後台訂單管理**：訂單列表（可依狀態篩選）、訂單詳情（含使用者資訊）
- **前端介面**：EJS + Vue 3 + Tailwind CSS、全前台頁面、後台管理頁面
- **API 文件**：Swagger/OpenAPI 3.0 JSDoc 標記、`npm run openapi` 產生 openapi.json
- **測試套件**：Vitest + supertest，涵蓋所有 API 端點，循序執行

### 技術決策
- 訂單商品採快照設計，`order_items` 儲存下單時的名稱與價格
- SQLite WAL 模式提升並發讀取效能
- 測試關閉並行（`fileParallelism: false`）避免資料庫競爭條件
- bcrypt salt rounds 在測試環境降為 1（`NODE_ENV=test`）加速測試
