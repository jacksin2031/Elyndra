import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeRuntimeNpc} from "../src/runtime-generation-normalizer.js";
import {buildContextualActionSet,trustedSuggestionAssessment} from "../src/contextual-actions.js";

function actionState(){
 return {
  world:{id:"W",state:{day:1},registry:{locations:[{id:"L1",name:"燼骨城外圍無名廢廟的轉生祭壇",known:true},{id:"L2",name:"燼骨城北風化哨站",known:true}],npcs:[],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},
  player:{location:"燼骨城外圍無名廢廟的轉生祭壇",status:"ACTIVE",difficulty:"normal",skills:{OBSERVE:1,SOCIAL:0,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},
  quests:{main:{title:"追查世界規則",objectives:["取得可驗證證據"],status:"ACTIVE"}},events:[]
 }
}

test("v0.54.15 normalizes malformed Runtime Cast NPC profiles before validation",()=>{
 const npc=normalizeRuntimeNpc({name:"殘影",role:"守衛",knowledgeScope:"不應是字串",behaviorProfile:"總是避開目光",companionProfile:"不願成為同伴"});
 assert.deepEqual(npc.knowledgeScope,[]);
 assert.equal(typeof npc.behaviorProfile,"object");assert.deepEqual(npc.behaviorProfile.habits,["總是避開目光"]);
 assert.equal(typeof npc.companionProfile,"object");assert.equal(npc.companionProfile.joinThreshold,35);assert.equal(npc.companionProfile.leaveThreshold,10);assert.deepEqual(npc.companionProfile.boundaries,["不願成為同伴"]);
 const drift=normalizeRuntimeNpc({behaviorProfile:{greeting:"先沉默再開口",fear:"害怕節點"},companionProfile:{reason:"需要外部協助",conditions:["不可觸碰禁忌物"]}});
 assert.deepEqual(drift.behaviorProfile.speechPatterns,["先沉默再開口"]);assert.deepEqual(drift.behaviorProfile.fears,["害怕節點"]);assert.deepEqual(drift.companionProfile.motives,["需要外部協助"]);assert.deepEqual(drift.companionProfile.boundaries,["不可觸碰禁忌物"]);
});

test("v0.54.15 keeps intra-location search OBSERVE but preserves genuine named TRAVEL",()=>{
 const s=actionState(),localAction="暫時離開祭壇中心，在廢廟其他區域尋找可能保留較完好的符號或文字，試圖建立一套本地的符號對照表。";
 const local=buildContextualActionSet(s,[{label:"找其他符號",action:localAction,kind:"OBSERVE",risk:"MEDIUM",approach:"CREATIVE",progression:true,requirementsSatisfied:true,causalBasis:"仍在同一廢廟內"}]).all.find(x=>x.action===localAction);
 assert.ok(local);const localAssessment=trustedSuggestionAssessment(s,local);assert.equal(localAssessment.kind,"OBSERVE");assert.equal(localAssessment.actionIntent.intent,"OBSERVE");assert.equal(localAssessment.source,"AI_SUGGESTION_PREVALIDATED");
 const travelAction="離開祭壇，前往燼骨城北風化哨站查看入口痕跡";
 const travel=buildContextualActionSet(s,[{label:"去北哨站",action:travelAction,kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:true,requirementsSatisfied:true,causalBasis:"已知北哨站"}]).all.find(x=>x.action===travelAction);
 assert.ok(travel);const travelAssessment=trustedSuggestionAssessment(s,travel);assert.equal(travelAssessment.kind,"TRAVEL");assert.equal(travelAssessment.actionIntent.intent,"TRAVEL");assert.equal(travelAssessment.source,"AI_SUGGESTION_ENGINE_RECLASSIFIED");
});

test("v0.54.15 gives Runtime Society enough output headroom and escalates retry budget",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/RUNTIME_SOCIETY[\s\S]*?timeoutMs:55001,maxOutputTokens:2400/);
 assert.match(client,/attemptTokens=attempt>1\?Math\.min\(3600/);
 assert.match(client,/被截斷，縮短自由文字但必須完整閉合 JSON/);
 assert.match(client,/runtimeRows\(value,"npcs",slots\.npcs\)\.map\(normalizeRuntimeNpc\)/);
});

test("v0.54.15 opening nearby NPC is player-visible in direct and server world creation",async()=>{
 const [client,server]=await Promise.all([readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/world.js",import.meta.url),"utf8")]);
 assert.match(client,/附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true/);
 assert.match(client,/historyRefs:\["0-2個 HIST id"\],known:true,behaviorProfile/);
 assert.match(server,/附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true/);
 assert.match(server,/historyRefs:\["0-2 HIST"\],known:true,behaviorProfile/);
});
