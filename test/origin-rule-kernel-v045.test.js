import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {applyOriginRuntime,originNpcContext,originRuntimeSnapshot,originOpeningContract} from "../src/origin-runtime.js";
import {registerDocument,canReadDocument} from "../src/document-engine.js";
import {fallbackWorldEvaluation} from "../src/world-quality.js";
import {buildSnapshot} from "../src/adventure-engine.js";

function make(originType,difficulty="normal"){
 const seed=compileWorldCreation(createWorldCreationDraft({worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:12,difficulty,originType,playerRole:"ordinary",masterSeed:"origin-"+originType+"-"+difficulty}));
 const s=newGame(seed);applyWorldCreationState(s,seed);
 s.world.name="艾蘭達";s.world.bible={startingRegion:"北境",startingSettlement:"門城",startingLocation:"北門",weatherSystem:{phenomena:[]}};
 s.world.state.region="北境";s.world.state.location="北門";s.player.location="北門";
 s.world.registry.locations=[{id:"LOC-NORTH",name:"北門",type:"關口",region:"北境",description:"石造城門",known:false,worldState:{safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]}}];
 s.world.canon.facts.push(
  {id:"F-LOCAL",type:"public",visibility:"public",text:"北門是門城通往北境舊路的主要關口。",canonical:true},
  {id:"F-LAW",type:"public",visibility:"public",text:"門城居民以鐘聲區分夜間戒嚴時段。",canonical:true},
  {id:"F-MARKET",type:"public",visibility:"public",text:"門城每五日有一次公開市集。",canonical:true}
 );
 return s
}

test("crossing Origin becomes real zero-local-knowledge Engine rules",()=>{
 const s=make("crossing");const pre=originRuntimeSnapshot(s,{director:true});
 assert.equal(pre.knowledgePolicy,"EARTH_ONLY");assert.equal(pre.equipmentPolicy,"NONE");assert.equal(pre.spawnPolicy,"UNREGISTERED_ARRIVAL");
 applyOriginRuntime(s,{phase:"POST_CANON"});
 assert.equal(s.player.worldNameKnown,false);assert.equal(s.player.calendarKnown,false);assert.deepEqual(s.player.spokenLanguages,[]);assert.deepEqual(s.player.languages,[]);
 assert.equal(s.player.identity.legalStatus,"NONE");assert.equal(s.world.registry.locations[0].known,false);
 assert.equal(s.knowledge.filter(x=>x.status==="VERIFIED").length,0);
 const doc=registerDocument(s,{title:"門城告示",language:"COMMON",claims:[{text:"今晚戒嚴。"}]});assert.equal(canReadDocument(s,doc.id).ok,false);
 const npc={id:"NPC-1",name:"守衛",role:"守衛",trust:7};const before=npc.trust,ctx=originNpcContext(s,npc);
 assert.equal(ctx.languageMode,"GESTURE");assert.equal(ctx.reaction,"UNREGISTERED_OUTSIDER");assert.equal(npc.trust,before)
});

test("native Origin grants bounded local knowledge, local identity and language",()=>{
 const s=make("native");applyOriginRuntime(s,{phase:"POST_CANON"});
 assert.equal(s.player.worldNameKnown,true);assert.equal(s.player.calendarKnown,true);
 assert.ok(s.player.spokenLanguages.includes("COMMON"));assert.ok(s.player.languages.includes("COMMON"));
 assert.equal(s.player.identity.legalStatus,"LOCAL");assert.equal(s.world.registry.locations[0].known,true);
 const verified=s.knowledge.filter(x=>x.status==="VERIFIED");assert.ok(verified.length>=1&&verified.length<=6);assert.ok(verified.some(x=>x.factId==="F-LOCAL"));
 const doc=registerDocument(s,{title:"門城告示",language:"COMMON",claims:[{text:"今晚戒嚴。"}]});assert.equal(canReadDocument(s,doc.id).ok,true);
 const ctx=originNpcContext(s,{id:"NPC-1",name:"鄰居",role:"居民"});assert.equal(ctx.languageMode,"FLUENT");assert.equal(ctx.reaction,"FAMILIAR_BASELINE")
});

test("difficulty can preserve spoken language while making native literacy harder",()=>{
 const s=make("native","hard");applyOriginRuntime(s,{phase:"POST_CANON"});
 assert.ok(s.player.spokenLanguages.includes("COMMON"));assert.equal(s.player.languages.includes("COMMON"),false);
 const ctx=originNpcContext(s,{id:"NPC-1",name:"店員",role:"商人"});assert.equal(ctx.languageMode,"FLUENT");
 const doc=registerDocument(s,{title:"稅務冊",language:"COMMON",claims:[{text:"稅額。"}]});assert.equal(canReadDocument(s,doc.id).reason,"LANGUAGE_UNKNOWN")
});

test("amnesia retains fragmented speech ability without auto-granting world truth",()=>{
 const s=make("amnesia");applyOriginRuntime(s,{phase:"POST_CANON"});
 assert.equal(s.player.worldNameKnown,false);assert.equal(s.player.calendarKnown,false);assert.equal(s.knowledge.filter(x=>x.status==="VERIFIED").length,0);
 assert.ok(s.player.spokenLanguages.includes("COMMON"));assert.equal(s.player.languages.includes("COMMON"),false);
 const ctx=originNpcContext(s,{id:"NPC-1",name:"陌生人"});assert.equal(ctx.languageMode,"FRAGMENTED");assert.equal(ctx.reaction,"UNCERTAIN_IDENTITY")
});

test("summoned Origin is briefed partial rather than globally omniscient",()=>{
 const s=make("summoned");applyOriginRuntime(s,{phase:"POST_CANON"});
 assert.equal(s.player.identity.legalStatus,"SPONSOR_DEPENDENT");assert.equal(s.player.worldNameKnown,true);assert.equal(s.player.calendarKnown,false);
 assert.ok(s.knowledge.filter(x=>x.status==="VERIFIED").length<=2);
 const ctx=originNpcContext(s,{id:"NPC-1",name:"宮廷侍從"});assert.equal(ctx.reaction,"SPONSOR_RECOGNITION_POSSIBLE")
});

test("Origin opening contract exposes Engine permissions rather than prose guesses",()=>{
 const crossing=make("crossing"),native=make("native");applyOriginRuntime(crossing,{phase:"POST_CANON"});applyOriginRuntime(native,{phase:"POST_CANON"});
 const a=originOpeningContract(crossing),b=originOpeningContract(native);
 assert.equal(a.openingMode,"ZERO_LOCAL_KNOWLEDGE");assert.equal(a.worldNameKnown,false);
 assert.equal(b.openingMode,"LOCAL_BASELINE");assert.equal(b.worldNameKnown,true);assert.equal(b.spawnPolicy,"LOCAL_HOME_OR_DUTY")
});

test("World Quality only flags names that exceed that Origin knowledge boundary",()=>{
 const base={worldName:"潮界",worldTheme:"天空潮汐",openingHook:"你在潮界的潮門聽見急促鐘聲。",worldBible:{startingLocation:"潮門",magicCost:"每次施術都會失去一段近期記憶，直到完成儀式才能恢復。"},generation:{locations:[],npcs:[],factions:[]}};
 const crossing=fallbackWorldEvaluation({...base,originOpening:{knowledgePolicy:"EARTH_ONLY",worldNameKnown:false}},{stages:{}});
 const native=fallbackWorldEvaluation({...base,originOpening:{knowledgePolicy:"LOCAL_BASELINE",worldNameKnown:true}},{stages:{}});
 assert.ok(crossing.findings.some(x=>x.targetType==="KNOWLEDGE_BOUNDARY"));
 assert.equal(native.findings.some(x=>x.targetType==="KNOWLEDGE_BOUNDARY"),false)
});

test("turn snapshot carries Engine Origin runtime and creation pipeline applies PRE/POST phases",async()=>{
 const s=make("native");applyOriginRuntime(s,{phase:"POST_CANON"});const snap=buildSnapshot(s);
 assert.equal(snap.player.originRuntime.identitySignal,"LOCAL");assert.ok(snap.player.originRuntime.spokenLanguages.includes("COMMON"));
 const [creation,app,client]=await Promise.all([readFile(new URL("../src/world-creation.js",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")]);
 assert.match(creation,/applyOriginRuntime\(state,\{phase:"PRE_WORLD"\}\)/);
 assert.match(app,/applyOriginRuntime\(gameState,\{phase:"POST_CANON"\}\)/);
 assert.match(client,/originContext=originNpcContext\(state,npc\)/);assert.match(client,/languageMode=GESTURE/)
});
