# Elyndra

**Elyndra** 是一款以 AI 生成世界、骰子判定、知識探索與 AI 夥伴為核心的異世界網頁 RPG 概念原型。

> 每一個世界，都有自己的真相。

## 目前原型

- 異世界世界種子建立流程
- 王道 / 黑暗 / 東方 / 蒸汽 / 末日世界風格
- 危險度、魔法普及度、政治複雜度參數
- 基礎 RPG 冒險畫面
- D20 判定
- 世界手帳 / Knowledge Fragment 概念
- 背包
- AI 夥伴概念
- 本地存檔（localStorage）
- 響應式手機版 UI

目前仍屬於 **V0.1 Concept Prototype**。這一版的主要目的不是完成 AI 世界生成，而是先把核心玩家體驗、UI 與資料流建立起來。

## 核心方向

Elyndra 的最終世界引擎會遵循以下架構：

```
World Seed
  ↓
World Constitution
  ↓
World Bible / Knowledge Graph
  ↓
World Validator
  ↓
Canonical World
  ↓
Runtime World State
  ↓
NPC / Event / Narrator AI
```

AI 負責提出內容，遊戲引擎負責驗證與保存 Canon。

## 本地啟動

直接開啟 `index.html` 即可。

也可以使用任意靜態伺服器：

```bash
python -m http.server 8000
```

然後打開 `http://localhost:8000`。

## 下一階段

- IndexedDB 正式 Save Manager
- .elyndra 世界匯出 / 匯入
- World Schema
- World Constitution
- World Compiler prototype
- World integrity validation
- NPC 記憶與知識權限
- 事件系統
- AI Provider abstraction
