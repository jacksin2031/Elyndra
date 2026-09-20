# World Schema v0.2

Elyndra 把 AI 生成內容分為不可任意改寫的 Canon 與可隨遊戲變化的 Runtime State。

## World
- id / name / version / seed
- constitution[]
- canon.facts[]
- canon.relations[]
- state.day / state.location / state.flags

## Canon Fact
- id
- type
- text
- visibility: hidden | discoverable | public
- canonical: boolean

## Runtime domains
- player
- inventory[]
- knowledge[]
- npcs{}
- events[]
- narrative

## Knowledge
Knowledge 與 Canon 分離。玩家只有在取得 Knowledge Fragment 後才能把相關 Canon 放入 AI Narrator context。

## NPC
NPC 必須有 knowledgeScope、memories、goal、trust、alive。Narrator 不得讓 NPC 使用 knowledgeScope 以外的隱藏知識。

## Invariants
1. Canon 不能由 Narrator 修改。
2. Dice 不能由 AI 修改。
3. Event 必須 append-only。
4. Save 載入時重新 validate World。
5. AI 產生的新 Canon 在寫入前必須經 Validator。
