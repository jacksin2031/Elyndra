import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {advanceFutureSimulation} from "../src/future-runtime.js";
import {appendWorldLedger,promoteLedgerEntryToHistory} from "../src/world-ledger.js";
import {seedHistoryLegacy,syncHistoryLegacy,pendingHistoryLegacyEchoes,historyLegacySnapshot} from "../src/history-legacy.js";
import {ensureDocumentRuntime} from "../src/document-engine.js";
import {ensureItemHeritage} from "../src/item-heritage.js";
import {planLazyGeneration,validateLazyGenerationCandidate,commitLazyGeneration,abortLazyGeneration} from "../src/lazy-generation.js";
import {ensureCausalWorldCore} from "../src/causal-world-core.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:10,prompt:"新歷史遺產回聲測試"};
function world(){
 const s=newGame(seed);s.world.state.region="北境";s.world.state.location="北門";s.player.location="北門";
 s.world.registry.locations=[{id:"LOC-START",name:"北門",region:"北境",known:true,historyRefs:[]}];
 return s
}
function createPlayerHistory(s,{category="WORLD_IMPACT",title="北門危機被平息"}={}){
 const ev={id:"EV-PLAYER-HISTORY-"+Math.random(),type:"WORLD_IMPACT",visibility:"PLAYER_KNOWN",scope:"REGIONAL",summary:title,day:3,at:Date.now()};
 s.events.push(ev);
 const entry=appendWorldLedger(s,ev,{sourceEventId:ev.id,significance:"MAJOR",causeRefs:["PLAYER_ACTION"],entityRefs:["LOC-START"]});
 return promoteLedgerEntryToHistory(s,entry.id,{title,category,summary:title+"，成為後續世界記憶的一部分。",legacies:["地方居民開始記住這件事"],regions:["北境"],discoverKeywords:["北門","危機"]})
}

test("Future runtime closes Player Action -> Ledger -> New History -> Legacy Echo loop automatically",()=>{
 const s=world(),beforeKnowledge=structuredClone(s.knowledge);
 s.events.push({id:"EV-IMPACT-AUTO",type:"WORLD_IMPACT",visibility:"PLAYER_KNOWN",scope:"REGIONAL",summary:"玩家阻止北門災變並重新開放道路。",day:4,at:Date.now()});
 const out=advanceFutureSimulation(s);
 assert.equal(out.newHistory.length,1);
 const history=s.world.history.find(x=>x.id===out.newHistory[0]);assert.ok(history?.ledgerRef);
 const legacy=historyLegacySnapshot(s,{director:true}).find(x=>x.historyId===history.id);assert.ok(legacy);
 assert.ok(legacy.echoes.some(x=>x.kind==="DOCUMENT"&&x.status==="MATERIALIZED"));
 assert.ok(legacy.echoes.some(x=>x.kind==="RELIC"&&x.status==="MATERIALIZED"));
 assert.ok(legacy.echoes.some(x=>x.kind==="ORAL_TRADITION"&&x.status==="UNMATERIALIZED"));
 assert.ok(legacy.echoes.some(x=>x.kind==="MEMORIAL"&&x.status==="UNMATERIALIZED"));
 assert.deepEqual(s.knowledge,beforeKnowledge)
});

test("new player-era History seeds hidden document and relic traces without granting Knowledge",()=>{
 const s=world(),history=createPlayerHistory(s),beforeKnowledge=structuredClone(s.knowledge);
 const record=seedHistoryLegacy(s,history.id);assert.ok(record);
 const docs=ensureDocumentRuntime(s).documents.filter(x=>x.historyRefs.includes(history.id));
 assert.equal(docs.length,1);assert.equal(docs[0].known,false);assert.equal(docs[0].read,false);
 assert.equal(docs[0].claims[0].historyId,history.id);assert.match(docs[0].bias,/記錄者視角/);
 const relics=ensureItemHeritage(s).seeds.filter(x=>x.historyRefs.includes(history.id)&&x.id==="LEGACY-RELIC-"+history.id);
 assert.equal(relics.length,1);assert.equal(relics[0].status,"UNMATERIALIZED");
 assert.deepEqual(s.knowledge,beforeKnowledge)
});

test("martial new History also leaves an undiscovered weapon-relic seed",()=>{
 const s=world(),history=createPlayerHistory(s,{category:"WAR",title:"北門決戰"});
 seedHistoryLegacy(s,history.id);
 const weapons=ensureItemHeritage(s).seeds.filter(x=>x.id==="LEGACY-WEAPON_RELIC-"+history.id);
 assert.equal(weapons.length,1);assert.equal(weapons[0].status,"UNMATERIALIZED");assert.match(weapons[0].label,/武器|軍用/)
});

test("only oral tradition and memorial echoes remain for Lazy Generation",()=>{
 const s=world(),history=createPlayerHistory(s);seedHistoryLegacy(s,history.id);
 const pending=pendingHistoryLegacyEchoes(s,{limit:10});
 assert.deepEqual(new Set(pending.map(x=>x.kind)),new Set(["ORAL_TRADITION","MEMORIAL"]));
 assert.ok(pending.every(x=>x.historyId===history.id&&x.status==="UNMATERIALIZED"))
});

test("Lazy Generation reserves Legacy Echoes and enforces their entity type",()=>{
 const s=world(),history=createPlayerHistory(s);seedHistoryLegacy(s,history.id);
 const plan=planLazyGeneration(s,{reason:"CLAIM_MATERIALIZATION"});assert.equal(plan.legacyEchoIds.length,2);
 const memorial=plan.legacyEchoes.find(x=>x.kind==="MEMORIAL"),oral=plan.legacyEchoes.find(x=>x.kind==="ORAL_TRADITION");assert.ok(memorial&&oral);
 const invalid={locations:[{name:"回憶碑",historyRefs:[history.id],claimRefs:[...plan.claimIds],echoRefs:[oral.id]}],npcs:[{name:"老說書人",historyRefs:[history.id],claimRefs:[],echoRefs:[memorial.id]}],factions:[],sideQuests:[]};
 const bad=validateLazyGenerationCandidate(s,invalid,plan);assert.equal(bad.valid,false);assert.ok(bad.errors.some(x=>x.includes("LAZY_RESERVED_ECHO_UNBOUND")));
 const valid={locations:[{name:"回憶碑",historyRefs:[history.id],claimRefs:[...plan.claimIds],echoRefs:[memorial.id]}],npcs:[{name:"老說書人",historyRefs:[history.id],claimRefs:[],echoRefs:[oral.id]}],factions:[],sideQuests:[]};
 assert.equal(validateLazyGenerationCandidate(s,valid,plan).valid,true)
});

test("Lazy commit materializes oral tradition and memorial into canonical entity refs",()=>{
 const s=world(),history=createPlayerHistory(s);seedHistoryLegacy(s,history.id);
 const plan=planLazyGeneration(s,{reason:"CLAIM_MATERIALIZATION"}),memorial=plan.legacyEchoes.find(x=>x.kind==="MEMORIAL"),oral=plan.legacyEchoes.find(x=>x.kind==="ORAL_TRADITION");
 const generation={locations:[{name:"回憶碑",historyRefs:[history.id],claimRefs:[...plan.claimIds],echoRefs:[memorial.id]}],npcs:[{name:"老說書人",historyRefs:[history.id],claimRefs:[],echoRefs:[oral.id]}],factions:[],sideQuests:[]};
 const added={locations:[{id:"LOC-MEM",name:"回憶碑"}],npcs:[{id:"NPC-ORAL",name:"老說書人"}],factions:[],sideQuests:[]};
 const out=commitLazyGeneration(s,plan,generation,added);assert.equal(out.ok,true);
 const snapshot=historyLegacySnapshot(s,{director:true})[0],byKind=Object.fromEntries(snapshot.echoes.map(x=>[x.kind,x]));
 assert.equal(byKind.MEMORIAL.status,"MATERIALIZED");assert.deepEqual(byKind.MEMORIAL.entityRefs,["LOC-MEM"]);
 assert.equal(byKind.ORAL_TRADITION.status,"MATERIALIZED");assert.deepEqual(byKind.ORAL_TRADITION.entityRefs,["NPC-ORAL"])
});

test("aborted Lazy Generation releases reserved Legacy Echoes",()=>{
 const s=world(),history=createPlayerHistory(s);seedHistoryLegacy(s,history.id);
 const plan=planLazyGeneration(s,{reason:"CLAIM_MATERIALIZATION"});assert.ok(plan.legacyEchoIds.length);
 abortLazyGeneration(s,plan,"PLAYER_ACTION");
 const pending=pendingHistoryLegacyEchoes(s,{limit:10});assert.equal(pending.length,2);
 const snapshot=historyLegacySnapshot(s,{director:true})[0];assert.ok(snapshot.echoes.filter(x=>["ORAL_TRADITION","MEMORIAL"].includes(x.kind)).every(x=>x.status==="UNMATERIALIZED"))
});

test("Causal Core backfills Legacy Echoes for older saves with player-era History",()=>{
 const s=world(),history=createPlayerHistory(s);
 delete s.world.historyLegacy;delete s.world.documents;s.world.itemHeritage={version:1,materials:[],weaponCultures:[],equipmentCultures:[],dailyGoods:[],knowledgeMedia:[],seeds:[]};
 ensureCausalWorldCore(s);syncHistoryLegacy(s);
 const legacy=historyLegacySnapshot(s,{director:true}).find(x=>x.historyId===history.id);assert.ok(legacy);
 assert.ok(ensureDocumentRuntime(s).documents.some(x=>x.id==="LEGACY-DOC-"+history.id&&x.known===false));
 assert.ok(ensureItemHeritage(s).seeds.some(x=>x.id==="LEGACY-RELIC-"+history.id&&x.status==="UNMATERIALIZED"))
});

test("Runtime Expansion AI receives Engine-reserved Legacy Echo contract",async()=>{
 const [client,lazy,future,causal]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/legacyEchoes:plan\.legacyEchoes\|\|\[\]/);assert.match(client,/MEMORIAL echo 必須由 Location/);assert.match(client,/ORAL_TRADITION echo 必須由 NPC/);
 assert.match(lazy,/pendingHistoryLegacyEchoes/);assert.match(lazy,/reserveHistoryLegacyEcho/);assert.match(lazy,/materializeHistoryLegacyEcho/);assert.match(lazy,/releaseHistoryLegacyEcho/);
 assert.match(future,/seedHistoryLegacy\(state,history\.id\)/);assert.match(causal,/syncHistoryLegacy\(state\)/)
});
