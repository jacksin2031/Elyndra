# Elyndra

**Elyndra** 是一款以瀏覽器運行的 **AI × TRPG × World Discovery** 異世界 RPG。

目前版本：**v0.58.0**

> 每一個世界，都有自己的真相。

Elyndra 的核心設計是把 AI 放在「提案與敘事」的位置，而把世界真相、骰子結果、狀態修改、存檔與因果一致性留給 Engine 管理。

> **AI proposes. Game Engine decides. Database remembers.**

## 核心特色

- **Progressive World Building**：世界由 Identity、Rules、Anchor、History、Geography、Future、Society、Cast 等階段逐步建立，後一階段只能使用前面已驗證的 Canon。
- **Engine-owned RPG rules**：D20、能力、技能、裝備、生存、旅行、魔法、文化、經濟、地下城、世界影響與角色成長由 deterministic Engine 裁決。
- **Causal World Core**：World Ledger、History、Future、Generation Claims、Evidence / Belief / Truth 分離，避免 AI 直接改寫已成立的世界事實。
- **Knowledge & Visibility Gate**：玩家、NPC 與 Director 使用不同知識邊界；未知 Canon 不會因 AI 已看見而自動洩漏給玩家。
- **Endless Runtime**：遊戲期間可逐步延伸地點、NPC、勢力、支線與世界事件，而不需要一次生成整個世界。
- **多 AI Provider**：支援 OpenAI、Gemini 與 Agnes，並提供 task-aware optimization、timeout、retry、rate-limit backpressure 等 Runtime 控制。
- **本地存檔**：IndexedDB autosave、手動存檔與 `.elyndra` 匯入／匯出。
- **Developer Autotest / Debug**：可批次建立世界、執行 AI 遊玩測試、輸出 Debug JSON 與世界檔，並記錄 AI latency、token usage、fallback、degraded state 與 runtime issues。
- **Desktop / Mobile UI**：同一套 Runtime 支援桌面與手機版操作。

## Runtime 架構

```text
World Creation
  ↓
World Seed / Blueprint / Constitution
  ↓
Progressive World Compiler
  ↓
Canon + History + Future + World Ledger
  ↓
Runtime World
  ├─ Player / Build / Survival
  ├─ NPC / Memory / Knowledge Scope
  ├─ Inventory / Items / Crafting
  ├─ Player Knowledge / Evidence
  ├─ Quest / Faction / World Impact
  └─ Event History
       ↓
Action Intent → Game Engine / D20
       ↓
Turn Outcome Kernel
       ↓
AI Scene / NPC / State candidate
       ↓
Validation / StatePatch / Causal checks
       ↓
IndexedDB / .elyndra
```

AI 可以理解玩家語言、生成敘事與提出候選內容，但最終狀態修改必須通過 Engine 邊界。

## AI Provider

Elyndra 目前內建以下 Provider preset：

| Provider | Model | Default endpoint |
| --- | --- | --- |
| OpenAI | `gpt-5.6-luna` | `https://api.openai.com/v1/chat/completions` |
| Gemini | `gemini-3.8-flash` | Google Generative Language API |
| Agnes | `agnes-3.0-flash` | `https://apihub.agnes-ai.com/v1/chat/completions` |

每個 Provider 的 API Key / Endpoint 設定分開保存。Direct AI 模式下，API Key 只保存在目前瀏覽器的 `localStorage`，Repository 不包含 API Key。

> 在共享或不受信任的裝置上，不建議保存正式 API Key。若要建立公開服務，應改用 server-side proxy 與正式的身份／quota 控制。

## 本地啟動

Elyndra 是原生 ES Modules 網頁專案，不需要前端 bundler。

```bash
git clone https://github.com/A24DC523/Elyndra.git
cd Elyndra
python -m http.server 8000
```

然後開啟：

```text
http://localhost:8000
```

由於專案使用 ES Modules、Service Worker 與 IndexedDB，請不要直接用 `file://` 開啟 `index.html`。

## 測試

需求：**Node.js 20+**。

```bash
npm test
```

目前 `npm test` 會依序執行：

1. 版本一致性檢查
2. Browser cache-bust dependency graph 檢查
3. JavaScript syntax gate
4. Node built-in regression test suite

專案目前沒有 runtime npm dependency，因此不需要先執行 `npm install` 才能跑測試。

## 重要目錄

```text
Elyndra/
├─ index.html                 # Web entry
├─ app.js                     # UI / gameplay orchestration
├─ src/                       # Engine、AI runtime、storage、world systems
├─ api/                       # Server-side / serverless AI routes
├─ assets/                    # UI / scene assets
├─ test/                      # Regression tests
├─ scripts/                   # Version / cache / syntax checks
├─ docs/                      # Architecture / schema / release docs
└─ .github/workflows/pages.yml
```

主要模組包括：

- `src/world-engine.js` — World Compiler / Constitution / Canon validation
- `src/game-engine.js` — deterministic gameplay mutation
- `src/storage.js` — IndexedDB + `.elyndra` import/export
- `src/ai-settings.js` — Provider profiles、Direct AI transport、optimization / timeout / backpressure
- `src/ai-client.js` — Action / Scene / NPC / State / Runtime Expansion AI boundary
- `src/travel-engine.js` — Canon 路網、距離與旅行耗時
- `src/survival-engine.js` — 飢餓／飽足、疲勞、環境與傷勢
- `src/magic-engine.js` — 魔法規則、成本與反噬
- `src/culture-engine.js` — 文化、禮俗、禁忌與 standing
- `src/economy-engine.js` — 市場、住宿、交易與地方經濟
- `src/dungeon-engine.js` — 遺跡／地下城與考古證據
- `src/world-impact.js` — 世界改變、授權邊界與延遲後果
- `src/talent-engine.js` — 玩家長期成長

## 文件

- [`docs/WORLD_SCHEMA.md`](docs/WORLD_SCHEMA.md) — Canon / Runtime schema
- [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md) — API integration boundary
- [`docs/ENDLESS_RUNTIME.md`](docs/ENDLESS_RUNTIME.md) — Endless Runtime 概覽
- [`docs/causal-world-core-v040.md`](docs/causal-world-core-v040.md) — Causal World Core 架構
- [`docs/releases/`](docs/releases/) — 版本紀錄與歷史 release notes

README 只保留目前專案入口與現行架構；詳細版本變更請放在 `docs/releases/` 或 GitHub Pull Requests / commit history，避免 README 再次變成 changelog。

## CI / Deployment

Repository 只保留正式的 GitHub Pages workflow：`.github/workflows/pages.yml`。

- Pull Request → Node 20 / Node 24 完整測試
- Push 到 `main` → Node 20 / Node 24 完整測試
- `main` 測試成功 → 部署 GitHub Pages
- GitHub Actions 使用 immutable commit SHA pin

## v0.58.0 重點

v0.58.0 整合 NPC 玩家可見身份隱私與條件式場景對白：未知 NPC 的 canonical 名稱／職業在取得證據前保持隱藏；Scene Narrator 只在玩家明確說話或有可見 NPC 回應證據時使用簡短對白，並禁止替玩家發明台詞或讓 NPC 洩漏不可知資訊。

完整歷史請查看 `docs/releases/`、Pull Requests 與 commit history。
