# 花漾生活 Bauhaus 改版 — 程式碼實作（第 1 期：基礎設施 + Header/Footer + 首頁）

## Context

`docs/design/design_draft.pen` 內已完成全站 Bauhaus 視覺設計稿（9 個前台頁面 + 共用元件），先前的 Pencil 設計階段已封存於 `docs/plans/archive/`。使用者現在要求把設計稿落實成實際的 Tailwind/EJS 程式碼。經確認，採**逐頁實作**模式（與畫設計稿時相同節奏）：本次先做「全站共用基礎設施（色彩/字體 token、Header、Footer）+ 首頁（index.ejs）」，使用者看過效果後再決定後續 8 頁的實作順序與時程。

### 現況技術細節（已透過程式碼探查確認）

- Tailwind **v4**，無 `tailwind.config.js`，所有 token 定義在 `public/css/input.css` 的 `@theme` block，build 指令為 `npm run css:build` / `npm run dev:css`（呼叫 `@tailwindcss/cli`）。
- 現有色彩 token：`rose-primary #C4727F`、`rose-dark #A85B67`、`rose-light #E8A5AE`、`apricot #D4956A`、`sage #7EA584`、`cream #FBF8F4`、`blush #FFF1EC`、`rose-bg #FDEAE4`、`text-primary #2C2A28`、`text-secondary #6B6560`、`text-muted #9A948E`。
- 字體：Google Fonts 載入於 `views/partials/head.ejs`（Noto Sans TC 400/500/700 + Noto Serif TC 400/700）；`body` 預設 `font-family: 'Noto Sans TC'`；各頁標題目前用 inline `style="font-family: 'Noto Serif TC', serif;"`。
- **重要發現**：Header 的 `#auth-nav` 內容並非寫在 `header.ejs` 裡，而是由 `public/js/header-init.js` 在執行階段用 `innerHTML` 字串插入（含寫死的 `bg-rose-primary`、`rounded-full`、`text-text-secondary` 等 class）。**改 Header 視覺一定要同步改 `header-init.js`，否則登入按鈕/登出狀態會維持舊樣式。**
- `#cart-badge` 是同一個 DOM 元素直接被 JS `textContent`/`style.display` 操作（非巢狀 span），改外觀時必須保留這個元素本身（id 不變、仍支援 `display:flex` 切換），只能調整其 class。
- 其餘 8 頁的 `views/pages/*.ejs` 仍使用舊 rose/sage/apricot token 與 `rounded-*`、`shadow-*`、Noto Serif TC——**本次不動它們**，因此舊 token 必須保留（不可刪除/改值），新 Bauhaus token 以「新增」方式並存，等全部 9 頁都遷移完成後再統一清理舊 token（留待最後一期处理，本次不做）。

## 設計系統 token 對應（新增到 `public/css/input.css`）

在現有 `@theme` block **新增**（不修改現有項目）：

```css
--color-bh-red: #d33023;
--color-bh-blue: #2253a8;
--color-bh-yellow: #f4c027;
--color-bh-black: #111111;
--color-bh-white: #f7f3ea;
--font-display: 'Noto Sans TC', sans-serif;
--font-numeral: 'Space Grotesk', sans-serif;
```

`views/partials/head.ejs` 的 Google Fonts `<link>` 新增 `Space Grotesk:wght@700;900`、Noto Sans TC 補上 `900` 字重，**保留** Noto Serif TC（其餘未遷移頁面仍在用）。

語意配色規則（已在 Pencil 稿中驗證過）：
- `bh-red`：主要 CTA、價格強調、`failed` 狀態
- `bh-blue`：次要動作（前往付款）、`paid` 狀態
- `bh-yellow`：提示/強調、`pending` 狀態
- `bh-black` / `bh-white`：文字、邊框、底色（取代 text-primary/secondary/muted 與 cream/blush/rose-bg 的多層次灰白）
- 圓角全面移除（僅圓形本身可用 `rounded-full`），陰影改為 `border-2 border-bh-black` 線框

## Header / Footer 改版

對照 Pencil `Component/HeaderBar`(`ofUs6`) 與 `Component/FooterBar`(`Ce0yQ`) 的實際節點結構：

**`views/partials/header.ejs`**：黑底（`bg-bh-black`）、高度 72px、左側 Logo 改為「莖+花苞」圖形（2px 白色直線 + 12px 紅色圓點，用兩個絕對定位的小 div 或 inline SVG）+「花漾生活」白字粗體；中間導覽（`商品列表`/`購物車`+`#cart-badge`/`#orders-link`）改為大寫、字距加寬的 caption 樣式白字；`#cart-badge` 移除 `rounded-full`/`bg-rose-primary`，改為 `bg-bh-yellow text-bh-black`、移除絕對定位改成 inline-flex 緊接在「購物車」文字後（沿用既有 `display:none` 初始狀態與 JS 切換邏輯，不動 id）；`#auth-nav` 容器保留空殼。

**`public/js/header-init.js`**：同步把字串內 class 換成 Bauhaus 版本（`bg-rose-primary`→`bg-bh-red`、`rounded-full`→移除、`text-text-secondary`/`text-text-muted`→`text-bh-white`、加上 `uppercase tracking-widest text-xs font-bold`），邏輯與條件判斷完全不動。

**`views/partials/footer.ejs`**：黑底、左右排版（版權文字 + 一個白色描邊圓圈裝飾，對應 Pencil 的 `QuietBud`），移除原本置中單欄版型。

## 首頁（`views/pages/index.ejs` + `public/js/pages/index.js`）改版對照

對照 Pencil `01-Home`(`c448A`) 各區塊，逐段把現有 Vue 結構保留、只換視覺：

| Pencil 區塊 | 現有 EJS 區塊 | 改版要點 |
|---|---|---|
| Hero (`m7XJ6`) | Hero Banner | 左側大紅圓出血背景（絕對定位+`rounded-full`+`overflow-hidden`容器裁切）、黑色粗體標題、黃色純色塊裝飾、藍色三角（`clip-path: polygon(...)`，Tailwind 任意值語法 `[clip-path:...]`）、花束照片疊放（`rounded-2xl`例外允許，因設計稿本身用了圓角）、新增「立即選購」CTA 按鈕 |
| FeaturedProducts (`vuVAB`) | 精選推薦 (`products.slice(0,4)`) | 4 格單排、色塊輪替（紅/藍/黃/白），**不含**加入購物車按鈕，沿用既有 v-for 但改用色彩輪替 helper |
| BrandStory (`l6zmVU`) | 品牌故事 | 左右不對稱（圖片 + 黑底白字面板），引言旁加莖+花苞簽名圖形（重用 Header logo 的同一組件） |
| ProductGrid (`kYqJm`) | 探索所有花藝 (`v-for="product in products"`) | 標題文案調整、卡片改色塊輪替（4色循環）+ 補回「加入購物車」按鈕（沿用既有 `addToCart`/`product._adding` 邏輯，只換樣式） |
| Pagination (`vqQaA`) | 分頁按鈕 | 圓形改方形數字按鈕，沿用 `loadProducts(p)` |
| Testimonials (`oIyod`) | 顧客好評 | 卡片改黑框白底（移除 shadow）、星星評分改 5 個小紅色花苞圓點 |
| ServiceFeatures (`wq4NT`) | 服務特色 | emoji 改實際 icon（卡車/禮物/愛心），保留三色語意 |

**色彩輪替 helper**：在 `index.js` 新增一個小函式（例如 `tileStyle(idx)` 回傳 `{bg, text}` class 字串，4 色循環 `[red,blue,yellow,white]`），在 `index.ejs` 的 tile 卡片用 `:class="tileStyle(idx).bg"` 套用，取代目前固定的 `bg-white`。`featuredImages` 陣列、`goToProduct`、`addToCart`、`loadProducts`、`pagination` 等既有邏輯**完全不變**。

## 執行步驟

1. Edit `public/css/input.css`：新增 Bauhaus token（不動舊 token）。
2. Edit `views/partials/head.ejs`：補字體。
3. Edit `views/partials/header.ejs` + `public/js/header-init.js`：黑色 Header、Logo、nav 樣式、auth-nav 字串樣式同步。
4. Edit `views/partials/footer.ejs`：黑色 Footer。
5. Edit `public/js/pages/index.js`：加入 `tileStyle` 色彩輪替 helper。
6. Edit `views/pages/index.ejs`：依上表逐區塊套用新樣式，新增 Hero 幾何裝飾與 CTA。
7. 執行 `npm run css:build` 重新編譯 CSS。
8. 啟動 `npm run dev:server`，用瀏覽器檢視首頁與其他頁的 Header/Footer 是否正常（其餘 8 頁此時會呈現「新黑色 Header/Footer + 舊玫瑰色頁面內容」的過渡期外觀，這是預期中的暫時狀態）。
9. 執行 `npm test` 確認後端測試（與本次改動無關，但需確認沒有意外破壞任何依賴 DOM id 的行為）。

## 關鍵檔案

- `public/css/input.css`、`views/partials/head.ejs`
- `views/partials/header.ejs`、`public/js/header-init.js`、`views/partials/footer.ejs`
- `views/pages/index.ejs`、`public/js/pages/index.js`
- 對照來源：`docs/design/design_draft.pen` 的 `ofUs6`（HeaderBar）、`Ce0yQ`（FooterBar）、`c448A`（01-Home）及其子節點

## 驗證方式

- `npm run css:build` 無錯誤、`output.css` 正確產生新 utility classes（`bg-bh-red` 等）。
- `npm run dev:server` 後人工瀏覽首頁：Hero 幾何疊放、Featured/BrandStory/Grid/Testimonials/ServiceFeatures 視覺對照 `get_screenshot(c448A)` 截圖一致；購物車加入、分頁切換等既有互動功能正常運作（手動點擊測試，因這些是前端互動非後端 API，現有 Vitest 主要測後端）。
- `npm test` 全綠，確認沒有動到後端邏輯。
- 確認 `#cart-badge`、`#orders-link`、`#auth-nav` 三個 id 的 JS 行為（登入/登出切換、購物車數字更新）在新樣式下依然正常。

## 執行結果（已完成）

- 全部 9 個項目（CSS token、字體、Header、Footer、首頁 7 個區塊、build+測試驗證）皆已實作完成。
- `npm run css:build` 成功；瀏覽器截圖確認首頁視覺與 Pencil 設計稿高度一致；`/login`、`/cart` 等未遷移頁面的黑色 Header/Footer 正常顯示，過渡期外觀符合預期；`npm test` 32/32 全綠。

## 首頁微調（第一輪 code review 後的細部調整）

完成第 1 期落地後，使用者逐項檢視首頁並提出以下微調，皆已實作並通過 `npm run css:build` + `npm test`（32/32）驗證：

- **Service Features**：3 欄 icon 區塊外層 grid container 加 `py-4`，讓圖示/文字不貼齊區塊上下邊緣（個別 item 上的 `pb-4` 因看不出效果而改用此方式）。
- **Hero 區塊重構為 Flex**：原本標題文字與圖片是用 `absolute` 定位疊放，改成 `flex flex-col lg:flex-row items-end` 兩欄各佔 50%（`lg:w-1/2`），標題/CTA 與圖片底部對齊（`items-end`）。
  - 圖片高度從固定 `h-[320px]` 改成 `h-full`（隨 Hero 區塊高度縮放），後又因效果不佳改成：外層 wrapper `w-1/2 h-full relative`，圖片本身 `absolute bottom-0 left-0 w-4/5 h-4/5`（佔外層 80%、靠左下對齊），放棄了中間嘗試過的 `aspect-square` 正方形作法。
  - 標題文字內層加一個 `w-3/4` 區塊，原先 `mx-auto` 置中效果太分散，改成 `ml-auto` 靠右對齊。
  - 標題字級加響應式斷點：`text-4xl sm:text-5xl md:text-6xl xl:text-7xl`（中間試過 `xl:text-8xl` 太大，調回 `text-7xl`）。
  - `lg` 以下（圖片隱藏的範圍）文字垂直置中於整個 Hero 區塊：row 容器加 `justify-center lg:justify-start`，且 `pb-16` 改成只在 `lg:pb-16` 生效（避免不對稱 padding 讓置中偏移）。
  - 藍色三角形（`HeroTriangle`）取消 `hidden lg:block`，改成全斷點顯示，並加上手機尺寸 `w-40 h-36 md:w-[360px] md:h-[320px]`；位置與角度微調為 `top-[55%]`（原 `top-[45%]`，往下移）、`rotate-[-35deg]`（原 `-45deg`，順時鐘多轉 10 度）。
  - CTA 按鈕（立即選購）在 `<md` 範圍內改為「區塊內靠右呈現」：外層多包一層 `<div class="text-right md:text-left">`，僅在 mobile 寬度把 CTA 推到區塊右側，`md` 以後完全恢復原始左側位置（曾經誤做成 `md:absolute` 取代黃色色塊的版本，使用者糾正後改回此做法）。
  - 黃色色塊維持 `hidden md:block`（`md` 以上才顯示，未變動）。
- **Featured Products 4 卡 grid**：`grid-cols-2 md:grid-cols-4` 改成 `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`，並讓第 4 張卡（`idx===3`）多加 `md:hidden lg:block`，使 `md` 範圍剛好 3 欄不溢出、`lg` 恢復 4 欄全顯示。

## 範圍外（待後續回合）

- `product-detail.ejs`、`cart.ejs`、`checkout.ejs`、`login.ejs`、`orders.ejs`、`order-detail.ejs`（含 `orders.js`/`order-detail.js` 的 `statusMap` 改色）、`payment-redirect.ejs`、`404.ejs`：依相同模式，逐頁對照 Pencil 對應 frame 實作。
- 全站舊 token（rose/sage/apricot/cream/blush/text-*）與 Noto Serif TC 字體的最終清理：等全部 9 頁遷移完成後一次性移除。
