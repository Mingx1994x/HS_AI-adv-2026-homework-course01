# 花卉電商網站

一個以 Node.js + Express 為後端、EJS + Vue 3 為前端的花卉電商示範平台。支援訪客購物車、JWT 認證、管理後台、以及模擬金流。

---

## 技術棧

| 層級 | 技術 | 版本 |
|------|------|------|
| HTTP 伺服器 | Express.js | ~4.16.1 |
| 資料庫 | SQLite（better-sqlite3） | ^12.8.0 |
| 認證 | jsonwebtoken（HS256） | ^9.0.2 |
| 密碼加密 | bcrypt | ^6.0.0 |
| ID 生成 | uuid | ^11.1.0 |
| 樣板引擎 | EJS | ^5.0.1 |
| 前端框架 | Vue 3（CDN） | 3.x |
| CSS 框架 | Tailwind CSS | ^4.2.2 |
| API 文件 | swagger-jsdoc（OpenAPI 3.0） | ^6.2.8 |
| 測試框架 | Vitest + supertest | ^2.1.9 / ^7.2.2 |

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env，至少需填入 JWT_SECRET
```

最小化 `.env` 範例：

```env
JWT_SECRET=your-secret-key-here
PORT=3001
NODE_ENV=development
ADMIN_EMAIL=admin@hexschool.com
ADMIN_PASSWORD=12345678
```

### 3. 啟動伺服器

```bash
npm start
# 伺服器啟動在 http://localhost:3001
```

或分別執行（開發模式）：

```bash
npm run dev:server   # Terminal 1：啟動 Express
npm run dev:css      # Terminal 2：監聽 Tailwind CSS 變更
```

### 4. 執行測試

```bash
npm test
```

### 5. 產生 OpenAPI 文件

```bash
npm run openapi
# 輸出至 openapi.json
```

---

## 常用指令表

| 指令 | 用途 |
|------|------|
| `npm start` | 建置 CSS 並啟動伺服器 |
| `npm run dev:server` | 僅啟動伺服器 |
| `npm run dev:css` | 監聽 CSS 變更（--watch） |
| `npm run css:build` | 一次性壓縮建置 CSS |
| `npm run openapi` | 從 JSDoc 產生 openapi.json |
| `npm test` | 執行全部測試（循序） |

---

## 預設帳號

| 角色 | Email | 密碼 | 來源 |
|------|-------|------|------|
| 管理員 | admin@hexschool.com | 12345678 | `.env` `ADMIN_EMAIL` / `ADMIN_PASSWORD` 種子資料 |

---

## 頁面路由

| 路徑 | 說明 |
|------|------|
| `/` | 首頁（商品列表） |
| `/products/:id` | 商品詳情 |
| `/cart` | 購物車 |
| `/checkout` | 結帳（需登入） |
| `/login` | 登入 / 註冊 |
| `/orders` | 訂單列表（需登入） |
| `/orders/:id` | 訂單詳情（需登入） |
| `/admin/products` | 後台商品管理（需管理員） |
| `/admin/orders` | 後台訂單管理（需管理員） |

---

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目錄結構、資料流、API 路由總覽、DB Schema |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 命名規則、新增 API 步驟、環境變數表 |
| [FEATURES.md](./FEATURES.md) | 功能清單、行為描述、完成狀態 |
| [TESTING.md](./TESTING.md) | 測試規範、執行順序、撰寫指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日誌 |
