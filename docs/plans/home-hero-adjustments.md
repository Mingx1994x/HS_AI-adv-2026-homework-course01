# 花漾生活 Bauhaus 改版 — 首頁 Hero 區塊調整紀錄

## Context

延續 `docs/plans/archive/home-page-section-fix.md` 補齊首頁缺漏區塊後，使用者針對 Hero（`01-Home` → `Hero`，frame id `m7XJ6`）的構圖又做了多輪微調，部分由我透過 `batch_design` 執行、部分由使用者直接在 Pencil App 手動拖拉完成（Pencil 是多人協作環境，文件可能在我操作的同時被使用者修改）。本文件記錄**最終共識的設計決策與構圖邏輯**，不鎖定精確像素值——後續若要再調整，請以 `docs/design/design_draft.pen` 內 `m7XJ6` 的即時節點資料為準，本文件僅描述意圖。

## 最終 Hero 構圖決策

1. **CtaBox 簡化為純色塊**：原本內含「立即選購」文字的黃色方塊（`gZGSE`）拿掉文字，只留黃色正方形作為純裝飾幾何形狀。
2. **新增藍色三角形（`HeroTriangle` / `ESWQd`）**：作為 Hero 新的主要幾何構圖元素。
   - 旋轉角度：順時針約 45 度（`rotation:-45`，Pencil 採 CCW 正值，故順時針需設負值）。
   - 水平位置：往右平移至整體版面（1440px）約 50% + 10px 處。
   - 下方一角刻意超出 `m7XJ6` 的 `clip:true` 邊界，形成「出血裁切」效果，呼應左側紅圓的出血手法。
3. **花束照片（`HeroPhoto` / `iaTUL`）放大並疊放**：原始 `index.ejs` Hero Banner 的花束照片，從原本完全沒畫出來，到放大尺寸後疊放在黃色色塊與藍色三角形之上（z-order 最上層），呈現照片與兩個幾何色塊的疊壓張力。額外加上約 16px 圓角（`cornerRadius:16`），柔化照片邊角、與週邊純幾何直角形狀做出材質區分。
4. **新增 CTA 按鈕（`HeroCTAButton` / `W1sec`）**：標題文字（`GjUeG`「讓花裝點 / 生活每一刻」）下方補上「立即選購」按鈕，重用既有 `Component/ButtonCTA`（黃底黑字）並覆寫文字內容。
5. **底部齊平對齊**：CTA 按鈕的下緣與花束照片的下緣對齊在同一條水平線上，作為 Hero 左側文字區與右側視覺區共用的隱性基準線；標題文字位置也相應上移，避免與下方按鈕擁擠或重疊。
6. **Hero 整體高度** 由原本 560px 調整為 600px，以容納新增的 CTA 按鈕，同時讓藍色三角形的出血效果仍保留但不過度誇張。

## 涉及節點 ID（供後續調整參考）

- `m7XJ6` = Hero frame（`clip:true`，目前 height:600）
- `gZGSE` = CtaBox 黃色純色塊
- `ESWQd` = HeroTriangle 藍色三角形
- `iaTUL` = HeroPhoto 花束照片（含 `cornerRadius:16`）
- `GjUeG` = Headline 標題文字
- `W1sec` = HeroCTAButton（ref 自 `Component/ButtonCTA` id `KQY1P`）

## 驗證方式

- `get_screenshot(m7XJ6)` 確認紅圓、黃方塊、藍三角、花束照片、標題、CTA 按鈕的疊放與裁切效果符合預期。
- `snapshot_layout(problemsOnly:true)` 全文件檢查，目前回傳「No layout problems.」。
- 後續若使用者在 Pencil App 手動微調座標，本文件的「決策邏輯」（旋轉角度、疊放關係、底部對齊基準）仍應維持，僅精確像素值會隨手動調整變動。
