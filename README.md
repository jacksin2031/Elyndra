# Elyndra

**Elyndra** 是一款 AI × TRPG × World Discovery 的異世界網頁 RPG。

> 每一個世界，都有自己的真相。

## V0.8 — Endless AI Adventure Runtime

目前版本已建立可直接接入 AI Provider 的遊戲 Runtime：

- World Seed 建立流程
- World Compiler
- World Constitution
- Canon facts / visibility
- World integrity validator
- D20 Game Engine（AI 無權修改結果）
- Player Knowledge / Knowledge Fragment
- NPC state / knowledge scope / episodic memory
- append-only Event History
- Inventory
- IndexedDB autosave
- `.elyndra` 世界匯出 / 匯入
- 存檔載入完整性驗證
- OpenAI-compatible Provider abstraction
- Narrator context knowledge gate
- deterministic local narration fallback
- Node built-in test suite
- Desktop / mobile responsive UI

目前**不包含任何 API key，也沒有發生付費 API 呼叫**。

## 架構

```
World Seed
  ↓
World Compiler
  ↓
World Constitution + Canon
  ↓
Validator
  ↓
Runtime World
  ├─ Player
  ├─ NPC + Memory + Knowledge Scope
  ├─ Inventory
  ├─ Player Knowledge
  └─ Event History
       ↓
Game Engine / D20
       ↓
AI Provider (optional)
       ↓
Narrator / NPC / World candidate
       ↓
Validator
       ↓
Save Manager → IndexedDB / .elyndra
```

核心原則：

> AI proposes. Game Engine decides. Database remembers.

## 本地啟動

ES Modules 與 IndexedDB 需要透過本地 HTTP server 開啟：

```bash
python -m http.server 8000
```

瀏覽 `http://localhost:8000`。

## 測試

Node.js 20+：

```bash
npm test
```

測試不需要安裝第三方 dependency。

## 重要檔案

- `src/world-engine.js` — World Compiler / Constitution / Validator / D20
- `src/game-engine.js` — deterministic gameplay mutation
- `src/storage.js` — IndexedDB + .elyndra import/export
- `src/ai-provider.js` — AI Provider boundary / narrator context gate
- `docs/WORLD_SCHEMA.md` — Canon 與 runtime schema
- `docs/API_INTEGRATION.md` — 下一階段 API 安全接入規格

## 下一階段：AI API

目前架構已刻意停在 API boundary。下一步加入 server-side AI proxy 後，即可把 AI 用於：

1. 世界候選內容生成
2. NPC 對話
3. 場景敘事
4. Lore 擴展

正式 API key **不得**放入瀏覽器 JavaScript 或提交到 GitHub。詳見 `docs/API_INTEGRATION.md`。

## V0.3 API Runtime

Serverless endpoints：

- `GET /api/health` — API 配置狀態
- `POST /api/world` — AI World candidate
- `POST /api/narrate` — 根據 Engine 已確定結果生成場景敘事
- `POST /api/npc` — 受 Knowledge Scope 限制的 NPC 對話

環境變數參考 `.env.example`。未設定 API 時遊戲自動使用 deterministic local fallback。

## V0.8 Endless AI Adventure

目前停止點已達成：設定 AI Provider 後，玩家可反覆使用自由行動。每回合由 deterministic rules 先裁決，再由 `/api/turn` 產生經白名單驗證的下一回合候選內容。AI 可延伸場景、地點、Lore、道具、NPC 關係、任務與建議，但不能直接改骰子或隱藏 Canon。

長期遊玩已有 context budget、event retention、NPC memory compaction 與 IndexedDB autosave。詳見 `docs/ENDLESS_RUNTIME.md`。
