# Endless Runtime

Elyndra V0.5+ 的遊戲不依賴預先寫好的章節。

每一回合：
1. 玩家自由輸入行動。
2. deterministic Game Engine 產生 D20 結果。
3. Browser 建立只含玩家可知資訊的 snapshot。
4. /api/turn 要求 AI 提出 Turn Candidate。
5. Adventure Engine 驗證並只允許白名單 mutation。
6. Narrative / location / knowledge / item / NPC trust / quest / suggestions 寫入 Runtime。
7. IndexedDB autosave。
8. 下一回合重複。

AI 無法直接寫入 hidden Canon、骰子結果、任意 HP 或任意存檔欄位。

## 可持續遊玩的必要條件

部署環境設定：
- AI_API_URL
- AI_API_KEY（Provider 需要時）
- AI_MODEL

之後 /api/health 回傳 aiConfigured=true，遊戲自動進入 AI ONLINE。

## 下一步品質工作

Endless 不代表無限制 Context。長期遊玩應加入 event summarization、NPC memory compaction、world region archive，以及 token budget manager。