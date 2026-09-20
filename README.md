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
- 世界不再有全域通用貨幣；每個地點／勢力首次生成自己的 `culture` 與 `trade`，可使用地方貨幣、代幣、配給或以物易物。任務與戰鬥獎勵只使用目前所在地接受的交易制度。
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

## V0.24.0 — Living Isekai World

這一版把世界由「現實世界換皮」進一步改成真正的異世界文明模擬：

- **世界原生曆法**：World Architect 首次生成 `worldCalendar`，包括紀元、週期、日序與時段名稱。Engine 內部仍以 deterministic minutes/day 排程，但玩家未學會曆法前只看到「時序未知」，學會後才顯示世界自己的時間稱呼。
- **遊玩時長驅動 Timeline**：玩家設定希望遊玩小時數，Engine 轉成 timeline horizon、事件數與早／中／後期比例。AI 只在創世時生成 4–8 個大事件時間窗；到期後由 Engine 本地觸發 `observableEffect`，`directorTruth` 永不提前向玩家洩漏。
- **地方文化與交易**：每個新地點／勢力首次生成自己的文化、禁忌、飲食、信仰、建築、命名與交易制度。可以因歷史／政治共享，但不能無理由使用全世界同一文化或貨幣。
- **多貨幣錢包**：玩家使用 `wallet` 保存不同地方貨幣；任務／戰鬥不再發全域 gold，而是依當前地點的 `trade` 規則給地方貨幣；純 barter 地區不會憑空產生錢。
- **任意 NPC 夥伴**：所有 NPC 都有 companion profile，但沒有人天生是固定同伴。玩家可邀請；高信任 NPC 可主動提出同行；同行者可因信任跌破底線或自身目標主動離隊。狀態由 Engine 保存為 `NONE / OFFERED / ACTIVE / LEFT`。
- **AI 邊界**：AI 只提出新文化、Timeline 與關係轉折候選；Engine 擁有時間、可見性、夥伴狀態、貨幣 balance 與事件觸發權。
- **Save Format v6**：舊存檔自動補 wallet、calendar knowledge、timeline 與 companion runtime，不會把舊版固定 suggestions 帶回新世界。

> No Earth defaults. Every culture must belong to the world that created it.


## V0.25.0 — World Impact & Consequence Engine

這一版讓玩家不只探索世界，而是能夠在冒險期間留下可持續、可傳播的改變：

- **World Impact Ledger**：玩家造成的持久改變以 append-only impact records 保存；過去 Canon 不會被覆寫，Current State 可以被之後行動改變。
- **五級影響範圍**：PERSONAL → LOCAL → REGIONAL → FACTION → WORLD。高層級影響需要實際累積世界知識、過去影響與危機進度；失敗行動不能直接跳成世界級改變。
- **Mutable World State**：地點可改變 safety / prosperity / supply / infrastructure / stability；勢力可改 resources / influence / stability；NPC 關係與狀態標記亦可留下持久結果。
- **Delayed Consequences**：玩家行動可以安排有因果的延遲後果；由 Engine 按世界分鐘觸發，不依賴再次呼叫 AI。
- **Timeline Impact**：REGIONAL 以上行動可以延遲／提前／削弱／加強尚未觸發的大事件；原本 base timeline 仍保留，玩家只改變實際發生時間與強度。
- **Director Boundary**：Adventure Director 只提出 worldImpacts 候選；Engine 驗證 scope、target、mutation 上限、Timeline 狀態與可見性後才真正落地。
- **World Impact UI**：側欄顯示目前影響層級，新增「我的影響」記錄；即時改變顯示為「世界改變」，延遲後果日後以世界動向重新出現。
- **Save Format v7**：舊世界自動補 impact ledger、entity mutable state 與 Timeline impact metadata。

> The player becomes the protagonist by changing the world, not because the world says they are one.


## V0.26.0 — Living Reputation & World Recognition

玩家對世界造成改變之後，世界現在會進一步「記住玩家」：

- **Earned Renown**：只有真正通過 Engine 並成功落地的 World Impact 才會增加名聲；無效 candidate 不會白賺 influence / renown。
- **五級社會存在感**：UNKNOWN → LOCAL_NAME → REGIONAL_FIGURE → MAJOR_FIGURE → LEGEND。這不是劇情硬封主角，而是依玩家累積的實際事蹟上升。
- **Rumor Propagation**：個人、地方、區域、勢力、世界級事蹟有不同傳播範圍與時間。NPC 不會因全局名聲高就自動知道玩家。
- **NPC Recognition Boundary**：NPC 對話只會收到該 NPC 合理知道的 knownDeeds / titles；未傳到其所在地或勢力的傳聞不會被偷看。
- **World-Culture Titles**：Adventure Director 可為已成立的 impact 提出符合當地文化的玩家稱呼；Engine 保存並重用，不會每回合重新改名。
- **Legacy Marks**：真正留下紀念物、告示、傷痕、制度等持久可見結果時，可記錄為世界中的 legacy mark。
- **Faction Attention**：勢力會根據真正傳到它們耳中的事蹟累積關注；配合玩家聲望關係，可主動要求接觸、監視，或公開把玩家視為威脅。
- **Recognition UI**：側欄新增名聲等級；「我的影響」頁整合稱號、正在流傳的傳聞、legacy marks、勢力反應與歷史 impact。
- **Save Format v8**：v0.25 已存在的 PLAYER_IMPACT 會回填成 deeds / rumors / renown，不會因升級而失去過往主角歷史。

> The world does not declare you the protagonist. It gradually learns that you matter.


## V0.26.3 — Staged World Compiler

世界建立不再用一個巨型 AI request 一次生成所有內容。Direct AI 現在分成四個獨立編譯階段：

1. **CORE** — 世界名稱、主題、Seed Compliance、World Bible、公開／隱藏 Canon。
2. **CHRONOLOGY** — 世界專屬曆法與完整大事件 Timeline。
3. **REGION** — 開局地區、地方文化、交易制度、勢力與零知識 opening hook。
4. **CAST** — 附近 NPC、第一個支線與玩家眼前可合理採取的 suggestions。

每個階段都有獨立 timeout、JSON 驗證與錯誤名稱，最後再合併成原有 World Candidate，由 Engine 統一執行 Seed / Timeline / Canon validation 與 Canonize。

生成進度現在代表真實階段，不再用等待單一 request 的假進度停在 72%。瀏覽器模組 cache 同步更新至 `v263`，確保載入最新 timeout 與 staged compiler 邏輯。


## V0.26.4 — Faster Parallel World Compilation

世界生成效能與 Seed 驗證修正：

- **Theme Canonicalization**：AI 在同一次 CORE 回覆中若用不同措辭描述同一主題，Engine 會以 `worldTheme` 作為唯一 Canon theme，並同步 `seedCompliance.theme.value`，保留 evidence 與其餘 Seed 驗證規則。
- **Parallel Compiler DAG**：CORE 完成後，CHRONOLOGY 與 REGION 會並行；REGION 完成後可立即進入 CAST，不必等待 Timeline。
- **Smaller Opening Payload**：初始只生成 1 個出生地點、最多 1 個勢力、1 個附近 NPC 與最多 1 個支線；其他世界內容依原有 Lazy Generation 機制於探索時生成。
- **Per-stage output budgets**：只有 World Compiler 明確設定 `maxOutputTokens`；普通回合、NPC 與其他 AI 呼叫不會被意外限制。
- **Lighter prompts**：CORE 不再傳送整份 Constitution／完整 directive；REGION 不再攜帶 Timeline、hiddenFacts 與完整 seedCompliance。
- **Cache generation**：前端模組統一更新至 `v264`。
