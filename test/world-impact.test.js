import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {applyWorldImpacts,ensureWorldImpact,impactCapability,impactSnapshot,processDueConsequences,validateImpactCandidate} from "../src/world-impact.js";
import {advanceTime} from "../src/world-clock.js";
import {tickWorld} from "../src/world-simulation.js";
import {migrateSave} from "../src/storage.js";
import {validateSaveState} from "../src/state-validator.js";

const seed={genre:"黑暗奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:"玩家的行動必須留下因果痕跡"};

function grantKnowledge(s,count=3,score=3){
 for(let i=0;i<count;i++){const id="FACT-WI-"+i;s.world.canon.facts.push({id,type:"public",visibility:"public",text:"已驗證區域知識 "+i+" 的完整內容。",canonical:true});s.knowledge.push({id:"K-WI-"+i,title:"區域知識 "+i,text:"已驗證區域知識 "+i+" 的完整內容。",factId:id,status:"VERIFIED",score});s.player.knowledgeScore+=score}
}
function localWorld(){
 const s=newGame(seed);
 canonizeGeneration(s,{locations:[{name:"石橋鎮",type:"聚落",region:"河谷",description:"沿河而建的聚落",known:true}],factions:[{name:"河岸盟",goal:"控制渡口",description:"地方勢力",known:true}],npcs:[{name:"米拉",role:"渡船人",description:"熟悉河道",known:true}]});
 s.player.location="石橋鎮";s.world.state.location="石橋鎮";return s
}

test("local player impact mutates current state and appends immutable impact history",()=>{
 const s=localWorld(),loc=s.world.registry.locations[0];
 const applied=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:"CURRENT_LOCATION",title:"重開渡口",summary:"你清除了堵塞渡口的障礙，居民重新可以通行。",reason:"行動成功直接恢復交通",mutations:[{field:"infrastructure",op:"DELTA",value:10},{field:"safety",op:"DELTA",value:6},{field:"statusTag",op:"ADD_TAG",value:"渡口重開"}]}],{roll:{success:true}});
 assert.equal(applied.length,1);assert.equal(loc.worldState.infrastructure,60);assert.equal(loc.worldState.safety,56);assert.ok(loc.worldState.statusTags.includes("渡口重開"));
 assert.equal(ensureWorldImpact(s).records[0].type,"PLAYER_IMPACT");assert.ok(s.events.some(e=>e.type==="WORLD_IMPACT"));
});

test("impact engine refuses unknown targets and excessive early-game scope",()=>{
 const s=localWorld();
 assert.equal(applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"faction",targetId:"FAC-NOT-KNOWN",title:"不存在",summary:"這個改變不應該被接受進世界狀態。",mutations:[{field:"influence",op:"DELTA",value:-10}]}],{roll:{success:true}}).length,0);
 assert.equal(applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"world",targetId:"WORLD",title:"地方行動越權",summary:"地方級影響不能直接修改整個世界的全局狀態。",mutations:[{field:"tension",op:"DELTA",value:-5}]}],{roll:{success:true}}).length,0);
 assert.equal(applyWorldImpacts(s,[{scope:"WORLD",targetKind:"world",targetId:"WORLD",title:"改變全世界",summary:"開局不能因一句話就直接改變整個世界。",mutations:[{field:"tension",op:"DELTA",value:-30}]}],{roll:{success:true}}).length,0);
 assert.equal(impactCapability(s).maxScope,"LOCAL");
});

test("regional influence unlocks through accumulated knowledge and prior impact",()=>{
 const s=localWorld();grantKnowledge(s,3,3);
 for(let i=0;i<2;i++)applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:"CURRENT_LOCATION",title:"地方改善 "+i,summary:"玩家完成了一項能夠被居民確認的地方改善行動。",mutations:[{field:"prosperity",op:"DELTA",value:1}]}],{roll:{success:true}});
 assert.equal(impactCapability(s).maxScope,"REGIONAL");
});

test("delayed consequences fire from world time instead of the original turn",()=>{
 const s=localWorld(),loc=s.world.registry.locations[0];
 applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:loc.id,title:"修復水渠",summary:"你完成了水渠的緊急修復，但農田恢復需要時間。",mutations:[{field:"infrastructure",op:"DELTA",value:5}],consequences:[{delayMinutes:60,targetKind:"location",targetId:loc.id,observableEffect:"水流重新到達農田，缺水情況開始緩解。",mutations:[{field:"supply",op:"DELTA",value:8},{field:"statusTag",op:"ADD_TAG",value:"供水恢復"}]}]}],{roll:{success:true}});
 assert.equal(loc.worldState.supply,50);advanceTime(s,59);assert.equal(processDueConsequences(s).length,0);advanceTime(s,1);const due=processDueConsequences(s);assert.equal(due.length,1);assert.equal(loc.worldState.supply,58);assert.ok(loc.worldState.statusTags.includes("供水恢復"));assert.ok(s.events.some(e=>e.type==="WORLD_CONSEQUENCE"));
});

test("player can alter future timeline timing without rewriting the base event",()=>{
 const s=localWorld();grantKnowledge(s,3,3);
 applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:"CURRENT_LOCATION",title:"建立情報網",summary:"你建立了一個可靠的地方情報網絡。",mutations:[{field:"stability",op:"DELTA",value:1}]}],{roll:{success:true}});
 applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:"CURRENT_LOCATION",title:"保護補給站",summary:"你讓地方補給站能繼續正常運作。",mutations:[{field:"supply",op:"DELTA",value:1}]}],{roll:{success:true}});
 s.world.timeline=[{id:"TL-war",title:"進軍",category:"WAR",earliestDay:5,latestDay:8,triggerDay:6,baseTriggerDay:6,impactOffsetDays:0,intensityModifier:0,impactHistory:[],directorTruth:"軍隊原定在第六日進軍",observableEffect:"遠方道路出現軍隊活動",pressure:8,status:"SCHEDULED",triggeredDay:null}];
 const result=applyWorldImpacts(s,[{scope:"REGIONAL",targetKind:"location",targetId:"CURRENT_LOCATION",title:"切斷軍隊補給",summary:"你破壞了區域補給網，使原定行動無法按原計劃展開。",mutations:[{field:"supply",op:"DELTA",value:-8}],timelineEffects:[{timelineId:"TL-war",action:"DELAY",days:3},{timelineId:"TL-war",action:"WEAKEN",amount:3}]}],{roll:{success:true}});
 assert.equal(result.length,1);assert.equal(s.world.timeline[0].baseTriggerDay,6);assert.equal(s.world.timeline[0].triggerDay,6);assert.equal(s.world.timeline[0].impactOffsetDays,2);assert.equal(s.world.timeline[0].intensityModifier,-3);
});

test("failed roll cannot escalate a proposed impact above local scope",()=>{
 const s=localWorld();grantKnowledge(s,7,3);ensureWorldImpact(s).records=Array.from({length:8},(_,i)=>({id:"I"+i,type:"PLAYER_IMPACT",visibility:"PLAYER_KNOWN",scope:"LOCAL",title:"舊影響",summary:"過去已完成的地方改變",day:1}));
 s.world.state.crisis={stage:"CRISIS",pressure:90,lastStageDay:1,history:[]};
 assert.equal(impactCapability(s).maxScope,"WORLD");
 const out=applyWorldImpacts(s,[{scope:"WORLD",targetKind:"world",targetId:"WORLD",title:"失敗卻改變世界",summary:"失敗行動不應直接造成世界級主動改變。",mutations:[{field:"tension",op:"DELTA",value:-20}]}],{roll:{success:false}});
 assert.equal(out.length,0);
});

test("impact snapshot gives Director current mutable state and recent player consequences",()=>{
 const s=localWorld();applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:"CURRENT_LOCATION",title:"加固橋樑",summary:"橋樑獲得實際加固，之後通行會更安全。",mutations:[{field:"infrastructure",op:"DELTA",value:7}]}],{roll:{success:true}});
 const snap=impactSnapshot(s,{director:true});assert.equal(snap.entityStates.locations[0].state.infrastructure,57);assert.equal(snap.recent.at(-1).title,"加固橋樑");assert.ok(snap.capability.allowedScopes.includes("LOCAL"));
});

test("save format v11 preserves impact runtime and initializes recognition",()=>{
 const s=localWorld();s.formatVersion=6;delete s.world.impact;for(const x of s.world.registry.locations)delete x.worldState;
 const m=migrateSave(s);assert.equal(m.formatVersion,11);assert.ok(m.world.impact);assert.ok(m.world.recognition);assert.equal(m.world.registry.locations[0].worldState.infrastructure,50);assert.equal(validateSaveState(m).valid,true);
});

test("invalid impact candidate is rejected before mutation",()=>{
 assert.equal(validateImpactCandidate([{scope:"GALAXY",targetKind:"world",targetId:"WORLD",title:"錯誤",summary:"這個 scope 並不存在於遊戲規則。"}]).valid,false);
});
