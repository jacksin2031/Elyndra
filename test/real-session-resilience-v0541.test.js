import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateStatePatch,groundStatePatch} from "../src/state-sync.js";
import {ensureLazyGeneration} from "../src/lazy-generation.js";
import {ensureKnowledgeMetadata} from "../src/knowledge-model.js";
import {maintainSession} from "../src/session-maintenance.js";
import {fastTurnStateSnapshot} from "../src/turn-compiler.js";
import {providerOptimization,providerTokenBudget} from "../src/ai-settings.js";

function groundingState(){
 return {
  player:{location:"異界醒轉地"},
  world:{state:{location:"異界醒轉地"},registry:{
   locations:[{id:"L1",name:"異界醒轉地",known:true,description:"霧氣與聲音傳播異常可直接被感知。"}],
   npcs:[{id:"N1",name:"當地引路人",known:false,encountered:false,visibilityLock:"UNSEEN",alive:true,locationId:"L1"}]
  },canon:{facts:[]}},
  events:[],inventory:[],knowledge:[]
 }
}

test("v0.54.1 DISCOVER_FACT requires an explicit Engine-groundable source",()=>{
 const plan={baseRevision:3,capabilities:["DISCOVER_FACT"]};
 const missing={baseRevision:3,operations:[{op:"DISCOVER_FACT",title:"有人在場",text:"至少有一個目擊者",factId:"",evidenceType:"OBSERVED"}]};
 const mv=validateStatePatch(missing,plan);assert.equal(mv.valid,false);assert.ok(mv.errors.includes("STATE_PATCH_DISCOVERY_GROUNDING_REQUIRED"));
 const phantom={baseRevision:3,operations:[{op:"DISCOVER_FACT",title:"有人在場",text:"至少有一個目擊者",factId:"",evidenceType:"OBSERVED",sourceKind:"NPC",sourceId:"N1"}]};
 assert.equal(validateStatePatch(phantom,plan).valid,true);
 const grounded=groundStatePatch(groundingState(),phantom);assert.equal(grounded.patch.operations.length,0);assert.equal(grounded.rejected[0].reason,"DISCOVERY_SOURCE_NOT_OBSERVABLE");
 const location={baseRevision:3,operations:[{op:"DISCOVER_FACT",title:"聲音異常",text:"目前位置可直接感知聲音傳播異常",factId:"",evidenceType:"OBSERVED",sourceKind:"LOCATION",sourceId:"L1"}]};
 assert.equal(groundStatePatch(groundingState(),location).patch.operations.length,1)
});

test("v0.54.1 legacy observation evidence no longer drifts into testimony",()=>{
 const state={knowledge:[
  {id:"K1",status:"OBSERVATION",evidenceType:"OBSERVED",text:"我親眼看到痕跡"},
  {id:"K2",status:"OBSERVATION",evidenceType:"UNVERIFIED",text:"AI 舊版觀察"}
 ]};
 ensureKnowledgeMetadata(state);
 for(const row of state.knowledge){assert.equal(row.status,"UNCONFIRMED");assert.equal(row.evidenceType,"OBSERVATION");assert.equal(row.beliefState,"UNCONFIRMED")}
});

test("v0.54.1 lazy generation migration deduplicates repeated plan ids",()=>{
 const state={world:{lazyGeneration:{version:2,generationRevision:0,plans:[
  {id:"LGP-X",status:"ABORTED",attempts:1,createdAt:10,abortedAt:20},
  {id:"LGP-X",status:"ABORTED",attempts:6,createdAt:10,abortedAt:30},
  {id:"LGP-Y",status:"PLANNED",attempts:1,createdAt:40}
 ],commits:[]}}};
 const root=ensureLazyGeneration(state);assert.equal(root.plans.length,2);
 const x=root.plans.find(p=>p.id==="LGP-X");assert.equal(x.attempts,6)
});

test("v0.54.1 runtime summary replaces the prior compaction text instead of concatenating it",()=>{
 const state={events:Array.from({length:50},(_,i)=>({id:"E"+i,type:i%2?"PLAYER_ACTION":"WORLD_EVENT"})),npcs:{},runtimeSummary:"OLD SUMMARY"};
 maintainSession(state);assert.doesNotMatch(state.runtimeSummary,/OLD SUMMARY/);assert.match(state.runtimeSummary,/較早旅程共 26 個事件/)
});

test("v0.54.1 FAST provider policy keeps requested completion budget and low reasoning",()=>{
 assert.deepEqual(providerOptimization("agnes","standard","turn_state_fast"),{});
 assert.equal(providerTokenBudget("agnes","adaptive","turn_state_fast",650),800);
 assert.equal(providerTokenBudget("openai","adaptive","scene",760),760)
});

test("v0.54.1 FAST state snapshot only includes capability-relevant heavy sections",()=>{
 const snapshot={
  stateRevision:9,world:{name:"UNKNOWN",day:1,location:"異界醒轉地"},player:{location:"異界醒轉地"},
  knownFacts:["A"],knowledge:[],recentEvents:[],inventory:[{name:"物品"}],magic:{knownSpells:[{name:"術"}]},travel:{routes:[1]},survival:{fatigue:0},
  registry:{locations:[{id:"L1",name:"異界醒轉地"}],npcs:[],sideQuests:[]},directorCanon:[{id:"F1",text:"fact"}]
 };
 const fast=fastTurnStateSnapshot(snapshot,{capabilities:["DISCOVER_FACT"]});
 assert.equal(fast.stateRevision,9);assert.equal(fast.directorCanon.length,1);
 assert.equal("inventory" in fast,false);assert.equal("magic" in fast,false);assert.equal("travel" in fast,false);assert.equal("survival" in fast,false)
});

test("v0.54.1 foreground waits for State Sync, not Scene AI, and background requires idle grace",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 assert.match(run,/await stateSyncResult/);assert.doesNotMatch(run,/await playerActionResult/);assert.match(run,/scene_nonblocking/);
 assert.match(app,/BACKGROUND_IDLE_GRACE_MS=10000/);assert.match(app,/backgroundIdleRemaining\(\)/);assert.match(app,/ENGINE_GROUNDED_FAIL_FORWARD_APPLIED/)
});

test("v0.54.1 world compiler circuit counts final distinct stage timeouts instead of attempts",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/timeoutStages/);assert.match(client,/circuit\.timeoutCount>=4/);
 const catchBlock=client.slice(client.indexOf("async function resilientWorldStage"),client.indexOf("function fallbackClause"));
 const first=catchBlock.indexOf("const firstReason"),note=catchBlock.indexOf("noteGenerationTimeout");
 assert.ok(first>=0&&note>first);assert.doesNotMatch(catchBlock.slice(first,note),/noteGenerationTimeout\(stage,firstReason\)/)
});


test("v0.54.6 successful pickup can fail forward when State AI is empty",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function commitGroundedPickupFallback/);
 assert.match(app,/ENGINE_PICKUP_FAIL_FORWARD_APPLIED/);
 assert.match(app,/groundedPickup:Boolean\(pickup\.applied\|\|pickup\.reused\)/)
});
