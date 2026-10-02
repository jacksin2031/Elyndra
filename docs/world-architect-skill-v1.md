# Elyndra World Architect Skill V1

## 目的

World Architect Skill 將異世界設計由「設定清單生成」改為「因果世界推導」。它不保存或模仿任何單一作品的人物、專名、情節或作者文風，只使用可泛化的世界設計結構。

核心推導鏈：

`Core Fantasy / Hook -> World Laws -> Costs -> Consequence Chains -> Institutions -> Daily Life -> Conflicts -> Mystery Layers -> Story Engines`

## 蒸餾出的設計原則

1. **Rule -> Society Cascade**：重要世界規則必須改變社會，而不是只存在於戰鬥系統。
2. **Scarcity -> Conflict**：能力、資源、知識或安全的稀缺必須形成利益衝突。
3. **Institutional Response**：長期壓力會形成法律、職業、宗教、教育、市場或治理制度。
4. **Daily-Life Proof**：重大設定至少要能在數個生活領域被觀察到。
5. **Layered Truth**：公開認知、矛盾證據與 Director-level 真相分層存在。
6. **Persistent Story Engine**：世界壓力在玩家不介入時仍會演化，玩家有多種介入槓桿。
7. **Trope Requires Cause**：公會、勇者、魔王、等級等類型元素不能只是預設；必須具有世界內成因與本世界特有變形。
8. **Origin Alignment**：世界可支援玩家 Origin，但不能因此破壞 Epistemic / Opening knowledge boundary。

## Runtime Schema

新世界在 `worldBible.designLogic` 保存：

- `coreFantasy`
- `worldHook`
- `laws[]`
  - `rule`
  - `cost`
  - `observableEffect`
- `consequenceChains[]`
  - `cause`
  - `consequences[]`
  - `institution`
  - `conflict`
- `dailyLifeImpacts[]`
- `storyEngines[]`
  - `pressure`
  - `actors[]`
  - `escalation`
  - `playerLevers[]`
- `mysteryLayers`
  - `surfaceBelief`
  - `contradiction`
  - `hiddenMechanism`
- `tropeAudit[]`
  - `trope`
  - `causalBasis`
  - `twist`

## 生成流程整合

`IDENTITY`
-> `CORE_RULES + CORE_ANCHOR`
-> `World Anchor Contract`
-> `HISTORY + GEOGRAPHY`
-> `FUTURE + SOCIETY`
-> `CAST`
-> Engine validation
-> background Quality Critic

`CORE_RULES` 現在同時產生 `designLogic`。`buildWorldAnchorContract()` 將該結構傳到 History、Society 與 Future，使後續階段使用同一份因果骨架。

History 用 consequence chains 解釋制度形成；Society 把 daily-life impacts 落實到文化、交易與勢力利益；Future 把 story engines 具體化為可阻止、加速、緩和或改向的事件壓力。

## Validation

World Architect Validator 至少要求：

- 2 條完整世界 laws。
- 2 條 consequence chains，每條至少 3 階後果。
- 3 項 daily-life impacts。
- 2 個 persistent story engines。
- 每個 story engine 至少 2 種利益方與 2 種 player levers。
- 完整三層 mystery architecture。

新的 World Quality dimensions：

- `causalDepth`
- `narrativeEngines`
- `antiCliche`

若使用常見異世界 trope 而沒有 `causalBasis + twist`，Quality Critic 會標記 `ANTI_CLICHE` finding。

## 相容性

`designLogic` 對舊存檔保持 optional；舊世界不會僅因沒有此欄位而無法載入。新生成世界的 `CORE_RULES` 則會要求完整 design logic。Direct AI 與 `/api/world` server AI 路徑使用相同 Architect schema。
