import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {visibleFacts} from "../src/ai-client.js";
import {validateKnowledgeBoundaries} from "../src/knowledge-model.js";
import {appendWorldLedger,promoteLedgerEntryToHistory} from "../src/world-ledger.js";
import {syncGenerationClaimsFromConstitution,reconcileGenerationClaims} from "../src/generation-claims.js";
import {planLazyGeneration,validateLazyGenerationCandidate} from "../src/lazy-generation.js";
import {auditCausalIntegrity,repairCausalIntegrity} from "../src/causal-integrity.js";
import {planStateSync} from "../src/state-sync.js";
import {causalWorldCoreSnapshot} from "../src/causal-world-core.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:10,prompt:"v0.53 causal integrity"};
const world=()=>newGame(seed);

test("Narrator only receives Canon facts backed by Engine-VERIFIED Knowledge",()=>{
 const s=world();s.world.canon.facts.push({id:"FACT-HIDDEN",type:"truth",visibility:"hidden",text:"王城地下有古代核心",canonical:true});
 s.knowledge.push({id:"K-RUMOR",title:"傳聞",text:"有人說王城地下有核心",factId:"FACT-HIDDEN",status:"UNCONFIRMED",beliefState:"CORROBORATED",evidenceType:"TESTIMONY",claimKey:"core",sourceIndependence:1,score:0});
 assert.deepEqual(visibleFacts(s),[]);
 s.knowledge[0].status="VERIFIED";s.knowledge[0].beliefState="VERIFIED";
 assert.deepEqual(visibleFacts(s),["王城地下有古代核心"]);
 assert.equal(validateKnowledgeBoundaries(s).valid,true)
});

test("Knowledge boundary validator rejects orphan VERIFIED authority and flags unverified score",()=>{
 const s=world();s.knowledge.push({id:"K-BAD",title:"錯誤權威",text:"不存在的真相",factId:"FACT-MISSING",status:"VERIFIED",beliefState:"VERIFIED",evidenceType:"OBSERVATION",score:2});
 let v=validateKnowledgeBoundaries(s);assert.equal(v.valid,false);assert.ok(v.errors.some(x=>x.includes("VERIFIED_KNOWLEDGE_ORPHAN")));
 s.knowledge[0].status="UNCONFIRMED";v=validateKnowledgeBoundaries(s);assert.ok(v.warnings.some(x=>x.includes("UNVERIFIED_KNOWLEDGE_SCORE")))
});

test("Lazy Generation rejects stale world version before canonization",()=>{
 const s=world(),plan=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"});s.world.version+=1;
 const result=validateLazyGenerationCandidate(s,{locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]},plan);
 assert.equal(result.valid,false);assert.ok(result.errors.includes("LAZY_STALE_WORLD_VERSION"))
});

test("Lazy Generation rejects a plan whose generation revision lost the race",()=>{
 const s=world(),plan=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"});s.world.lazyGeneration.generationRevision=plan.generationRevision;
 const result=validateLazyGenerationCandidate(s,{locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]},plan);
 assert.equal(result.valid,false);assert.ok(result.errors.includes("LAZY_STALE_GENERATION_REVISION"))
});

test("Generation Claims reopen when their materialized entity disappears",()=>{
 const s=world();s.world.constitution.push({id:"REQ-A",kind:"REQUIRE",term:"魔法學院"});
 s.world.registry.locations.push({id:"LOC-A",name:"魔法學院",description:"教授魔法的學院",historyRefs:[],known:false});
 let claim=syncGenerationClaimsFromConstitution(s).find(x=>x.label==="魔法學院");reconcileGenerationClaims(s);claim=s.world.generationClaims.claims.find(x=>x.id===claim.id);
 assert.equal(claim.status,"MATERIALIZED");assert.deepEqual(claim.entityRefs,["LOC-A"]);
 s.world.registry.locations=[];reconcileGenerationClaims(s);
 assert.equal(claim.status,"UNMATERIALIZED");assert.deepEqual(claim.entityRefs,[]);assert.equal(claim.failureReason,"MATERIALIZATION_DRIFT")
});

test("Ledger compaction never discards pinned historical causal anchors",()=>{
 const s=world(),event={id:"EV-PIN",type:"WORLD_IMPACT",visibility:"PLAYER_KNOWN",summary:"改變王國邊境的事件",day:1,at:1};
 const pinned=appendWorldLedger(s,event,{significance:"HISTORIC",sourceEventId:event.id});
 promoteLedgerEntryToHistory(s,pinned.id,{title:"邊境改變之日",summary:event.summary});
 for(let i=0;i<2050;i++)appendWorldLedger(s,{id:"EV-R-"+i,type:"ROUTINE",visibility:"INTERNAL",summary:"routine "+i,day:2,at:10+i},{sourceEventId:"EV-R-"+i,significance:"ROUTINE"});
 assert.ok(s.world.ledger.entries.some(x=>x.id===pinned.id));assert.ok(s.world.history.some(x=>x.ledgerRef===pinned.id))
});

test("Integrity repair restores Ledger backlinks and releases orphan background reservations",()=>{
 const s=world(),event={id:"EV-H",type:"WORLD_IMPACT",visibility:"PLAYER_KNOWN",summary:"重大事件",day:1,at:1};
 const entry=appendWorldLedger(s,event,{significance:"MAJOR"}),history=promoteLedgerEntryToHistory(s,entry.id,{title:"重大事件"});entry.historyRefs=[];
 s.world.constitution.push({id:"REQ-A",kind:"REQUIRE",term:"魔法學院"});syncGenerationClaimsFromConstitution(s);
 const plan=planLazyGeneration(s,{reason:"CLAIM_MATERIALIZATION"});assert.ok(plan.claimIds.length);plan.status="ABORTED";
 const before=auditCausalIntegrity(s);assert.ok(before.errors.some(x=>x.code==="CLAIM_RESERVATION_ORPHAN"));assert.ok(before.warnings.some(x=>x.code==="LEDGER_HISTORY_BACKLINK_MISSING"));
 const repaired=repairCausalIntegrity(s);assert.equal(repaired.repaired,true);assert.ok(entry.historyRefs.includes(history.id));
 assert.ok(plan.claimIds.every(id=>s.world.generationClaims.claims.find(x=>x.id===id).status==="UNMATERIALIZED"))
});

test("Causal Integrity auditor catches Future History orphan links",()=>{
 const s=world();s.world.futures.push({id:"FUT-BAD",title:"壞未來",pressure:0,stage:"DORMANT",earliestDay:1,historicalLinks:["HIST-MISSING"],impactScope:"LOCAL",affectedRegions:[],intensity:20,domains:[],playerCanPrevent:true,playerCanAccelerate:true,playerCanMitigate:true,playerCanRedirect:true,pressureLog:[]});
 const report=auditCausalIntegrity(s);assert.equal(report.valid,false);assert.ok(report.errors.some(x=>x.code==="FUTURE_HISTORY_REF_ORPHAN"&&x.ref==="FUT-BAD"))
});

test("State Sync routing still covers ENGINE_ONLY FAST DEFERRED and DEEP without collapsing every turn into AI",()=>{
 const base={roll:{success:true,profile:{kind:"GENERAL"}},snapshot:{}};
 assert.equal(planStateSync({...base,action:"休息",ruleEffects:{utility:true}}).mode,"ENGINE_ONLY");
 assert.equal(planStateSync({...base,action:"觀察牆上的刻痕",intent:{intent:"OBSERVE",kind:"OBSERVE"},roll:{success:true,profile:{kind:"OBSERVE"}}}).mode,"FAST");
 assert.equal(planStateSync({...base,action:"改善公會關係",kernel:{dirtyFlags:{faction:true}}}).mode,"DEFERRED");
 assert.equal(planStateSync({...base,action:"摧毀王城核心",kernel:{dirtyFlags:{worldImpact:true,timeline:true}}}).mode,"DEEP")
});

test("Background systems all have stale-world guards",async()=>{
 const [app,history,lazy]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-depth.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/BACKGROUND_QUALITY_CRITIC_STALE_DISCARDED/);
 assert.match(history,/HISTORY_DEEPENING_STALE_WORLD/);
 assert.match(lazy,/LAZY_STALE_WORLD_VERSION/);assert.match(lazy,/LAZY_STALE_GENERATION_REVISION/)
});

test("new worlds expose a valid Causal Integrity report through Causal Core",()=>{
 const s=world(),snap=causalWorldCoreSnapshot(s);assert.equal(s.world.causalCore.version,2);assert.equal(snap.version,2);assert.equal(snap.integrity.valid,true,snap.integrity.errors.map(x=>x.code).join(","))
});
