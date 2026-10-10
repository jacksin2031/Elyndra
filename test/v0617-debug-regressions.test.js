import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {tokenBudgetSnapshot} from "../src/context-manager.js";
import {groundStatePatch,projectDeferredSceneEvidence} from "../src/state-sync.js";
import {repairStatePatchCandidate} from "../src/ai-output-repair.js";
import {recordBackgroundQualityReview} from "../src/world-quality.js";

function oversizedSnapshot(){
 const loc={id:"LOC-1",name:"真正的避難所",type:"SHELTER",region:"測試區",known:false};
 return {world:{name:"UNKNOWN",day:1,location:"眼前的陌生地點",summary:"x".repeat(6000)},player:{hp:100,knowledgeScore:0,wallet:{},calendarKnown:false},travel:{currentLocationId:"LOC-1",routes:Array.from({length:40},(_,i)=>({id:`R-${i}`,fromId:"LOC-1",toId:`LOC-${i+2}`}))},registry:{locations:[],npcs:[],factions:[],sideQuests:[]},directorRegistry:{locations:[loc,{id:"LOC-2",name:"第二地點",type:"ROAD",region:"測試區",known:false}],npcs:[],factions:[]},knownFacts:Array(40).fill("已知事實"),knowledge:Array(40).fill({title:"線索",text:"內容"}),recentEvents:Array(40).fill({type:"TURN",summary:"事件"}),narrativeDirector:{storyEngines:Array(10).fill({pressure:"p".repeat(300)}),factionPlans:Array(10).fill({plan:"p".repeat(300)}),npcPlans:Array(10).fill({plan:"p".repeat(300)}),activeFutures:Array(10).fill({title:"future"}),unresolvedConsequences:Array(10).fill({summary:"c".repeat(300)})}};
}

test("v0.61.7 minimal context preserves current canonical director location",()=>{
 const compact=tokenBudgetSnapshot(oversizedSnapshot(),1800);
 assert.equal(compact.contextMeta.degraded,true);
 assert.ok(compact.contextMeta.degradationReasons.includes("MINIMAL_CONTEXT_FALLBACK"));
 assert.equal(compact.directorRegistry.locations[0].id,"LOC-1");
});
test("v0.61.7 minimal context still binds a real hidden location for REVEAL_ENTITY",()=>{
 const compact=tokenBudgetSnapshot(oversizedSnapshot(),1800);
 const fixed=repairStatePatchCandidate({baseRevision:7,operations:[{op:"REVEAL_ENTITY",kind:"location",id:"LOC-1"}]},{plan:{baseRevision:7,capabilities:["REVEAL_ENTITY"]},snapshot:compact});
 assert.equal(fixed.dropped.length,0);
 assert.equal(fixed.value.operations.length,1);
 assert.equal(fixed.value.operations[0].id,"LOC-1");
});

test("v0.61.7 projected scene evidence commits despite its generic presentation title",()=>{
 const state={player:{location:"眼前的陌生地點",locationId:"LOC-1"},world:{state:{location:"真正的避難所",locationId:"LOC-1"},registry:{locations:[{id:"LOC-1",name:"真正的避難所",known:false}],npcs:[]},canon:{facts:[]}},events:[],inventory:[],narrative:""};
 const pending=[{op:"DISCOVER_FACT",title:"電磁殘響的方向",text:"原始候選內容",factId:"F-1",evidenceType:"EXAMINED",sourceKind:"LOCATION",sourceId:"LOC-1"}];
 const narrative="你看見空氣中的稲妻沿牆面向右流動，硬質地面同時傳來細微反響。";
 const projected=projectDeferredSceneEvidence(pending,narrative);
 assert.equal(projected[0].title,"本回合確認到的可觀察線索");
 const grounded=groundStatePatch(state,{baseRevision:0,operations:projected},{roll:{success:true},evidencePhase:"SCENE",observableText:narrative,action:"稲妻の方向を観察する"});
 assert.equal(grounded.rejected.length,0);
 assert.equal(grounded.patch.operations.length,1);
});
test("v0.61.7 failed background critic preserves the last known good official evaluation",()=>{
 const prior={overall:88,status:"PASS",source:"AI_BACKGROUND",official:true,dimensions:{internalConsistency:92},findings:[]};
 const state={world:{version:9,quality:{overall:88,status:"PASS",source:"AI_BACKGROUND",official:true,background:{reviewedAt:1,reviewedWorldVersion:8,evaluation:structuredClone(prior),runs:1}}}};
 recordBackgroundQualityReview(state,{error:"WORLD_QUALITY_CRITIC_FAILED: INVALID_MODEL_JSON"});
 assert.equal(state.world.quality.status,"PASS");
 assert.equal(state.world.quality.official,true);
 assert.equal(state.world.quality.overall,88);
 assert.match(state.world.quality.background.error,/INVALID_MODEL_JSON/);
});

test("v0.61.7 engine fallback opening is semantically re-evaluated",async()=>{
 const source=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(source,/const originEvaluatorArgs=openingHook=>/);
 assert.match(source,/geography=geographyFallback\(anchor,originOpening\);const fallbackSemantic=await resilientWorldStage\("ORIGIN_OPENING_COMPLIANCE",originEvaluatorArgs\(geography\.openingHook\)/);
 assert.match(source,/ORIGIN_FALLBACK_SEMANTIC_EVALUATOR_UNAVAILABLE/);
 assert.doesNotMatch(source,/ORIGIN_OPENING_REPLACED_BY_ENGINE_FALLBACK/);
});

test("v0.61.7 background quality critic retries malformed non-JSON once",async()=>{
 const source=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(source,/BACKGROUND_QUALITY_CRITIC_RETRY/);
 assert.match(source,/禁止輸出思考、前言、Markdown/);
});
test("v0.61.7 locale defer telemetry is deduplicated per action flight",async()=>{
 const source=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/uiTranslationDeferredEpoch!==playerActionFlight\.epoch/);
 assert.match(source,/localeRepairDeferredEpoch!==playerActionFlight\.epoch/);
 assert.match(source,/uiTranslationDeferredEpoch=playerActionFlight\.epoch/);
 assert.match(source,/localeRepairDeferredEpoch=playerActionFlight\.epoch/);
});
