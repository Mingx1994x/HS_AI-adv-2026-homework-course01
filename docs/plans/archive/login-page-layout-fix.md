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
