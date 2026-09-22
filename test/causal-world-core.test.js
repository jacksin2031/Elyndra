import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {appendWorldLedger,promoteLedgerEntryToHistory} from "../src/world-ledger.js";
import {syncGenerationClaimsFromConstitution,materializeGenerationClaim} from "../src/generation-claims.js";
import {recordKnowledgeEvidence,recomputeCorroboration,knowledgeCanRevealCanon} from "../src/knowledge-model.js";
import {createFutureSkeleton,applyFuturePressure,recomputeFutureStage,registerTimelineFutures} from "../src/future-engine.js";
import {ensureCausalWorldCore} from "../src/causal-world-core.js";
import {migrateSave} from "../src/storage.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:4,politics:4,playHours:15,prompt:"因果世界核心測試"};

test("new worlds initialize the causal core and ledger the creation event",()=>{
 const s=newGame(seed);
 assert.equal(s.world.causalCore.version,2);
 assert.equal(s.world.ledger.version,1);
 assert.ok(s.world.ledger.entries.some(x=>x.type==="WORLD_CREATED"));
 assert.ok(Array.isArray(s.world.futures));
 assert.ok(Array.isArray(s.world.generationClaims.claims))
});

test("world ledger is append-only by source event and can promote major events into immutable history",()=>{
 const s=newGame(seed);
 const event={id:"EV-KING-FALL",type:"FACTION_LEADER_KILLED",visibility:"INTERNAL",summary:"王位持有人死亡",day:2,at:100};
 const first=appendWorldLedger(s,event,{significance:"HISTORIC",causeRefs:["EV-PLOT"],entityRefs:["NPC-KING"]});
 const again=appendWorldLedger(s,event,{significance:"HISTORIC"});
 assert.equal(first.id,again.id);
 assert.equal(s.world.ledger.entries.filter(x=>x.sourceEventId==="EV-KING-FALL").length,1);
 const history=promoteLedgerEntryToHistory(s,first.id,{title:"王位空缺之日",legacies:["繼承危機"]});
 assert.equal(history.mutable,false);
 assert.equal(history.canonical,true);
 assert.equal(history.ledgerRef,first.id)
});

test("constitution requirements remain generation claims until materialized",()=>{
 const s=newGame(seed);
 s.world.constitution.push({id:"REQ-ACADEMY",kind:"REQUIRE",term:"魔法學院"});
 const claims=syncGenerationClaimsFromConstitution(s);
 const claim=claims.find(x=>x.label==="魔法學院");
 assert.ok(claim);assert.equal(claim.status,"UNMATERIALIZED");
 materializeGenerationClaim(s,claim.id,["LOC-ACADEMY"]);
 assert.equal(claim.status,"MATERIALIZED");
 assert.deepEqual(claim.entityRefs,["LOC-ACADEMY"])
});

test("corroborated evidence is not automatically Canon truth",()=>{
 const s=newGame(seed);
 const a=recordKnowledgeEvidence(s,{title:"旅人說法",text:"北門下埋著古代裝置",claimKey:"north-gate-device",evidenceType:"TESTIMONY",sourceIndependence:1});
 const b=recordKnowledgeEvidence(s,{title:"舊文書",text:"北門地下曾有大型工程",claimKey:"north-gate-device",evidenceType:"DOCUMENT",sourceIndependence:1});
 const result=recomputeCorroboration(s,"north-gate-device");
 assert.equal(result.beliefState,"CORROBORATED");
 assert.equal(a.status,"UNCONFIRMED");assert.equal(b.status,"UNCONFIRMED");
 assert.equal(knowledgeCanRevealCanon(s,a),false);
 s.world.canon.facts.push({id:"FACT-NORTH",type:"truth",visibility:"hidden",text:"北門下確實存在古代裝置",canonical:true});
 const verified=recordKnowledgeEvidence(s,{title:"實地驗證",text:"你確認了古代裝置",factId:"FACT-NORTH",claimKey:"north-gate-device",evidenceType:"OBSERVATION",sourceIndependence:1,verifiedByEngine:true});
 assert.equal(verified.status,"VERIFIED");
 assert.equal(knowledgeCanRevealCanon(s,verified),true)
});

test("future pressure supports escalation mitigation and cancellation instead of fixed day triggers",()=>{
 const s=newGame(seed);
 const f=createFutureSkeleton(s,{id:"FUT-WAR",title:"邊境戰爭",earliestDay:1,impactScope:"NATIONAL",activationConditions:["DAY>=1"],cancelConditions:["FLAG:peace_treaty"],playerCanPrevent:true,playerCanMitigate:true,playerCanRedirect:true,playerCanAccelerate:true});
 applyFuturePressure(s,f.id,70,"使節遇害");
 assert.equal(f.stage,"CRITICAL");
 applyFuturePressure(s,f.id,15,"軍隊越境");
 assert.equal(f.stage,"ACTIVE");
 applyFuturePressure(s,f.id,-35,"玩家促成停火");
 assert.ok(["ESCALATING","CRITICAL","RESOLVING"].includes(f.stage));
 s.world.state.flags.peace_treaty=true;recomputeFutureStage(s,f);
 assert.equal(f.stage,"RESOLVED")
});

test("timeline skeletons become intervention-capable Future records",()=>{
 const s=newGame(seed);
 s.world.timeline=[{id:"TL-1",title:"魔力瘟疫",earliestDay:8,latestDay:15,pressure:8,directorTruth:"三百年前的災害正在重演"}];
 registerTimelineFutures(s);
 const f=s.world.futures.find(x=>x.id==="FUT-TL-1");
 assert.ok(f);assert.equal(f.playerCanPrevent,true);assert.equal(f.playerCanMitigate,true);assert.equal(f.hiddenCause,"三百年前的災害正在重演")
});

test("save migration reconciles runtime events into the World Ledger without changing legacy format contract",()=>{
 const s=newGame(seed);
 s.events.push({id:"EV-RUNTIME",type:"ITEM_SHOWN",visibility:"PLAYER_KNOWN",summary:"你展示了古老徽章",day:1,at:123});
 const migrated=migrateSave(s);
 ensureCausalWorldCore(migrated);
 assert.equal(migrated.formatVersion,12);
 assert.ok(migrated.world.ledger.entries.some(x=>x.sourceEventId==="EV-RUNTIME"))
});
