import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeActionIntent} from "../src/action-intent.js";
import {deterministicAutotestDecision,decideAutotestAction,resetAutotestDecisionCircuit,buildAutotestReport} from "../src/ai-autotest.js";
import {PROVIDERS,saveAISettings,clearAISettings} from "../src/ai-settings.js";
import {planLazyGeneration,abortLazyGeneration} from "../src/lazy-generation.js";
import {needsExpansion} from "../src/knowledge-graph.js";

function memoryStorage(){
 const data=new Map();
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear()}
}
function replayState(){
 return {events:[],world:{id:"W",version:3,bible:{centralConflict:"test"},seed:{genre:"測試"},seedContract:{genre:"測試",magic:2},state:{region:"北境",day:2,clock:{totalMinutes:135}},registry:{locations:[],npcs:[],factions:[],sideQuests:[]},history:[],generationClaims:{version:1,claims:[]},historyLegacy:{version:1,records:[]},lazyGeneration:{version:2,generationRevision:0,plans:[],commits:[]}}}
}
function autotestState(){
 return {
  world:{id:"AUTO-W",name:"Test",state:{day:1,clock:{hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"LOC-1",name:"起點",known:true}],npcs:[{id:"NPC-1",name:"咝-4",role:"維護工",known:true,encountered:true}],factions:[],sideQuests:[]}},
  player:{name:"Tester",worldNameKnown:false,location:"起點",hp:10,maxHp:10,status:"ACTIVE",level:1,xp:0,knowledgeScore:0,wallet:{}},
  quests:{main:{title:"離開起點",stage:0,status:"ACTIVE",objectives:["找到出口"]}},inventory:[],knowledge:[],discoveries:0,events:[],sceneTitle:"起點",narrative:"前方有出口。",
  suggestionIntents:[
   {label:"再看一次",action:"再次觀察牆面",kind:"OBSERVE",progression:false,risk:"LOW"},
   {label:"問咝-4",action:"向咝-4追問同一件事",kind:"SOCIAL",progression:true,risk:"LOW",targetId:"NPC-1"},
   {label:"去出口",action:"沿可見通道走向出口",kind:"TRAVEL",progression:true,risk:"LOW",targetId:"LOC-1"}
  ]
 }
}

test("non-canonical AI target aliases are resolved to a real registry NPC instead of GUARD",()=>{
 const snapshot={registry:{npcs:[{id:"NPC-1",name:"咝-4",role:"維護工"}],locations:[]}};
 const out=normalizeActionIntent({intent:"OBSERVE",targetId:"GUARD",target:"護衛"},"檢查那名護衛的狀態","OBSERVE",snapshot);
 assert.equal(out.targetId,"NPC-1");assert.equal(out.target,"咝-4");assert.notEqual(out.targetId,"GUARD")
});

test("ambiguous generic NPC alias never invents a canonical target id",()=>{
 const snapshot={registry:{npcs:[{id:"NPC-1",name:"甲",role:"居民"},{id:"NPC-2",name:"乙",role:"居民"}],locations:[]}};
 const out=normalizeActionIntent({intent:"TALK",targetId:"GUARD",target:"護衛"},"向護衛詢問","SOCIAL",snapshot);
 assert.equal(out.targetId,null)
});

test("seven stagnant turns force a fresh travel recovery instead of another social loop",()=>{
 const snap={world:{location:"起點"},quest:{title:"離開起點",objectives:["找到出口"]},suggestions:autotestState().suggestionIntents,combat:{active:false}};
 const recent=Array.from({length:7},(_,i)=>({action:`向咝-4追問${i}`,kind:"SOCIAL",progressed:false}));
 const decision=deterministicAutotestDecision(snap,recent,"test recovery");
 assert.equal(decision.mode,"free");assert.equal(decision.kind,"TRAVEL");assert.equal(decision.progression,true);assert.match(decision.action,/出口|通道/)
});

test("autotest provider failures fall back locally and open a decision circuit after two failures",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();let calls=0;
 try{
  clearAISettings();saveAISettings({provider:"openai",apiKey:"test",endpoint:PROVIDERS.openai.endpoint,optimization:"standard"});resetAutotestDecisionCircuit();
  globalThis.fetch=async()=>{calls++;throw new TypeError("Failed to fetch")};
  const s=autotestState(),a=await decideAutotestAction(s),b=await decideAutotestAction(s),c=await decideAutotestAction(s);
  assert.equal(a.fallback,true);assert.equal(b.fallback,true);assert.equal(c.fallback,true);assert.equal(calls,2,"third decision should be served by the open circuit without another provider request")
 }finally{resetAutotestDecisionCircuit();globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});

test("ordinary abort keeps deterministic lazy replay but provider abort rotates plan id and enters backoff",()=>{
 const normal=replayState(),a=planLazyGeneration(normal,{reason:"WORLD_EDGE_UNDERDEFINED"});abortLazyGeneration(normal,a,"TEST_ABORT");const retry=planLazyGeneration(normal,{reason:"WORLD_EDGE_UNDERDEFINED"});
 assert.equal(retry.id,a.id);assert.equal(retry.entitySeed,a.entitySeed);
 const failed=replayState(),p=planLazyGeneration(failed,{reason:"WORLD_EDGE_UNDERDEFINED"});abortLazyGeneration(failed,p,"WORLD_RUNTIME_GEOGRAPHY_FAILED: AI_TIMEOUT: Provider 在 50 秒內未完成回應");
 assert.equal(needsExpansion(failed),false,"recent provider abort should prevent immediate pre-play retry storm");
 const next=planLazyGeneration(failed,{reason:"WORLD_EDGE_UNDERDEFINED"});assert.notEqual(next.id,p.id);assert.equal(next.generationRevision,p.generationRevision)
});

test("zero-turn PLAY world is not reported as completed and severe generation is surfaced",()=>{
 const diagnostics={quality:"SEVERELY_DEGRADED",stages:{IDENTITY:{source:"FALLBACK"},CORE_RULES:{source:"FALLBACK"}}};
 const report=buildAutotestReport({config:{worldCount:1,maxTurns:30},worlds:[{index:1,status:"COMPLETED",phase:"PLAY",turns:0,actions:[],generation:{diagnostics}}],telemetry:[]});
 assert.equal(report.summary.worldsCompleted,0);assert.equal(report.summary.worldsPlayNotStarted,1);assert.equal(report.worlds[0].status,"PLAY_NOT_STARTED");
 assert.ok(report.issues.some(x=>x.type==="PLAY_NOT_STARTED"));assert.ok(report.issues.some(x=>x.type==="GENERATION_SEVERELY_DEGRADED"))
});

test("runtime contracts forbid alias target ids and narrator fact inversion",async()=>{
 const source=await readFile(new URL("../src/ai-runtime-contracts.js",import.meta.url),"utf8");
 assert.match(source,/禁止輸出 GUARD、NPC、STRANGER/);
 assert.match(source,/禁止用新敘事反轉先前 hook／場景已建立的可見事實/);
 assert.match(source,/targetId 只可逐字使用 snapshot\.registry 中已存在的 canonical id/)
});

test("AI runtime control is shared across cache-versioned module instances and can pause hidden requests",async()=>{
 const source=await readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8");
 assert.match(source,/__ELYNDRA_DIRECT_AI_RUNTIME_CONTROL__/);assert.match(source,/globalThis\[RUNTIME_CONTROL_KEY\]/);assert.match(source,/AI_BACKGROUND_PAUSED/);assert.match(source,/visibilitychange/)
});
