const fs = require('fs');
const spec = require('../openapi.json');

// 固定寫死（而非每次 crypto.randomUUID()），讓 npm run postman 在規格沒變動時
// 重複執行會產生一模一樣的輸出，不會每次都跑出無意義的 diff
const COLLECTION_ID = '414e5e5e-ee11-4465-802a-c2fa38e25aa0';
const ENVIRONMENT_ID = '7de56629-4cdc-456a-9f00-01efc8854de7';
const DEFAULT_SESSION_ID = 'f9969064-51cb-49c4-934a-9cd37222451a';

const FOLDER_ORDER = ['Auth', 'Products', 'Cart', 'Orders', 'Admin Products', 'Admin Orders'];

// 單一來源：baseUrl / token / sessionId 這三個變數同時餵給 collection.variable（讓
// collection 單獨匯入也能直接測）與 environment.json（給實際測試時用的機敏值，token
// 標成 secret，Postman 會在畫面上遮罩、不會明碼顯示/同步）
const RUNTIME_VARIABLES = [
  { key: 'baseUrl', value: 'http://localhost:3001', secret: false },
  { key: 'token', value: '', secret: true },
  { key: 'sessionId', value: DEFAULT_SESSION_ID, secret: false },
];

// 沒有 example/default 時，依欄位名稱給出比泛型 schema walker 更可讀的預設值。
// name / description 這種欄位在不同 tag 下意義不同（註冊姓名 vs 商品名稱），
// 所以不放進共用表，改用 TAG_FIELD_EXAMPLES 依 tag 個別覆寫
const FIELD_EXAMPLES = {
  email: 'test@example.com',
  password: '12345678',
  recipientName: '測試收件人',
  recipientEmail: 'test@example.com',
  recipientAddress: '台北市大安區忠孝東路四段1號',
  image_url: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400',
};

const TAG_FIELD_EXAMPLES = {
  Auth: { name: '測試使用者' },
  'Admin Products': { name: '新商品', description: '商品描述', price: 999, stock: 10 },
};

function exampleForSchema(schema, fieldName, fieldExamples) {
  if (!schema) return null;
  if (fieldName && Object.prototype.hasOwnProperty.call(fieldExamples, fieldName)) {
    return fieldExamples[fieldName];
  }
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length) return schema.enum[0];

  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') return 'test@example.com';
      return `<${fieldName || 'string'}>`;
    case 'integer':
    case 'number':
      return schema.minimum !== undefined ? schema.minimum : 0;
    case 'boolean':
      return false;
    case 'object': {
      const obj = {};
      for (const [key, propSchema] of Object.entries(schema.properties || {})) {
        obj[key] = exampleForSchema(propSchema, key, fieldExamples);
      }
      return obj;
    }
    default:
      return null;
  }
}

function toPostmanPath(openapiPath) {
  return openapiPath.replace(/\{([^}]+)\}/g, ':$1');
}

function buildUrl(openapiPath, parameters) {
  const postmanPath = toPostmanPath(openapiPath);
  const pathSegments = postmanPath.split('/').filter(Boolean);
  const pathParams = (parameters || []).filter((p) => p.in === 'path');
  const queryParams = (parameters || []).filter((p) => p.in === 'query');

  const query = queryParams.map((p) => ({
    key: p.name,
    value: p.schema && p.schema.default !== undefined ? String(p.schema.default) : '',
    disabled: !(p.schema && p.schema.default !== undefined),
  }));

  const rawQuery = query.length ? '?' + query.map((q) => `${q.key}=${q.value}`).join('&') : '';

  return {
    raw: `{{baseUrl}}/${pathSegments.join('/')}${rawQuery}`,
    host: ['{{baseUrl}}'],
    path: pathSegments,
    query: query.length ? query : undefined,
    variable: pathParams.length ? pathParams.map((p) => ({ key: p.name, value: `<${p.name}>` })) : undefined,
  };
}

function buildBody(operation, tag) {
  const content = operation.requestBody && operation.requestBody.content && operation.requestBody.content['application/json'];
  if (!content) return undefined;
  const fieldExamples = { ...FIELD_EXAMPLES, ...(TAG_FIELD_EXAMPLES[tag] || {}) };
  const example = exampleForSchema(content.schema, undefined, fieldExamples);
  return {
    mode: 'raw',
    raw: JSON.stringify(example, null, 2),
    options: { raw: { language: 'json' } },
  };
}

// data.token 儲存流程：登入/註冊成功後把 JWT 寫回 collection 變數 token，
// 之後需要登入的請求就能直接透過 collection 層級的 Bearer auth 自動帶上
const SAVE_TOKEN_TEST_SCRIPT = [
  'if (pm.response.code === 200 || pm.response.code === 201) {',
  '  const json = pm.response.json();',
  '  if (json && json.data && json.data.token) {',
  "    pm.collectionVariables.set('token', json.data.token);",
  "    console.log('已將 JWT 儲存至 token 變數');",
  '  }',
  '}',
];

// 購物車同時支援已登入（JWT）與訪客（X-Session-Id）兩種模式：
// 後端 dualAuth 只要看到 Authorization header 就會嘗試驗證，token 是空字串時仍會送出
// 「Bearer 」導致直接 401、擋掉訪客模式的 fallback，所以改用 pre-request script
// 只在 token 變數真的有值時才動態加上 Authorization，讓兩種模式都能直接測試
const CART_AUTH_PREREQUEST_SCRIPT = [
  "const token = pm.collectionVariables.get('token');",
  'if (token) {',
  "  pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + token });",
  '}',
];

function buildRequestItem(path, method, operation, tag) {
  const item = {
    name: operation.summary || `${method.toUpperCase()} ${path}`,
    request: {
      method: method.toUpperCase(),
      header: [],
      url: buildUrl(path, operation.parameters),
    },
  };

  const body = buildBody(operation, tag);
  if (body) {
    item.request.body = body;
    item.request.header.push({ key: 'Content-Type', value: 'application/json' });
  }

  const security = operation.security || [];
  const isPublic = security.length === 0;
  const isDualAuth = security.some((s) => Object.prototype.hasOwnProperty.call(s, 'sessionId'));

  if (isPublic) {
    item.request.auth = { type: 'noauth' };
  } else if (isDualAuth) {
    // auth 由 Cart 資料夾層級的 noauth + pre-request script 處理，這裡只補 X-Session-Id
    item.request.header.push({ key: 'X-Session-Id', value: '{{sessionId}}' });
  }
  // 其餘（純 bearerAuth）不設定 request.auth，直接繼承 collection 層級的 Bearer auth

  if (path === '/api/auth/login' || path === '/api/auth/register') {
    item.event = [
      {
        listen: 'test',
        script: { type: 'text/javascript', exec: SAVE_TOKEN_TEST_SCRIPT },
      },
    ];
  }

  if (!item.request.header.length) delete item.request.header;

  return item;
}

function buildFolders() {
  const folders = new Map();
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const tag = (operation.tags && operation.tags[0]) || 'Misc';
      if (!folders.has(tag)) folders.set(tag, { name: tag, item: [] });
      folders.get(tag).item.push(buildRequestItem(path, method, operation, tag));
    }
  }

  const cartFolder = folders.get('Cart');
  if (cartFolder) {
    cartFolder.auth = { type: 'noauth' };
    cartFolder.event = [
      {
        listen: 'prerequest',
        script: { type: 'text/javascript', exec: CART_AUTH_PREREQUEST_SCRIPT },
      },
    ];
  }

  return FOLDER_ORDER.filter((tag) => folders.has(tag)).map((tag) => folders.get(tag));
}

const collection = {
  info: {
    _postman_id: COLLECTION_ID,
    name: spec.info.title,
    description: spec.info.description,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
  },
  variable: RUNTIME_VARIABLES.map((v) => ({ key: v.key, value: v.value, type: 'string' })),
  item: buildFolders(),
};

const environment = {
  id: ENVIRONMENT_ID,
  name: `${spec.info.title} - Local`,
  values: RUNTIME_VARIABLES.map((v) => ({
    key: v.key,
    value: v.value,
    type: v.secret ? 'secret' : 'default',
    enabled: true,
  })),
  _postman_variable_scope: 'environment',
};

fs.mkdirSync('postman', { recursive: true });

fs.writeFileSync('postman/collection.json', JSON.stringify(collection, null, 2));
console.log('postman/collection.json generated successfully');

fs.writeFileSync('postman/environment.json', JSON.stringify(environment, null, 2));
console.log('postman/environment.json generated successfully');
