---
name: playwright-checkout-test
description: Use when asked to run an end-to-end Playwright MCP test of 花漾生活 (flower e-commerce)'s order/checkout flow — login, add random products to cart, checkout, ECPay WebATM payment, and confirm the order's paid status. Triggers on Playwright 測試、訂購流程測試、結帳流程測試、綠界金流測試、e2e test order.
user-invocable: true
---

# Playwright 訂購結帳流程測試

針對花漾生活（Node.js/Express + SQLite）的完整下單付款流程，使用 Playwright MCP 進行端對端測試。

## 前置工具

Playwright MCP 工具為 deferred tools，執行前先用 `ToolSearch` 載入所需工具（一次查詢即可批次取得）：

```
ToolSearch(query: "select:mcp__playwright__browser_navigate,mcp__playwright__browser_click,mcp__playwright__browser_type,mcp__playwright__browser_snapshot,mcp__playwright__browser_fill_form,mcp__playwright__browser_select_option,mcp__playwright__browser_take_screenshot,mcp__playwright__browser_wait_for,mcp__playwright__browser_tabs")
```

## 測試步驟

### 0. 啟動伺服器並進入首頁

- 先確認 port 3001 是否已有伺服器運行：`curl -s -o /dev/null -w "%{http_code}" http://localhost:3001`
- 若未運行，依 CLAUDE.md 指令啟動：`npm start`（建置 CSS 並啟動）或 `npm run dev:server`（僅啟動伺服器）。啟動前確認 `.env` 存在且含 `JWT_SECRET`，否則伺服器會拋錯終止。
- 用 `browser_navigate` 進入 `http://localhost:3001/`，確認首頁載入成功。

### 1. 登入

- 導向 `/login`
- 以 `browser_fill_form` 填入 Email：`admin@hexschool.com`、密碼：`12345678`
- 點擊「登入」按鈕，確認導回首頁且 nav 出現「我的訂單」「登出」等已登入元素

### 2. 隨機選擇 2~3 項商品加入購物車

- 用 `browser_snapshot` 取得首頁商品列表（含「加入購物車」按鈕的卡片）
- 用 bash `echo $((RANDOM % 2 + 2))` 決定要選的商品數量（2 或 3）
- 用 bash `echo $((RANDOM % N))`（N = 商品總數）為每次選擇產生不重複的隨機索引
- 依序點擊對應商品的「加入購物車」按鈕
- 每次加入後可用 snapshot 確認購物車數量徽章（如「購物車 2」）正確累加

### 3. 前往購物車並結帳

- 點擊導覽列「購物車」連結，進入 `/cart`
- 用 snapshot 確認所有選中商品與小計皆正確顯示
- 點擊「前往結帳」，進入 `/checkout`

### 4. 填寫收件資訊送出訂單

- 填寫收件人姓名、Email、收件地址（任意合理測試資料即可）
- 點擊「確認送出訂單」，應跳轉至綠界測試環境 `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5`

### 5. 綠界金流：網路ATM + 台灣土地銀行

- 點擊付款方式列表中的「網路ATM」(WebATM) listitem
- 用 `browser_select_option` 在「選擇銀行」下拉選單選擇「台灣土地銀行」
- 點擊「前往付款」連結
- 會彈出確認 modal（提醒跳轉至銀行頁面），點擊「關閉」按鈕才會真正導向模擬銀行頁面 `MockMPPost/LandWebAtm`
- 模擬銀行頁面已預填成功交易資料（`RC` = `0`、`MSG` = 交易成功），直接點擊「Save」按鈕送出
- 應自動導回站內訂單詳情頁，網址帶有 `?payment=success`

### 6. 確認付款狀態並截圖

- 在導回的訂單詳情頁（`/orders/:id?payment=success`），確認頁面顯示「已付款」與「付款成功！感謝您的購買」
- 用 `browser_take_screenshot` 對此付款後畫面截圖
- 點擊導覽列「我的訂單」進入 `/orders`，用 snapshot 確認剛剛建立的訂單編號狀態為「已付款」
- 用 `browser_take_screenshot` 對「我的訂單」列表截圖，確認該筆訂單已付款

## 截圖規則

- 儲存路徑固定為專案的 `.playwright-mcp/screen_shot/`（此目錄已在 `.gitignore` 中排除，不會進版控）
- 命名規則：`test_orderList_{時間戳}_{用途}.png`，時間戳用 bash `date +%Y%m%d_%H%M%S` 產生（精確到秒），例如 `test_orderList_20260624_163125_paid.png`
- 用同一次測試開始時產生的時間戳（執行一次 `date` 指令並重複使用），讓本次兩張截圖共用同一前綴，且自然避免與其他測試批次撞名，不需手動加序號
- 第 6 步驟有兩張截圖：付款後畫面用 `_paid` 後綴、我的訂單列表用 `_orderList` 後綴

## 注意事項

- 帳密：`admin@hexschool.com` / `12345678`（測試帳號，已預先存在於資料庫）
- ECPay 為測試環境網域 `payment-stage.ecpay.com.tw` / `pay-stage.ecpay.com.tw`，純模擬交易不會產生實際金流
- 若商品列表數量或商品名稱有變動，第 2 步驟的索引需以當下 snapshot 重新計算，不可硬編碼
- 測試需循序執行單一購物車/訂單流程，不可與其他自動化測試平行跑（避免共用同一登入 session 的購物車狀態互相干擾）
