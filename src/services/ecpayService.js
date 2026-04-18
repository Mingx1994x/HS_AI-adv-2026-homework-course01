const crypto = require('crypto');
const querystring = require('querystring');

const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID;
const HASH_KEY = process.env.ECPAY_HASH_KEY;
const HASH_IV = process.env.ECPAY_HASH_IV;
const IS_STAGE = process.env.ECPAY_ENV !== 'production';

const AIO_URL = IS_STAGE
  ? 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
  : 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';

const QUERY_URL = IS_STAGE
  ? 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5'
  : 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5';

// ECPay 專用 URL encode（AIO SHA256 協議）
function ecpayUrlEncode(source) {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
  encoded = encoded.toLowerCase();
  // .NET 字元還原
  const netRestore = { '%2d': '-', '%5f': '_', '%2e': '.', '%21': '!', '%2a': '*', '%28': '(', '%29': ')' };
  for (const [from, to] of Object.entries(netRestore)) {
    encoded = encoded.split(from).join(to);
  }
  return encoded;
}

function generateCheckMacValue(params) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'CheckMacValue')
  );
  const sorted = Object.keys(filtered)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const paramStr = sorted.map(k => `${k}=${filtered[k]}`).join('&');
  const raw = `HashKey=${HASH_KEY}&${paramStr}&HashIV=${HASH_IV}`;
  const encoded = ecpayUrlEncode(raw);
  return crypto.createHash('sha256').update(encoded, 'utf8').digest('hex').toUpperCase();
}

function verifyCheckMacValue(params) {
  const received = (params.CheckMacValue || '').toUpperCase();
  const calculated = generateCheckMacValue(params);
  if (received.length !== calculated.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(calculated));
}

// 台灣時間 UTC+8，格式：yyyy/MM/dd HH:mm:ss
function getMerchantTradeDate() {
  const now = new Date();
  const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${twTime.getUTCFullYear()}/${pad(twTime.getUTCMonth() + 1)}/${pad(twTime.getUTCDate())} ${pad(twTime.getUTCHours())}:${pad(twTime.getUTCMinutes())}:${pad(twTime.getUTCSeconds())}`;
}

// order_no 去除連字號作為 MerchantTradeNo（最長 20 字元）
function toMerchantTradeNo(orderNo) {
  return orderNo.replace(/-/g, '');
}

// 建立 AIO 表單參數
function buildAioParams(order, baseUrl) {
  const itemName = order.items
    .map(i => `${i.product_name} x ${i.quantity}`)
    .join('#')
    .substring(0, 390); // 保留安全邊界，防止 UTF-8 截斷

  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: toMerchantTradeNo(order.order_no),
    MerchantTradeDate: getMerchantTradeDate(),
    PaymentType: 'aio',
    TotalAmount: order.total_amount,
    TradeDesc: '花卉電商訂單',
    ItemName: itemName,
    ReturnURL: `${baseUrl}/api/payment/notify`,
    OrderResultURL: `${baseUrl}/payment/ecpay/result`,
    ClientBackURL: `${baseUrl}/orders/${order.id}`,
    ChoosePayment: 'ALL',
    EncryptType: 1,
    CustomField1: order.id,
  };

  params.CheckMacValue = generateCheckMacValue(params);
  return { params, aioUrl: AIO_URL };
}

// 主動查詢綠界訂單狀態
async function queryTradeInfo(merchantTradeNo) {
  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: Math.floor(Date.now() / 1000),
  };
  params.CheckMacValue = generateCheckMacValue(params);

  const body = new URLSearchParams(params).toString();
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(30000),
  });

  const text = await res.text();
  const result = Object.fromEntries(new URLSearchParams(text));

  if (!verifyCheckMacValue(result)) {
    throw new Error('QueryTradeInfo CheckMacValue 驗證失敗');
  }

  return result;
}

module.exports = {
  AIO_URL,
  generateCheckMacValue,
  verifyCheckMacValue,
  buildAioParams,
  queryTradeInfo,
  toMerchantTradeNo,
};
