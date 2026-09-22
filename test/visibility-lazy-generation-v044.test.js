import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {isPlayerVisibleEvent,projectPlayerEvent,playerVisibleEvents} from "../src/event-visibility.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";
import {syncGenerationClaimsFromCausalStructure,generationClaimsSnapshot,validateGenerationClaims} from "../src/generation-claims.js";
import {planLazyGeneration,validateLazyGenerationCandidate,commitLazyGeneration,abortLazyGeneration,lazyGenerationSnapshot} from "../src/lazy-generation.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:4,playHours:12,prompt:"Visibility Lazy Generation 測試"};
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

test("Lazy candidate is bounded by slots, plan history and reserved claim ids",()=>{
 const s=state(),plan=planLazyGeneration(s,{reason:"WORLD_EDGE_UNDERDEFINED"}),historyRef=(plan.claims.flatMap(x=>x.historyRefs||[])[0]||plan.historyRefs[0]);
 const valid={locations:[{name:"灰塔外圍",description:"崩落石材形成的舊聚落。",historyRefs:[historyRef],claimRefs:[...plan.claimIds]}],npcs:[],factions:[],sideQuests:[]};
 assert.equal(validateLazyGenerationCandidate(s,valid,plan).valid,true);
 const badClaim=structuredClone(valid);badClaim.locations[0].claimRefs=["CLAIM-NOT-RESERVED"];assert.ok(validateLazyGenerationCandidate(s,badClaim,plan).errors.some(x=>x.includes("LAZY_CLAIM_NOT_RESERVED")));
 const badHistory=structuredClone(valid);badHistory.locations[0].historyRefs=["HIST-OUTSIDE"];assert.ok(validateLazyGenerationCandidate(s,badHistory,plan).errors.some(x=>x.includes("LAZY_HISTORY_REF_OUTSIDE_PLAN")));
 const duplicate={locations:[...valid.locations,{...valid.locations[0]}],npcs:[],factions:[],sideQuests:[]};assert.ok(validateLazyGenerationCandidate(s,duplicate,plan).errors.some(x=>x.includes("LAZY_DUPLICATE_CANDIDATE")))
});

test("Lazy commit materializes reserved Generation Claims against canonical entity ids",()=>{
 const s=state(),plan=planLazyGeneration(s,{reason:"WORLD_EDGE_UNDERDEFINED"}),historyRef=(plan.claims.flatMap(x=>x.historyRefs||[])[0]||plan.historyRefs[0]);
 const generation={locations:[{name:"灰塔遺址",description:"可探索的舊遺址。",historyRefs:[historyRef],claimRefs:[...plan.claimIds]}],npcs:[],factions:[],sideQuests:[]};
 const added={locations:[{id:"LOC-GRAY",name:"灰塔遺址"}],npcs:[],factions:[],sideQuests:[]};
 const out=commitLazyGeneration(s,plan,generation,added);assert.equal(out.ok,true);assert.equal(plan.status,"COMMITTED");
 const claims=generationClaimsSnapshot(s);for(const id of plan.claimIds){const c=claims.find(x=>x.id===id);assert.equal(c.status,"MATERIALIZED");assert.deepEqual(c.entityRefs,["LOC-GRAY"])}
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

test("background world evolution uses plan validate canonize commit pipeline",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/planLazyGeneration\(gameState,\{reason\}\)/);
 assert.match(app,/generateRegionExpansion\(gameState,reason,\{signal:ctrl\.signal,plan\}\)/);
 assert.match(app,/validateLazyGenerationCandidate\(gameState,ex\.generation,plan\)/);
 assert.match(app,/canonizeGeneration\(gameState,ex\.generation\)/);
 assert.match(app,/commitLazyGeneration\(gameState,plan,ex\.generation,added,\{sourceProvider:ex\.generationSource\?\.provider,sourceModel:ex\.generationSource\?\.model\}\)/);
 assert.match(app,/abortLazyGeneration\(gameState,plan/);
});
