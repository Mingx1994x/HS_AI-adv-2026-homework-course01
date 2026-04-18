# CLAUDE.md

## 專案概述

花卉電商網站 — Node.js/Express + SQLite + EJS/Vue3 + Tailwind CSS
- 後端：Express REST API、JWT 認證、better-sqlite3（WAL 模式）
- 前端：EJS 伺服器渲染 + Vue 3（CDN）客戶端水合
- 測試：Vitest + supertest（循序執行，不可平行）
- 雙重認證購物車：JWT Bearer Token（已登入）或 X-Session-Id Header（訪客）

## 常用指令

```bash
npm start           # 建置 CSS 並啟動伺服器（port 3001）
npm run dev:server  # 只啟動伺服器（不重建 CSS）
npm run dev:css     # 監聽並即時編譯 Tailwind CSS
npm run css:build   # 一次性建置並壓縮 CSS
npm run openapi     # 從 JSDoc 產生 openapi.json
npm test            # 執行所有測試（循序，非互動）
```

## 關鍵規則

- **價格以分（cents）整數儲存**：資料庫與 API 回應的 `price`、`total_amount` 均為整數（1680 = NT$1680，因設計上 1 unit = 1 cent）
- **訂單商品為快照**：`order_items` 儲存下單當時的 `product_name`、`product_price`，不依賴 `products` 外鍵，商品刪改不影響歷史訂單
- **購物車雙模式**：訪客用 `X-Session-Id`，登入用 JWT Bearer；系統不自動合併兩者購物車
- **測試循序執行**：`vitest.config.js` 強制關閉平行，順序為 auth → products → cart → orders → adminProducts → adminOrders；不可在測試中共用資料庫狀態
- **伺服器啟動前需 JWT_SECRET**：`server.js` 啟動時驗證，缺少會拋錯終止；請先確認 `.env` 存在
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`

## 詳細文件

- [docs/README.md](./docs/README.md) — 項目介紹與快速開始
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 架構、目錄結構、資料流
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 開發規範、命名規則
- [docs/FEATURES.md](./docs/FEATURES.md) — 功能列表與完成狀態
- [docs/TESTING.md](./docs/TESTING.md) — 測試規範與指南
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — 更新日誌
