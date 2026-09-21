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
function grantVerifiedKnowledge(state,count=6){
 state.player.knowledgeScore=0;
 for(let i=0;i<count;i++){const id="FACT-AUTH-"+i;state.world.canon.facts.push({id,type:"public",visibility:"public",text:"可驗證世界知識 "+i+" 的完整說明。",canonical:true});state.knowledge.push({id:"K-AUTH-"+i,title:"世界知識 "+i,text:"可驗證世界知識 "+i+" 的完整說明。",factId:id,status:"VERIFIED",score:3});state.player.knowledgeScore+=3}
}
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
 grantVerifiedKnowledge(s);s.world.state.crisis={stage:"CRISIS",pressure:90,history:[]};
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

test("future or malformed save versions are rejected and malformed impact state fails validation",()=>{
 const {s}=world();s.formatVersion=999;assert.throws(()=>migrateSave(s),/SAVE_VERSION_TOO_NEW/);const malformed=world().s;malformed.formatVersion="future";assert.throws(()=>migrateSave(malformed),/SAVE_VERSION_INVALID/);
 const {s:fresh}=world();fresh.world.impact={version:2,influence:{personal:0,local:0,regional:0,faction:0,world:0},records:[],queue:[{id:"bad",parentImpactId:"x",scope:"LOCAL",targetKind:"world",targetId:"WORLD",status:"SCHEDULED",dueMinute:-1,mutations:[],observableAtLocationIds:[]}]};
 assert.equal(validateSaveState(fresh).valid,false)
});

test("unverified knowledgeScore or non-VERIFIED fact references cannot unlock higher impact scopes",()=>{
 const {s}=world(),impact=ensureWorldImpact(s);impact.records.push(...Array.from({length:6},(_,i)=>({id:"seed-auth-"+i,type:"PLAYER_IMPACT",visibility:"PLAYER_KNOWN",scope:"LOCAL",targetKind:"location",targetId:s.world.registry.locations[0].id,changes:[]})));s.world.state.crisis={stage:"CRISIS",pressure:90,history:[]};s.player.knowledgeScore=99;
 assert.equal(impactCapability(s).maxScope,"LOCAL");s.world.canon.facts.push({id:"FACT-PARTIAL",type:"public",visibility:"public",text:"合法 Canon 但未完成驗證。",canonical:true});s.knowledge.push({id:"K-PARTIAL",title:"未確認",text:"仍然只是未確認情報。",factId:"FACT-PARTIAL",status:"PARTIAL",score:99});assert.equal(impactCapability(s).maxScope,"LOCAL");grantVerifiedKnowledge(s);assert.equal(impactCapability(s).maxScope,"WORLD")
});

test("FACTION consequence cannot jump from its parent faction to another faction",()=>{
 const {s,a}=world();canonizeGeneration(s,{factions:[{name:"山脊會",goal:"控制山道",description:"第二勢力",known:true}]});const first=s.world.registry.factions[0],second=s.world.registry.factions[1];
 grantVerifiedKnowledge(s);const impact=ensureWorldImpact(s);impact.records.push(...Array.from({length:4},(_,i)=>({id:"seed-fac-"+i,type:"PLAYER_IMPACT",visibility:"PLAYER_KNOWN",scope:"LOCAL",targetKind:"location",targetId:a.id,changes:[]})));
 const out=applyWorldImpacts(s,[{scope:"FACTION",targetKind:"faction",targetId:first.id,title:"重整河岸盟",summary:"玩家對單一勢力造成持久影響。",mutations:[{field:"influence",op:"DELTA",value:2}],consequences:[{delayMinutes:60,targetKind:"faction",targetId:second.id,observableEffect:"另一勢力不應被 parent consequence 橫向修改。",mutations:[{field:"resources",op:"DELTA",value:-3}]}]}],{roll:{success:true}});
 assert.equal(out.length,1);assert.equal(out[0].queuedConsequences.length,0)
});
