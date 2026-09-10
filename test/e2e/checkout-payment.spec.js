const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = 'admin@hexschool.com';
const ADMIN_PASSWORD = '12345678';

function buildTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

test('登入下單並以綠界網路ATM（台灣土地銀行）完成付款，訂單狀態轉為已付款', async ({ page, request, baseURL }) => {
  // 1. 登入花卉電商
  await page.goto('/login');
  await page.getByRole('textbox', { name: '請輸入 Email' }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '請輸入密碼' }).fill(ADMIN_PASSWORD);
  await page.locator('form').getByRole('button', { name: '登入' }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
  await expect(page.getByRole('link', { name: '我的訂單' })).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('flower_token'));
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 這是共用的測試帳號，購物車可能殘留前一次未完成的測試資料；
  // 先清空，讓每次執行都從固定狀態出發，避免累積或影響總金額斷言。
  const existingCart = await request.get('/api/cart', { headers: authHeaders }).then((r) => r.json());
  for (const item of existingCart.data.items) {
    await request.delete(`/api/cart/${item.id}`, { headers: authHeaders });
  }

  // 2. 選擇商品並加入購物車（隨機挑 2 件仍有庫存的商品）
  await page.goto('/');
  const addToCartButtons = page.locator('#products').getByRole('button', { name: '加入購物車' });
  const productCount = await addToCartButtons.count();
  expect(productCount).toBeGreaterThan(0);

  const pickCount = Math.min(2, productCount);
  const pickedIndexes = new Set();
  while (pickedIndexes.size < pickCount) {
    pickedIndexes.add(Math.floor(Math.random() * productCount));
  }
  for (const idx of pickedIndexes) {
    await addToCartButtons.nth(idx).click();
    await expect(page.locator('#cart-badge')).toBeVisible();
  }
  await expect(page.getByRole('link', { name: `購物車 ${pickCount}` })).toBeVisible();

  // 3. 進入結帳頁面
  await page.getByRole('link', { name: `購物車 ${pickCount}` }).click();
  await expect(page).toHaveURL(`${baseURL}/cart`);
  await page.getByRole('button', { name: '前往結帳' }).click();
  await expect(page).toHaveURL(`${baseURL}/checkout`);

  // 4. 填寫配送方式與結帳資料
  await page.getByRole('textbox', { name: '請輸入收件人姓名' }).fill('E2E 測試收件人');
  await page.getByRole('textbox', { name: '請輸入 Email' }).fill('e2e-test@example.com');
  await page.getByRole('textbox', { name: '請輸入收件地址' }).fill('台北市大安區忠孝東路四段1號');
  await page.getByRole('radio', { name: /^宅配到府/ }).check();

  // 5. 建立訂單 → 自動導向綠界測試環境
  await page.getByRole('button', { name: '確認送出訂單' }).click();
  await page.waitForURL(/payment-stage\.ecpay\.com\.tw\/Cashier\/AioCheckOut/);

  // 6. 選擇「網路ATM」
  await page.getByRole('listitem', { name: 'WebATM' }).click();

  // 7. 選擇「台灣土地銀行」
  // 銀行 <select> 沒有關聯的 <label>，Playwright 算出的 accessible name 會把全部銀行選項串成一長串文字，
  // 用角色定位不穩定，改用綠界頁面上這顆下拉選單固定的 id。
  await page.locator('#selWebATMBank').selectOption('台灣土地銀行');

  // 8. 點擊「前往付款」
  await page.getByRole('link', { name: '前往付款' }).click();

  // 9. 關閉提示視窗
  await page.getByRole('button', { name: '關閉' }).click();

  // 10. 在土地銀行測試頁面點擊 Save（頁面已預填成功交易資料：RC=0、MSG=交易成功）
  await page.waitForURL(/MockMPPost\/LandWebAtm/);
  await expect(page.getByRole('textbox', { name: 'MSG' })).toHaveValue('交易成功');
  await page.getByRole('button', { name: 'Save' }).click();

  // 11. 等待綠界顯示付款成功並返回商店
  // WebATM 流程由綠界後端驗證交易後直接 redirect 回站內訂單頁，過程中不會出現需要手動點擊的「返回商店」頁面。
  await page.waitForURL(new RegExp(`${baseURL}/orders/.+\\?payment=success`));

  // 12. 驗證訂單顯示「已付款」
  await expect(page.getByText('已付款')).toBeVisible();
  await expect(page.getByText('付款成功！感謝您的購買。')).toBeVisible();

  const timestamp = buildTimestamp();
  await page.screenshot({
    path: `.playwright-mcp/screen_shot/test_orderList_${timestamp}_paid.png`,
    fullPage: true,
  });

  // 13. 驗證訂單狀態為 paid
  const orderId = new URL(page.url()).pathname.split('/').pop();
  const orderRes = await request.get(`/api/orders/${orderId}`, { headers: authHeaders });
  const orderBody = await orderRes.json();
  expect(orderBody.data.status).toBe('paid');

  // 我的訂單列表也應顯示此筆訂單已付款
  await page.goto('/orders');
  const orderRow = page.getByRole('link', { name: new RegExp(orderBody.data.order_no) });
  await expect(orderRow).toContainText('已付款');

  await page.screenshot({
    path: `.playwright-mcp/screen_shot/test_orderList_${timestamp}_orderList.png`,
    fullPage: true,
  });
});
