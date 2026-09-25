import test from "node:test";
import assert from "node:assert/strict";
import {playerVisibleLocationName,playerVisibleLocationRecord} from "../src/player-location-visibility.js";
import {helperSnapshot} from "../src/helper-context.js";
import {buildSnapshot} from "../src/adventure-engine.js";
import {buildContextualActionSet} from "../src/contextual-actions.js";
import {revealRegistryEntities} from "../src/world-registry.js";
import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";
import {autotestDifficultyPlan,buildAutotestReport,AUTOTEST_DIFFICULTIES} from "../src/ai-autotest.js";
import {readFile} from "node:fs/promises";

function state(){return {world:{id:"W",name:"秘界",state:{day:1,region:"北境",clock:{day:1,hour:8,minute:0,totalMinutes:0},location:"裂霧庭",flags:{}},registry:{locations:[{id:"L0",name:"裂霧庭",type:"裂谷",region:"北境",description:"石階後有一道狹長裂隙，冷風從縫中湧出。",known:false,visibilityLock:"OBSERVED",worldState:{safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]}}],npcs:[],factions:[],sideQuests:[]},canon:{facts:[]},travel:{version:1,routes:[]},creation:{blueprint:{difficulty:"normal"},difficultyRules:{id:"normal"}},seedContract:{},weather:{},bible:{weatherSystem:{phenomena:[]}},economy:{},quality:{}},player:{name:"旅人",location:"裂霧庭",hp:100,maxHp:100,level:1,xp:0,knowledgeScore:0,wallet:{},calendarKnown:false,worldNameKnown:false,difficulty:"normal",origin:{}},inventory:[],knowledge:[],events:[],quests:{main:{title:"確認去向",objectives:["找出可驗證的出口"],stage:0,status:"ACTIVE"}},suggestions:[],suggestionIntents:[],discoveries:0,runtimeSummary:"",companions:[]}}

test("unknown current canonical location projects observable alias until evidence unlock",()=>{
 const s=state(),alias=playerVisibleLocationName(s);assert.notEqual(alias,"裂霧庭");assert.match(alias,/裂隙|陌生/);assert.equal(playerVisibleLocationRecord(s).known,false);
 const helper=helperSnapshot(s);assert.equal(helper.player.location,alias);assert.equal(helper.world.currentLocation.name,alias);assert.ok(!JSON.stringify(helper).includes("裂霧庭"));
 const snap=buildSnapshot(s),scene=sceneTurnSnapshot(snap);assert.equal(snap.world.location,alias);assert.equal(scene.world.location,alias);assert.ok(!JSON.stringify(scene).includes("裂霧庭"));
 const set=buildContextualActionSet(s,[]);assert.ok(set.all.length>0);assert.ok(set.all.every(x=>!String(x.action||"").includes("裂霧庭")&&!String(x.label||"").includes("裂霧庭")));
 const loc=s.world.registry.locations[0];assert.equal(revealRegistryEntities(s,[{kind:"location",id:loc.id}],{enforceCausality:true,actionKind:"OBSERVE",verifiedEvidenceCount:0}).length,0);assert.equal(loc.known,false);
 assert.equal(revealRegistryEntities(s,[{kind:"location",id:loc.id}],{enforceCausality:true,actionKind:"OBSERVE",verifiedEvidenceCount:1}).length,1);assert.equal(loc.known,true);assert.equal(playerVisibleLocationName(s),"裂霧庭")
});

test("scene narrator contract is concise grounded POV-safe and non-report-like",async()=>{
 const prompt=sceneNarratorSystem();assert.match(prompt,/1–3 句/);assert.match(prompt,/旅程小結/);assert.match(prompt,/不代表 NPC 信任、任務、物品或知識一定改變/);assert.match(prompt,/未知 canonical 地名/);assert.match(prompt,/自然繁體中文/);assert.match(prompt,/不得無中生有新線索/);
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.doesNotMatch(app,/state\.narrative=.*旅程小結/)
});

test("autotest difficulty plan covers current explicit and full matrix deterministically",()=>{
 assert.deepEqual(AUTOTEST_DIFFICULTIES,["easy","normal","hard","realistic"]);assert.deepEqual(autotestDifficultyPlan({worldCount:2,difficultyMode:"CURRENT",currentDifficulty:"hard"}).map(x=>x.difficulty),["hard","hard"]);
 const matrix=autotestDifficultyPlan({worldCount:2,difficultyMode:"ALL",currentDifficulty:"normal"});assert.equal(matrix.length,8);for(const id of AUTOTEST_DIFFICULTIES)assert.equal(matrix.filter(x=>x.difficulty===id).length,2);assert.deepEqual(autotestDifficultyPlan({worldCount:1,difficultyMode:"realistic"}).map(x=>x.difficulty),["realistic"])
});

test("autotest report groups execution by difficulty",()=>{
 const worlds=[{index:1,difficulty:"easy",status:"COMPLETED",phase:"PLAY",turns:3,stopReason:"TURN_LIMIT",actions:[{worldIndex:1,turn:1,beforeFingerprint:"a",afterFingerprint:"b"},{worldIndex:1,turn:2,beforeFingerprint:"b",afterFingerprint:"c"},{worldIndex:1,turn:3,beforeFingerprint:"c",afterFingerprint:"d"}],generation:{diagnostics:{quality:"HEALTHY",stages:{}}}},{index:2,difficulty:"hard",status:"FAILED",phase:"GENERATION",turns:0,error:"boom",actions:[],generation:{diagnostics:{quality:"HEALTHY",stages:{}}}}];
 const report=buildAutotestReport({config:{worldCount:1,worldsPerDifficulty:1,totalWorldCount:2,difficultyMode:"ALL"},worlds,telemetry:[],startedAt:1,endedAt:2});assert.equal(report.summary.worldsRequested,2);assert.equal(report.summary.byDifficulty.easy.worldsCompleted,1);assert.equal(report.summary.byDifficulty.easy.turns,3);assert.equal(report.summary.byDifficulty.hard.worldsFailed,1);assert.ok(report.summary.byDifficulty.hard.issues>=1);assert.equal(report.worlds[0].difficulty,"easy")
});

test("developer autotest wires selected difficulty into each generated world and grouped UI",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/id="autotestDifficultyMode"/);assert.match(app,/autotestDifficultyPlan/);assert.match(app,/raw\.difficulty=difficulty/);assert.match(app,/totalWorldCount:difficultyPlan\.length/);assert.match(app,/summary\.byDifficulty/)
});
