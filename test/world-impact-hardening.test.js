import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {advanceTime} from "../src/world-clock.js";
import {applyWorldImpacts,ensureWorldImpact,impactCapability,processDueConsequences,revealTriggeredConsequences} from "../src/world-impact.js";
import {effectiveTriggerDay,triggerDueTimelineEvents,applyTimelineImpact} from "../src/world-timeline.js";
import {migrateSave} from "../src/storage.js";
import {validateSaveState} from "../src/state-validator.js";

const seed={genre:"黑暗奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:"因果必須由 Engine 驗證"};
function world(){
 const s=newGame(seed);
 canonizeGeneration(s,{locations:[
  {name:"石橋鎮",type:"聚落",region:"河谷",description:"河谷聚落",known:true},
  {name:"遠港",type:"港口",region:"海岸",description:"遙遠港口",known:true}
 ],factions:[{name:"河岸盟",goal:"控制渡口",description:"地方勢力",known:true}],npcs:[
  {name:"米拉",role:"渡船人",description:"熟悉河道",known:true}
 ]});
 const a=s.world.registry.locations[0],b=s.world.registry.locations[1],n=s.world.registry.npcs[0],f=s.world.registry.factions[0];
 n.locationId=a.id;n.factionId=f.id;s.player.location=a.name;s.world.state.location=a.name;
 return {s,a,b,n,f}
}

test("LOCAL delayed consequence cannot mutate WORLD authority",()=>{
 const {s,a}=world(),before=s.world.state.simulation.tension;
 const out=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:a.id,title:"修復堤岸",summary:"玩家完成了地方性的堤岸修復。",mutations:[{field:"infrastructure",op:"DELTA",value:3}],consequences:[{delayMinutes:60,targetKind:"world",targetId:"WORLD",observableEffect:"整個世界的危機下降。",mutations:[{field:"tension",op:"DELTA",value:-12}]}]}],{roll:{success:true}});
 assert.equal(out.length,1);
 assert.equal(ensureWorldImpact(s).queue.length,0);
 advanceTime(s,60);processDueConsequences(s);
 assert.equal(s.world.state.simulation.tension,before)
});

test("invalid delayed mutation cannot create phantom influence",()=>{
 const {s,a}=world(),before=impactCapability(s).impactCount;
 const out=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:a.id,title:"空洞承諾",summary:"這個候選沒有任何可執行的世界狀態變化。",consequences:[{delayMinutes:60,targetKind:"location",targetId:a.id,observableEffect:"理論上會改變甚麼。",mutations:[{field:"notAField",op:"DELTA",value:9}]}]}],{roll:{success:true}});
 assert.equal(out.length,0);assert.equal(impactCapability(s).impactCount,before);assert.equal(ensureWorldImpact(s).queue.length,0)
});

test("failed roll cannot create positive durable local result",()=>{
 const {s,a}=world(),before=a.worldState.infrastructure;
 const out=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:a.id,title:"修橋失敗",summary:"修橋行動沒有成功完成。",mutations:[{field:"infrastructure",op:"DELTA",value:12}]}],{roll:{success:false}});
 assert.equal(out.length,0);assert.equal(a.worldState.infrastructure,before)
});

test("failed roll may record a real cost without granting success",()=>{
 const {s,a}=world(),before=a.worldState.safety;
 const out=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:a.id,title:"施工事故",summary:"修復失敗並令現場變得更加危險。",outcome:"COST",mutations:[{field:"safety",op:"DELTA",value:-6},{field:"statusTag",op:"ADD_TAG",value:"結構不穩"}]}],{roll:{success:false}});
 assert.equal(out.length,1);assert.equal(a.worldState.safety,before-6);assert.ok(a.worldState.statusTags.includes("結構不穩"))
});

test("pending consequences are never silently evicted after forty",()=>{
 const {s,a}=world();
 for(let i=0;i<45;i++)applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:a.id,title:"排程 "+i,summary:"建立一個仍未到期而且必須保留的地方後果。",consequences:[{delayMinutes:300+i,targetKind:"location",targetId:a.id,observableEffect:"排程後果 "+i,mutations:[{field:"supply",op:"DELTA",value:i%2?1:-1}]}]}],{roll:{success:true}});
 const q=ensureWorldImpact(s).queue.filter(x=>x.status==="SCHEDULED");assert.equal(q.length,45)
});

test("remote consequence changes state but does not leak until observed locally",()=>{
 const {s,b}=world(),before=b.worldState.supply;
 applyWorldImpacts(s,[{scope:"WORLD",targetKind:"location",targetId:b.id,title:"遠港封鎖",summary:"一項世界級行動影響到遠方港口。",mutations:[{field:"supply",op:"DELTA",value:-1}],consequences:[{delayMinutes:60,targetKind:"location",targetId:b.id,observableEffect:"遠港的補給進一步惡化。",mutations:[{field:"supply",op:"DELTA",value:-4}]}]}],{roll:{success:true}});
 // force capability for this isolated authorization test
 const impact=ensureWorldImpact(s);impact.records.push(...Array.from({length:6},(_,i)=>({id:"seed"+i,type:"PLAYER_IMPACT",visibility:"PLAYER_KNOWN",scope:"LOCAL",targetKind:"location",targetId:b.id,changes:[]})));
 s.player.knowledgeScore=20;s.world.state.crisis={stage:"CRISIS",pressure:90,history:[]};
 // schedule directly through a now-authorized second impact
 applyWorldImpacts(s,[{scope:"WORLD",targetKind:"location",targetId:b.id,title:"遠港連鎖",summary:"遠方港口將出現延遲後果。",mutations:[{field:"supply",op:"DELTA",value:-1}],consequences:[{delayMinutes:60,targetKind:"location",targetId:b.id,observableEffect:"遠港補給線中斷。",mutations:[{field:"supply",op:"DELTA",value:-4}]}]}],{roll:{success:true}});
 advanceTime(s,60);const due=processDueConsequences(s);assert.ok(due.length>=1);assert.equal(due.at(-1).visibility,"INTERNAL");assert.equal(revealTriggeredConsequences(s).length,0);
 s.player.location=b.name;s.world.state.location=b.name;assert.ok(revealTriggeredConsequences(s).length>=1);assert.ok(b.worldState.supply<before)
});

test("timeline impacts stay inside event window and due events trigger by effective day",()=>{
 const {s}=world();s.world.state.day=5;
 s.world.timeline=[
  {id:"A",earliestDay:5,latestDay:7,triggerDay:6,baseTriggerDay:6,impactOffsetDays:0,intensityModifier:0,impactHistory:[],pressure:5,status:"SCHEDULED"},
  {id:"B",earliestDay:5,latestDay:10,triggerDay:5,baseTriggerDay:5,impactOffsetDays:3,intensityModifier:0,impactHistory:[],pressure:5,status:"SCHEDULED"}
 ];
 applyTimelineImpact(s,{timelineId:"A",action:"DELAY",days:5});assert.equal(effectiveTriggerDay(s.world.timeline[0]),7);
 s.world.state.day=8;const due=triggerDueTimelineEvents(s);assert.equal(due.id,"A")
});

test("future save versions are rejected and malformed impact state fails validation",()=>{
 const {s}=world();s.formatVersion=999;assert.throws(()=>migrateSave(s),/SAVE_VERSION_TOO_NEW/);
 const {s:fresh}=world();fresh.world.impact={version:2,influence:{personal:0,local:0,regional:0,faction:0,world:0},records:[],queue:[{id:"bad",parentImpactId:"x",scope:"LOCAL",targetKind:"world",targetId:"WORLD",status:"SCHEDULED",dueMinute:-1,mutations:[],observableAtLocationIds:[]}]};
 assert.equal(validateSaveState(fresh).valid,false)
});
