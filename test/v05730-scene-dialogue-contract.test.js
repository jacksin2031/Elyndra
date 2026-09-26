import test from "node:test";
import assert from "node:assert/strict";
import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";

test("v0.57.30 scene dialogue is conditional rather than mandatory",()=>{
 const prompt=sceneNarratorSystem();
 assert.match(prompt,/對白是可選的，不是每回合必需/);
 assert.match(prompt,/只有 payload\.action／intent 明確包含說話意圖/);
 assert.match(prompt,/最多一句自然、簡短、能推進情境的對白/);
 assert.match(prompt,/純 OBSERVE、TRAVEL/);
 assert.match(prompt,/不要硬塞對白/);
});

test("v0.57.30 narrator cannot invent player speech or commitments",()=>{
 const prompt=sceneNarratorSystem();
 assert.match(prompt,/逐字引用 payload\.action 已明確說出的內容/);
 assert.match(prompt,/忠實且不增加立場、承諾、問題、資訊或決定的轉述/);
 assert.match(prompt,/不得替玩家發明台詞/);
});

test("v0.57.30 NPC dialogue is bounded by visible knowledge relationship and outcome",()=>{
 const prompt=sceneNarratorSystem();
 assert.match(prompt,/NPC 台詞必須符合 snapshot\.registry\.npcs 中該 NPC 的 role、description、trust/);
 assert.match(prompt,/kernel\.allowedVisibleFacts、snapshot\.knowledgeLayers\.playerKnowledge、snapshot\.recentEvents/);
 assert.match(prompt,/不得讓 NPC 說出 hidden Canon、未知人名／地名、未 commit 的 State Director 結果/);
 assert.match(prompt,/任何對白都不得反轉 kernel\.confirmedOutcome/);
 assert.match(prompt,/SUCCESS 也不得額外宣稱 NPC 關係、任務、知識或物品已改變/);
});

test("v0.57.30 Scene snapshot exposes grounded NPC relationship cues without director-only knowledge",()=>{
 const scene=sceneTurnSnapshot({
  world:{name:"測試世界",location:"石橋"},player:{location:"石橋"},knownFacts:[],knowledge:[],inventory:[],quest:null,recentEvents:[],factions:[],companions:[],recognition:{},
  registry:{locations:[],sideQuests:[],npcs:[{id:"N1",name:"眼前的陌生人",role:"守衛",description:"說話簡短而戒備",trust:-12,present:true,knowledgeScope:["SECRET-1"],goal:"隱藏目的"}]}
 });
 assert.deepEqual(scene.registry.npcs[0],{id:"N1",name:"眼前的陌生人",role:"守衛",description:"說話簡短而戒備",trust:-12,companionStatus:undefined,present:true});
 assert.equal(JSON.stringify(scene).includes("SECRET-1"),false);
 assert.equal(JSON.stringify(scene).includes("隱藏目的"),false);
});
