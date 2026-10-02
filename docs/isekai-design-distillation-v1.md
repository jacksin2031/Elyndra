# Isekai Design Distillation V1

## 方法

這份資料只蒸餾可泛化的世界設計機制。不保存作品原文，不要求模型模仿特定作者，也不把角色、專名或既有劇情當成 Elyndra 的生成素材。

分析問題固定為：

1. 作品的核心幻想是甚麼？
2. 哪條世界規則真正改變了角色決策？
3. 該規則是否改變社會、制度或日常生活？
4. 主要稀缺／限制是甚麼？
5. 衝突如何在主角不介入時自行發展？
6. 世界真相如何分層揭露？
7. 主角的 Origin 知識與世界知識有甚麼落差？
8. 哪些部分是可泛化 pattern，哪些只是作品表面元素？

## Comparative Corpus

### Ascendance of a Bookworm

可泛化觀察：知識與媒介本身可以是稀缺資源。當角色的核心需求碰上低識字、昂貴書籍與有限生產能力，世界設定會自然推動材料、工藝、教育、階級與市場問題。

抽象 Pattern：`Personal Need -> Scarcity -> Production Constraint -> Institution / Class Friction -> Social Change`

Elyndra 應學：不要只生成「主角想要某物」；要問世界為甚麼讓這件事難，以及文明如何圍繞這個難題形成制度。

### Log Horizon

可泛化觀察：若世界規則突然改變人口的死亡、能力、身份與安全條件，社會秩序不能保持原樣。規則改變應導致治理、合作、法律、經濟與組織重新形成。

抽象 Pattern：`System Rule Shock -> Social Disorder -> Collective Adaptation -> New Governance`

Elyndra 應學：超自然規則要產生制度後果，而不是只有戰鬥數值效果。

### No Game No Life

可泛化觀察：一條足夠強的世界級硬規則可以重新定義政治與衝突的合法形式。規則越強，文明越應發展出針對規則的專門策略、職業與文化。

抽象 Pattern：`Constitutional World Law -> Conflict Substitution -> Specialized Culture / Strategy`

Elyndra 應學：先問「這個世界有甚麼不能違反的法則」，再推導文明，而不是先生成王國、教會、公會。

### Grimgar of Fantasy and Ash

可泛化觀察：低初始知識、低能力與真實生存成本會讓合作、學習、職能分工與日常資源變得重要。

抽象 Pattern：`Knowledge Deficit + Fragility -> Cooperation -> Skill Learning -> Survival Culture`

Elyndra 應學：Origin 的無知本身可以是 gameplay engine；不要在開局用旁白替玩家補完世界百科。

### Re:Zero

可泛化觀察：強大但私密的能力不一定改變整個社會；它首先改變持有者的資訊優勢、心理決策與因果路徑。世界只能對它實際觀察到的後果作反應。

抽象 Pattern：`Hidden Personal Rule -> Asymmetric Knowledge -> Repeated Causal Branches -> Observable Consequences`

Elyndra 應學：區分 Director Truth、角色能力真相與公共 World State；秘密能力不能無理由成為 NPC 常識。

### Mushoku Tensei

可泛化觀察：保留前世記憶的第二人生把 Origin 變成長期敘事身份，而不是開場 gimmick。能力、知識、家庭、教育與成長環境會逐步改寫角色能做甚麼。

抽象 Pattern：`Origin Memory -> Early-Life Advantage / Bias -> Socialization -> Long-Term Identity`

Elyndra 應學：Origin Narrative Identity 應持續影響後續決策與世界關係，而不是第一幕後消失。

### Overlord

可泛化觀察：巨大力量差與既有從屬關係會改寫政治問題，但角色對新世界的資訊仍可能不足。力量優勢不等於知識優勢。

抽象 Pattern：`Power Asymmetry + Information Uncertainty -> Miscalibrated Decisions -> Political Reactions`

Elyndra 應學：Power、Knowledge、Recognition 應是分離維度；高能力玩家不應自動知道世界真相。

### That Time I Got Reincarnated as a Slime

可泛化觀察：特殊能力若能改變資源、身份或群體合作，就應逐步產生社會與國家級後果，而不是停留在個人戰鬥能力。

抽象 Pattern：`Adaptive Ability -> Resource / Relationship Change -> Coalition -> Institution Building`

Elyndra 應學：玩家造成的 durable impact 應能進入 World State、Faction 與 Future，而不是只存在於 narration。

### KONOSUBA

可泛化觀察：熟悉的類型元素可以保留，但透過限制、能力錯配、制度摩擦或角色需求重新定義其功能，從而避免只複製 genre default。

抽象 Pattern：`Recognizable Trope + Cost / Mismatch -> Functional Inversion`

Elyndra 應學：anti-cliché 不應等於禁止公會、勇者或技能；應要求每個 trope 具有 causalBasis 與本世界特有 twist。

### The Saga of Tanya the Evil

可泛化觀察：個體能力即使突出，也仍受到軍事、官僚、國家與戰爭制度約束；制度本身可以是強力故事引擎。

抽象 Pattern：`Exceptional Individual -> Institutional Constraint -> Incentive Conflict -> Escalating Systemic Consequences`

Elyndra 應學：Faction 與 Institution 不應只提供任務；它們要有自己的目標、成本、規則與升級路徑。

## Cross-work Distillation

跨作品後保留的不是「公會、魔王、轉生、技能」等表面元素，而是下列生成語法：

`Rule -> Cost -> Observable Effect -> Adaptation -> Institution -> Unequal Incentives -> Conflict -> Escalation -> Player Levers`

以及第二條知識語法：

`Director Truth -> Common Belief -> Contradictory Evidence -> Partial Discovery -> Verified Knowledge -> Strategic Use`

以及第三條角色語法：

`Origin -> Initial Knowledge / Ignorance -> Social Recognition -> Capability -> Narrative Identity -> Long-term Consequence`

## Failure Modes

World Architect 必須主動拒絕或降分：

- 魔法存在，但農業、醫療、戰爭、交通、教育與日常生活完全不受影響。
- 先生成「王國／教會／冒險者公會」再倒推理由。
- 所有 faction 只是好人／壞人標籤，沒有資源、需求與相互依賴。
- 世界秘密在 opening 直接由旁白解說。
- Origin 設定只影響第一幕。
- Future events 只是不同名稱的同一危機。
- 玩家不介入時世界完全靜止。
- AI 生成了有趣設定，但沒有真正寫入 Game State。
- fallback/template content 被當成正常高品質 AI 世界。

## Elyndra V1 Decision

因此 V1 將 World Architect 嵌入 `CORE_RULES`，不新增一個獨立模型 round-trip。AI 一次產出世界規則與 `worldBible.designLogic`，後續 History / Society / Future 共同消費該因果骨架。

這保留現有 staged compiler 的成本與 concurrency 模型，同時讓世界設計由「平行生成不同內容」升級為「多階段實現同一因果設計」。
