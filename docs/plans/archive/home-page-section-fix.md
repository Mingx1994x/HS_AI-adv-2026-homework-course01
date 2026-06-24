# 花漾生活 Bauhaus 改版 — 首頁缺漏區塊補件

## Context

包浩斯改版的設計系統與 9 個前台頁面已在 `docs/design/design_draft.pen` 完成並封存計畫於 `docs/plans/archive/bauhaus-frontend-redesign.md`。使用者覆核首頁（`01-Home`，frame id `c448A`）時發現：實際 `views/pages/index.ejs` 有 6 個區塊（Hero / 精選推薦 / 品牌故事 / 探索所有花藝(全部商品+分頁) / 顧客好評 / 服務特色），但 Pencil 稿只畫了 Hero、一個商品 Grid（標題誤植為「本週精選」）、Pagination 三塊，漏了**精選推薦、品牌故事、顧客好評、服務特色**四個區塊。本次任務是補齊這 4 塊，並修正既有 Grid 區塊的標題與功能缺口。

讀取 `c448A` 現況確認結構：`Header(ref) → Hero(m7XJ6) → ProductGrid(kYqJm, 標題"本週精選") → Pagination(vqQaA) → Footer(ref)`。`ProductGrid` 內 3 列 tile（`O0RTTx`/`q4Z5R`/`EXHvo`），每個 tile 是色塊卡（紅/藍/黃/白輪替）+ 圖片 + 名稱 + `PriceTag` component(`N9gfy`)，**但沒有「加入購物車」按鈕**——對照原始程式碼，全部商品 grid 的卡片本來就有按鈕，這是功能缺口需補上；而本來該獨立存在的「精選推薦」（首頁前 4 項、純展示無按鈕）目前完全沒畫。

## 修正後的首頁區塊順序

```
Header
Hero                    ← 補一張花束照片，疊加於藍色三角形一角、置於最上層
精選推薦  Featured        ← 新增：4 個 tile 單排，沿用色塊卡樣式，無按鈕，可點擊
品牌故事  Brand Story     ← 新增：左右不對稱 split
探索所有花藝 (改標題)      ← 沿用現有 ProductGrid (kYqJm)，標題改「探索所有花藝」+ 副標，每個 tile 補上 ButtonPrimary「加入購物車」
Pagination              （不動，沿用 vqQaA）
顧客好評  Testimonials    ← 新增：3 欄黑框卡
服務特色  Service Features ← 新增：3 欄幾何 icon + 文字
Footer
```

## Hero 區塊補件

現有 `Hero`(`m7XJ6`，height:560, clip:true) 內已有 Kicker(`wubEw`)、紅圓出血(`ZQf4Q`)、黃色 CtaBox(`gZGSE`，x:1080 y:64 w:220 h:220，內含 CTA 子節點)、Headline(`GjUeG`)。依使用者最新指示調整為：

1. **CtaBox 簡化**：刪除 `gZGSE` 內部的 CTA 子節點（文字/按鈕），只留下黃色正方形色塊本身，作為純裝飾幾何形狀（呼應包浩斯「形狀本身即構圖」原則）。
2. **新增藍色三角形**：新增 polygon 節點「HeroTriangle」（`type:"polygon"`，`polygonCount:3`，`fill:"$bh-blue"`），放在 Hero 偏「中下」位置（約 x:560 y:360 w:320 h:300，水平置中於畫面、垂直貼近下緣），套用 `rotation` 10–20 度製造張力。刻意讓三角形下方一角超出 Hero 的 560px 高度邊界，因 `m7XJ6` 已設 `clip:true`，超出部分會自然被裁掉、形成「形狀出血」效果。
3. **照片疊放於三角形一角**：原始 `index.ejs` Hero Banner 的花束照片（`https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600`）目前完全沒畫出來，新增圖片 Frame「HeroPhoto」（無圓角矩形，符合 Do/Don't），定位讓其一角疊蓋在 HeroTriangle 上方一角（約 x:560 y:200 w:280 h:300，使其右下角落在三角形頂部角附近），並放在 `m7XJ6` children 陣列最後（z-order 最上層，疊在三角形與其他形狀之上）。
4. 三者疊放順序（z-order，由下到上）：紅圓 → CtaBox(純色塊) → HeroTriangle → HeroPhoto。
5. 實際座標於執行時用 `get_screenshot(m7XJ6)` 反覆微調，使三角形旋轉角度與照片疊放位置視覺上自然、且三角形出血裁切效果明顯。

## 各新區塊設計

**精選推薦（Featured）**：複製 `ProductGrid` 的 tile 視覺語言（色塊卡紅/藍/黃輪替、`PriceTag` ref），但只取 4 個、單排、無 CTA 按鈕（呼應原站「點擊瀏覽、非購買決策點」的語意）。Heading 用 caption「FEATURED」+ h1「精選推薦」+ body 副標「本季最受歡迎的花卉精選」。

**品牌故事（Brand Story）**：左右不對稱（左 5 / 右 7），左側方形商品照（沿用 unsplash 花藝師圖），右側黑底白字面板放標題「專心，做好一束花的感動」、正文、斜體 caption 引言「『每一束花，都是一份用心的禮物。』」搭配一個小型莖+花苞（紅）簽名圖形放在引言旁，呼應全站簽名元素，是本區塊唯一的裝飾。

**探索所有花藝（既有 ProductGrid 修正）**：Heading 文字節點 `WGdea` 內容由「本週精選」改為「探索所有花藝」，新增副標 body「找到屬於您的那束花」；3 列 tile 內各補一個 `ButtonPrimary`（ref `V6qRW`）「加入購物車」，黑底白 tile（向日葵那張）用 `ButtonOutline`（ref `no5nV`）維持對比。

**顧客好評（Testimonials）**：3 欄黑框白底卡（無陰影，2px 黑框取代陰影），每卡：5 個小花苞圓點（取代⭐，紅色實心）排成評分列、引言內文、姓名 caption。沿用原始 3 則評論文字（小美/阿明/大衛）。

**服務特色（Service Features）**：3 欄，每欄一個幾何 icon 取代原 emoji——快速配送→藍三角、精美包裝→黃方塊、滿額免運→紅花苞圓——下方標題 + caption 說明，文字與原內容一致（台北市區當日配送／每束花都經過精心包裝／消費滿 NT$500 免運費）。

## 執行步驟

1. `batch_design`：(a) Delete `gZGSE`（CtaBox）內的 CTA 子節點，只留黃色色塊本身；(b) Insert 藍色 polygon「HeroTriangle」於中下位置並設定 rotation 10–20 度；(c) Insert「HeroPhoto」圖片 Frame 到 `m7XJ6` children 最後，疊在 HeroTriangle 一角之上（無圓角，原花束 unsplash 圖）。完成後用 `get_screenshot(m7XJ6)` 檢查並微調座標/旋轉角度，確認三角形下緣出血裁切效果正確。
2. `batch_design` Update `WGdea`（heading 文字）改為「探索所有花藝」，並在其後 Insert 一個 body 副標文字節點。
3. 對 `O0RTTx`/`q4Z5R`/`EXHvo` 三列、共 9 個 tile，各 Insert 一個 `ButtonPrimary`/`ButtonOutline` ref 於 Price 節點之後。
4. 在 Hero(`m7XJ6`) 之後、ProductGrid(`kYqJm`) 之前，Insert 新 Frame「FeaturedProducts」：heading + 4-tile 單排（複製 tile 結構但不含按鈕）。
5. 在 FeaturedProducts 之後、ProductGrid 之前，Insert 新 Frame「BrandStory」：左右split。
6. 在 Pagination(`vqQaA`) 之後、Footer ref(`I7aVSA`) 之前，依序 Insert 新 Frame「Testimonials」與「ServiceFeatures」。
7. 每完成 1-2 個區塊用 `get_screenshot(c448A)` 檢查整頁構圖與間距一致性。
8. 全部完成後 `snapshot_layout(problemsOnly:true)` 確認無破版。

## 驗證方式

- `get_screenshot` 確認 9 區塊（含原有 3 塊）依正確順序呈現，色彩/字級符合既有 Bauhaus tokens。
- 與使用者核對首頁截圖是否覆蓋原站全部 6 大區塊的內容語意。
- 其餘 8 個頁面是否也有類似「區塊漏畫」問題，待使用者下一步逐頁覆核時再確認（本次僅處理首頁）。

## 關鍵節點參考

- `c448A` = 01-Home frame；`m7XJ6` = Hero；`kYqJm` = ProductGrid；`WGdea` = Grid heading 文字；`vqQaA` = Pagination；`I7aVSA` = Footer ref
- Tile 色塊輪替範例：`O0RTTx`（紅/藍/黃三色 tile），`PriceTag` ref id `N9gfy`
- 可重用元件：`ButtonPrimary`(`V6qRW`)、`ButtonOutline`(`no5nV`)、`PriceTag`(`N9gfy`)
- 對照來源：`views/pages/index.ejs`（6 大區塊原始內容與文案）
