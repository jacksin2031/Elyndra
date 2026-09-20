# AI API Integration Contract

目前遊戲已到「接 API 前」邊界。Game Engine、World State、Canon、Knowledge 與 Save 不依賴任何模型。

## Provider boundary

`src/ai-provider.js` 提供 `AIProvider` 與 `OpenAICompatibleProvider`。

AI 只允許處理：
- World candidate generation
- NPC dialogue candidate
- Narration
- Lore candidate expansion

AI 不允許直接處理：
- D20 結果
- HP / 金錢 / Inventory mutation
- Canon overwrite
- Save mutation
- Knowledge permission

## Production security

不要把正式 API key 寫進前端或 GitHub。正式接入時新增 server-side proxy，例如 `/api/ai/narrate`，由伺服器保存 secret；瀏覽器只提交最小化 context。

## Narrator request

`buildNarratorContext(state, action, result)` 已會：
1. 注入 World Constitution。
2. 只加入 public 或玩家已解鎖的 Canon。
3. 明確禁止模型改寫骰子、Canon 與角色狀態。

## API 接入完成條件

- Server-side secret
- Provider timeout / retry
- JSON schema validation
- Rate limiting
- Candidate -> Validator -> Canonize pipeline
- AI failure fallback to deterministic local narration
- Prompt injection tests
- Knowledge leakage tests
