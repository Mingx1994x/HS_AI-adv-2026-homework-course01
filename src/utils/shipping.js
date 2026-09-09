/**
 * 運費計算模組
 * 不依賴資料庫或其他模組，可獨立單元測試。金額單位與商品 price 一致（整數）。
 *
 * 規則：
 *   - 宅配基本運費 120 元／超商取貨基本運費 60 元
 *   - 商品小計滿 1,500 元 → 免基本運費（偏遠地區、當日急件的加收費用不受影響）
 *   - 偏遠地區 → 加收 200 元
 *   - 當日急件 → 加收 250 元
 */

const DELIVERY_METHODS = {
  home: 120, // 宅配
  store: 60 // 超商取貨
};

const FREE_BASE_FEE_THRESHOLD = 1500;
const REMOTE_AREA_SURCHARGE = 200;
const EXPRESS_SURCHARGE = 250;

// 依收件地址關鍵字判斷是否為偏遠地區（離島、花東等）
const REMOTE_AREA_KEYWORDS = [
  '花蓮縣', '花蓮市',
  '台東縣', '臺東縣',
  '澎湖縣', '金門縣', '連江縣', '馬祖',
  '綠島', '蘭嶼', '琉球鄉', '小琉球'
];

function assertValidAmount(amount, label) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    throw new TypeError(`${label} 必須為非負數字`);
  }
}

/**
 * 依收件地址關鍵字判斷是否屬於偏遠地區
 * @param {string} address 收件地址
 * @returns {boolean}
 */
function isRemoteAddress(address) {
  if (typeof address !== 'string' || address.trim() === '') return false;
  return REMOTE_AREA_KEYWORDS.some(keyword => address.includes(keyword));
}

/**
 * 依商品小計與配送條件計算運費
 * @param {number} subtotal 商品小計（未含運費）
 * @param {object} [options]
 * @param {'home'|'store'} [options.method='home'] 配送方式：宅配 home／超商取貨 store
 * @param {boolean} [options.isRemoteArea=false] 是否為偏遠地區
 * @param {boolean} [options.isExpress=false] 是否為當日急件
 * @returns {number} 運費金額
 */
function calculateShippingFee(subtotal, options = {}) {
  const { method = 'home', isRemoteArea = false, isExpress = false } = options;

  assertValidAmount(subtotal, 'subtotal');
  if (!Object.prototype.hasOwnProperty.call(DELIVERY_METHODS, method)) {
    throw new RangeError(`method 必須為 ${Object.keys(DELIVERY_METHODS).join(' 或 ')}`);
  }

  const baseFee = subtotal >= FREE_BASE_FEE_THRESHOLD ? 0 : DELIVERY_METHODS[method];
  const surcharge =
    (isRemoteArea ? REMOTE_AREA_SURCHARGE : 0) + (isExpress ? EXPRESS_SURCHARGE : 0);

  return baseFee + surcharge;
}

/**
 * 計算含運費的訂單總金額
 * @param {number} subtotal 商品小計
 * @param {object} [options] 同 calculateShippingFee
 * @returns {number} 商品小計 + 運費
 */
function calculateOrderTotal(subtotal, options) {
  return subtotal + calculateShippingFee(subtotal, options);
}

module.exports = {
  DELIVERY_METHODS,
  FREE_BASE_FEE_THRESHOLD,
  REMOTE_AREA_SURCHARGE,
  EXPRESS_SURCHARGE,
  REMOTE_AREA_KEYWORDS,
  calculateShippingFee,
  calculateOrderTotal,
  isRemoteAddress
};
