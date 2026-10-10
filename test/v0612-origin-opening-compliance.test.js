import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {ORIGIN_PRESETS,createWorldCreationDraft,compileWorldCreation} from "../src/world-creation.js";
import {originOpeningContract} from "../src/origin-runtime.js";
import {evaluateOriginOpeningCompliance,fallbackOriginCompliance} from "../src/origin-opening-compliance.js";
import {autotestWorldSummary,autotestWorldCoherence,buildAutotestReport} from "../src/ai-autotest.js";

const expectedTensions={
 crossing:"DISPLACEMENT",reincarnation:"CONTINUITY_WITH_LIMITS",summoned:"DEPENDENCY_AND_AGENDA",
 possession:"IDENTITY_ASYMMETRY",native:"NORMALCY_DISRUPTED",amnesia:"SELF_UNCERTAINTY",custom:"CUSTOM_DEFINED"
};
function complianceFor(ni,{array=false}={}){
 const required=array?ni.requiredSignals.map(signal=>({signal,status:"PASS",evidence:"opening evidence"})):Object.fromEntries(ni.requiredSignals.map(signal=>[signal,"PASS"]));
 const forbidden=array?ni.forbiddenSignals.map(signal=>({signal,status:"ABSENT",evidence:""})):Object.fromEntries(ni.forbiddenSignals.map(signal=>[signal,{status:"ABSENT",evidence:""}]));
 return {epistemic:"PASS",worldState:{status:"PASS"},openingLegality:"PASS",narrativeIdentity:{status:"PASS",requiredSignals:required,forbiddenSignals:forbidden}}
}

test("v0.61.2 every Origin keeps a distinct Narrative Identity Contract",()=>{
 for(const [id,tension] of Object.entries(expectedTensions)){
  const row=ORIGIN_PRESETS[id];assert.equal(row.narrativeIdentity.coreTension,tension,id);
  assert.ok(row.narrativeIdentity.requiredSignals.length>=1,id);assert.ok(row.narrativeIdentity.proseContract?.mustShow,id)
 }
});

test("v0.61.2 compiled Origin Profile carries Narrative Identity into Opening Contract",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft({originType:"summoned",playerRole:"ordinary",difficulty:"normal",masterSeed:"origin-test"}));
 const origin=seed.creationV2.originProfile;assert.equal(origin.narrativeIdentity.coreTension,"DEPENDENCY_AND_AGENDA");
 assert.ok(origin.narrativeIdentity.requiredSignals.includes("SUMMONING_WORLD_TRACE"));
 const state={player:{origin},world:{creation:seed.creationV2,state:{day:1}}},contract=originOpeningContract(state);
 assert.equal(contract.narrativeIdentity.coreTension,"DEPENDENCY_AND_AGENDA");
 assert.ok(contract.spawnPolicy);assert.ok(contract.equipmentPolicy)
});

test("v0.61.2 Origin evaluator accepts string PASS and object-map/array signal reports",()=>{
 const ni=ORIGIN_PRESETS.summoned.narrativeIdentity,originOpening={worldNameKnown:false,calendarKnown:false,spawnPolicy:"SUMMONING_EVENT",equipmentPolicy:"SPONSOR_DEPENDENT",narrativeIdentity:ni};
 for(const array of [false,true]){
  const report=evaluateOriginOpeningCompliance({openingHook:"你腳邊仍有未冷卻的召喚刻痕，材料焦黑，門外留下急促腳步與被移走器材的痕跡。你可以檢查刻痕、追查腳步或先確認出口。",originOpening,playerOrigin:{narrativeIdentity:ni},anchor:{worldName:"秘密世界",hiddenFacts:["真正秘密"]},reported:complianceFor(ni,{array})});
  assert.equal(report.valid,true,report.errors.join(","))
 }
});

test("v0.61.2 Origin evaluator blocks missing required and present forbidden narrative signals",()=>{
 const ni=ORIGIN_PRESETS.possession.narrativeIdentity,originOpening={worldNameKnown:false,calendarKnown:false,spawnPolicy:"HOST_LOCATION",equipmentPolicy:"HOST_EXISTING",narrativeIdentity:ni},reported=complianceFor(ni);
 reported.narrativeIdentity.requiredSignals.HOST_HAS_PREEXISTING_SOCIAL_TRACE="FAIL";
 reported.narrativeIdentity.forbiddenSignals.FULL_HOST_MEMORY={status:"PRESENT",evidence:"opening explains every host memory"};
 const report=evaluateOriginOpeningCompliance({openingHook:"你醒來後察覺身上的衣物和手掌舊繭十分陌生，房間裡的物件卻留下長期生活的痕跡。",originOpening,playerOrigin:{narrativeIdentity:ni},anchor:{},reported});
 assert.equal(report.valid,false);assert.ok(report.errors.some(x=>x.includes("NARRATIVE_REQUIRED_SIGNAL:HOST_HAS_PREEXISTING_SOCIAL_TRACE")));assert.ok(report.errors.some(x=>x.includes("NARRATIVE_FORBIDDEN_SIGNAL:FULL_HOST_MEMORY")))
});

test("v0.61.2 historical Origin signal names are restored",()=>{
 assert.deepEqual(ORIGIN_PRESETS.crossing.narrativeIdentity.requiredSignals,["OUTSIDER_COGNITIVE_DISCONTINUITY"]);
 assert.deepEqual(ORIGIN_PRESETS.reincarnation.narrativeIdentity.requiredSignals,["PREEXISTING_LOCAL_LIFE"]);
 assert.deepEqual(ORIGIN_PRESETS.summoned.narrativeIdentity.requiredSignals,["SUMMONING_WORLD_TRACE"]);
 assert.deepEqual(ORIGIN_PRESETS.summoned.narrativeIdentity.forbiddenSignals,["SUMMONER_CLAIM_AS_CANON","UNCAUSED_RANDOM_ARRIVAL"]);
 assert.deepEqual(ORIGIN_PRESETS.possession.narrativeIdentity.requiredSignals,["HOST_HAS_PREEXISTING_SOCIAL_TRACE"]);
 assert.deepEqual(ORIGIN_PRESETS.amnesia.narrativeIdentity.forbiddenSignals,["TOTAL_COGNITIVE_RESET","CONVENIENT_MEMORY_RESTORE","AMNESIA_AS_CANON_PATCH"]);
});

test("v0.61.2 semantic evaluator fallback is explicit PARTIAL instead of silent PASS",()=>{
 const ni=ORIGIN_PRESETS.amnesia.narrativeIdentity,originOpening={spawnPolicy:"MEMORY_GAP",equipmentPolicy:"UNKNOWN_EXISTING",narrativeIdentity:ni};
 const semantic=fallbackOriginCompliance(originOpening,"AI_TIMEOUT"),report=evaluateOriginOpeningCompliance({openingHook:"你記得自己的名字，但名字背後仍是一片空白；腳邊舊物留下長期使用痕跡，出口與風聲都能立刻檢查。",originOpening,playerOrigin:{narrativeIdentity:ni},anchor:{},reported:semantic,semanticSource:"FALLBACK",semanticError:"AI_TIMEOUT"});
 assert.equal(report.status,"PARTIAL");assert.equal(report.valid,true);assert.equal(report.semanticSource,"FALLBACK");assert.match(report.semanticError,/AI_TIMEOUT/);
});

test("v0.61.2 Autotest preserves Origin Opening Compliance in summary and coherence",()=>{
 const compliance={status:"PARTIAL",semanticSource:"FALLBACK",semanticError:"AI_TIMEOUT",errors:[],coreTension:{type:"SELF_UNCERTAINTY",status:"PARTIAL",evidence:""},requiredSignals:{passed:0,total:1,rows:[]},forbiddenSignals:{violations:0,total:3,rows:[]}};
 const state={world:{id:"W",name:"N",state:{day:1,clock:{totalMinutes:0}},registry:{npcs:[],locations:[]},generationClaims:{claims:[]},catalog:{},quality:{status:"PASS"},originOpeningCompliance:compliance},player:{status:"ALIVE",hp:10,level:1,knowledgeScore:0,survival:{}},quests:{main:{}},inventory:[],knowledge:[],events:[]};
 const summary=autotestWorldSummary(state),coherence=autotestWorldCoherence(state);
 assert.equal(summary.originOpeningCompliance.status,"PARTIAL");assert.equal(coherence.originOpeningCompliance.status,"PARTIAL");assert.ok(coherence.issues.some(x=>x.type==="ORIGIN_OPENING_COMPLIANCE_PARTIAL"));
});

test("v0.61.2 Autotest aggregates Origin compliance PASS FAIL PARTIAL",()=>{
 const worlds=["PASS","FAIL","PARTIAL"].map((status,i)=>({index:i+1,status:"COMPLETED",phase:"PLAY",turns:1,summary:{originOpeningCompliance:{status},coherence:{status:"PASS",issues:[],quality:{}}},actions:[]}));
 const report=buildAutotestReport({config:{worldCount:3,totalWorldCount:3},worlds,telemetry:[],startedAt:1,endedAt:2});
 assert.deepEqual(report.summary.originOpeningCompliance,{evaluated:3,pass:1,fail:1,partial:1});
 assert.equal(report.worlds[0].status,"COMPLETED");assert.equal(report.worlds[1].status,"DEGRADED");assert.equal(report.worlds[2].status,"DEGRADED");
});

test("v0.61.2 finalized Origin compliance report can be revalidated at World Engine commit",()=>{
 const ni=ORIGIN_PRESETS.amnesia.narrativeIdentity,originOpening={worldNameKnown:false,calendarKnown:false,spawnPolicy:"MEMORY_GAP",equipmentPolicy:"UNKNOWN_EXISTING",narrativeIdentity:ni};
 const semantic=complianceFor(ni,{array:true});semantic.narrativeIdentity.coreTension={type:ni.coreTension,status:"PASS",evidence:"身份與過去不確定"};
 const first=evaluateOriginOpeningCompliance({openingHook:"你記得自己的名字，但名字背後仍是一片空白；腳邊舊物留下長期使用痕跡，出口與風聲都能立刻檢查。",originOpening,playerOrigin:{narrativeIdentity:ni},anchor:{},reported:semantic,semanticSource:"AI"});
 assert.equal(first.status,"PASS");const second=evaluateOriginOpeningCompliance({openingHook:"你記得自己的名字，但名字背後仍是一片空白；腳邊舊物留下長期使用痕跡，出口與風聲都能立刻檢查。",originOpening,playerOrigin:{narrativeIdentity:ni},anchor:{},reported:first,semanticSource:first.semanticSource});
 assert.equal(second.status,"PASS");assert.equal(second.requiredSignals.passed,first.requiredSignals.passed);assert.equal(second.forbiddenSignals.violations,0);
});

test("v0.61.2 direct and server world generation both enforce four-layer Origin Opening Compliance",async()=>{
 const [client,server,engine]=await Promise.all([readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/world.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8")]);
 for(const source of [client,server]){
  assert.match(source,/Epistemic Contract/);assert.match(source,/World-State Contract/);assert.match(source,/Opening Legality Contract/);assert.match(source,/Narrative Identity Contract/);
  assert.match(source,/originComplianceSchema\(originOpening\)/);assert.match(source,/evaluateOriginOpeningCompliance/)
 }
 assert.match(server,/known 必須為 false/);assert.doesNotMatch(server,/known 必須為 true/);
 assert.match(engine,/PLAYER_ORIGIN_NARRATIVE_INVALID/);assert.match(engine,/C-013/)
});


test("v0.61.6 old saves recover Origin Narrative Identity from Blueprint authority",()=>{
 const ni=ORIGIN_PRESETS.possession.narrativeIdentity,state={player:{origin:{id:"WC2_POSSESSION",label:"附身",knowledgePolicy:"HOST_FRAGMENTED",languagePolicy:"HOST_DEPENDENT",legalStatus:"HOST_IDENTITY",openingBias:"IDENTITY_CONFLICT"}},world:{creation:{blueprintProfile:{origin:{narrativeIdentity:structuredClone(ni)}},originProfile:{id:"WC2_POSSESSION"}},state:{day:1}}};
 const contract=originOpeningContract(state);
 assert.equal(contract.narrativeIdentity.coreTension,"IDENTITY_ASYMMETRY");
 assert.deepEqual(state.player.origin.narrativeIdentity.requiredSignals,["HOST_HAS_PREEXISTING_SOCIAL_TRACE"]);
 assert.equal(state.world.creation.originProfile.narrativeIdentity.coreTension,"IDENTITY_ASYMMETRY");
});
