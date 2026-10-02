# Elyndra

**Elyndra** 是一款以瀏覽器運行的 **AI × TRPG × World Discovery** 異世界 RPG。

目前版本：**v0.61.3**（復原整合版；完整歷史復原仍待核實）

> 每一個世界，都有自己的真相。
>
> **AI proposes. Game Engine decides. Database remembers.**

線上版本：<https://a24dc523.github.io/Elyndra/>

## 核心特色

世界生成設定採用 Stellaris 參考的分組參數工作台，包含五步導覽、即時世界風格預覽及 11 個 World Genesis 設定。獨立圖鑑展示 11 款風格，模板可保存名稱、故事及進階參數；六款專屬圖片同時用於圖鑑、預覽與遊玩背景。自訂內容統一由模板流程處理，保留舊模板與存檔契約。介面支援手機排版、四種語言、背景動畫與減少動態效果。使用方式見 [世界生成設定 UI](docs/creator-console-ui.md)及[世界風格工作室](docs/world-style-library.md)。

- **Progressive World Building**：世界由 Seed / Blueprint / Constitution 逐步編譯成 Canon、History、Future、Society、Cast 等結構。
- **Engine-owned rules**：D20、能力、技能、裝備、生存、旅行、魔法、經濟、地下城、世界影響與角色成長由 deterministic Engine 裁決。
- **Causal World Core**：World Ledger、History、Future、Generation Claims 與 Evidence / Belief / Truth 分離，避免 AI 直接改寫既有世界事實。
- **Knowledge & Visibility Gate**：玩家、NPC 與 Director 使用不同知識邊界，hidden Canon 不會因 AI 已讀取而自動洩漏。
- **Endless Runtime**：遊戲期間可按需要延伸地點、NPC、勢力、支線與世界事件。
- **Multilingual Runtime**：支援繁體中文、簡體中文、English、日本語，並維持單一 runtime language contract。
- **多 AI Provider**：支援 OpenAI、Gemini、Agnes，包含 task routing、timeout、retry、rate-limit backpressure 與背景工作控制。
- **本地存檔**：IndexedDB autosave、手動存檔及 `.elyndra` 匯入／匯出。
- **Developer Autotest / Debug**：可批次建立世界、執行 AI 遊玩測試、輸出 Debug JSON / 世界檔，並記錄 latency、token usage、fallback、degraded state 與 runtime issues。

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
Runtime Language Contract
       ↓
IndexedDB / .elyndra
```

AI 負責理解玩家輸入、提出候選內容與生成敘事；正式狀態修改仍必須通過 Engine、validation 與因果一致性邊界。

## 多國語言

| Locale | 語言 |
| --- | --- |
| `zh-Hant` | 繁體中文 |
| `zh-Hans` | 簡體中文 |
| `en` | English |
| `ja` | 日本語 |

語言切換只應改變玩家可見表達，不應改寫 Canon 或 deterministic state。跨語言載入、世界生成、Scene、NPC 與 Helper 皆沿用目前 runtime locale contract。

## AI Provider

Direct AI 模式下，各 Provider 的 API Key / Endpoint 分開保存；API Key 只存放於目前瀏覽器的 `localStorage`，Repository 不包含正式 API Key。

在共享或不受信任的裝置上，不建議保存正式 API Key。公開部署若需要集中管理憑證，應使用 server-side proxy 與正式 quota / identity 控制。

## 本地啟動

Elyndra 使用原生 ES Modules，不需要前端 bundler。

```bash
git clone https://github.com/A24DC523/Elyndra.git
cd Elyndra
python -m http.server 8000
```

然後開啟：<http://localhost:8000>

由於專案使用 ES Modules、Service Worker 與 IndexedDB，請不要直接用 `file://` 開啟 `index.html`。

## 測試

需求：**Node.js 20+**。

```bash
npm test
```

常用檢查：

```bash
npm run version:check
npm run cache:check
npm run test:nondownload
```

GitHub Pages workflow 會在 Node 20 / Node 24 執行版本一致性、browser cache-bust dependency graph、JavaScript syntax、static i18n coverage 及 focused regression tests。Push 到 `main` 且測試通過後才會部署 Pages，之後再執行 live smoke verification。

## 目錄

```text
Elyndra/
├─ index.html                 # Web entry / import map
├─ app.js                     # UI 與 gameplay orchestration
├─ src/                       # Engine、AI runtime、storage、world systems
├─ api/                       # Server-side / serverless AI routes
├─ assets/                    # UI / scene assets
├─ test/                      # Regression tests
├─ scripts/                   # 維護、版本、cache、syntax、i18n checks
├─ docs/                      # 現行架構、schema 與 release notes
└─ .github/workflows/pages.yml
```

主要模組：

- `src/world-engine.js` — World / Canon validation
- `src/world-compiler.js` — staged world compilation
- `src/game-engine.js` — deterministic gameplay mutation
- `src/storage.js` — IndexedDB + `.elyndra` import/export
- `src/locale-runtime.js` — locale normalization 與 runtime language contract
- `src/ai-settings.js` — Provider profiles、Direct AI transport、optimization / timeout / backpressure
- `src/ai-client.js` — Action / Scene / NPC / State / Runtime Expansion / translation AI boundary
- `src/world-quality.js` — background world quality review / repair
- `src/contextual-actions.js` — contextual action candidates
- `src/world-impact.js` — world changes、授權邊界與延遲後果

> `src/v*.js` 中仍存在的版本化 hotfix 是目前 runtime import chain 的一部分。不要只因版本號較舊就刪除；移除前必須先確認 import map、wrapper imports 與 regression tests 已不再引用。

## 文件

現行設計文件：

- [`docs/WORLD_SCHEMA.md`](docs/WORLD_SCHEMA.md) — Canon / Runtime schema
- [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md) — API integration boundary
- [`docs/ENDLESS_RUNTIME.md`](docs/ENDLESS_RUNTIME.md) — Endless Runtime 概覽
- [`docs/causal-world-core-v040.md`](docs/causal-world-core-v040.md) — Causal World Core 架構
- [`docs/releases/`](docs/releases/) — 正式版本紀錄

版本開發過程中的臨時 scope、驗證 evidence 與一次性修補腳本不作為長期文件保存；需要追溯時使用 Git history / Pull Requests。

## v0.60.29

v0.60.29 主要修正 Agnes 背景 world-quality 任務：`quality` / `quality_repair` 會使用較輕量的 structured runtime routing；失敗或 timeout 的背景 review 不再錯誤推進成功 review watermark，因此仍可在之後重試。

目前 release 還保留 v0.60.28 的 AI-first action suggestion recovery 與既有 foreground gameplay preemption 行為。

## CI / Deployment

正式 workflow：`.github/workflows/pages.yml`

- Pull Request → Node 20 / Node 24 validation
- Push `main` → validation
- tests pass → GitHub Pages deploy
- deploy pass → live smoke verification
