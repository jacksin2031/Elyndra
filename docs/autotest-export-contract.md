# Developer AutoTest 匯出與策略契約

本文件描述目前 source contract；它不表示任何一個歷史 run 已部署到 Pages，也不把瀏覽器接受請求等同於檔案已保存或已上傳。

## 保留 snapshot 與原始 artifact

- AutoTest 完成後保存 snapshot 至 IndexedDB 的 `last` slot，並另存為以 run 身分識別的 archive slot。正常 IndexedDB 路徑會同時保存 Debug / World artifact 的原始 body；讀回時優先使用這些原始 bytes 對應的文字。
- 舊 snapshot 沒有原始 artifact 時，`buildAutotestExportArtifacts()` 會按兼容規則重建 JSON。這是重建結果，不應描述成歷史原始 bytes 的逐 byte readback。
- localStorage fallback 僅保存 snapshot；不保存預建的下載 artifacts。它能保留可重建的資料，但不提供原始 artifact byte identity 的證明。
- Recovery artifact 由 Debug payload 和 Worlds snapshot 組成。單一 world 的 World artifact 使用 `.elyndra` 檔名；多個 worlds 使用 `elyndra-autotest-worlds-v1` JSON。

## 交付方式與可宣稱的證據

- **Service Worker HTTP attachment / 標準下載**：先把目前選取的 snapshot 保存到其 archive slot，再等待目前版本的 Service Worker 接管；兩者成功才使用帶有 `slot` 的同源 HTTP attachment。Service Worker 按指定 slot 取檔，不會改用其他 run 的 `last`；沒有 `slot` 的舊連結仍可讀取 `last`。保存失敗、IndexedDB 不可用或目前版本未接管時，使用所選 artifact 的 Blob URL，點擊重試不得把這個 fallback 升級為錯誤的 HTTP 連結。使用者點擊只記為 `DOWNLOAD REQUESTED · NOT VERIFIED`。只有把實際檔案選回，並通過 filename、UTF-8 bytes 和 SHA-256 比對，才記作 `verified`。
- **Web Share / File Picker / Directory Picker**：只有瀏覽器實際提供相應 API 時才顯示 capability。Share API 被呼叫或完成不等於目的 app 已保存檔案；Picker 的成功結果也只證明其 API 回傳的寫入流程完成。
- **Native drag**：payload 同時可包含原生 `File` item 和 Chromium `DownloadURL`。頁內 drop self-test 只驗證 File payload；外部 dragstart、dragend 或 dropEffect 均不證明 Explorer/ChatGPT 已保存或上傳。
- **頁面文字取回**：manifest 帶有檔名、MIME、UTF-8 bytes、字元數、chunk 數及整體 SHA-256。分段按 index 1..N 原樣串接，不插入換行或分隔符；每段也有 bytes 與 SHA-256。
- **Codex bridge**：`window.__ELYNDRA_AUTOTEST_CODEX__` 提供 `manifest(kind)`、`read(kind,index)`、`readAll(kind)`、`verifyText(kind,text)`。它只暴露目前選取／還原 snapshot 的 artifact 內容，不會替本機寫檔。取回後仍要在呼叫端以 UTF-8 bytes 及 SHA-256 驗證。
- **Copy**：copy API 回傳只表示瀏覽器提供的 copy 路徑已接受文字；不得由此推論 Windows clipboard 或外部應用已收到內容。

## 遊玩策略

- 批次開始時凍結的有效 `config.playStrategy` 是執行及報告的權威值。有效值只有 `FIRST_BUTTON` 和 `AI_DECISION`；只有缺少／無效時才讀取 localStorage 作 fallback。後續 localStorage 變化不得改寫該批次的決策策略或報告。
- `FIRST_BUTTON` 一般選第一個可見行動按鈕。連續無進展或重複目標達門檻時，若有可見的其他 action kind／target，改選那個按鈕並保留其真實 index；此 recovery 仍是 `mode=suggestion`，不會偽造 free action。
- 存在可見按鈕但沒有替代 action class／target 時，仍選 index 0，並標示 `FIRST_BUTTON_STALL_NO_ALTERNATIVE`。只有完全沒有可見按鈕時，才可用 free-action fallback；若有已知可達路線，先用該路線，否則用本地 observe fallback。
- 戰鬥中維持 combat action contract；低 HP retreat safety override 屬 combat mode，與「沒有按鈕時才用 free fallback」分開處理。

## 驗證邊界

Focused Node tests 驗證 source module 的保存、分段重組、filename/bytes/SHA、drag payload、HTTP attachment、fileShare capability，以及兩種策略的 batch/storage 優先序。這些測試不會建立或修改玩家世界、玩家 save 或 IndexedDB run，也不證明 historical deployment。
