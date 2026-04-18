# 綠界 ECPay AIO 金流串接計畫

## 背景

專案目前結帳流程為假的模擬付款（按鈕直接切換 pending/paid），需換成真實的綠界 AIO 全方位金流。
由於只跑本地端，無法接收 ECPay Server Notify（ReturnURL），
因此付款確認改為：瀏覽器返回 → OrderResultURL → 本地主動呼叫 QueryTradeInfo 驗證。

## 付款流程（本地端架構）

```
checkout.ejs → POST /api/orders (建立訂單 pending)
  → 前端 redirect /payment/ecpay/start/:orderId
  → 伺服器建立 AIO form + CheckMacValue
  → 渲染 payment-redirect.ejs (auto-submit 表單送往 ECPay)
  → 使用者在 ECPay 付款頁面完成付款
  → ECPay 瀏覽器 redirect (form POST) 到 OrderResultURL
    = http://localhost:3001/payment/ecpay/result
  → 伺服器驗證 CheckMacValue + 呼叫 QueryTradeInfo
  → 更新 orders.status → redirect /orders/:id?payment=success|fail
```

ReturnURL 設為 `http://localhost:3001/api/payment/notify`，ECPay 無法呼叫到但此參數為必填。

## 新增檔案

### 1. `src/services/ecpayService.js`
ECPay 核心工具函式：
- `ecpayUrlEncode(str)` — encodeURIComponent + `%20→+` + `~→%7e` + lowercase + .NET 字元還原
- `generateCheckMacValue(params, hashKey, hashIv)` — 排序 key → 拼接 → encode → SHA256 → toUpperCase
- `verifyCheckMacValue(params, hashKey, hashIv)` — timing-safe 比較
- `getMerchantTradeDate()` — Taiwan UTC+8，格式 `yyyy/MM/dd HH:mm:ss`
- `buildAioParams(order)` — 組合所有 AIO 必填參數
- `queryTradeInfo(merchantTradeNo)` — POST 到 QueryTradeInfo V5 → 解析 URL-encoded 回應 → 驗證 CMV

MerchantTradeNo = `order.order_no.replace(/-/g, '')` → 例 `ORD20241115ABCDE`（16 字元 ≤ 20 限制）

### 2. `src/routes/paymentRoutes.js`
```
GET  /payment/ecpay/start/:orderId → buildAioParams → render payment-redirect.ejs
POST /payment/ecpay/result         → OrderResultURL（瀏覽器帶回）
                                     verifyCheckMacValue → queryTradeInfo
                                     → UPDATE orders SET status, ecpay_trade_no, payment_type, paid_at
                                     → redirect /orders/:id?payment=success|fail
POST /api/payment/notify           → ReturnURL 備用（本地收不到，但實作留存）
                                     verifyCheckMacValue → UPDATE status → 回應 '1|OK'
```

### 3. `views/pages/payment-redirect.ejs`
不套用主版型（layout: false），輸出 `<form>` + hidden inputs + auto-submit script。

## 修改現有檔案

### 4. `src/database.js`
在 `initializeDatabase()` 加入冪等 migration：
```js
const cols = db.pragma("table_info(orders)").map(c => c.name)
if (!cols.includes('ecpay_trade_no')) {
  db.exec("ALTER TABLE orders ADD COLUMN ecpay_trade_no TEXT")
  db.exec("ALTER TABLE orders ADD COLUMN payment_type TEXT")
  db.exec("ALTER TABLE orders ADD COLUMN paid_at TEXT")
}
```

### 5. `app.js`
新增掛載：
```js
app.use('/', require('./src/routes/paymentRoutes'))
```

### 6. `views/pages/checkout.ejs`（submitOrder 成功後）
```js
window.location.href = `/payment/ecpay/start/${data.id}`
```

### 7. `views/pages/order-detail.ejs`
移除假付款按鈕，改為真實付款連結：
```html
<div v-if="order.status === 'pending'">
  <a :href="`/payment/ecpay/start/${order.id}`">前往付款（綠界）</a>
</div>
```

## 環境變數
`.env` 需包含（測試用值）：
```
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
ECPAY_HASH_IV=EkRm7iFT261dpevs
ECPAY_ENV=staging
BASE_URL=http://localhost:3001
```

## 驗證方式
1. `npm start` 啟動服務
2. 加商品到購物車 → 結帳 → 填收件資訊 → 送出
3. 跳轉到綠界付款頁（staging）
4. 使用測試卡 `4311-9522-2222-2222` / CVV `222` / 3DS `1234`
5. 返回後訂單狀態應顯示「已付款」
6. `npm test` 確認所有既有測試通過
