# Elyndra

**Elyndra** 是一款以瀏覽器運行的 **AI × TRPG × World Discovery** 異世界 RPG。

目前版本：**v0.59.4**

> 每一個世界，都有自己的真相。

Elyndra 的核心設計是把 AI 放在「提案與敘事」的位置，而把世界真相、骰子結果、狀態修改、存檔與因果一致性留給 Engine 管理。

> **AI proposes. Game Engine decides. Database remembers.**

## 核心特色

- **Progressive World Building**：世界由 Identity、Rules、Anchor、History、Geography、Future、Society、Cast 等階段逐步建立，後一階段只能使用前面已驗證的 Canon。
- **Engine-owned RPG rules**：D20、能力、技能、裝備、生存、旅行、魔法、文化、經濟、地下城、世界影響與角色成長由 deterministic Engine 裁決。
- **Causal World Core**：World Ledger、History、Future、Generation Claims、Evidence / Belief / Truth 分離，避免 AI 直接改寫已成立的世界事實。
- **Knowledge & Visibility Gate**：玩家、NPC 與 Director 使用不同知識邊界；未知 Canon 不會因 AI 已看見而自動洩漏給玩家。
- **Endless Runtime**：遊戲期間可逐步延伸地點、NPC、勢力、支線與世界事件，而不需要一次生成整個世界。
- **Multilingual Runtime**：支援繁體中文、簡體中文、English、日本語；UI、AI 敘事、世界生成與跨語言存檔載入使用同一個 runtime language contract，避免不同語言互相污染。
- **多 AI Provider**：支援 OpenAI、Gemini 與 Agnes，並提供 task-aware optimization、timeout、retry、rate-limit backpressure 等 Runtime 控制。
- **本地存檔**：IndexedDB autosave、手動存檔與 `.elyndra` 匯入／匯出。
- **Developer Autotest / Debug**：可批次建立世界、執行 AI 遊玩測試、輸出 Debug JSON 與世界檔，並記錄 AI latency、token usage、fallback、degraded state 與 runtime issues。
- **Desktop / Mobile UI**：同一套 Runtime 支援桌面、平板與手機版操作；遊戲敘事、任務及行動分區呈現，介面動畫支援系統「減少動態效果」設定。

## 多國語言 / Multilingual

Elyndra v0.59.0 目前支援四種顯示與 AI 輸出語言：

| Locale | 語言 |
| --- | --- |
| `zh-Hant` | 繁體中文 |
| `zh-Hans` | 簡體中文 |
| `en` | English |
| `ja` | 日本語 |

語言可以在遊戲介面中切換。Runtime 會把目前選擇的語言傳入 AI Scene、NPC、World Generation、Helper 與 server fallback API；AI schema 不再固定要求繁體中文，因此英文、日文與簡體中文模式不會被舊 prompt 拉回其他語言。

### 跨語言世界與存檔

- 新世界會使用目前選擇的語言建立玩家可見內容。
- 載入其他語言建立的 autosave、手動存檔或 `.elyndra` 世界時，Elyndra 會在進入遊戲畫面前先完成 AI 翻譯／語言正規化。
- `sourceLocale` 只代表世界原始語言來源；每一段文字會獨立判斷實際語言，因此可以連續進行 `繁中 → English → 日本語` 等切換。
- 翻譯必須保留 Canon、數字、名稱、遊戲狀態、不確定性與玩家知識邊界，不可新增 lore、劇透 hidden Canon 或修改世界事實。
- 繁體中文模式額外保留簡體字 leak guard；其他語言不會套用繁中限定規則。
- 如果跨語言載入需要 AI 而目前沒有可用 AI，世界不會在未翻譯完成前直接進入 gameplay，避免混合語言狀態。

語言系統的設計原則是：**同一時間只有一個 runtime language contract 是玩家可見輸出的權威來源**。既有專有名稱可以保留，但一般 UI、敘事與 AI 輸出不應在四個語言 channel 之間互相干擾。

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

AI 可以理解玩家語言、生成敘事與提出候選內容，但最終狀態修改必須通過 Engine 邊界；語言切換只改變玩家可見表達，不應改變 Canon 或 deterministic state。

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

目前正式 Pages workflow 會驗證：

1. 版本一致性檢查
2. Browser cache-bust dependency graph 檢查
3. JavaScript syntax gate
4. v0.59.0 multilingual focused regressions
5. NPC identity privacy / scene dialogue regressions
6. Node 20 / Node 24 compatibility

v0.59.0 multilingual regression 會檢查四個 locale channel 的隔離、runtime language contract、跨語言 world-entry gate，以及旁白固定在「你的行動」區域正上方的 UI 結構。

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
- `src/locale-runtime.js` — locale normalization、UI strings、runtime language contract、localized output tracking
- `src/ai-settings.js` — Provider profiles、Direct AI transport、optimization / timeout / backpressure
- `src/ai-client.js` — Action / Scene / NPC / State / Runtime Expansion / translation AI boundary
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

Repository 正式部署 workflow：`.github/workflows/pages.yml`。

- Pull Request → Node 20 / Node 24 focused release validation
- Push 到 `main` → Node 20 / Node 24 focused release validation
- `main` 測試成功 → 部署 GitHub Pages
- GitHub Actions 使用 immutable commit SHA pin

## v0.59.4 重點

首頁標題調整欄寬、字級及日文斷行，並與介紹卡片對齊。加入原創星門載入插畫、向量導航圖示、實際行動處理狀態，以及使用 Engine 判定的 D20 翻滾與結果動畫；支援減少動態效果設定。

遊玩介面使用隨世界風格切換的全畫面背景；狀態、任務、旁白、行動、骰仔、導航與彈出視窗共用固定尺寸刻紋。「更多／其他行動」、系統選單及設定按鈕補齊向量圖示。背景層不參與版面尺寸計算，桌面保留固定舞台等比例縮放，窄視窗使用可捲動版面。

驗證範圍與素材來源見 [UI 視覺回饋記錄](docs/ui-visual-feedback-v0.59.4.md)。

## v0.59.3 重點

v0.59.3 完成多語言可見層補強：World Contract 以 Engine deterministic locale renderer 顯示繁中／簡中／英文／日文；AI 或 Engine 動態文字若混入非目標語言，將不再被誤標為已翻譯，而會進入 residual translation gate。

## v0.59.2 重點

v0.59.2 修復非繁體中文介面在世界契約確認後進入遊戲時，`state.notes` 陣列被誤判為 `entries` iterable 而觸發 `function is not iterable` 的問題。日文、英文與簡體中文現在可正常完成世界建立、存檔與首次遊戲畫面 refresh。

## v0.59.1 重點

v0.59.1 補齊多國語言覆蓋：首頁、World Creation、AI 設定、手帳、背包、存檔與動態遊玩 UI 會依繁體中文／簡體中文／English／日本語切換。對於 Engine 或舊模組在遊玩途中產生、未進靜態字典的玩家可見文字，Runtime 會偵測剩餘中文並透過既有 AI 翻譯層轉成目前選擇語言，避免語言混雜。

## v0.59.0 重點

v0.59.0 加入完整 Multilingual Runtime：繁體中文、簡體中文、English、日本語共用同一個 locale runtime 與 AI language contract。新世界、場景旁白、NPC、Helper、World Generation 與 server fallback 都會使用目前選擇語言；移除 AI schema 中殘留的繁體中文硬鎖，並只在 `zh-Hant` 模式保留繁體字 leak guard。

跨語言載入方面，autosave、手動存檔與 `.elyndra` Import 在進入 gameplay 前都會先完成可見世界翻譯；翻譯器可處理同一世界曾經切換過多個 runtime language 的情況，而不依賴單一舊 `sourceLocale` 猜測每一條文字。Desktop scene layout 同時固定為「主要場景 → 旁白 → 你的行動」，確保 Narrator 永遠直接位於玩家行動區正上方。

完整歷史請查看 `docs/releases/`、Pull Requests 與 commit history。
