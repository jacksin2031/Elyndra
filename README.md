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

GitHub Actions 在每次 push 到 `main` 時先執行 browser/API/core syntax gates 與完整 `node --test` regression suite；只有 `main` 的測試成功才部署 GitHub Pages。Pull Request 亦會執行 test gate，但不部署 Pages。

## V0.22.3 — Unknown World + Stored Lore

目前世界生成採用「**AI 只生成一次，Engine 負責之後的揭露與重用**」：

- 玩家可自行輸入角色名稱；留空時由 World Architect 決定名稱。
- 新世界開局知識為 **0%**，玩家看到的是「未知世界／未知地點」，不會因 Canon 中已有世界名、地名或 public facts 而自動知道。
- 行動按鈕由 AI 根據當前場景動態生成；UI 不再硬編碼森林／道路／銅幣／莉亞等固定選項。AI 不可用未發現資訊製造 suggestion。
- World Architect／Adventure Director 首次建立物品、地點、NPC、勢力時，可同時建立 `lore.story`、`unlockKeywords`、`minMatches`。Lore 會 Canonize 並保存在存檔。
- 玩家之後取得所需知識時，`Lore Engine` 在本地直接解鎖既有 story，加入世界手帳；**不再次呼叫 AI**。
- 查看背包、已知物品描述、已解鎖故事、已知資料等純查詢會走 local fast path，不消耗生成模型 token。
- 尚未被玩家發現的實體不會出現在 player-facing registry / faction snapshot。
- Adventure Director 另有最小化的 `directorRegistry`，可知道「已存在但玩家未知」的 Canon ID/名稱，用來避免重複生成。真正遇見時只回 `entityReveals`，由 Engine 本地標記為已知，不會重建該 NPC／地點／勢力或再次生成其背景故事。
- Director-only registry 同樣受 context budget 限制，不會無限增加 prompt 大小。

核心原則：

> Generate once. Canonize once. Reveal locally. Reuse forever.

V0.22.3 CI 已驗證：browser/API syntax gate + **55/55 tests passed**，GitHub Pages deployment 成功。


## V0.23.0 — Dynamic World Runtime Cleanup

這個版本把 Runtime 從舊版固定世界內容徹底抽離，讓 World Seed 真正控制每一個世界：

- Game Engine 不再硬編碼森林、道路、銅幣、特定 NPC、地名或怪物；自由行動改由通用 Action Profile 判定難度與時間。
- NPC relationship mutation 改用實際 `npcId`；任何已知 NPC 都可以直接交談，不再存在固定 Companion。
- NPC 只讀取自己的 `knowledgeScope` 與 memories；`publicFacts` 不再等於所有 NPC 自動知道。
- 新增 Event Visibility Gate；NPC／勢力自主模擬屬於 `INTERNAL`，不會出現在玩家旅程紀錄或玩家 AI snapshot。
- Adventure Director 可提出符合目前世界的 `encounter`；敵人、戰利品與戰鬥來源不再由 Engine 預設。
- 貨幣由 World Architect 的 `worldBible.economy` 決定；無貨幣世界不顯示虛構金幣，任務與戰鬥亦不再固定發放金幣。
- World Simulation 的可見事件只使用玩家可直接感知的中性描述，不再偷渡特定區域或勢力資訊。
- UI 改為動態 NPC Dock，世界手帳／旅程紀錄與已發現世界遵守 player knowledge boundary。
- 加入 legacy-canon regression tests，防止固定世界內容重新混入 Runtime。

## V0.23.1 — Runtime Hardening

這一版針對長期遊玩、知識隔離與存檔可靠性進行全項目 hardening：

- **公平世界模擬**：NPC / Faction autonomous simulation 改為 round-robin cursor；世界超過 4 個實體後，後生成角色與勢力不會永久停止活動。
- **時間驅動 tension**：World Simulation tension 依實際經過分鐘累積，不再依函式呼叫次數；短戰鬥回合不會異常加速世界危機。
- **Knowledge Graph visibility**：內部 NPC／勢力事件不再被轉成 public causal nodes；player-facing graph edges 只保留兩端皆可見的關係，並修正舊存檔 event-first graph 無法 bootstrap World Bible fundamentals 的問題。
- **Knowledge-gated ENDGAME**：危機 pressure 可以推進到 CRISIS，但 ENDGAME 同時需要玩家取得最低限度的有效世界知識，避免用重複行動直接磨出終局。
- **本地支線證據引擎**：Side Quest 首次生成時可保存 `evidenceKeywords` / `target`；之後 discoveries / items 命中線索時由 Engine 本地加進度，同一線索不重複計算，不需要再次呼叫 AI。
- **Save Format v4**：migration 補齊 event visibility、simulation cursor / clock、economy 與 runtime domains；State Validator 加強 registry、graph、crisis、economy、combat、suggestions 等完整性檢查。
- **Context degradation 安全**：即使 prompt context 被壓縮到 minimal snapshot，仍保留 World Seed Contract，避免長局後 AI 因 token budget 遺失玩家最初的世界設定。
- **完整 cache-bust**：不只 `app.js`，整個瀏覽器 module graph 的 nested imports 都使用同一版本 query；CI 新增 contract test 防止半套 cache-bust。

目前原則進一步明確化：

> AI creates new possibilities. Engine owns truth, time, visibility, progression and persistence.
