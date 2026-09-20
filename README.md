# Elyndra

**Elyndra** 是一款 AI × TRPG × World Discovery 的異世界網頁 RPG。

> 每一個世界，都有自己的真相。

## Elyndra Runtime

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
- 多 Provider AI Runtime：OpenAI / Gemini / Agnes
- Provider-scoped API 設定：切換公司時自動切換各自的 API Key / Endpoint / Model
- Narrator context knowledge gate
- deterministic local narration fallback
- Node built-in test suite
- Desktop / mobile responsive UI

Repository **不包含任何 API key**。玩家自行輸入的 API 設定只保存在目前瀏覽器的 localStorage；是否產生 API 費用取決於玩家實際使用的 Provider 與帳戶。

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
- `src/ai-settings.js` — Provider profiles、API Key / Endpoint / Model 切換與 Direct AI transport
- `src/ai-client.js` — AI world / turn / NPC / expansion boundary 與 knowledge gate
- `docs/WORLD_SCHEMA.md` — Canon 與 runtime schema
- `docs/API_INTEGRATION.md` — 下一階段 API 安全接入規格

## AI Provider 設定

遊戲目前支援直接在「AI 設定」中配置 Provider：

- **OpenAI** — 獨立保存 OpenAI API Key、Endpoint、Model
- **Gemini** — 獨立保存 Gemini API Key、Endpoint、Model
- **Agnes** — 獨立保存 Agnes / OpenAI-compatible API Key、Endpoint、Model

每間公司的設定彼此分離。當你由 OpenAI 切換到 Gemini，介面會自動保存 OpenAI 當前設定，再載入 Gemini 自己的 API Key / Endpoint / Model；切回 OpenAI 時會恢復原本 OpenAI 設定，不需要重新輸入。

舊版 v1/v2 瀏覽器設定會自動遷移到 v3 Provider Profiles。按「清除本地 Key」只會清除目前選取 Provider 的設定，不會刪除其他公司的 API Key。

> 安全提示：API Key 不會提交到 GitHub，但 Direct AI 模式會把 Key 儲存在目前瀏覽器 localStorage，並由瀏覽器直接傳送到所選 Provider。共享或不受信任的裝置不應保存正式 Key。Production 若需要更強的秘密管理，應改用 server-side proxy。

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

## CI / Deployment

GitHub Actions 在每次 push 到 `main` 時先執行 `npm test`，只有測試成功才部署 GitHub Pages。最近一次已驗證的 run（2026-09-20）為 **44/44 tests passed**，test 與 Pages deploy 均成功。
