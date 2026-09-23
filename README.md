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


### v0.54.14 — Runtime Quest Recovery

v0.54.13 真實 Autotest 發現 Runtime SideQuest 的 `target` schema 與 Engine 進度門檻契約不一致：模型會輸出 NPC 名稱／任務描述／物件，造成同一 `RUNTIME_QUESTS` checkpoint 每回合重試。v0.54.14 在 Engine validation 前正規化 `target`、`conditions`、`evidenceKeywords`，並把 prompt 明確鎖定 `target=1..5`；Autotest fingerprint 同時納入玩家可見 Knowledge 變化，避免把已取得新線索的回合誤報為 NO_STATE_PROGRESS。History stage hard timeout 由 65 秒調整為 75 秒，以降低 Agnes 長回應的單階段 fallback。

### v0.54.9 — Sequential World Foundation

世界觀建立改為真正的 **Progressive World Building**。不論瀏覽器 Direct AI 或 server `/api/world`，都不再一次要求 AI 寫完整世界，也不再把互相有依賴的世界觀部分並行生成。

`Identity → Core Rules → Core Anchor → History → Geography → Future → Society → Cast`

每一階段只可讀取前面已鎖定並通過 Engine 驗證的結果；例如 Geography 必須讀取已驗證 History，Society 必須讀取已驗證 Geography/Future，Cast 最後才建立人物與支線。遊玩期間的 Runtime Expansion 則維持 v0.54.8 的 `Geography/Definitions → Society/Faction → Cast/NPC → Side Quest` 四段式。

這使局部 AI 失敗只影響當前 stage，已確認的 Canon 不會被後面的 AI 一次重寫。

### v0.40.0 — Causal World Core

Elyndra 現在加入 World Ledger、Generation Claims、Evidence/Belief/Truth 分離，以及多事件 Future Engine。現有 crisis / VERIFIED knowledge / Save v12 保持向後相容，詳細架構見 `docs/causal-world-core-v040.md`.

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
- `src/travel-engine.js` — Canon 路網、距離、地形與旅行耗時
- `src/survival-engine.js` — 飢餓、疲勞、環境暴露與傷勢
- `src/magic-engine.js` — Canon 驗證法術、魔法負荷與反噬
- `src/culture-engine.js` — 地方禮俗、禁忌與文化 standing
- `src/economy-engine.js` — 地方市場、住宿、買賣與兌換
- `src/dungeon-engine.js` — 持久遺跡／地下城空間與考古證據
- `src/world-impact.js` — 授權邊界、持久世界改變與延遲後果
- `src/world-pacing.js` — Timeline / Crisis 共用節奏
- `src/talent-engine.js` — 玩家選擇式長期成長
- `src/ai-settings.js` — Provider profiles、API Key / Endpoint / Model 切換與 Direct AI transport
- `src/ai-client.js` — AI world / turn / NPC / expansion boundary 與 knowledge gate
- `docs/WORLD_SCHEMA.md` — Canon 與 runtime schema
- `docs/API_INTEGRATION.md` — 下一階段 API 安全接入規格

## AI Provider 設定

遊戲目前支援直接在「AI 設定」中配置 Provider：

- **OpenAI** — 獨立保存 OpenAI API Key 與 Endpoint；Model 由 Elyndra 固定管理
- **Gemini** — 獨立保存 Gemini API Key 與 Endpoint；Model 由 Elyndra 固定管理
- **Agnes 3.0 Flash** — 內建 `https://apihub.agnes-ai.com/v1/chat/completions` + `agnes-3.0-flash` 預設；通常只需輸入 Agnes API Key，Endpoint 可進階覆寫，Model 由 Elyndra 固定管理

每間公司的設定彼此分離。當你由 OpenAI 切換到 Gemini，介面會自動保存 OpenAI 當前設定，再載入 Gemini 自己的 API Key / Endpoint 與優化模式；切回 OpenAI 時會恢復原本 OpenAI 設定，不需要重新輸入。

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
- NPC relationship mutation 改用實際 `npcId`；互動能力由是否真正遇過、目前是否在場，以及世界 Canon 是否存在可用遠距聯絡方式決定，不再存在固定 Companion。
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


## V0.26.5 — Dual-AI Turn Compiler

一般冒險回合由單一大型 Adventure Director request 改為最多 **2 個 AI request 並行**：

1. **Scene Narrator** — 只處理玩家可見敘事與下一步 suggestions。只收到 player-visible snapshot，不可讀取 Director-only Timeline、Registry 或 World Impact capability，也不可修改 Canon。
2. **State Director** — 只處理結構化世界狀態候選，包括 discoveries、items、NPC／勢力／夥伴變化、encounter、generation、quest 與 worldImpacts。

兩個 request 同時開始，最後由 Turn Compiler 合併，再交給既有 `validateTurnCandidate()` / Engine 執行驗證與套用。任何時候不會因單一回合開超過兩個並行 AI request。

失敗策略：
- Scene Narrator 失敗但 State Director 成功：以 State Director 的短 `outcomeSummary` 作安全 fallback，世界狀態仍可正常驗證。
- State Director 失敗：不套用任何未驗證世界 mutation，沿用原有 fallback 流程。

Scene request 使用較小 visible-only context 與較低 output budget；State request 保留 Director context，但不再負責長篇敘事，降低單次生成負擔。


## V0.26.6 — RPG Check Engine

骰子由固定「行動類型 bonus」升級成統一 RPG 判定：

```
D20
+ Attribute
+ Skill
+ Equipment
+ Companion Support
+ Explicit Relationship
+ Situation
vs
Dynamic DC
```

### Attributes
- Strength / 力量
- Agility / 敏捷
- Mind / 心智
- Presence / 魅力
- Instinct / 直覺

現有角色會透過 Save Format v9 自動補齊新能力欄位，不需要重開世界。

### Skills
五個行動技能：
- OBSERVE / 觀察
- SOCIAL / 交涉
- TRAVEL / 旅行
- RISKY / 冒險
- GENERAL / 應變

成功使用技能會累積熟練度；Critical Success 取得較多熟練度。技能最高 Lv.5。

### Contextual modifiers
- 功能性工具／裝備可提供 -2 至 +2 的 check bonus；Engine 會限制總裝備 modifier。
- 最多同時裝備 2 件具判定加成的工具。
- 合適角色／目標的 ACTIVE 夥伴可提供有限支援。
- SOCIAL 行動只有在玩家明確點名已知 NPC／勢力時，對應 trust / reputation 才會加入判定；不使用全世界全知名聲。
- 低 HP、當地 infrastructure / stability 等目前環境可改變 modifier。
- World Seed 的 danger / politics，以及 CRISIS / ENDGAME 狀態會改變相關 Dynamic DC。

### Combat
Attack、Defend、Retreat 亦統一使用 RPG Check Engine，不再使用獨立固定 +2 / +1 戰鬥骰規則。

### Transparency
每次 D20 結果 UI 會列出能力、技能、裝備、夥伴、關係、情境以及 Dynamic DC 修正。新增「角色能力」頁可查看能力值、技能熟練度、裝備工具及同行夥伴。


## V0.26.7 — Runtime Visibility, World History & Travel Helper

呢個版本集中修正長時間遊玩後嘅 runtime 一致性問題，並加入唯讀旅途助手。

### Runtime visibility hardening
- NPC 分成 **known / encountered / present / interactable** 多層；只聽聞過但未真正遇到的 NPC 不會被當成可直接聯絡人物。
- 玩家離開 NPC 所在地後，只有世界 Canon 支援即時／近即時遠距通訊，而且玩家曾與該 NPC 面對面交談並建立聯絡時，才可繼續遠距對話。
- NPC dock 改名為 **CONTACTS**，同時顯示附近人物與合法可遠距聯絡人物，並標示聯絡方式。
- Scene Narrator 只會收到目前 present NPC，而唔係所有已知 NPC；遠距 NPC 對話走獨立 knowledge-bounded NPC 路徑。

### Civilization-aware communication
- World Bible 新增 **civilization level 1–5**、基建、識字／教育與人口流動方式。
- 通訊能力由 **文明程度 + 魔法普及度 + 世界風格**共同限制；AI 即使提出過度先進的通訊，Engine 亦會降級到世界合理上限。
- 低文明＋低魔法通常只有信使／驛站／烽火等 **DELAYED** 通訊，不能當成即時 NPC 對話。
- 低文明但高魔法可以合理存在區域傳訊術；高文明則可出現世界內合理的終端、網絡或其他等價系統。
- 遠距聯絡仍受 range 與 contact establishment 約束，唔會因「已知 NPC」就自動全世界通話。

### Immutable World History
- 創世 CHRONOLOGY 階段會同時生成 **World History + Calendar + Future Timeline**。
- World History 至少包含多個已經發生的大事件，例如王朝興衰、戰爭、宗教分裂、技術／魔法突破、遷徙、災難或改革。
- 歷史事件會以 `canonical:true / mutable:false` 儲存；玩家與後續 AI 只能發現、引用其遺產，不能重寫已發生的歷史。
- Lazy Region Generation 與 State Director 會收到受 context budget 限制的 Director History，用來保持地區文化、勢力、技術與世界過去一致。
- World History 與未來 Timeline 分離：歷史不可改寫；未來 Timeline 可因玩家造成的實際影響改變觸發時間或最終結果。

### NPC conversation as a world turn
- 與 NPC 對話而家係正式世界互動，不再只係 UI 回覆。
- 面對面對話會消耗世界時間；合法遠距通訊亦會按通訊延遲消耗時間。
- 對話會寫入 NPC memories 與玩家可見 event，並用對話內容檢查支線任務 evidence。
- 對話完成後會執行 World Simulation tick，所以 Timeline、NPC／勢力活動與延遲後果仍會繼續前進。
- 第一次面對面對話後，如果該世界文明／魔法支援即時遠距聯絡，Engine 才會建立該 NPC 的 remote contact。

### Player-facing output guards
- 移除 `[世界動向]`、`【世界改變】`、SYSTEM 等系統標籤。
- 玩家可見 narrative、suggestions、地點與 NPC 回覆會做語言／亂碼 sanitization。
- 明顯日文、韓文、俄文等非繁體中文 leakage 會被拒絕並使用安全 fallback。
- 地點更新只接受已 Canonize location 或本回合新建立且已 Canonize 的 location；舊存檔中無效位置會自動修復到有效已知地點。

### Stable assets and actions
- 資產顯示改為優先顯示玩家實際 wallet，不會因進入 barter 地區而令已有貨幣看似消失。
- 舊式「但目前條件不足」fallback 已移除，改為描述本次方法未奏效並鼓勵改變做法。
- AI suggestions 若與上一輪完全相同，Engine 會換成新的 deterministic fallback actions，避免按鈕長期不變。

### Combat UX
- 遇敵唔再自動彈出 modal。
- 主行動區會切換為 **攻擊 / 防禦 / 撤退** 三個戰鬥行動。
- 戰鬥期間自由行動輸入會停用，避免同時走兩套互動流程。

### Dynamic current objective
主場景大標題由固定「陌生世界的第一天」改為 **目前目標**：
- 優先採用最新 Scene AI 提出的動詞導向目標。
- AI 未提供時由 Engine 根據主線 objective、戰鬥、危機與當前位置生成。
- 戰鬥時 Engine 強制使用「應對○○」類目標，確保玩家清楚知道目前要處理甚麼。

### Travel Helper AI
新增 **旅途助手**：
- 可問「我現在在哪裏？」「四周圍有什麼？」「附近有誰可以對話？」「我目前知道什麼？」「下一步可以做什麼？」。
- Helper context 只包含玩家已知／目前可直接感知資料。
- 不包含 Director Timeline、Hidden Facts、未發現地點、未遇 NPC 或未公開勢力。
- 問附近資訊時，只可使用 current location / current narrative / nearby NPCs / combat。
- Helper 唔擲骰、唔消耗世界時間、唔寫入 event、唔改 HP／物品／任務／關係／戰鬥／Canon。
- Helper 對話只存在當前頁面記憶，唔寫入世界存檔。
- 主回合 AI 運行時 Helper 會被鎖住，因此單一時刻仍維持最多兩個 AI request。


## V0.26.8 — World Weather System

天氣成為正式世界 Canon 與 Runtime，而唔係 Scene AI 每回合即興加入的背景文字。

### World Weather Canon
- World Architect 在創世 **CORE** 階段建立 `worldBible.weatherSystem`。
- 天氣不需要遵循現實地球：可以由魔力潮汐、異常天體、浮游物質、世界物理法則或其他異世界機制形成。
- 新世界至少會要求多種天氣現象，並鼓勵包含真正具有該世界辨識度的異世界天象，而唔係只把晴／雨／雪改名。
- 每個 phenomenon 保存 Canon 名稱、玩家可直接感知的 `observableName`／`sensoryCue`、出現權重、持續時間、危險度、轉換傾向與 D20 modifiers。
- 天氣 Canon 一經接受後由 Engine 管理；普通 Scene／State AI 不可以臨時創造或改寫天氣法則。

### Deterministic Weather Runtime
- `state.world.weather` 保存目前天氣、開始時間、下一次變化時間、地區 key、sequence 與有限歷史。
- Weather Engine 以 **世界時間 + 所在地 + Canon 權重 + transition** 決定下一個天氣，而唔係每回合亂抽。
- 同一個天氣不會被當成「天氣改變」再次觸發。
- 天氣改變會產生 `WEATHER_CHANGED / OBSERVABLE` event，加入玩家旅程紀錄。
- 移動到新地點時會重新套用當地 Weather Zone。

### Regional Weather Zones
每個新地點可有：
```js
weatherProfile: {
  zone: "當地天候區域",
  affinities: ["WTH-..."],
  suppressions: ["WTH-..."]
}
```
- `affinities` 提高該地區某些 Canon 天氣的出現機率。
- `suppressions` 禁止不適合該地區的天氣。
- profile 只能引用 World Weather Canon 已存在的 phenomenon id；無效 id 會由 Engine 移除。
- Lazy Region Generation 同樣必須沿用既有 Weather Canon，不能探索到新地區時突然發明另一套世界天氣規則。

### Gameplay Effects
- 天氣可以對 `OBSERVE / SOCIAL / TRAVEL / RISKY / GENERAL` 提供 -2 至 +2 的 bounded modifier。
- D20 詳細結果會獨立顯示「天氣 +N / -N」，唔會混入其他情境 bonus。
- 極端天氣目前影響判定與世界敘事，但唔會無提示直接扣 HP；真正傷害仍要經已成立的 encounter／consequence 規則。
- Combat、自由行動、NPC 對話推進世界時間時都會令 Weather Runtime 一同前進。

### Player Knowledge Boundary
- 玩家、Scene Narrator、NPC 與旅途助手只收到目前可直接感知的天氣描述。
- Weather Canon 正式名稱、形成原理、完整 phenomenon 列表、內部 danger rating、transition 與未出現天氣只提供給 Director／Engine。
- 因此玩家可以看見「發光微粒逆著重力升上天空」，但唔會因為 UI 或 AI 偷漏而自動知道它的正式名稱與世界原理。

### UI & Travel Helper
- 主場景位置旁新增即時 Weather Chip。
- 「已發現世界」顯示目前可感知天氣；已知地點可顯示其 weather zone 描述。
- 旅途助手新增「現在天氣如何？」快捷問題，只整理目前感官情報，仍然保持完全唯讀。
- Scene Narrator 會自然把目前天氣融入場景，但無權改變天氣。

### Save Format v10
- 新世界完整保存 Weather Canon、runtime 與 location weather profiles。
- v0.26.7 或更舊存檔升級時不會憑空補造異世界 Weather Canon；舊世界維持中性固定天候，避免升級等同改寫既有世界設定。

## V0.27.0 — Isekai Runtime Hardening

呢個版本集中處理兩件事：**AI 不可以繞過 Engine 因果授權**，以及**異世界設定必須真正成為玩家要遵守、可以利用的遊戲規則**。

### Causality & authority hardening
- World Impact 使用明確 scope × targetKind × field 邊界；LOCAL / REGIONAL / FACTION / WORLD 不再只係數值上限。
- Delayed Consequence 保存並重驗 parent authority boundary，不能由地方／勢力影響橫向或向上越權。
- 無實際 mutation / timeline effect / valid consequence 的候選不會建立 impact record、增加 influence 或解鎖更高 scope。
- 失敗骰預設不能產生正面 durable result；只有明確 COST / MIXED fail-forward 才可留下負面持久後果。
- Pending consequence 不再因固定 queue 長度而靜默消失；未到期項目全部保留。
- World Impact Ledger 不再截斷 PLAYER_IMPACT / CONSEQUENCE records。
- 遠方 consequence 可準時改變世界，但在玩家合理得知之前保持 INTERNAL。
- Timeline DELAY / ADVANCE 受 event window 約束；同時到期按 effective trigger day 排序。
- Impact scope 解鎖只計 VERIFIED Canon / World History knowledge。

### Verified knowledge boundary
- AI discovery 只有引用 public Canon fact、成功行動及合法 evidence type 才會成為 VERIFIED knowledge。
- Hidden / Director-only Canon 不能直接變成玩家知識。
- 未驗證 observation、NPC testimony、一般 lore 不增加可用於 Endgame / World Impact 的 knowledge score。
- NPC 對話可作為 `NPC_TESTIMONY` 推進支線，但不等同世界真相。
- AI 生成物品只有在同回合有相同 VERIFIED Canon fact 時，才可以作 quest evidence。
- 法術學習要求玩家已驗證對應 Canon fact，而且 Canon 文字必須實際包含該法術名稱。

### Real isekai gameplay rules
- **Travel Runtime**：持久路網、距離、地形、天氣與旅行時間由 Engine 管理。
- **Survival Runtime**：飢餓、疲勞、環境暴露、傷勢、休息、住宿與食物形成實際循環。
- **Culture Runtime**：地方 etiquette / taboo 改變判定及 persistent culture standing。
- **Magic Runtime**：Canon 法術、strain、capacity、失敗反噬及休息恢復。
- **Local Economy**：地方貨幣／barter、庫存、買賣、住宿與兌換。
- **NPC Life Simulation**：NPC 有 HP、energy、工作／休息、移動、避難及個人目標。
- **Faction Simulation**：勢力依 goal、resources、territory、diplomacy、crisis 採取不同策略。
- **Companion Gameplay**：同行者有 HP、energy、skills、加入／離開條件並可參戰。
- **Combat Depth**：element、weakness、resistance、abilities、status、phase，以及 Encounter 因果閘門。
- **Quest State Machine**：主線由 Engine 狀態推進；AI 只提供 hint。
- **Structured Side Quests**：優先使用 FACT_KNOWN / ITEM_OWNED / ENTITY_KNOWN / EVENT_OCCURRED / WORLD_STATE conditions。
- **Persistent Ruins / Dungeons**：固定 room graph、hazard、清理狀態、遺物及歷史 evidence。
- **Archaeology / World History**：Immutable History 必須透過合理證據被發現。
- **Structural World Mutation**：橋、道路、神殿、城市設施可持久改變狀態。
- **Player-selected Talents**：升級給 Talent Point，由玩家決定成長方向。
- **Unified Pacing**：遊玩時數映射到合理世界日數；ENDGAME 同時要求 verified knowledge 與 Timeline 成熟度。

### Save / CI
- **Save Format v11**：保存 travel、survival、magic、culture standing、NPC life、faction diplomacy、dungeon、talent、structural state 與 impact authority。
- 非法或 future `formatVersion` 直接拒絕，不會被降級覆寫。
- State Validator 驗證 impact scope-target matrix、queue、authority、travel、dungeon、magic、survival 等 runtime。
- Browser module graph 統一 cache generation `v270`；nested import 版本不一致會令 contract test 失敗。
- CI 使用最低支援 Node.js 20，不增加 matrix，以控制 GitHub Actions 用量。
- `npm test` 自動 syntax-check 全部 `api/`、`src/` runtime JS，再執行完整 Node regression suite。

> The world is not merely lore the AI can describe. It is a ruleset the player must live inside.

## V0.27.1 — World Core Compiler Hotfix

- CORE 編譯輸出瘦身：AI 只需定義 2 個代表性異世界天候，Engine 會補足到 4 個 runtime weather states。
- CORE direct-AI timeout 調整為 95 秒，而且 timeout 不再把同一重型請求自動重試兩次。
- 新增 World Core 欄位正規化、缺欄位診斷與 semantic repair；合法 JSON 但漏欄位時只局部修補 CORE。
- Weather Canon 在 Engine 套用前會經 `normalizeWeatherSystem()`，補足 duration、weight、modifiers 等 runtime 欄位。
- Browser cache generation 升至 `v271`，避免正式站繼續載入舊版 `ai-client.js`。

## V0.27.2 — Chronology Compiler Hotfix

- 移除單一 `CHRONOLOGY` 重型請求，拆成 `HISTORY` 與 `FUTURE` 兩個較小編譯階段。
- `HISTORY` 只生成 3 個不可改寫的重要歷史節點，避免一次輸出 5 段歷史、曆法與整條 Timeline。
- `FUTURE` 只生成自訂曆法與未來事件內容；事件日期窗口由 Engine 預先分配，AI 不再自己計算日數。
- 修正短遊玩時數下 middle / late phase 可能超出 `horizonDays` 的 pacing bug。
- REGION timeout 調整至 65 秒、CAST 至 60 秒，並停用重型 compiler stage 的 duplicate timeout retry。
- Browser cache generation 升至 `v272`，正式站不會繼續載入舊 `CHRONOLOGY` compiler。

## V0.27.3 — Linked Two-Agent World Compiler

- 世界生成改為 **Linked Two-Agent Waves**；任何時刻最多只會有 2 個 AI request。
- `worldStage()` 內加入硬性 concurrency semaphore，即使日後新增子編譯器亦不能突破 2 個同時請求。
- Wave 1：`HISTORY + GEOGRAPHY`；兩者共享同一份 World Anchor Contract。
- Wave 2：`FUTURE + SOCIETY`；必須引用 Wave 1 的 History / Starting Location。
- Wave 3：`CAST`；NPC 與支線必須引用已存在 Location / Faction / History。
- Engine 會驗證 `historyRefs` / `locationRefs` 等跨階段引用，拒絕無來源的新事件、地點、勢力或支線。
- 子編譯器 timeout 或 malformed response 會用同一 Anchor 與上一波 Canon 生成 fallback，不再令整個世界建立失敗。
- Browser cache generation 升至 `v273`。

## V0.27.4 — Split Core Compiler

- 移除單一 95 秒 `CORE` / `CORE_REPAIR` 世界核心請求。
- 新增短 `IDENTITY` 階段，只鎖定唯一 `worldName / worldTheme / genre / scale / danger / magic / politics`。
- Core 改為 `CORE_RULES + CORE_ANCHOR` 兩個 AI 並行；兩者共享同一 World Identity Contract，任何時候仍受 `WORLD_AI_CONCURRENCY=2` 硬限制。
- `CORE_RULES` 只生成時代、核心衝突、魔法代價、危機、文明與通訊。
- `CORE_ANCHOR` 只生成概要、開局 Region/Settlement/Location、Weather Canon、公開與隱藏事實。
- `worldName / worldTheme / seedCompliance` 由 Engine 組裝，Rules/Anchor 無法各自改寫世界身份。
- IDENTITY、Rules、Anchor 遇到 timeout、429/5xx 或 invalid JSON 會使用同一 Seed / Identity-derived fallback，不再因單點 Core provider timeout 中止整個世界。
- Browser cache generation 升至 `v274`。

## V0.27.4 — Resilient Split Core Compiler

- 移除單一 95 秒 `CORE` / `CORE_REPAIR` 重型請求。
- 先用短 `IDENTITY` 鎖定唯一 `worldName / worldTheme / genre / scale / danger / magic / politics`。
- 再以最多兩個 AI 並行生成 `CORE_RULES + CORE_ANCHOR`，兩者共享同一 Engine-owned World Identity。
- `CORE_RULES` 只擁有時代、核心衝突、魔法代價、危機、文明與通訊；`CORE_ANCHOR` 只擁有開局地區、Weather Canon、public/hidden facts，不能互相覆寫。
- IDENTITY / RULES / ANCHOR 遇到 timeout、429/5xx、JSON 破損或 malformed shape 時，會使用同一 Seed/Identity 衍生 fallback，不再因單一 Core provider timeout 終止整個世界。
- 世界生成全流程仍由硬性 semaphore 保證最多 2 個 AI request 同時執行。
- Browser cache generation 升至 `v274`。


### AI 自適應優化

OpenAI、Gemini、Agnes 都可在 AI 設定選擇「標準」或「Elyndra 自適應優化」。自適應模式按任務重要性分配 Provider 原生思考強度：行動判定／敘事／助手採低延遲設定；一般世界內容採中等；核心規則、歷史、Future Timeline 採較深入推理；World Critic、Recovery 與 Repair 採高推理。模型名稱由 Elyndra Provider preset 固定管理，用戶毋須自行輸入。


### v0.54.10 — Faster Creation, Progressive Runtime Canon, Action Lock

- 新世界創建改為最多 **2 個 AI 同時生成**：Core Rules + Anchor、History + Geography、Future + Society 各為一個 bounded two-AI wave，wave 之間仍由 Engine 驗證。
- 玩家遊玩期間的自動世界完善改為真正 checkpoint 模型：Geography 成功即寫入 Canon；Society、Cast、Quest 各自成功即保存，後段失敗不會丟失前段成果，下一次只從未完成 stage 繼續。
- Runtime Society 明確要求對每個新地點逐字回傳 locationDetails，降低 LOCATION_DETAIL_MISSING。
- 玩家按下行動後進入 single-flight UI lock；在 Player Action AI 完成前，不會先跳回 fallback／預設行動，也不能重複提交下一個行動。


### v0.54.11 — Background-safe Autotest & Generation Recovery

- Developer AI Autotest 會記錄前景／背景切換；背景期間的網絡中斷與 timeout 會獨立標記為 background interruption，不再誤算成 Elyndra 產品 AI failure。
- 若背景切換在 AI 尚未提交玩家行動前中斷請求，回到前景後會安全重試同一回合；已提交的行動不會自動重播，避免重複寫入狀態。
- 玩家遊玩中的 Runtime Geography 可引用任何已存在 Canon History；只要成功產生至少一個真正新地點便可建立 stage checkpoint，既有地點會被過濾而不再造成整段失敗。
- BLUEPRINT_DEFINITION claim 只容許綁定 matching definition；錯綁在 Location 的 claim 會由 Engine 清理，未綁 definition claim 會按 kind 自動配對。
- Core Anchor 會正規化模型常見的 publicFacts／hiddenFacts 層級差異，避免有效內容被誤判成 STRUCTURE_INVALID。
- Future／Society 增加輸出 budget 與 timeout 空間，降低長 JSON 截斷造成的 fallback；新世界生成仍保持最多兩個 AI 同時工作。


### v0.54.12 — Runtime Schema Normalization

- Runtime Geography 先把 AI 常見的 Location schema 漂移正規化，再交給嚴格 Engine validator：字串 lore、不同 weatherProfile 形狀與自然語言 access notes 不再令整個 stage 報廢。
- Runtime claim refs 改由 Engine 語義驗證與補綁；錯綁 FUTURE/HISTORY/BLUEPRINT claim 會清理，符合 historyRefs／definition kind 的新實體會自動綁定。
- TRAVEL StatePatch 不再接受移動到目前同一地點或不存在的地點，避免假進展。
- Model JSON parser 可修復陣列物件之間漏逗號的常見模型輸出錯誤。


### v0.54.13 — Runtime Resume & Generation Shape Recovery

- Checkpointed Runtime Expansion remains eligible until the entire Geography → Society → Cast → Quest plan is complete, even after enough locations already exist.
- String-form NPC lore is accepted as safe hidden lore instead of aborting Cast; Runtime Cast also requests the explicit lore object schema.
- Opening Society recovers missing root historyRefs from its own faction, and orphan lore-only Cast rows are folded back into the preceding NPC before cross-stage validation.
- Future generation gets a 3000-token structured-output floor and a 70s ceiling, with tighter prose limits, to avoid the v0.54.12 2200-token truncation + retry timeout pattern.
- Model JSON repair now handles missing commas between properties. Single-op StatePatch responses recover their transport envelope before the normal capability and grounding validation.
