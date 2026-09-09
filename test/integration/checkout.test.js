const { app, request, db, registerUser, setProductStock } = require('./setup');
const { calculateShippingFee } = require('../../src/utils/shipping');

const QUANTITY = 2;

async function getProductsList() {
  const res = await request(app).get('/api/products?limit=100');
  return res.body.data.products;
}

describe('Checkout Integration - 建立訂單成功流程', () => {
  let token;
  let userId;
  let product;
  let subtotal;
  let expectedShippingFee;
  let orderData;

  beforeAll(async () => {
    // 1. 建立測試會員（登入）
    const { token: t, user } = await registerUser();
    token = t;
    userId = user.id;

    // 2. 取得商品資料，挑一個小計會低於免運門檻（1,500）的商品，方便驗證非零運費
    const products = await getProductsList();
    product = products.find((p) => p.price * QUANTITY < 1500 && p.stock >= QUANTITY);
    expect(product).toBeDefined();
    subtotal = product.price * QUANTITY;
    expectedShippingFee = calculateShippingFee(subtotal, {
      method: 'home',
      isRemoteArea: false,
      isExpress: false,
    });
  });

  it('應能將商品加入購物車', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: QUANTITY });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.quantity).toBe(QUANTITY);
  });

  it('應能建立包含配送方式與配送資訊的訂單，且狀態碼與回應格式、運費、總額皆正確', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipientName: '整合測試收件人',
        recipientEmail: 'checkout-integration@example.com',
        recipientAddress: '台北市大安區忠孝東路100號',
        shippingMethod: 'home',
        isExpress: false,
      });

    // 狀態碼與回應格式
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('order_no');
    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);

    orderData = res.body.data;

    // 運費正確
    expect(orderData.subtotal).toBe(subtotal);
    expect(orderData.shipping_fee).toBe(expectedShippingFee);
    expect(orderData.is_remote_area).toBe(false);

    // 總額正確
    expect(orderData.total_amount).toBe(subtotal + expectedShippingFee);
  });

  it('訂單應正確寫入資料庫', () => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderData.id);

    expect(order).toBeDefined();
    expect(order.user_id).toBe(userId);
    expect(order.recipient_name).toBe('整合測試收件人');
    expect(order.recipient_email).toBe('checkout-integration@example.com');
    expect(order.recipient_address).toBe('台北市大安區忠孝東路100號');
    expect(order.status).toBe('pending');
    expect(order.shipping_fee).toBe(expectedShippingFee);
    expect(order.total_amount).toBe(subtotal + expectedShippingFee);
  });

  it('訂單品項應正確寫入資料庫', () => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderData.id);

    expect(items.length).toBe(1);
    expect(items[0].product_id).toBe(product.id);
    expect(items[0].product_name).toBe(product.name);
    expect(items[0].product_price).toBe(product.price);
    expect(items[0].quantity).toBe(QUANTITY);
  });

  it('商品庫存應正確扣除', () => {
    const updated = db.prepare('SELECT stock FROM products WHERE id = ?').get(product.id);
    expect(updated.stock).toBe(product.stock - QUANTITY);
  });

  it('建立訂單後購物車應被清空', () => {
    const remaining = db.prepare('SELECT * FROM cart_items WHERE user_id = ?').all(userId);
    expect(remaining.length).toBe(0);
  });
});

describe('Checkout Integration - 建立訂單失敗時的資料完整性', () => {
  let token;
  let userId;
  let product;

  beforeAll(async () => {
    const { token: t, user } = await registerUser();
    token = t;
    userId = user.id;

    const products = await getProductsList();
    product = products.find((p) => p.stock >= QUANTITY);
    expect(product).toBeDefined();

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: QUANTITY });

    // 模擬下單當下庫存被買光，讓建立訂單時的庫存檢查失敗
    setProductStock(product.id, 0);
  });

  it('庫存不足時應回傳 400 STOCK_INSUFFICIENT', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipientName: '失敗測試收件人',
        recipientEmail: 'checkout-fail@example.com',
        recipientAddress: '台北市信義區松仁路1號',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('STOCK_INSUFFICIENT');
    expect(res.body.data).toBeNull();
  });

  it('建立訂單失敗時不應留下不完整訂單', () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(userId).count;
    expect(count).toBe(0);
  });

  it('建立訂單失敗時不應誤扣庫存', () => {
    const current = db.prepare('SELECT stock FROM products WHERE id = ?').get(product.id);
    expect(current.stock).toBe(0);
  });

  it('建立訂單失敗時購物車不應被清空', () => {
    const items = db.prepare('SELECT * FROM cart_items WHERE user_id = ?').all(userId);
    expect(items.length).toBe(1);
    expect(items[0].quantity).toBe(QUANTITY);
  });
});
