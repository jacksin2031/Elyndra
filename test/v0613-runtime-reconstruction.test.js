import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration,repairPlayerLocation} from "../src/world-registry.js";
import {playerVisibleLocationRecord} from "../src/player-location-visibility.js";
import {playerVisibleLocationRecord as hotfixVisibleLocationRecord,projectPlayerVisibleLocationName} from "../src/v06011-player-location-hotfix.js";
import {validateSceneProvenance} from "../src/scene-provenance.js";
import {compileWorldGenesis,evaluateWorldGenesis,attachWorldGenesis} from "../src/world-genesis-evaluator.js";
import {planLazyGeneration,commitLazyGeneration,reconcileLazyGenerationLifecycle,failLazyGenerationTerminal} from "../src/lazy-generation.js";
import {parseMagicLaw,resolveMagicAction,magicActionModifier} from "../src/magic-engine.js";
import {isLocationTypeInstruction,repairWorldStageCandidate} from "../src/ai-output-repair.js";
import {simplifiedChineseLeak} from "../src/traditional-chinese-guard.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:2,playHours:12,prompt:"v0.61.3 runtime reconstruction fixture"};
const runtimeState=()=>newGame(seed);

test("location type prompt instructions cannot enter Canon through a direct registry call",()=>{
 for(const type of ["具體地點用途或形態；不得輸出「地點類型」","具體用途／形態","Location type"]){
  const state=runtimeState(),before=structuredClone(state.world.registry);
  assert.throws(()=>canonizeGeneration(state,{locations:[{name:"測試碼頭",description:"潮水拍打碼頭石壁。",type}]}),/LOCATION_TYPE_INSTRUCTION/);
  assert.deepEqual(state.world.registry,before);
 }
 const state=runtimeState();
 const location=canonizeGeneration(state,{locations:[{name:"測試碼頭",description:"潮水拍打碼頭石壁。",type:"河岸碼頭"}]}).locations[0];
 assert.equal(location.type,"河岸碼頭");
});

test("v0.61.3 scene grounding accepts a present multiword Unicode speaker and generic Narrator",()=>{
 const scope={currentLocation:"北門",presentNpcNames:["Alice Smith","ミラ・カワセ"],allNpcNames:["Alice Smith","ミラ・カワセ"],knownLocations:["北門"]};
 const alice=validateSceneProvenance({narrative:"Alice Smith: The wind shifts near the gate."},scope);
 const japanese=validateSceneProvenance({narrative:"ミラ・カワセ：風向きが変わった。"},scope);
 const narrator=validateSceneProvenance({narrative:"Narrator: A faint bell sounds beyond the wall."},{...scope,presentNpcNames:[],allNpcNames:[]});
 assert.equal(alice.valid,true,JSON.stringify(alice.issues));assert.equal(japanese.valid,true,JSON.stringify(japanese.issues));assert.equal(narrator.valid,true,JSON.stringify(narrator.issues));
});

test("v0.61.3 scene grounding rejects an absent multiword speaker and ignores a clock prefix",()=>{
 const absent=validateSceneProvenance({narrative:"Alice Smith: I have been waiting."},{currentLocation:"北門",presentNpcNames:[],allNpcNames:["Alice Smith"]});
 const clock=validateSceneProvenance({narrative:"08:30 — the log records a bell from outside."},{currentLocation:"北門",presentNpcNames:[],allNpcNames:[]});
 assert.ok(absent.issues.some(row=>row.type==="UNKNOWN_SPEAKER"&&row.value==="Alice Smith"));assert.equal(clock.valid,true,JSON.stringify(clock.issues));
});

test("v0.61.3 player location repair synchronizes canonical IDs without exposing an unknown canonical name",()=>{
 const state=runtimeState(),added=canonizeGeneration(state,{locations:[{name:"霧隙秘站",type:"洞穴",region:"北境",description:"洞穴深處的石階仍帶著濕冷痕跡。",known:false}]});
 const location=added.locations[0];state.world.state.region=location.region;state.world.state.location=location.name;state.player.location="未知地點";
 repairPlayerLocation(state);
 assert.equal(state.player.locationId,location.id);assert.equal(state.world.state.locationId,location.id);assert.equal(state.world.state.location,location.name);
 assert.equal(location.known,false);assert.notEqual(state.player.location,location.name);assert.equal(state.player.location,"石階後的陌生區域");
 assert.equal(playerVisibleLocationRecord(state).id,location.id);assert.equal(playerVisibleLocationRecord(state).known,false);assert.equal(playerVisibleLocationRecord(state).name,"石階後的陌生區域");
 assert.equal(hotfixVisibleLocationRecord(state).id,location.id);assert.equal(hotfixVisibleLocationRecord(state).known,false);assert.equal(hotfixVisibleLocationRecord(state).name,"石階後的陌生區域");
});

test("v0.61.3 location projection keeps legacy no-ID saves safe and repairs by canonical name",()=>{
 const state=runtimeState(),added=canonizeGeneration(state,{locations:[{name:"未識別的棧橋",type:"棧橋",region:"北境",description:"木棧橋伸向霧中的水面。",known:false}]});
 const location=added.locations[0];state.player.location="未知地點";delete state.player.locationId;state.world.state.location=location.name;delete state.world.state.locationId;
 repairPlayerLocation(state);
 assert.equal(state.player.locationId,location.id);assert.equal(state.world.state.locationId,location.id);assert.notEqual(state.player.location,location.name);assert.equal(location.known,false);
 const legacy={world:{registry:{locations:[{id:"OLD-LOC",name:"已知舊地點",known:true}]}},player:{location:"已知舊地點"}};
 assert.equal(playerVisibleLocationRecord(legacy).id,"OLD-LOC");
});

test("v0.61.3 locale hotfix keeps unknown fallback and honors explicit projection targets",()=>{
 const legacy={world:{state:{location:"保密地點"},registry:{locations:[{id:"SECRET",name:"保密地點",known:false}]}},player:{location:"UNKNOWN"}};
 assert.equal(hotfixVisibleLocationRecord(legacy).name,"未知地點");
 const state={world:{state:{location:"保密地點",locationId:"SECRET"},registry:{locations:[{id:"SECRET",name:"保密地點",known:false,observableAlias:"眼前的橋邊"},{id:"PUBLIC",name:"白石橋",known:true}]}},player:{location:"眼前的橋邊",locationId:"SECRET"}};
 assert.equal(hotfixVisibleLocationRecord(state).name,"眼前的橋邊");assert.equal(projectPlayerVisibleLocationName(state,"PUBLIC"),"白石橋");
});

test("v0.61.3 World Genesis compiler and evaluator report seven dimensions with meaningful incomplete scores",()=>{
 const blueprint={blueprint:{genesis:{worldShape:"ARCHIPELAGO",routeDensity:"DENSE",historicalDepth:"ANCIENT",mysteryDensity:"HIGH",ancientPowers:1,nomadicPowers:1,independentInstitutions:1,lostCivilizations:2},advanced:{civilizationCount:{value:3},speciesCount:{value:2},languageCount:{value:2}}}},origin={id:"WC2_SUMMONED",knowledgePolicy:"LIMITED",languagePolicy:"UNKNOWN"};
 const plan=compileWorldGenesis(blueprint,origin),candidate={summary:"未完成的創世候選"},report=evaluateWorldGenesis({candidate,blueprint,originProfile:origin}),attached=attachWorldGenesis(candidate,{blueprint,originProfile:origin});
 assert.equal(plan.provenance,"RECONSTRUCTED");assert.equal(plan.topology.worldShape,"ARCHIPELAGO");assert.equal(plan.topology.routeTargets,3);assert.equal(report.provenance,"RECONSTRUCTED");assert.equal(report.checks.length,18);assert.equal(Object.keys(report.dimensions).length,7);
 assert.equal(report.valid,false);assert.ok(report.score<100);assert.ok(report.hardErrors.length>0);assert.equal(candidate.worldGenesisEvaluation,undefined);assert.equal(attached.worldGenesisEvaluation.checks.length,18);
});

test("v0.61.3 terminal lazy failure releases claims and permits a distinct retry epoch",()=>{
 const state=runtimeState(),plan=planLazyGeneration(state,{reason:"PLAYER_REQUEST"}),oldId=plan.id;
 const failed=failLazyGenerationTerminal(state,plan,"LAZY_CHECKPOINT_RESTORE_FAILED:unknown stage");
 assert.equal(failed.ok,true);assert.equal(plan.status,"ABORTED");assert.equal(plan.terminalFailure,true);assert.equal(plan.failureKind,"TERMINAL_CHECKPOINT");assert.equal(plan.checkpoint,undefined);
 const retry=planLazyGeneration(state,{reason:"PLAYER_REQUEST"});assert.notEqual(retry.id,oldId);assert.ok(retry.attemptEpoch>plan.attemptEpoch);assert.equal(plan.status,"ABORTED");
});

test("v0.61.3 lazy lifecycle reconciliation repairs committed plan and replay revision",()=>{
 const state=runtimeState(),plan=planLazyGeneration(state,{reason:"PLAYER_REQUEST"});plan.status="ABORTED";
 state.world.lazyGeneration.commits.push({planId:plan.id,entityRefs:["LOC-COMMITTED"],committedAt:123,replay:{generationRevision:plan.generationRevision}});
 const report=reconcileLazyGenerationLifecycle(state);
 assert.equal(plan.status,"COMMITTED");assert.deepEqual(plan.entityRefs,["LOC-COMMITTED"]);assert.equal(state.world.lazyGeneration.generationRevision,plan.generationRevision);assert.ok(report.reconciledPlanIds.includes(plan.id));
});

test("v0.61.3 first-button recovery reveals only a route-reachable new location",()=>{
 const state=runtimeState(),start=canonizeGeneration(state,{locations:[{name:"北門",type:"關口",region:"北境",description:"北境道路的起點。",known:true}]}).locations[0];
 state.world.state.region=start.region;state.world.state.location=start.name;state.player.location=start.name;state.player.locationId=start.id;state.world.state.locationId=start.id;
 const plan=planLazyGeneration(state,{reason:"FIRST_BUTTON_STALL_RECOVERY"}),generation={locations:[{name:"新側路",type:"道路",region:"北境",description:"可由北門抵達的側路。",known:false,historyRefs:[]}],npcs:[],factions:[],sideQuests:[],definitions:[]};
 const added=canonizeGeneration(state,generation),committed=commitLazyGeneration(state,plan,generation,added),target=added.locations[0];
 assert.equal(committed.ok,true,committed.errors?.join(","));assert.equal(target.known,true);assert.equal(committed.recoveryAffordance.id,target.id);assert.ok(committed.recoveryAffordance.routeIds.length>0);

 const blocked=runtimeState(),blockedStart=canonizeGeneration(blocked,{locations:[{name:"西門",type:"關口",region:"西境",description:"道路的起點。",known:true}]}).locations[0];
 blocked.world.state.region=blockedStart.region;blocked.world.state.location=blockedStart.name;blocked.player.location=blockedStart.name;blocked.player.locationId=blockedStart.id;blocked.world.state.locationId=blockedStart.id;
 const blockedPlan=planLazyGeneration(blocked,{reason:"FIRST_BUTTON_STALL_RECOVERY"}),blockedGeneration={...generation,locations:[{...generation.locations[0],name:"不可達側路",region:"西境"}]},blockedAdded=canonizeGeneration(blocked,blockedGeneration),blockedTarget=blockedAdded.locations[0];
 blocked.world.travel.routes.push({id:"R-CLOSED",fromId:blockedStart.id,toId:blockedTarget.id,open:false});
 const blockedCommit=commitLazyGeneration(blocked,blockedPlan,blockedGeneration,blockedAdded);
 assert.equal(blockedCommit.ok,true,blockedCommit.errors?.join(","));assert.equal(blockedCommit.recoveryAffordance,null);assert.equal(blockedTarget.known,false);
});

function magicState(cost){
 const state=runtimeState();state.world.bible={...(state.world.bible||{}),magicCost:cost};state.player.magic={capacity:100,strain:0,knownSpells:[{id:"S1",name:"火花術",cost:10,effect:"微弱火花"}],attunements:[]};state.player.hp=100;state.world.canon.facts.push({id:"FACT-KEEP",type:"secret",visibility:"hidden",text:"不能刪除的既有 Canon 記憶。",canonical:true});state.knowledge.push({id:"K-KEEP",factId:"FACT-KEEP",status:"UNCONFIRMED",text:"玩家既有記錄"});return state
}

test("v0.61.3 MEMORY_LOSS impairs recall checks but preserves knowledge and Canon",()=>{
 const state=magicState("每次成功施法會失去一段童年記憶"),canon=structuredClone(state.world.canon),knowledge=structuredClone(state.knowledge),contract=parseMagicLaw(state.world.bible.magicCost),result=resolveMagicAction(state,"施法火花術",{success:true});
 assert.deepEqual(contract.effect,{type:"MEMORY_LOSS",amount:1});assert.equal(result.lawExecution.status,"EXECUTED");assert.equal(state.player.magic.memoryBurden,1);assert.ok(magicActionModifier(state,"回想家人的樣子","OBSERVE")<0);
 assert.deepEqual(state.world.canon,canon);assert.deepEqual(state.knowledge,knowledge);assert.equal(result.lawExecution.effects[0].preservedKnowledge,true);
});

test("v0.61.3 CORRUPTION and BODY_COST apply bounded runtime penalties",()=>{
 const corrupted=magicState("成功施法會增加5層腐化"),corruption=parseMagicLaw(corrupted.world.bible.magicCost),corruptionResult=resolveMagicAction(corrupted,"施法火花術",{success:true});
 assert.equal(corruption.effect.type,"CORRUPTION");assert.equal(corrupted.player.magic.corruption,50);assert.ok(magicActionModifier(corrupted,"施法火花術")<0);assert.equal(corruptionResult.lawExecution.status,"EXECUTED");
 const injured=magicState("成功施法會承受10點身體代價"),body=parseMagicLaw(injured.world.bible.magicCost),bodyResult=resolveMagicAction(injured,"施法火花術",{success:true});
 assert.equal(body.effect.type,"BODY_COST");assert.equal(injured.player.survival.injury,10);assert.equal(bodyResult.lawExecution.effects[0].mechanic,"SURVIVAL_INJURY");
});

test("v0.61.3 location type guard filters prompt instructions, supports NFKC slash, and keeps concrete types",()=>{
 const instruction="具體地點用途或形態；不得輸出『地點類型』",slash="具體用途／形態",concrete="石造棧橋";
 assert.equal(isLocationTypeInstruction(instruction),true);assert.equal(isLocationTypeInstruction(slash),true);assert.equal(isLocationTypeInstruction(concrete),false);
 const repaired=repairWorldStageCandidate("GEOGRAPHY",{locations:[{name:"霧橋",type:instruction},{name:"古棧橋",type:concrete}]},{locale:"zh-Hant"});
 assert.equal(repaired.value.locations[0].type,undefined);assert.equal(repaired.value.locations[1].type,concrete);assert.ok(repaired.reasons.includes("LOCATION_TYPE_INSTRUCTION_REMOVED"));
});

test("v0.61.3 Traditional Chinese guard detects Simplified keys and allows English schema keys",()=>{
 const leak=simplifiedChineseLeak({"地点类型":"道路"});
 assert.equal(leak.character,"点");assert.match(leak.path,/\[key:地点类型\]/);assert.equal(simplifiedChineseLeak({locationType:"location type"}),null);
});

test("v0.61.3 runtime consumers use the hotfix location resolver and shared instruction predicate",async()=>{
 const [html,registry,repair,client]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../src/world-registry.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-output-repair.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")]);
 assert.match(html,/"\.\/src\/player-location-visibility\.js\?v=57025":"\.\/src\/v06011-player-location-hotfix\.js\?v=\d+"/);assert.match(registry,/playerVisibleLocationName\(state\)/);assert.match(repair,/export function isLocationTypeInstruction/);assert.match(client,/isLocationTypeInstruction\(v\)/);
});
