import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeWorldEvaluation} from "../src/world-quality.js";
import {validateSceneProvenance} from "../src/scene-provenance.js";
import {evaluateOriginOpeningCompliance} from "../src/origin-opening-compliance.js";
import {originOpeningContract} from "../src/origin-runtime.js";
import {groundStatePatch} from "../src/state-sync.js";
import {repairStatePatchCandidate} from "../src/ai-output-repair.js";
import {fastTurnStateSnapshot} from "../src/turn-compiler.js";
import {repairPlayerLocation} from "../src/world-registry.js";
import {providerRateLimitPolicy,providerTokenBudget} from "../src/ai-settings.js";
import {buildAutotestReport,autotestStateFingerprint,autotestProgressFingerprint} from "../src/ai-autotest.js";
import {APP_VERSION} from "../src/version.js";

test("v0.61.7 keeps canonical current location internal while unknown presentation stays separate",()=>{
 const s={player:{location:"眼前的陌生地點",locationId:"LOC-1"},world:{state:{location:"鐵棘村東側牧草棚",locationId:"LOC-1"},registry:{locations:[{id:"LOC-1",name:"鐵棘村東側牧草棚",known:false,region:"鐵棘村"}],npcs:[],factions:[],sideQuests:[]}}};
 repairPlayerLocation(s);
 assert.notEqual(s.player.location,"鐵棘村東側牧草棚");
 assert.equal(s.player.locationId,"LOC-1");
 assert.equal(s.world.state.location,"鐵棘村東側牧草棚");
 assert.equal(s.world.state.locationId,"LOC-1");
});

test("v0.61.7 quality evaluator accepts overallScore dimensionScores and repair aliases",()=>{
 const raw={overallScore:52,dimensionScores:{internalConsistency:62,originality:74},findings:[{severity:"HIGH",dimension:"internalConsistency",finding:"Canon conflict",recommendedRepair:"Repair canon",targetId:"LOC-1"}]};
 const out=normalizeWorldEvaluation(raw);
 assert.equal(out.overall,52);assert.equal(out.dimensions.internalConsistency,62);
 assert.equal(out.findings[0].targetType,"internalConsistency");assert.equal(out.findings[0].problem,"Canon conflict");assert.deepEqual(out.findings[0].targetIds,["LOC-1"]);
});

test("v0.61.7 scene provenance rejects an invented generic NPC when nobody is present",()=>{
 const out=validateSceneProvenance({narrative:"一位老者忽然睜開眼睛，向你開口。",sceneTitle:"陌生老者"},{currentLocation:"眼前的陌生地點",presentNpcNames:[],allNpcNames:[],knownLocations:[],visibleEventTexts:[]});
 assert.equal(out.valid,false);assert.ok(out.issues.some(x=>x.type==="NPC_NOT_PRESENT_GENERIC"));
});

test("v0.61.7 Agnes structured budgets and adaptive penalty match observed free-tier failures",()=>{
 assert.equal(providerTokenBudget("agnes","standard","core_rules",900),6000);
 assert.equal(providerTokenBudget("agnes","standard","society",1400),2600);
 assert.equal(providerTokenBudget("agnes","standard","runtime_quality",1300),2400);
 const policy=providerRateLimitPolicy("agnes");assert.equal(policy.spacingMs,4000);assert.equal(policy.penaltySpacingMs,6000);assert.equal(policy.penaltyMs,300000);
});

test("v0.61.7 debug report has explicit version timestamp session and world identifiers",()=>{
 const report=buildAutotestReport({config:{worldCount:1},worlds:[{index:1,status:"COMPLETED",phase:"GENERATION",turns:0,stopReason:"WORLD_GENERATED",summary:{worldId:"WORLD-1"},actions:[]}],telemetry:[],startedAt:1000,endedAt:2000});
 assert.equal(report.version,APP_VERSION);assert.equal(report.timestamp,new Date(2000).toISOString());assert.equal(report.session.id,"UNKNOWN");assert.deepEqual(report.world.ids,["WORLD-1"]);
});

test("v0.61.7 UI and compiler contracts cover the debug root causes",async()=>{
 const [app,ai,client]=await Promise.all([readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")]);
 assert.match(app,/providerRateLimitSnapshot/);assert.match(app,/PLAYER_ACTION_BLOCKED_RATE_LIMIT/);assert.match(app,/AUTOTEST_RATE_LIMIT_WAIT/);assert.match(app,/PLAYER_ACTION_FLIGHT_FINISHED_UI_STILL_LOCKED/);
 assert.match(ai,/penaltySpacingMs:6000/);assert.match(ai,/task==="turn_state_fast"\)return 12000/);
 assert.match(client,/CORE_RULES",\{[\s\S]*?timeoutMs:75000[\s\S]*?maxOutputTokens:6000/);assert.match(client,/SOCIETY",\{[\s\S]*?maxOutputTokens:2600/);assert.match(client,/const originEvaluatorArgs=openingHook=>\(\{timeoutMs:35000/);assert.match(client,/fallbackSemantic=await resilientWorldStage\("ORIGIN_OPENING_COMPLIANCE",originEvaluatorArgs\(geography\.openingHook\)/);
});

test("v0.61.7 report ignores repeated combat attacks when state keeps progressing",()=>{
 const actions=Array.from({length:5},(_,i)=>({turn:i+1,decision:{mode:"combat",action:"attack",combatAction:"attack"},beforeFingerprint:`hp:${10-i}`,afterFingerprint:`hp:${9-i}`,error:""}));
 const report=buildAutotestReport({config:{worldCount:1},worlds:[{index:1,status:"COMPLETED",phase:"PLAY",turns:5,stopReason:"TURN_LIMIT",summary:{worldId:"W"},generation:{diagnostics:{quality:"HEALTHY",stages:{}}},actions}],telemetry:[],startedAt:1000,endedAt:2000});
 assert.equal(report.issues.some(x=>x.type==="REPETITIVE_ACTION_LOOP"),false);
});

test("v0.61.7 Origin evaluator unwraps openingHookCheck instead of discarding valid semantics",()=>{
 const narrativeIdentity={coreTension:"DISPLACEMENT",requiredSignals:["OUTSIDER_COGNITIVE_DISCONTINUITY"],forbiddenSignals:["INSTANT_BELONGING"],proseContract:{}};
 const out=evaluateOriginOpeningCompliance({openingHook:"陌生的冷風掠過皮膚，你只能從眼前裂隙與紫霧重新判斷自己身在何處。",originOpening:{worldNameKnown:false,spawnPolicy:"UNREGISTERED_ARRIVAL",equipmentPolicy:"NONE",narrativeIdentity},reported:{openingHookCheck:{coreTension:{type:"DISPLACEMENT",status:"PASS",evidence:"熟悉環境已斷裂"},requiredSignals:[{signal:"OUTSIDER_COGNITIVE_DISCONTINUITY",status:"PASS",evidence:"只能重新觀察"}],forbiddenSignals:[{signal:"INSTANT_BELONGING",status:"ABSENT",evidence:"沒有本地歸屬"}],notes:["semantic evaluator ok"]}}});
 assert.equal(out.status,"PASS");assert.equal(out.coreTension.status,"PASS");assert.equal(out.requiredSignals.passed,1);assert.equal(out.forbiddenSignals.violations,0);
});

test("v0.61.7 Origin runtime recovers narrative identity from World Creation contract",()=>{
 const narrativeIdentity={coreTension:"DISPLACEMENT",requiredSignals:["OUTSIDER_COGNITIVE_DISCONTINUITY"],forbiddenSignals:["INSTANT_BELONGING"],proseContract:{}};
 const state={player:{origin:{id:"WC2_CROSSING",knowledgePolicy:"EARTH_ONLY",languagePolicy:"UNKNOWN",legalStatus:"NONE",openingBias:"ARRIVAL_ANOMALY"}},world:{creation:{difficultyRules:{languageBarrier:"STANDARD"},originProfile:{narrativeIdentity}},seed:{creationV2:{}},registry:{locations:[],npcs:[],factions:[],sideQuests:[]}}};
 const contract=originOpeningContract(state);assert.deepEqual(contract.narrativeIdentity,narrativeIdentity);assert.deepEqual(state.player.origin.narrativeIdentity,narrativeIdentity);
});

test("v0.61.7 current LOCATION remains observable when player-facing alias hides its canonical name",()=>{
 const state={player:{location:"眼前的裂隙"},world:{state:{location:"天穹裂縫邊緣的懸崖斷面",locationId:"LOC-1"},registry:{locations:[{id:"LOC-1",name:"天穹裂縫邊緣的懸崖斷面",known:false}],npcs:[],factions:[],sideQuests:[]}}};
 const out=groundStatePatch(state,{baseRevision:3,operations:[{op:"DISCOVER_FACT",title:"紫色痕跡",text:"紫霧沿岩縫規律脈動。",factId:"LOC-1-pulse",evidenceType:"EXAMINED",sourceKind:"LOCATION",sourceId:"LOC-1"}]},{action:"仔細檢查眼前的裂隙",roll:{success:true},evidencePhase:"STATE_PENDING"});
 assert.equal(out.rejected.length,0);assert.equal(out.patch.operations.length,1);assert.equal(out.patch.operations[0].sourceId,"LOC-1");
});

test("v0.61.7 state repair can bind REVEAL_ENTITY from director registry hidden from player snapshot",()=>{
 const fixed=repairStatePatchCandidate({baseRevision:4,operations:[{op:"REVEAL_ENTITY",kind:"location",id:"LOC-1"}]},{plan:{baseRevision:4,capabilities:["REVEAL_ENTITY"]},snapshot:{registry:{locations:[],npcs:[],factions:[],sideQuests:[]},directorRegistry:{locations:[{id:"LOC-1",name:"天穹裂縫邊緣的懸崖斷面"}],npcs:[],factions:[]}}});
 assert.equal(fixed.value.operations.length,1);assert.equal(fixed.value.operations[0].id,"LOC-1");assert.equal(fixed.dropped.length,0);
});

test("v0.61.7 FAST state snapshot carries internal director registry only for entity/travel grounding",()=>{
 const snapshot=fastTurnStateSnapshot({stateRevision:4,world:{name:"UNKNOWN",location:"眼前的裂隙"},player:{location:"眼前的裂隙"},registry:{locations:[],npcs:[],factions:[],sideQuests:[]},directorRegistry:{locations:[{id:"LOC-1",name:"真實地點"}],npcs:[],factions:[]}}, {capabilities:["REVEAL_ENTITY"]});
 assert.equal(snapshot.directorRegistry.locations[0].id,"LOC-1");
});

test("v0.61.7 scene provenance allows explicit negative/exploratory mentions of an unconfirmed passage",()=>{
 const out=validateSceneProvenance({narrative:"你沿著裂隙邊緣仔細搜尋，卻只見粗糙岩壁，並未見階梯或安全通道。",sceneTitle:"紫霧未散"},{currentLocation:"眼前的裂隙",locationDescription:"粗糙岩壁與淡紫色霧氣包圍裂隙。",presentNpcNames:[],allNpcNames:[],knownLocations:["眼前的裂隙"],visibleEventTexts:[]});
 assert.equal(out.valid,true);assert.equal(out.issues.length,0);
});

test("v0.61.7 progress fingerprint ignores bookkeeping events while diagnostic fingerprint still records them",()=>{
 const base={world:{id:"W",registry:{npcs:[],locations:[],sideQuests:[]}},player:{location:"L",hp:10,status:"OK",level:1,xp:0,knowledgeScore:0},quests:{main:{stage:0,status:"ACTIVE",objectives:[]}},inventory:[],knowledge:[],events:[],discoveries:0,combat:{active:false}};
 const changed=structuredClone(base);changed.events.push({type:"TICK"});assert.notEqual(autotestStateFingerprint(base),autotestStateFingerprint(changed));assert.equal(autotestProgressFingerprint(base),autotestProgressFingerprint(changed));
});

test("v0.61.7 degraded-but-finished world still counts as executed/completed",()=>{
 const report=buildAutotestReport({config:{worldCount:1},worlds:[{index:1,status:"DEGRADED",phase:"PLAY",turns:1,stopReason:"TURN_LIMIT",summary:{worldId:"W",coherence:{status:"PASS",issues:[],quality:{status:"PASS"}}},generation:{diagnostics:{quality:"HEALTHY",stages:{}}},actions:[{turn:1,beforeProgressFingerprint:"A",afterProgressFingerprint:"B",decision:{action:"觀察"},error:""}]}],telemetry:[],startedAt:1000,endedAt:2000});
 assert.equal(report.summary.worldsExecuted,1);assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsDegraded,1);
});

test("v0.61.7 autotest finalizer exposes incomplete settlement instead of silently reporting completed",async()=>{
 const [app,autotest]=await Promise.all([readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-autotest.js",import.meta.url),"utf8")]);
 assert.match(app,/AUTOTEST_FINALIZATION_INCOMPLETE/);assert.match(app,/waitForAutotestRuntimeExpansion/);assert.match(app,/autotestProgressFingerprint/);assert.match(app,/result\.status="DEGRADED"/);assert.match(autotest,/\["COMPLETED","DEGRADED"\]\.includes/);
});