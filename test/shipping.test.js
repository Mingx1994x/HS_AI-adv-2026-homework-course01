const {
  calculateShippingFee,
  calculateOrderTotal,
  isRemoteAddress,
  DELIVERY_METHODS,
  FREE_BASE_FEE_THRESHOLD,
  REMOTE_AREA_SURCHARGE,
  EXPRESS_SURCHARGE
} = require('../src/utils/shipping');

describe('shipping utils - calculateShippingFee', () => {
  it('宅配基本運費：小計未達免運門檻時收取 120 元', () => {
    expect(calculateShippingFee(800)).toBe(DELIVERY_METHODS.home);
    expect(calculateShippingFee(800, { method: 'home' })).toBe(120);
  });

  it('超商取貨費用：小計未達免運門檻時收取 60 元', () => {
    expect(calculateShippingFee(800, { method: 'store' })).toBe(DELIVERY_METHODS.store);
    expect(calculateShippingFee(800, { method: 'store' })).toBe(60);
  });

  it('商品小計 1,499 元：未達免運門檻，仍需收取基本運費', () => {
    expect(calculateShippingFee(1499)).toBe(120);
    expect(calculateShippingFee(1499, { method: 'store' })).toBe(60);
  });

  it('商品小計 1,500 元：達到免運門檻，基本運費全免', () => {
    expect(FREE_BASE_FEE_THRESHOLD).toBe(1500);
    expect(calculateShippingFee(1500)).toBe(0);
    expect(calculateShippingFee(1500, { method: 'store' })).toBe(0);
  });

  it('偏遠地區附加費：加收 200 元', () => {
    expect(calculateShippingFee(800, { isRemoteArea: true })).toBe(120 + REMOTE_AREA_SURCHARGE);
  });

  it('當日急件附加費：加收 250 元', () => {
    expect(calculateShippingFee(800, { isExpress: true })).toBe(120 + EXPRESS_SURCHARGE);
  });

  it('多項附加費同時成立：偏遠地區與急件同時加收', () => {
    expect(calculateShippingFee(800, { isRemoteArea: true, isExpress: true })).toBe(120 + 200 + 250);
    expect(
      calculateShippingFee(800, { method: 'store', isRemoteArea: true, isExpress: true })
    ).toBe(60 + 200 + 250);
  });

  it('滿額免運與附加費同時成立：基本運費全免，附加費仍照收', () => {
    expect(calculateShippingFee(1500, { isRemoteArea: true, isExpress: true })).toBe(0 + 200 + 250);
    expect(
      calculateShippingFee(2560, { method: 'store', isRemoteArea: true, isExpress: true })
    ).toBe(450);
  });

  it('subtotal 為負數時拋出例外', () => {
    expect(() => calculateShippingFee(-1)).toThrow();
  });

  it('method 不合法時拋出例外', () => {
    expect(() => calculateShippingFee(100, { method: 'drone' })).toThrow();
  });
});

describe('shipping utils - calculateOrderTotal', () => {
  it('回傳商品小計加上運費', () => {
    expect(calculateOrderTotal(800)).toBe(800 + 120);
    expect(calculateOrderTotal(1500, { method: 'store', isExpress: true })).toBe(1500 + 250);
  });
});

describe('shipping utils - isRemoteAddress', () => {
  it('比對到偏遠地區關鍵字時回傳 true', () => {
    expect(isRemoteAddress('花蓮縣花蓮市中山路1號')).toBe(true);
    expect(isRemoteAddress('澎湖縣馬公市')).toBe(true);
  });

  it('一般地址回傳 false', () => {
    expect(isRemoteAddress('台北市大安區')).toBe(false);
  });

  it('空字串或非字串輸入回傳 false', () => {
    expect(isRemoteAddress('')).toBe(false);
    expect(isRemoteAddress(undefined)).toBe(false);
  });
});
