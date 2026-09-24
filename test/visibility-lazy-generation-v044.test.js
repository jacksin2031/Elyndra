import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {isPlayerVisibleEvent,projectPlayerEvent,playerVisibleEvents} from "../src/event-visibility.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";
import {syncGenerationClaimsFromCausalStructure,generationClaimsSnapshot,validateGenerationClaims} from "../src/generation-claims.js";
import {planLazyGeneration,validateLazyGenerationCandidate,commitLazyGeneration,abortLazyGeneration,lazyGenerationSnapshot} from "../src/lazy-generation.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:4,playHours:12,prompt:"Visibility Lazy Generation 測試"};
function candidateForPlan(plan,prefix="CLAIM"){
 const fallbackHistory=plan.historyRefs[0]||"";
 const locations=plan.claims.map((claim,i)=>{
  const required=claim.type==="REQUIRED_ELEMENT",historyRefs=claim.historyRefs?.length?[...claim.historyRefs]:(fallbackHistory?[fallbackHistory]:[]);
  return {name:required?claim.label:`${prefix}-${i+1}`,description:required?`這裡確實是${claim.label}，並作為世界 Canon 的具體存在。`:`與 ${claim.label} 對應的可探索地點。`,historyRefs,claimRefs:[claim.id]}
 });
 return {locations,npcs:[],factions:[],sideQuests:[],definitions:[]}
}
function state(){
 const s=newGame(seed);
 s.world.history=[
  {id:"HIST-A",order:1,era:"舊紀",title:"灰塔崩落",category:"DISASTER",summary:"灰塔崩落後留下大量遺構。",causes:["失控"],legacies:["遺構"],regions:["北境"],factions:[],discoverKeywords:["灰塔"],canonical:true,mutable:false},
  {id:"HIST-B",order:2,era:"新紀",title:"北路重開",category:"TRADE",summary:"北路重開改變了聚落。",causes:["復建"],legacies:["商路"],regions:["北境"],factions:[],discoverKeywords:["舊路碑"],canonical:true,mutable:false}
 ];
 s.world.state.region="北境";
 s.world.creation={constitution:{hardRules:[{id:"RULE-ACADEMY",kind:"REQUIRE",term:"魔法學院"}]}};
 return s
}

test("event visibility is explicit allow-list and missing visibility is hidden",()=>{
 assert.equal(isPlayerVisibleEvent({type:"PLAYER_ACTION"}),false);
 assert.equal(isPlayerVisibleEvent({type:"X",visibility:"INTERNAL"}),false);
 assert.equal(isPlayerVisibleEvent({type:"X",visibility:"DIRECTOR_ONLY"}),false);
 assert.equal(isPlayerVisibleEvent({type:"X",visibility:"PLAYER_KNOWN"}),true);
 assert.equal(isPlayerVisibleEvent({type:"X",visibility:"OBSERVABLE"}),true);
 assert.equal(isPlayerVisibleEvent({type:"X",visibility:"RUMOR"}),true)
});

test("player event projection strips Director-only payload fields",()=>{
 const raw={id:"E1",type:"FUTURE_FORESHADOW",visibility:"OBSERVABLE",day:2,summary:"道路封閉。",directorTruth:"秘密戰爭計畫",hiddenCause:"王室命令",pressure:88,claimIds:["SECRET"]};
 const out=projectPlayerEvent(raw);assert.equal(out.summary,"道路封閉。");
 const text=JSON.stringify(out);assert.doesNotMatch(text,/秘密戰爭計畫|王室命令|pressure|claimIds/);
 const s={events:[raw,{id:"E2",type:"INTERNAL",summary:"secret"},{id:"E3",type:"INTERNAL",visibility:"INTERNAL",summary:"secret2"}]};
 assert.deepEqual(playerVisibleEvents(s).map(x=>x.id),["E1"])
});

test("Scene Narrator snapshot cannot receive Director world state or faction simulation values",()=>{
 const snapshot={
  world:{name:"UNKNOWN",summary:"SECRET_WORLD_SUMMARY",day:3,clock:{day:3,hour:9,minute:0},simulation:{tension:99},seedContract:{prompt:"SECRET_SEED"},creation:{blueprint:{secret:true}},location:"北門"},
  weather:{observableName:"薄霧"},player:{name:"旅人",calendarKnown:false},knownFacts:["可見事實"],knowledge:[],inventory:[],quest:null,recentEvents:[],runtimeSummary:"SECRET_RUNTIME",
  factions:[{id:"FAC",name:"已知勢力",goal:"SECRET_GOAL",resources:99,influence:88,playerReputation:2,relations:{SECRET:1},strategy:"MOBILIZE"}],
  registry:{locations:[{id:"LOC",name:"北門",type:"關口",region:"北境",description:"石門",worldState:{safety:12}}],npcs:[{id:"NPC",name:"守門人",role:"守衛",description:"披甲",present:true,trust:3,goal:"SECRET_NPC_GOAL",worldState:{statusTags:["SECRET"]}}],sideQuests:[]},
  companions:[],recognition:{},knowledgeLayers:{version:1,playerKnowledge:{}}
 };
 const scene=sceneTurnSnapshot(snapshot),serialized=JSON.stringify(scene);
 assert.equal(scene.world.clock,null);
 assert.deepEqual(scene.factions,[{id:"FAC",name:"已知勢力",playerReputation:2}]);
 for(const secret of ["SECRET_WORLD_SUMMARY","SECRET_SEED","SECRET_RUNTIME","SECRET_GOAL","MOBILIZE","SECRET_NPC_GOAL","tension","worldState","resources","influence"])assert.doesNotMatch(serialized,new RegExp(secret))
});

test("Lazy Generation plan is deterministic for the same Engine state and reserves explicit claims",()=>{
 const s=state();syncGenerationClaimsFromCausalStructure(s);
 const a=planLazyGeneration(s,{reason:"WORLD_EDGE_UNDERDEFINED"}),b=planLazyGeneration(s,{reason:"WORLD_EDGE_UNDERDEFINED"});
 assert.equal(a.id,b.id);assert.equal(a.seed,b.seed);assert.deepEqual(a.claimIds,b.claimIds);assert.ok(a.claimIds.length>0);
 const claims=generationClaimsSnapshot(s);for(const id of a.claimIds){const c=claims.find(x=>x.id===id);assert.equal(c.status,"RESERVED");assert.equal(c.reservation.planId,a.id)}
 assert.equal(validateGenerationClaims(s).valid,true)
});

test("Lazy candidate is bounded by slots, plan history, claim semantics and reserved claim ids",()=>{
 const s=state(),plan=planLazyGeneration(s,{reason:"WORLD_EDGE_UNDERDEFINED"}),valid=candidateForPlan(plan,"灰塔錨點");
 const report=validateLazyGenerationCandidate(s,valid,plan);assert.equal(report.valid,true,report.errors.join(","));
 const badClaim=structuredClone(valid);badClaim.locations[0].claimRefs=["CLAIM-NOT-RESERVED"];assert.ok(validateLazyGenerationCandidate(s,badClaim,plan).errors.some(x=>x.includes("LAZY_CLAIM_NOT_RESERVED")));
 const badHistory=structuredClone(valid);badHistory.locations[0].historyRefs=["HIST-OUTSIDE"];assert.ok(validateLazyGenerationCandidate(s,badHistory,plan).errors.some(x=>x.includes("LAZY_HISTORY_REF_OUTSIDE_PLAN")));
 const duplicate={...structuredClone(valid),locations:[...valid.locations,{...valid.locations[0]}]};assert.ok(validateLazyGenerationCandidate(s,duplicate,plan).errors.some(x=>x.includes("LAZY_DUPLICATE_CANDIDATE")))
});

test("Lazy commit materializes reserved Generation Claims against semantically matched canonical ids",()=>{
 const s=state(),plan=planLazyGeneration(s,{reason:"WORLD_EDGE_UNDERDEFINED"}),generation=candidateForPlan(plan,"灰塔遺址");
 const added=canonizeGeneration(s,generation);
 const out=commitLazyGeneration(s,plan,generation,added);assert.equal(out.ok,true,out.errors?.join(",")||"");assert.equal(plan.status,"COMMITTED");
 const claims=generationClaimsSnapshot(s);for(let i=0;i<plan.claimIds.length;i++){const c=claims.find(x=>x.id===plan.claimIds[i]);assert.equal(c.status,"MATERIALIZED");assert.deepEqual(c.entityRefs,[added.locations[i].id])}
 assert.equal(lazyGenerationSnapshot(s,{director:true}).recentCommits.at(-1).planId,plan.id)
});

test("aborted Lazy Generation releases claims for deterministic retry",()=>{
 const s=state(),plan=planLazyGeneration(s,{reason:"PLAYER_REQUEST"});assert.ok(plan.claimIds.length);
 abortLazyGeneration(s,plan,"TEST_ABORT");assert.equal(plan.status,"ABORTED");
 const claims=generationClaimsSnapshot(s);for(const id of plan.claimIds)assert.equal(claims.find(x=>x.id===id).status,"UNMATERIALIZED")
});

test("causal reconciliation auto-materializes History anchors already represented in registry",()=>{
 const s=state();s.world.registry.locations=[{id:"LOC-A",name:"灰塔村",description:"位於遺址旁",historyRefs:["HIST-A"],known:false}];
 const rows=syncGenerationClaimsFromCausalStructure(s),claim=rows.find(x=>x.type==="HISTORY_ANCHOR"&&x.sourceRef==="HIST-A");
 assert.ok(claim);assert.equal(claim.status,"MATERIALIZED");assert.deepEqual(claim.entityRefs,["LOC-A"])
});

test("background world evolution uses resumable checkpoint canon pipeline",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/planLazyGeneration\(gameState,\{reason\}\)/);
 assert.match(app,/generateRegionExpansion\(state,reason,\{signal:ctrl\.signal,plan,onStage:stage=>commitRuntimeStageCheckpoint\(plan,stage,sessionToken,state\)\}\)/);
 assert.match(app,/validateLazyGenerationCandidate\(state,ex\.generation,plan,\{added:plan\.checkpoint\?\.added\}\)/);
 assert.match(app,/plan\.checkpoint\?\.added\|\|canonizeGeneration\(state,ex\.generation\)/);
 assert.match(app,/commitLazyGeneration\(state,plan,ex\.generation,added,\{sourceProvider:ex\.generationSource\?\.provider,sourceModel:ex\.generationSource\?\.model\}\)/);
 assert.match(app,/checkpointed=hasLazyGenerationCheckpoint\(plan\)/);
 assert.match(app,/plan\.status==="PLANNED"&&!checkpointed\)abortLazyGeneration\(state\|\|\{world:\{\}\},plan/);
});
