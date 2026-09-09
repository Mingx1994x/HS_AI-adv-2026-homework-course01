# 運費計算功能

## User Story

As a 消費者, I want to 在結帳時看到依配送方式、地址、急件需求計算出的正確運費, so that 我知道實際要付多少錢，且商家收到的金額（含 ECPay 付款金額）與畫面顯示一致。

## Spec（規格）

### 運費規則（依商家提供的規則表）

| 條件 | 費用 |
|------|------|
| 宅配基本運費 | NT$ 120 |
| 超商取貨 | NT$ 60 |
| 商品小計滿 NT$ 1,500 | 免基本運費 |
| 偏遠地區 | 加收 NT$ 200 |
| 當日急件 | 加收 NT$ 250 |

- 偏遠地區採**自動判斷**（依收件地址關鍵字比對），不需使用者手動勾選
- 前端即時試算運費採**擴充現有 `GET /api/cart`**（加 query 參數），不另開新端點

### 技術決策

- 運費邏輯獨立封裝為 `src/utils/shipping.js`，純函式、不依賴資料庫，維持與其他業務邏輯解耦、可獨立單元測試
- `orders.total_amount` 語意調整為「商品小計 + 運費」（原本只有商品小計，未含運費，連帶導致 ECPay 實際收款金額少算運費，此次一併修正）
- `orders` 新增 `shipping_fee` 欄位（冪等 migration，比照 `ecpay_trade_no` 等既有欄位的做法）

### API 異動

- `POST /api/orders`：新增選填 body 欄位 `shippingMethod`（`home`/`store`，預設 `home`）、`isExpress`（預設 `false`）；`isRemoteArea` 由後端依 `recipientAddress` 自動判斷，不接受前端傳入；回應新增 `subtotal`、`shipping_fee`、`is_remote_area`
- `GET /api/cart`：新增選填 query 參數 `method`、`isExpress`、`address`；回應新增 `shipping_fee`、`is_remote_area`、`free_shipping_threshold`、`grand_total`

### DB Schema 異動

- `orders.shipping_fee INTEGER NOT NULL DEFAULT 0`（冪等 `ALTER TABLE` migration）

### 邊界條件

- `calculateShippingFee()` 對非法 `method` 或負數 `subtotal` 拋出例外（`POST /api/orders` 會驗證並回 400；`GET /api/cart` 為試算用途，`method` 不合法時 fallback 為 `home`，不噴錯）
- 免基本運費只免除宅配/超商的基本運費，偏遠地區與急件加收不受影響（可疊加）

## Tasks

- [x] `src/utils/shipping.js`：`calculateShippingFee`、`calculateOrderTotal`、`isRemoteAddress` + 常數
- [x] `src/database.js`：`orders.shipping_fee` 欄位 + 冪等 migration
- [x] `src/routes/orderRoutes.js`：整合運費計算、地址自動判斷偏遠地區、回應新增欄位
- [x] `src/routes/cartRoutes.js`：`GET /api/cart` 支援運費試算 query 參數
- [x] `public/js/pages/cart.js` + `views/pages/cart.ejs`：運費/總計改用 API 回傳值，免運門檻文字動態化
- [x] `public/js/pages/checkout.js` + `views/pages/checkout.ejs`：新增配送方式／急件選項，即時試算運費，偏遠地區提示
- [x] 修正首頁、商品詳情頁殘留的舊「消費滿 NT$500 免運費」文案為正確的 NT$1,500
- [x] 手動端到端驗證（curl API + 瀏覽器實際下單），確認畫面顯示金額與資料庫 `shipping_fee`/`total_amount` 一致
- [ ] 自動化測試（`tests/shipping.test.js` 等）— 使用者要求本次先不寫，列入 CHANGELOG 待實作
