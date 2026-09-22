import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {ensureVisibilityLocks,advanceVisibilityLock,markEntityHinted,visibilityLevel,backgroundMutableFields} from "../src/visibility-lock.js";
import {applyUnseenWorldRepair} from "../src/world-quality.js";
import {revealRegistryEntities,ensureWorldRegistry} from "../src/world-registry.js";
import {planLazyGeneration,validateLazyGenerationCandidate,commitLazyGeneration,abortLazyGeneration,lazyGenerationSnapshot,LAZY_PROMPT_VERSION,LAZY_VALIDATION_VERSION} from "../src/lazy-generation.js";
import {causalWorldCoreSnapshot} from "../src/causal-world-core.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:10,prompt:"visibility replay test"};
function state(){
 const s=newGame(seed);s.world.state.region="北境";s.world.state.location="北門";s.player.location="北門";
 s.world.registry={
  locations:[
   {id:"LOC-CURRENT",name:"北門",region:"北境",description:"目前看見的石門",known:false},
   {id:"LOC-HIDDEN",name:"霧谷",region:"北境",description:"舊描述",known:false},
   {id:"LOC-KNOWN",name:"已知村",region:"北境",description:"已知描述",known:true}
  ],
  npcs:[{id:"NPC-HIDDEN",name:"陌生人",role:"旅人",known:false,encountered:false}],
  factions:[{id:"FAC-HIDDEN",name:"灰旗會",known:false}],
  sideQuests:[]
 };
 ensureWorldRegistry(s);return s
}
function replayState(){
 return {events:[],world:{id:"W",version:3,seed:{genre:"測試"},seedContract:{genre:"測試",magic:2},state:{region:"北境",day:2,clock:{totalMinutes:135}},registry:{locations:[],npcs:[],factions:[],sideQuests:[]},history:[],generationClaims:{version:1,claims:[]},historyLegacy:{version:1,records:[]},lazyGeneration:{version:2,generationRevision:0,plans:[],commits:[]}}}
}

test("Visibility Lock infers current/known state and never downgrades",()=>{
 const s=state();
 assert.equal(visibilityLevel(s,"location","LOC-CURRENT"),"OBSERVED");
 assert.equal(visibilityLevel(s,"location","LOC-HIDDEN"),"UNSEEN");
 assert.equal(visibilityLevel(s,"location","LOC-KNOWN"),"KNOWN");
 advanceVisibilityLock(s,"location","LOC-HIDDEN","HINTED",{summary:"遠處有人提到一座霧谷",fields:["name"]});
 assert.equal(visibilityLevel(s,"location","LOC-HIDDEN"),"HINTED");
 advanceVisibilityLock(s,"location","LOC-HIDDEN","UNSEEN",{reason:"attempt downgrade"});
 assert.equal(visibilityLevel(s,"location","LOC-HIDDEN"),"HINTED");
 advanceVisibilityLock(s,"location","LOC-HIDDEN","CANON_LOCKED",{reason:"core canon"});
 assert.equal(visibilityLevel(s,"location","LOC-HIDDEN"),"CANON_LOCKED")
});

test("HINTED content protects hinted fields but can fill unhinted descriptive fields",()=>{
 const s=state(),loc=s.world.registry.locations.find(x=>x.id==="LOC-HIDDEN");
 markEntityHinted(s,"location",loc.id,{summary:"旅人只提到谷地外觀",fields:["description"],source:"RUMOR"});
 assert.deepEqual(backgroundMutableFields(loc,["description","culture","trade","lore"]),["culture","trade","lore"]);
 const out=applyUnseenWorldRepair(s,{patch:{registry:{locations:[{id:loc.id,description:"不應覆蓋 hint",culture:{identity:"霧中牧民"},trade:{mode:"barter"}}]}}});
 assert.equal(out.applied,true);assert.equal(loc.description,"舊描述");assert.deepEqual(loc.culture,{identity:"霧中牧民"})
});

test("OBSERVED KNOWN and CANON_LOCKED entities reject background repair",()=>{
 const s=state(),current=s.world.registry.locations.find(x=>x.id==="LOC-CURRENT"),known=s.world.registry.locations.find(x=>x.id==="LOC-KNOWN");
 advanceVisibilityLock(s,"location",known.id,"CANON_LOCKED",{reason:"test"});
 const before=[current.description,known.description];
 const out=applyUnseenWorldRepair(s,{patch:{registry:{locations:[
  {id:current.id,description:"偷改目前位置"},
  {id:known.id,description:"偷改已知位置"}
 ]}}});
 assert.equal(out.applied,false);assert.deepEqual([current.description,known.description],before)
});

test("authorized reveal promotes entity to KNOWN monotonically",()=>{
 const s=state(),npc=s.world.registry.npcs[0];npc.locationId="LOC-CURRENT";npc.encountered=false;
 const out=revealRegistryEntities(s,[{kind:"npc",id:npc.id}],{enforceCausality:true,actionKind:"SOCIAL"});
 assert.equal(out.length,1);assert.equal(npc.known,true);assert.equal(visibilityLevel(s,"npc",npc.id),"KNOWN")
});

test("Lazy plan carries deterministic replay metadata",()=>{
 const s=replayState(),a=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"}),b=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"});
 assert.equal(a.id,b.id);assert.equal(a.generationRevision,1);assert.equal(a.promptVersion,LAZY_PROMPT_VERSION);assert.equal(a.validationVersion,LAZY_VALIDATION_VERSION);
 assert.equal(typeof a.worldSeedFingerprint,"string");assert.ok(a.worldSeedFingerprint.length>0);
 assert.equal(typeof a.entitySeed,"string");assert.ok(a.entitySeed.length>0);
 assert.deepEqual(a.generationSlot,{region:"北境",day:2,evolution:0,reason:"BACKGROUND_GAMEPLAY"});
 assert.deepEqual(a.generatedAtWorldTime,{day:2,totalMinutes:135});
 assert.equal(validateLazyGenerationCandidate(s,{locations:[],npcs:[],factions:[],sideQuests:[]},a).valid,true)
});

test("abort retry reuses deterministic revision; successful commit advances it",()=>{
 const s=replayState(),a=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"});abortLazyGeneration(s,a,"TEST_ABORT");
 const retry=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"});
 assert.equal(retry.id,a.id);assert.equal(retry.entitySeed,a.entitySeed);assert.equal(retry.generationRevision,1);
 const candidate={locations:[],npcs:[],factions:[],sideQuests:[]},committed=commitLazyGeneration(s,retry,candidate,{locations:[],npcs:[],factions:[],sideQuests:[]},{sourceProvider:"openai",sourceModel:"gpt-test"});
 assert.equal(committed.ok,true);assert.equal(committed.replay.generationRevision,1);assert.equal(committed.replay.sourceModel,"gpt-test");
 assert.equal(lazyGenerationSnapshot(s,{director:true}).generationRevision,1);
 const next=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"});assert.equal(next.generationRevision,2);assert.notEqual(next.id,retry.id);assert.notEqual(next.entitySeed,retry.entitySeed)
});

test("Causal Core exposes Director Visibility Lock snapshot",()=>{
 const s=state(),snap=causalWorldCoreSnapshot(s);
 assert.ok(snap.visibilityLocks);assert.ok(snap.visibilityLocks.locations.some(x=>x.id==="LOC-CURRENT"&&x.visibilityLock==="OBSERVED"))
});

test("runtime expansion receives replay metadata and commit receives trusted model identity",async()=>{
 const [client,app,lazy]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8")
 ]);
 for(const key of ["generationRevision","worldSeedFingerprint","entitySeed","generationSlot","promptVersion","validationVersion","generatedAtWorldTime"])assert.match(client,new RegExp(key));
 assert.match(client,/loadAISettings\(\)/);assert.match(client,/generationSource:\{provider:ai\.provider/);
 assert.match(app,/sourceProvider:ex\.generationSource\?\.provider/);assert.match(app,/sourceModel:ex\.generationSource\?\.model/);
 assert.match(lazy,/LAZY_PROMPT_VERSION/);assert.match(lazy,/LAZY_VALIDATION_VERSION/)
});
