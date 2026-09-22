import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeCoreAnchorStage,mergeCoreWave} from "../src/world-compiler.js";
import {newGame} from "../src/world-engine.js";
import {planLazyGeneration,validateLazyGenerationCandidate} from "../src/lazy-generation.js";
import {buildAutotestReport} from "../src/ai-autotest.js";

test("v0.54.11 Core Anchor accepts facts nested under worldBible and normalizes them to root",()=>{
 const anchor=normalizeCoreAnchorStage({
  summary:"測試概要",
  worldBible:{startingRegion:"北境",startingSettlement:"灰城",startingLocation:"灰城門",weatherSystem:{identity:"冷霧",phenomena:[{id:"WTH-1"},{id:"WTH-2"}]},publicFacts:["公開甲","公開乙"],hiddenFacts:["秘密甲","秘密乙"]}
 });
 assert.deepEqual(anchor.publicFacts,["公開甲","公開乙"]);
 assert.deepEqual(anchor.hiddenFacts,["秘密甲","秘密乙"]);
 assert.equal("publicFacts" in anchor.worldBible,false);
 assert.equal("hiddenFacts" in anchor.worldBible,false);
 const core=mergeCoreWave(
  {worldName:"霜域",worldTheme:"霜礦階級",playerName:"",premise:"測試"},
  {blueprintProfile:{}},
  {worldBible:{era:"霜紀",centralConflict:"階級",magicCost:"代價",ancientTruth:"秘密",currentCrisis:"危機",tone:"冷冽",civilization:{},communication:{}}},
  anchor
 );
 assert.deepEqual(core.publicFacts,["公開甲","公開乙"])
});

test("v0.54.11 Lazy Generation may cite any existing immutable canonical history",()=>{
 const s=newGame({worldviewMode:"style",genre:"奇幻",scale:"小型",danger:2,magic:2,politics:2,playHours:8,prompt:"history scope"});
 s.world.state.region="北境";
 s.world.history=[
  {id:"HIST-A",order:1,title:"A",summary:"A",causes:["A"],legacies:["A"],canonical:true,mutable:false},
  {id:"HIST-B",order:2,title:"B",summary:"B",causes:["B"],legacies:["B"],canonical:true,mutable:false},
  {id:"HIST-C",order:3,title:"C",summary:"C",causes:["C"],legacies:["C"],canonical:true,mutable:false}
 ];
 s.world.creation={constitution:{hardRules:[]}};
 const plan=planLazyGeneration(s,{reason:"WORLD_EDGE_UNDERDEFINED"});
 const outsidePlan=s.world.history.map(x=>x.id).find(id=>!plan.historyRefs.includes(id));
 assert.ok(outsidePlan,"fixture needs a canonical history outside rotated plan refs");
 const generation={locations:[{name:"北境舊路",description:"舊路",historyRefs:[outsidePlan],claimRefs:[],echoRefs:[]}],npcs:[],factions:[],sideQuests:[],definitions:[]};
 plan.slots.locations=Math.max(1,plan.slots.locations);plan.slots.npcs=0;plan.slots.factions=0;plan.slots.sideQuests=0;plan.slots.definitions=0;plan.claimIds=[];plan.claims=[];plan.legacyEchoIds=[];plan.legacyEchoes=[];
 const report=validateLazyGenerationCandidate(s,generation,plan);
 assert.equal(report.errors.some(x=>x.startsWith("LAZY_HISTORY_REF_OUTSIDE_PLAN:")),false,report.errors.join(","))
});

test("v0.54.11 runtime Geography accepts partial new-location progress and Engine-bound definition claims",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/locations\.length===0\)throw new Error\("RUNTIME_GEOGRAPHY_LOCATION_COUNT"\)/);
 assert.match(client,/function runtimeNewLocations/);
 assert.match(client,/function runtimeDefinitions\(plan,rows\)/);
 assert.match(client,/type==="BLUEPRINT_DEFINITION"/);
 assert.match(client,/String\(x\?\.kind\|\|""\)\.toUpperCase\(\)===String\(claim\.definitionKind\|\|""\)\.toUpperCase\(\)/);
 assert.match(client,/Location 不得綁 BLUEPRINT_DEFINITION/);
 assert.match(client,/allowedHistoryRefs=\(state\.world\?\.history\|\|\[\]\)/)
});

test("v0.54.11 report separates background network interruption from product AI failure",()=>{
 const started=1000,ended=6000;
 const report=buildAutotestReport({
  config:{worldCount:1,maxTurns:1},
  worlds:[{index:1,status:"COMPLETED",phase:"PLAY",turns:1,stopReason:"TURN_LIMIT",actions:[],generation:null}],
  startedAt:started,endedAt:ended,
  telemetry:[
   {at:1500,type:"AUTOTEST_VISIBILITY_HIDDEN",data:{}},
   {at:2500,type:"AI_CALL_FAILED",data:{task:"action",provider:"agnes",error:"Failed to fetch"}},
   {at:3500,type:"AUTOTEST_VISIBILITY_VISIBLE",data:{hiddenDurationMs:2000}}
  ]
 });
 assert.equal(report.summary.aiFailures,0);
 assert.equal(report.summary.aiBackgroundInterruptions,1);
 assert.equal(report.summary.stageBreakdown.action.backgroundInterruptions,1);
 assert.equal(report.issues.some(x=>x.type==="TELEMETRY_AI_CALL_FAILED"),false)
});

test("v0.54.11 app retries uncommitted autotest decision after background interruption",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/AUTOTEST_VISIBILITY_HIDDEN/);
 assert.match(app,/AUTOTEST_VISIBILITY_VISIBLE/);
 assert.match(app,/AUTOTEST_EXTERNAL_BACKGROUND_INTERRUPTION/);
 assert.match(app,/if\(!row\.decision&&autotestBackgroundAffected\(e\)\)/);
 assert.match(app,/await waitForAutotestVisible\(\);turn--;continue/)
});
