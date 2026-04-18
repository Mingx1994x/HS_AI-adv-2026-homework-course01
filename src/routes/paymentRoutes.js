const express = require('express');
const db = require('../database');
const { buildAioParams, verifyCheckMacValue, queryTradeInfo, toMerchantTradeNo } = require('../services/ecpayService');

const router = express.Router();

function getBaseUrl(req) {
  return process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
}

// 取得訂單及其項目
function getOrderWithItems(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  return order;
}

// GET /payment/ecpay/start/:orderId
// 建立 AIO 表單並渲染自動送出頁面
router.get('/payment/ecpay/start/:orderId', function (req, res) {
  const order = getOrderWithItems(req.params.orderId);

  if (!order) {
    return res.status(404).send('找不到訂單');
  }
  if (order.status !== 'pending') {
    return res.redirect(`/orders/${order.id}`);
  }

  const { params, aioUrl } = buildAioParams(order, getBaseUrl(req));
  res.render('pages/payment-redirect', { params, aioUrl }, function (err, html) {
    if (err) return res.status(500).send(err.message);
    res.send(html);
  });
});

// POST /payment/ecpay/result
// OrderResultURL — ECPay 在付款後將瀏覽器 redirect 到此（form POST）
router.post('/payment/ecpay/result', async function (req, res) {
  const body = req.body;

  // 驗證 CheckMacValue
  if (!verifyCheckMacValue(body)) {
    console.error('[ECPay] OrderResultURL CheckMacValue 驗證失敗', body);
    return res.redirect('/orders');
  }

  // CustomField1 存放 order.id
  const orderId = body.CustomField1;
  const merchantTradeNo = body.MerchantTradeNo;

  if (!orderId || !merchantTradeNo) {
    return res.redirect('/orders');
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.redirect('/orders');

  // 已處理過則直接跳轉
  if (order.status !== 'pending') {
    const param = order.status === 'paid' ? 'success' : 'fail';
    return res.redirect(`/orders/${orderId}?payment=${param}`);
  }

  try {
    // 主動呼叫 QueryTradeInfo 驗證
    const tradeInfo = await queryTradeInfo(merchantTradeNo);
    const tradeStatus = tradeInfo.TradeStatus;

    if (tradeStatus === '1') {
      db.prepare(`
        UPDATE orders
        SET status = 'paid',
            ecpay_trade_no = ?,
            payment_type = ?,
            paid_at = ?
        WHERE id = ?
      `).run(
        tradeInfo.TradeNo || '',
        tradeInfo.PaymentType || '',
        tradeInfo.PaymentDate || new Date().toISOString(),
        orderId
      );
      return res.redirect(`/orders/${orderId}?payment=success`);
    } else {
      db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(orderId);
      return res.redirect(`/orders/${orderId}?payment=fail`);
    }
  } catch (err) {
    console.error('[ECPay] QueryTradeInfo 失敗:', err.message);
    // 查詢失敗時依 RtnCode 判斷
    if (body.RtnCode === '1') {
      db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
      return res.redirect(`/orders/${orderId}?payment=success`);
    }
    db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(orderId);
    return res.redirect(`/orders/${orderId}?payment=fail`);
  }
});

// POST /api/payment/notify
// ReturnURL — 本地無法接收，但保留實作備用
router.post('/api/payment/notify', function (req, res) {
  const body = req.body;

  if (!verifyCheckMacValue(body)) {
    console.error('[ECPay] ReturnURL CheckMacValue 驗證失敗');
    return res.type('text').send('1|OK');
  }

  const orderId = body.CustomField1;
  if (orderId && body.RtnCode === '1') {
    db.prepare(`
      UPDATE orders
      SET status = 'paid',
          ecpay_trade_no = ?,
          payment_type = ?,
          paid_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(
      body.TradeNo || '',
      body.PaymentType || '',
      body.PaymentDate || new Date().toISOString(),
      orderId
    );
  }

  res.type('text').send('1|OK');
});

module.exports = router;
