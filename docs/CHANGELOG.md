# CHANGELOG.md

所有重要變更將記錄於此文件。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)。

---

## [未發布]

### 待實作
- 綠界金流（ECPay）真實整合
- 訪客購物車登入後自動合併
- 訂單取消 / 退款功能

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
