# 花漾生活 Bauhaus 改版 — 05-Login 頁面構圖調整

## Context

延續 Bauhaus 改版（`docs/design/design_draft.pen`），使用者要求調整 `05-Login` 頁面（frame id `HMO1c`）的構圖：登入/註冊表單面板目前靠左對齊，紅色裝飾圓形在右側偏上方、大範圍出血。使用者希望改為：表單面板置中於主要內容區域，紅色圓形裝飾改放到表單面板的右下角，作為角落裝飾而非大面積背景出血。

## 現況節點結構

讀取 `HMO1c` 確認：
```
05-Login (HMO1c, width:1440)
├─ Header (ref)
├─ Main (RFDC8, layout:none, width:fill_container=1440, height:640, clip:true)
│  ├─ BgCircle (EWH8u, ellipse, $bh-red, width:480 height:480, x:1080 y:60) ← 目前右側偏上、大幅出血
│  └─ FormPanel (y14LO, frame, width:420 height:364(fit_content), x:80 y:96) ← 目前靠左
│     ├─ Tabs (KaTgf)
│     ├─ Field_Email (YURV3)
│     ├─ Field_密碼 (FrFOc)
│     └─ LoginCta (qj29C, ref ButtonPrimary)
└─ Footer (ref)
```

`Main` 區域尺寸 1440×640；`FormPanel` 尺寸 420×364（fit_content 高度）。

## 調整方案

1. **FormPanel 置中**：因 `Main` 是 `layout:"none"`（絕對定位），用座標計算置中：
   - x = (1440 - 420) / 2 = **510**
   - y = (640 - 364) / 2 = **138**
   - `Update("y14LO", {x:510, y:138})`

2. **BgCircle 移到 FormPanel 右下角**：以置中後 FormPanel 的右下角座標 (510+420, 138+364) = (930, 502) 為中心點，讓 480×480 的圓形以該點為圓心對角線疊放（一半疊在面板上、一半出血在外，呼應全站「形狀疊壓文字/面板邊角」的包浩斯張力手法）：
   - x = 930 - 240 = **690**
   - y = 502 - 240 = **262**
   - `Update("EWH8u", {x:690, y:262})`

3. 維持 `BgCircle` 原有顏色（`$bh-red`）與尺寸（480×480）不變，僅調整位置。

## 後續微調

完成置中與角落疊放後，使用者再要求將 `BgCircle` 向右平移 30–50px，讓圓形更貼合 `FormPanel` 右下角邊緣：
- `Update("EWH8u", {x:730})`（原 x:690 → 730，平移 +40px，y:262 不變）

## 執行步驟

1. `batch_design`：依序 `Update("y14LO",{x:510,y:138})`、`Update("EWH8u",{x:690,y:262})`。
2. `get_screenshot(RFDC8)` 檢查置中效果與圓形疊放角落是否自然、是否遮住表單欄位文字（若有遮擋需再微調圓形位置/層級）。
3. `snapshot_layout(parentId:"RFDC8", problemsOnly:true)` 確認無破版。

## 關鍵節點參考

- `HMO1c` = 05-Login frame；`RFDC8` = Main 容器（layout:none, 1440×640）
- `y14LO` = FormPanel（表單面板，420×364）
- `EWH8u` = BgCircle（紅色裝飾圓，480×480，最終位置 x:730 y:262）

## 驗證方式

- `get_screenshot(RFDC8)` 確認表單面板視覺置中、紅圓裝飾退至面板右下角而不干擾表單可讀性。
- `snapshot_layout(problemsOnly:true)` 確認無 layout 問題（圓形部分出血裁切為預期效果，非破版）。

## 程式碼實作階段補充（`views/pages/login.ejs`）

延續上述 Pencil 構圖（表單面板置中、紅圓疊放右下角），實際落地為 Tailwind/EJS 程式碼時，額外完成以下調整：

- **表單面板**：`relative` + `border-2 border-bh-black` 直角白底面板，置中於 `min-h-[60vh] flex items-center justify-center` 容器；外層加 `overflow-hidden` 對應 Pencil `Main` 的 `clip:true`，裁切色塊出血範圍。
- **紅色圓形色塊**：以 `absolute -bottom-32 -right-32 md:-bottom-[240px] md:-right-[240px] w-64 h-64 md:w-[480px] md:h-[480px] rounded-full bg-bh-red` 疊放在面板右下角，手機寬度等比縮小。
  - **踩坑記錄**：圓形最初用 `-z-10` 完全不可見，因為 `relative` 容器若沒有自己的 z-index，不會形成獨立的 stacking context，導致負 z-index 子元素被推到整個頁面背景之下。修法：面板容器加上 `z-0`（`relative z-0`），讓面板自身形成 stacking context，圓形才正確疊在面板白底之上、表單內容（`z-10`）之下。
- **Tabs（登入/註冊切換）**：改為黑白反轉樣式（選中黑底白字、未選中白底黑字），移除原本圓角藥丸樣式，外層 `border-2 border-bh-black`、兩個分頁中間用 `border-l-2` 分隔。
- **Input 與按鈕**：欄位改 `border-2 border-bh-black` 直角樣式；因紅色圓形裝飾與紅色 focus 邊框、紅色送出按鈕視覺上會互相融在一起，使用者要求把 **focus 邊框色** 與 **送出按鈕底色** 改成 `bh-blue`（驗證錯誤狀態的紅框/紅字維持不變，仍用紅色表達錯誤語意）。
- **新增黃色三角色塊**：在面板左側新增 `bg-bh-yellow` 三角形（`[clip-path:polygon(0%_0%,100%_0%,50%_100%)]`，`rotate-[15deg]`），與右下角紅圓呈對角呼應；經兩輪微調：
  1. 尺寸放大兩倍：`w-28 h-24 md:w-36 md:h-32` → `w-56 h-48 md:w-72 md:h-64`。
  2. 位置往下約 10%、往左約 5%：`-left-20 top-16 md:-left-32` → `-left-24 top-24 md:-left-40`。
- **色塊與 `activeTab` 狀態連動**：紅圓與黃三角不再同時顯示，改用 `v-show` 綁定 `activeTab`——登入分頁顯示黃色三角形（`v-show="activeTab === 'login'"`），註冊分頁顯示紅色圓形（`v-show="activeTab === 'register'"`）。

驗證：每輪調整皆執行 `npm run css:build` 重建 CSS、Playwright 截圖比對桌面/手機寬度、登入/註冊分頁切換效果，並執行 `npm test` 確認 32/32 全綠不受影響。
