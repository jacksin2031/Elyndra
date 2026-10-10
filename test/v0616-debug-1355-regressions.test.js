import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {parseModelJSON} from "../src/model-json.js";
import {validateSceneProvenance,validateSuggestionProvenance} from "../src/scene-provenance.js";
import {questConditionReferenceIssues} from "../src/quest-contracts.js";
import {createGenerationDiagnostics,recordGenerationStage,finalizeGenerationDiagnostics} from "../src/world-quality.js";
import {groundStatePatch} from "../src/state-sync.js";

test("v0.61.6 successful local route discovery is not treated as a foreign scene",()=>{
 const scope={currentLocation:"眼前的陌生地點",knownLocations:[],presentNpcNames:[],allNpcNames:[],action:"沿著地面脈霧匯聚紋理前進，尋找通道斷點。",actionKind:"OBSERVE",rollSuccess:true};
 const narrative="你沿著紋理緩步前行，前方的通道斷點逐漸清晰。";
 const scene=validateSceneProvenance({sceneTitle:"脈霧紋理指向的通道",narrative},scope);
 assert.equal(scene.valid,true);
 const suggestion=validateSuggestionProvenance({kind:"OBSERVE",action:"繼續朝通道斷點前進並確認出口。"},{...scope,visibleEventTexts:[narrative]});
 assert.equal(suggestion.valid,true)
});

test("v0.61.6 still rejects an invented foreign room",()=>{
 const scope={currentLocation:"眼前的裂隙",knownLocations:[],presentNpcNames:[],allNpcNames:[],action:"觀察附近",actionKind:"OBSERVE",rollSuccess:true};
 const out=validateSceneProvenance({narrative:"你移步至石室東側牆壁檢查晶塵。"},scope);
 assert.equal(out.valid,false);assert.ok(out.issues.some(x=>x.type==="SCENE_CONTAINER_UNGROUNDED"&&x.value==="石室"))
});
test("v0.61.6 parser never salvages a nested object from a truncated structured root",()=>{
 const raw='{"npcs":[{"agency":{"want":"x","fear":"y"}} BROKEN';
 assert.throws(()=>parseModelJSON(raw),/INVALID_MODEL_JSON/);
 assert.deepEqual(parseModelJSON('{"ok":true}\n{"extra":1}'),{ok:true});
 assert.deepEqual(parseModelJSON('prefix {"a":[1,2]} trailing prose'),{a:[1,2]})
});

test("v0.61.6 quest item conditions require a real existing Engine item id",()=>{
 const q={conditions:[{type:"ITEM_SHOWN",id:"走私暗記速語",field:"symbol",op:"EQ",value:"1",description:"出示走私暗記速語"}]};
 assert.deepEqual(questConditionReferenceIssues(q,{items:[]}),["QUEST_CONDITION_REFERENCE_UNKNOWN:0:ITEM_SHOWN:走私暗記速語"]);
 assert.deepEqual(questConditionReferenceIssues({conditions:[{...q.conditions[0],id:"ITEM-1"}]},{items:[{id:"ITEM-1",name:"走私暗記速語"}]}),[])
});

test("v0.61.6 deterministic designLogic repair stays AI provenance but is observable",()=>{
 const d=createGenerationDiagnostics();recordGenerationStage(d,"CORE_RULES",{source:"AI",latencyMs:12});recordGenerationStage(d,"CORE_RULES",{source:"AI",repairUsed:true,repairReason:"DESIGN_LOGIC_RECOVERED:MYSTERY_ARCHITECTURE_INCOMPLETE"});
 const out=finalizeGenerationDiagnostics(d);assert.equal(out.stages.CORE_RULES.source,"AI");assert.equal(out.stages.CORE_RULES.repairUsed,true);assert.equal(out.summary.fallbackCount,0);assert.equal(out.summary.repairCount,1);assert.equal(out.quality,"RECOVERED")
});
test("v0.61.6 runtime wiring closes the 13:55 silent-failure paths",async()=>{
 const [app,client,lazy,registry]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),readFile(new URL("../src/world-registry.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/preview=groundStatePatch\(state,patch,\{\.\.\.context,evidencePhase:"SCENE_PENDING"\}\)/);
 assert.match(app,/STATE_PATCH_EVIDENCE_DEFERRED/);
 assert.match(app,/suggestionScope=\{\.\.\.freshScope,visibleEventTexts:/);
 assert.match(client,/markWorldRepair\("CORE_RULES","DESIGN_LOGIC_PARTIAL_REPAIR:/);
 assert.match(client,/repairWorldDesignLogic\(rules,identity,directive\.blueprintProfile\)/);
 assert.match(client,/existingEntities:\{[\s\S]*?items:[\s\S]*?facts:[\s\S]*?events:/);
 assert.match(lazy,/items:state\.inventory\|\|\[\],[\s\S]*?facts:[\s\S]*?events:state\.events\|\|\[\]/);
 assert.match(registry,/questConditionReferenceIssues\(\{conditions\},conditionContext\)/)
});
test("v0.61.6 History timeout gets one compact recovery within the prior latency envelope",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/resilientWorldStage\("HISTORY",\{\s*timeoutMs:50000,retryOnTimeout:true,maxOutputTokens:1200/);
 assert.match(client,/timedOut\?Math\.max\(25000,Math\.min\(35000/)
});
test("v0.61.6 State Director direct-source evidence commits while deterministic SCENE_PENDING still defers",()=>{
 const state={player:{location:"眼前的裂隙"},world:{state:{location:"天穹裂縫邊緣",locationId:"LOC-1"},registry:{locations:[{id:"LOC-1",name:"天穹裂縫邊緣",known:false}],npcs:[]}}};
 const op={op:"DISCOVER_FACT",title:"紫霧脈動",text:"紫霧沿岩縫規律脈動。",factId:"OBS-1",evidenceType:"EXAMINED",sourceKind:"LOCATION",sourceId:"LOC-1"};
 const direct=groundStatePatch(state,{baseRevision:0,operations:[op]},{action:"仔細檢查眼前的裂隙",roll:{success:true},evidencePhase:"STATE_PENDING"});
 assert.equal(direct.patch.operations.length,1);assert.equal(direct.deferredEvidence.length,0);
 const fallback=groundStatePatch(state,{baseRevision:0,operations:[op]},{action:"仔細檢查眼前的裂隙",roll:{success:true},evidencePhase:"SCENE_PENDING"});
 assert.equal(fallback.patch.operations.length,0);assert.equal(fallback.deferredEvidence.length,1);assert.equal(fallback.rejected.length,0)
});
