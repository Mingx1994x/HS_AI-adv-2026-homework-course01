# 花漾生活 Bauhaus 視覺改版 — Pencil 設計稿規劃

## 背景

現有花卉電商網站（花漾生活）採用暖色系玫瑰/鼠尾草綠（rose/sage）+ 米白底色的柔和風格。使用者要求依照包浩斯（Bauhaus）美學進行**全面視覺改造**——三原色（紅/藍/黃）+ 黑白、大型幾何形狀構圖、粗體無襯線字體、不對稱張力排版，取代目前的暖色花藝調性。

原本參考的 `bauhaus-design` skill 是寫死給「島嶼共鳴 2026 音樂祭」用的（lineup/schedule/venues/tickets 等版塊），與花卉電商無關，**不可直接套用其頁面結構**；只沿用其中可重用的部分：色彩 token、字級系統、幾何形狀 CSS 手法、Do/Don't 原則。`frontend-design` skill 則提供通用設計方法論（從主題本身找特色、限制簽名元素數量、結構需承載真實意義）。

**本次任務範圍**：產出視覺設計系統 + 9 個前台頁面的 Pencil 設計稿（`docs/design/design_draft.pen`），作為改版的設計規格文件。**不包含**實際修改 Tailwind/EJS 程式碼——那是設計稿確認後的下一步，本次不做。

**前提條件**：Pencil MCP 工具（`get_editor_state`、`get_guidelines` 等）目前回報找不到使用中的 .pen 編輯器，代表 `docs/design/design_draft.pen` 還沒有在 Pencil App 中被開啟。**執行設計繪製前，需請使用者先在 Pencil App 開啟此檔案**，否則 MCP 呼叫會失敗。

## 設計系統（Design Tokens）

延續包浩斯三原色 + 黑白核心，**不額外新增第四色**，而是賦予三色功能意義，剛好對應現有訂單狀態（pending/paid/failed）：

| Token | Hex | 用途 |
|---|---|---|
| `--bh-white` | `#f7f3ea` | 頁面底色（米白紙，非純白） |
| `--bh-black` | `#111111` | 文字、分隔線、邊框、結構 |
| `--bh-red` | `#d33023` | 主要 CTA（加入購物車/立即選購）、價格強調、`failed` 狀態 |
| `--bh-blue` | `#2253a8` | 次要動作（前往付款）、`paid` 狀態 |
| `--bh-yellow` | `#f4c027` | 提示/注意（免運門檻提示）、`pending` 狀態 |

**字級**：中文標題/正文用 Noto Sans TC 粗黑體（取代原 Noto Serif TC logo 字體）；數字/價格用 Futura/Helvetica Neue 等幾何 Latin 字體（`--font-numeral`），CJK 與數字分軌處理。沿用包浩斯字級表：display clamp(72-180px)/900、h1 clamp(40-72px)/800、h2 22px/700、body 15px/400、caption 11px/700/uppercase。

**版面**：max-width 1280px 容器，但幾何形狀可全出血（bleed）超出容器邊界；12 欄不對稱網格（避免 6/6 對稱分割）；每個畫面最多 3 個可見幾何形狀（一主一副一點綴），無圓角（除了圓形本身與數量步進器的圓形按鈕）。

**簽名元素 — 「莖與花苞」**：垂直黑色細線（莖）+ 端點實心圓（花苞），圓的顏色即代表狀態/重點。從 Logo（花漾生活字樣旁的莖+紅花苞）、商品價格標籤、訂單狀態徽章（黃=待付款/藍=已付款/紅=付款失敗的圓點）、區塊分隔符號，全站重複使用同一套幾何語言——把抽象的包浩斯圓形賦予花卉語意，同時是全站唯一被允許「搶眼」的元素，其餘版面保持安靜。

## 共用 Header / Footer

**Header**：黑色滿版色帶（取代原白底 sticky header），左側為莖+花苞 Logo 標記，導覽連結（商品列表/購物車/我的訂單，沿用現有 `views/partials/header.ejs` 的連結結構）改為大寫、letter-spacing 的 caption 樣式白字；購物車數字徽章改成黃色方塊；登入 CTA 改為紅色實心方塊白字，直角無圓角。

**Footer**：黑色色帶，僅版權文字 + 一個描邊白圓（安靜的花苞呼應），不做多欄佈局。

## 9 個前台頁面構圖規劃

| # | 頁面 | 構圖要點 |
|---|---|---|
| 1 | `index.ejs` 首頁 | Hero：左側大紅圓出血 + 黑色巨大標題壓在圓上（mix-blend-multiply）；右上黃色方塊內放 CTA。商品格採實色色塊卡（紅/藍/黃/白底黑框輪替），價格用莖+花苞 bullet。分頁用編號方塊。 |
| 2 | `product-detail.ejs` | 左右 7/5 不對稱：左側商品照裁切方形，右下角被黃色三角「切入」；右側價格用巨大數字字體+紅花苞 bullet，庫存用藍/紅 caption 標籤，CTA 為紅色滿版矩形。 |
| 3 | `cart.ejs` | 商品列以純黑分隔線（無卡片陰影）排列；NT$500 免運門檻橫幅：未達標黃色、達標藍色；右下角總計區為黑色實色塊，總金額用巨大紅色數字。 |
| 4 | `checkout.ejs` | 7/5 split：左側表單黑色粗框、無圓角、focus 時邊框變紅；右側訂單摘要為藍色實色塊（與購物車黑塊區別，代表「進入結帳」）；CTA 為黃底黑字滿版矩形。 |
| 5 | `login.ejs` | 表單置於左三分之一黑框白底面板，右側大紅圓出血背景；登入/註冊 tab 改為方形黑框按鈕，啟用狀態為黑底白字。 |
| 6 | `orders.ejs` | 每筆訂單為黑框矩形列，內部以垂直細線分隔訂單編號/總額/狀態；狀態徽章直接用花苞圓點（黃/藍/紅）+ caption 文字。空狀態用描邊黑圓取代原 emoji。 |
| 7 | `order-detail.ejs` | 頂部黑色色帶顯示訂單編號/狀態花苞徽章；商品明細表為細線列，標題列 caption/uppercase；總計列以 4px 粗黑線分隔，總額巨大紅色數字；付款結果橫幅改為滿版藍（成功）/紅（失敗）色帶白字；待付款時顯示藍色「前往付款」CTA。 |
| 8 | `payment-redirect.ejs` | 維持無 header/footer 的極簡轉場頁；黑底，中央三色（紅/藍/黃）旋轉弧線環（CSS 幾何 spinner，呼應康定斯基三色構成），caption 白字提示文案。 |
| 9 | `404.ejs` | 巨大「404」數字字體，「0」直接畫成實心紅色花苞圓（將品牌符號融入錯誤頁字形）；caption 說明文字；CTA 為黑色方塊白字按鈕。 |

## Pencil 執行步驟

1. **前提**：確認使用者已在 Pencil App 開啟 `docs/design/design_draft.pen`。
2. `get_editor_state(include_schema: true)` — 取得 schema（執行任何操作前必做）。
3. `get_guidelines()` — 確認 Pencil 節點類型、版面原語、blend-mode 等限制是否支援本規劃中的形狀疊壓效果。
4. `set_variables` — 先註冊色彩 token（bh-white/black/red/blue/yellow）、字級（display/h1/h2/body/caption/numeral）、間距/半徑規則，供後續所有畫面共用。
5. `batch_design` 依序建立 9 個 frame（建議畫布寬度 1440px，desktop-first 單一斷點）：
   `01-Home` → `02-Product-Detail` → `03-Cart` → `04-Checkout` → `05-Login` → `06-Orders` → `07-Order-Detail` → `08-Payment-Redirect` → `09-404`
   Header/Footer 僅在第一個 frame 完整定義樣式，後續 frame 重用同一套組成。
6. 每完成 1-2 個 frame 用 `get_screenshot` 檢查構圖（尤其檢查形狀出血/疊壓的 Home、Login、404）。
7. 全部完成後用 `snapshot_layout` 做整體結構檢視，確認跨頁間距/網格一致。

## 驗證方式

- 逐頁 `get_screenshot` 截圖檢視色彩/字級/幾何構圖是否符合本規劃。
- `snapshot_layout` 確認 9 個 frame 的版面結構與 grid 對齊一致。
- 與使用者一起檢視截圖，確認是否符合預期後，再決定是否進入「程式碼實作」階段（Tailwind/EJS 改版，本次不包含）。

## 關鍵檔案參考

- `.claude/skills/bauhaus-design/SKILL.md` — 色彩/字級/形狀 token 來源（僅取可重用部分）
- `views/partials/header.ejs`、`views/partials/footer.ejs` — 現有導覽結構，改版需保留連結但重設樣式
- `views/pages/*.ejs`（9 個前台頁面）— 各頁現有內容結構對照
- `public/js/pages/order-detail.js` — 確認訂單狀態列舉 `pending`/`paid`/`failed`，對應花苞徽章顏色
- `public/css/input.css` — 現有 Tailwind CSS 變數（將被取代，僅供對照舊樣式）
- `docs/design/design_draft.pen` — 本次設計稿輸出目標
