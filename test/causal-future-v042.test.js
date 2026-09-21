import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {createFutureSkeleton} from "../src/future-engine.js";
import {advanceFutureSimulation,playerFutureSignals} from "../src/future-runtime.js";
import {ensureHistoryFutureLinks,recordHistoryClueEvidence,unlockedFutureSolutions,applyFutureSolution} from "../src/history-future.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:4,playHours:12,prompt:"因果未來測試"};
function state(){
 const s=newGame(seed);
 s.world.history=[{id:"HIST-WAR",order:1,era:"舊紀",title:"第一次邊境戰爭",category:"WAR",summary:"舊王國曾因補給線崩潰而停戰。",causes:["資源衝突"],legacies:["補給線是戰爭弱點"],regions:["北境"],factions:["赤衛團"],discoverKeywords:["舊補給塔","停戰記錄"],canonical:true,mutable:false}];
 s.world.registry.factions=[{id:"FAC-RED",name:"赤衛團",goal:"控制北境",known:true,relations:{},worldState:{stability:50,statusTags:[]}}];
 s.world.registry.locations=[{id:"LOC-NORTH",name:"北境關口",region:"北境",known:true,worldState:{safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]}}];
 s.world.timeline=[{id:"TL-WAR",title:"第二次邊境戰爭",category:"WAR",earliestDay:2,latestDay:8,triggerDay:4,baseTriggerDay:4,impactOffsetDays:0,intensityModifier:0,impactHistory:[],directorTruth:"赤衛團準備利用糧荒開戰",observableEffect:"北境開始徵用糧車並封閉部分道路。",pressure:8,links:{historyRefs:["HIST-WAR"],locationRefs:["LOC-NORTH"]},activationConditions:[],cancelConditions:[],escalationConditions:[],playerCanPrevent:true,playerCanAccelerate:true,status:"SCHEDULED"}];
 createFutureSkeleton(s,{id:"FUT-TL-WAR",title:"第二次邊境戰爭",pressure:10,earliestDay:2,latestDay:8,historicalLinks:["HIST-WAR"],impactScope:"NATIONAL",intensity:60,domains:["SECURITY","FACTION"],playerCanPrevent:true,playerCanMitigate:true,playerCanRedirect:true,playerCanAccelerate:true});
 return s
}

test("Faction simulation pressure only affects causally linked Futures",()=>{
 const s=state();ensureHistoryFutureLinks(s);
 s.events.push({id:"EV-FAC",type:"FACTION_ACTION",visibility:"INTERNAL",factionId:"FAC-RED",strategy:"MOBILIZE",summary:"赤衛團動員",day:1,at:1});
 const before=s.world.futures.find(x=>x.id==="FUT-TL-WAR").pressure;
 const out=advanceFutureSimulation(s),future=s.world.futures.find(x=>x.id==="FUT-TL-WAR");
 assert.equal(future.pressure,before+8);
 assert.ok(out.changes.some(x=>x.source==="EV-FAC"&&x.futureId===future.id));
 assert.equal(future.stage,"EMERGING")
});

test("Triggered Timeline forces its Future active, emits diegetic foreshadowing and becomes new History",()=>{
 const s=state(),beforeHistory=s.world.history.length;
 s.events.push({id:"EV-TL",type:"WORLD_EVENT",visibility:"OBSERVABLE",subtype:"TIMELINE_EVENT",timelineId:"TL-WAR",summary:"北境開始徵用糧車並封閉部分道路。",day:4,at:4});
 const out=advanceFutureSimulation(s),future=s.world.futures.find(x=>x.id==="FUT-TL-WAR");
 assert.ok(future.pressure>=80);assert.equal(future.stage,"ACTIVE");
 assert.ok(out.signals.some(x=>x.futureId===future.id));
 assert.ok(playerFutureSignals(s).some(x=>x.summary.includes("徵用糧車")));
 assert.equal(s.world.history.length,beforeHistory+1);
 assert.ok(s.world.history.some(x=>x.ledgerRef));
 assert.ok(s.world.ledger.entries.some(x=>x.sourceEventId==="EV-TL"&&x.significance==="MAJOR"))
});

test("History clues become strategic knowledge that unlocks Future interventions",()=>{
 const s=state();const links=ensureHistoryFutureLinks(s);
 const history=links.history.find(x=>x.id==="HIST-WAR"),clue=history.clues[0];
 assert.equal(clue.status,"UNDISCOVERED");
 const e=recordHistoryClueEvidence(s,{historyId:history.id,clueId:clue.id,evidenceType:"DOCUMENT",text:"軍需簿證明舊戰爭因補給塔失守而停止。",sourceIndependence:1,verifiedByEngine:true});
 assert.equal(e.ok,true);assert.equal(clue.status,"VERIFIED");
 const future=s.world.futures.find(x=>x.id==="FUT-TL-WAR"),solutions=unlockedFutureSolutions(s,future.id);
 const mitigate=solutions.find(x=>x.type==="MITIGATE");assert.ok(mitigate?.unlocked);
 const before=future.pressure,result=applyFutureSolution(s,future.id,mitigate.id);
 assert.equal(result.ok,true);assert.ok(future.pressure<before);assert.ok(future.intensity<60);
 assert.ok(s.events.some(x=>x.type==="FUTURE_INTERVENTION"&&x.action==="MITIGATE"))
});

test("Timeline impacts alter Future Pressure through deterministic Engine rules",()=>{
 const s=state(),future=s.world.futures.find(x=>x.id==="FUT-TL-WAR");future.pressure=50;
 s.world.timeline[0].impactHistory.push({day:2,action:"DELAY",beforeDay:4,afterDay:6});
 advanceFutureSimulation(s);
 assert.equal(future.pressure,42);
 s.world.timeline[0].impactHistory.push({day:2,action:"STRENGTHEN",beforeDay:6,afterDay:6});
 advanceFutureSimulation(s);
 assert.equal(future.pressure,48)
});

test("Player-facing Future signals never expose Director hidden cause or internal title",()=>{
 const s=state(),future=s.world.futures.find(x=>x.id==="FUT-TL-WAR");future.hiddenCause="SECRET-CAUSE-XYZ";future.title="SECRET-TITLE-XYZ";
 s.events.push({id:"EV-FAC-2",type:"FACTION_ACTION",visibility:"INTERNAL",factionId:"FAC-RED",strategy:"MOBILIZE",summary:"動員",day:1,at:2});
 advanceFutureSimulation(s);
 const serialized=JSON.stringify(playerFutureSignals(s));
 assert.doesNotMatch(serialized,/SECRET-CAUSE-XYZ/);assert.doesNotMatch(serialized,/SECRET-TITLE-XYZ/)
});

test("Verified history can redirect scope instead of only cancelling a Future",()=>{
 const s=state(),history=s.world.history[0];ensureHistoryFutureLinks(s);
 const clue=history.clues[0];recordHistoryClueEvidence(s,{historyId:history.id,clueId:clue.id,evidenceType:"ARTIFACT",text:"舊補給塔控制核心仍可使用。",verifiedByEngine:true,sourceIndependence:1});
 const future=s.world.futures.find(x=>x.id==="FUT-TL-WAR"),redirect=unlockedFutureSolutions(s,future.id).find(x=>x.type==="REDIRECT");
 const before=future.impactScope,result=applyFutureSolution(s,future.id,redirect.id);
 assert.equal(result.ok,true);assert.equal(before,"NATIONAL");assert.equal(future.impactScope,"REGIONAL")
});
