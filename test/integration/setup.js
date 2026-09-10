// 必須是整份檔案第一件事：在 require app（進而 require src/database）之前
// 把 DB 路徑指向記憶體資料庫，確保這份 integration test 完全不會碰到專案真正的 database.sqlite
process.env.DATABASE_PATH = ':memory:';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const request = require('supertest');
const app = require('../../app');
const db = require('../../src/database');

async function registerUser(overrides = {}) {
  const email = overrides.email || `integration-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password: overrides.password || 'password123',
      name: overrides.name || '整合測試使用者',
    });
  return { token: res.body.data.token, user: res.body.data.user };
}

function getProduct(productId) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
}

function setProductStock(productId, stock) {
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, productId);
}

module.exports = { app, request, db, registerUser, getProduct, setProductStock };
