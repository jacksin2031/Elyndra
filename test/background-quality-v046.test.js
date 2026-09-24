import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {backgroundQualitySnapshot,applyUnseenWorldRepair,backgroundQualityNeed,recordBackgroundQualityReview} from "../src/world-quality.js";

function state(){
 return {
  player:{location:"起點"},
  events:[],
  world:{
   id:"W",name:"測試界",theme:"測試主題",version:7,state:{day:1,location:"起點"},
   registry:{
    locations:[
     {id:"LOC-CURRENT",name:"起點",known:false,description:"目前位置",historyRefs:["HIST-1"]},
     {id:"LOC-KNOWN",name:"已知村",known:true,description:"已知描述",historyRefs:["HIST-1"]},
     {id:"LOC-HIDDEN",name:"隱藏谷",known:false,description:"模板描述",historyRefs:["HIST-1"]}
    ],
    npcs:[
     {id:"NPC-KNOWN",name:"已見人物",known:true,encountered:true,description:"已知人物",personality:"謹慎",goal:"生活",historyRefs:["HIST-1"]},
     {id:"NPC-HIDDEN",name:"未見人物",known:false,encountered:false,description:"模板人物",personality:"普通",goal:"生活",historyRefs:["HIST-1"]}
    ],
    factions:[
     {id:"FAC-KNOWN",name:"已知勢力",known:true,description:"已知勢力",historyRefs:["HIST-1"]},
     {id:"FAC-HIDDEN",name:"未見勢力",known:false,description:"模板勢力",historyRefs:["HIST-1"]}
    ],
    sideQuests:[]
   },
   history:[{id:"HIST-1",title:"舊史",summary:"不可改寫"}],
   timeline:[],quality:{}
  }
 }
}

test("background quality snapshot marks core Canon immutable and exposes only unseen repair targets",()=>{
 const s=state(),snap=backgroundQualitySnapshot(s);
 assert.equal(snap.immutableBoundary.worldIdentity,true);
 assert.equal(snap.immutableBoundary.historySkeleton,true);
 assert.deepEqual(snap.unseenRepairTargets.locations.map(x=>x.id),["LOC-HIDDEN"]);
 assert.deepEqual(snap.unseenRepairTargets.npcs.map(x=>x.id),["NPC-HIDDEN"]);
 assert.deepEqual(snap.unseenRepairTargets.factions.map(x=>x.id),["FAC-HIDDEN"])
});

test("background repair cannot mutate seen/current entities, identity, refs or numeric rules",()=>{
 const s=state(),beforeHistory=structuredClone(s.world.history),beforeCurrent=s.world.registry.locations[0].description,beforeKnown=s.world.registry.locations[1].description;
 const patch={patch:{registry:{
  locations:[
   {id:"LOC-CURRENT",description:"不應改目前位置"},
   {id:"LOC-KNOWN",description:"不應改已知位置"},
   {id:"LOC-HIDDEN",name:"偷改名稱",region:"偷改區域",historyRefs:["HIST-X"],description:"具體的灰岩裂谷。",culture:{identity:"沿裂谷鐘聲生活"},trade:{mode:"barter"},worldState:{safety:0}}
  ],
  npcs:[
   {id:"NPC-KNOWN",description:"不應改已見 NPC"},
   {id:"NPC-HIDDEN",name:"偷改 NPC 名",trust:100,description:"記錄裂谷聲響的守夜人。",personality:"寡言而精確",goal:"偷改規則也不應影響此欄以外數值",locationId:"LOC-X"}
  ],
  factions:[
   {id:"FAC-KNOWN",description:"不應改已知勢力"},
   {id:"FAC-HIDDEN",name:"偷改勢力名",description:"以維護舊鐘塔為傳統。",culture:{identity:"鐘塔守護者"},goal:"不可由 repair 改 faction goal",resources:100}
  ]
 }}};
 const out=applyUnseenWorldRepair(s,patch);assert.equal(out.applied,true);assert.equal(out.modified.length,3);
 assert.equal(s.world.registry.locations[0].description,beforeCurrent);assert.equal(s.world.registry.locations[1].description,beforeKnown);
 const loc=s.world.registry.locations[2];assert.equal(loc.name,"隱藏谷");assert.deepEqual(loc.historyRefs,["HIST-1"]);assert.equal(loc.description,"具體的灰岩裂谷。");assert.equal(loc.worldState,undefined);
 const npc=s.world.registry.npcs[1];assert.equal(npc.name,"未見人物");assert.equal(npc.trust,undefined);assert.equal(npc.locationId,undefined);assert.equal(npc.description,"記錄裂谷聲響的守夜人。");
 const fac=s.world.registry.factions[1];assert.equal(fac.name,"未見勢力");assert.equal(fac.goal,undefined);assert.equal(fac.resources,undefined);assert.equal(fac.description,"以維護舊鐘塔為傳統。");
 assert.deepEqual(s.world.history,beforeHistory);assert.equal(s.world.version,8)
});

test("background quality need is version-aware and does not loop after a completed review",()=>{
 const s=state();assert.equal(backgroundQualityNeed(s).required,true);
 recordBackgroundQualityReview(s,{evaluation:{overall:90}});
 assert.equal(backgroundQualityNeed(s).required,false);
 s.world.version++;const need=backgroundQualityNeed(s);assert.equal(need.required,true);assert.equal(need.reason,"WORLD_VERSION_ADVANCED")
});

test("world creation no longer awaits AI Critic or repair before returning candidate",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const start=client.indexOf("export async function generateWorldCandidate"),end=client.indexOf("export async function runWorldQualityCritic",start),gen=client.slice(start,end);
 assert.match(gen,/BACKGROUND_AI_CRITIC_PENDING/);
 assert.doesNotMatch(gen,/await reviewAndRepairWorldCandidate/);
 assert.doesNotMatch(gen,/await recoverFallbackWorldCandidate/);
 const tail=gen.slice(gen.indexOf("const draft="));assert.match(tail,/return draft/);
});

test("server world route also stops after Engine compliance and local quality baseline",async()=>{
 const api=await readFile(new URL("../api/world.js",import.meta.url),"utf8");
 assert.match(api,/BACKGROUND_AI_CRITIC_PENDING/);
 assert.doesNotMatch(api,/World Critic/);assert.doesNotMatch(api,/World Repair Architect/);
 assert.doesNotMatch(api,/let evaluation=await evaluate/);
 assert.match(api,/validateWorldCreationCandidate\(seed,candidate\)/)
});

test("background Critic is post-entry, preemptible and stale-version gated",async()=>{
 const [app,client]=await Promise.all([readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")]);
 assert.match(app,/const worldQualityBackground=\{/);
 assert.match(app,/function preemptBackgroundWorldQuality\(\)/);
 assert.match(app,/preemptBackgroundAI\(\).*preemptBackgroundWorldQuality\(\)/);
 assert.match(app,/scheduleWorldQualityCritic\("post_creation",1000\)/);
 assert.match(app,/scheduleWorldQualityCritic\("continue_world",1200\)/);
 assert.match(app,/const state=gameState,sessionToken=captureStateSession\(\)/);
 assert.match(app,/runWorldQualityCritic\(state,\{signal:ctrl\.signal\}\)/);
 assert.match(app,/ctrl\.signal\.aborted\|\|!isCurrentStateSession\(sessionToken\)\|\|state\.world\?\.id!==worldId/);
 assert.match(app,/BACKGROUND_QUALITY_CRITIC_STALE_DISCARDED/);
 assert.match(app,/applyUnseenWorldRepair\(state,result\.repairPatch\)/);
 assert.match(client,/export async function runWorldQualityCritic/);
 assert.match(client,/unseenRepairTargets/);assert.match(client,/signal,timeoutMs:45000,retryOnTimeout:false/)
});
