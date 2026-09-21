import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {
 createGenerationDiagnostics,recordGenerationStage,finalizeGenerationDiagnostics,
 normalizeWorldEvaluation,fallbackWorldEvaluation,applyWorldRepairPatch,
 validateExpansionProvenance,worldEvolutionNeed,markWorldEvolution
} from "../src/world-quality.js";

test("generation diagnostics separates structural success from fallback degradation",()=>{
 const d=createGenerationDiagnostics();
 recordGenerationStage(d,"IDENTITY",{source:"AI",latencyMs:12});
 recordGenerationStage(d,"CORE_RULES",{source:"FALLBACK",reason:"AI_TIMEOUT",latencyMs:50000,fallbackUsed:true});
 const out=finalizeGenerationDiagnostics(d);
 assert.equal(out.summary.aiSucceeded,1);
 assert.equal(out.summary.fallbackCount,1);
 assert.equal(out.quality,"DEGRADED")
});

test("critic normalization keeps structured repair targets",()=>{
 const q=normalizeWorldEvaluation({
  overall:62,
  dimensions:{magicSystem:30,futureEvents:45},
  findings:[{severity:"HIGH",targetType:"MAGIC_SYSTEM",problem:"代價太抽象",recommendation:"改成具體代價",requiresRegeneration:true}]
 },{source:"AI"});
 assert.equal(q.status,"REPAIR_REQUIRED");
 assert.equal(q.repairTargets[0],"MAGIC_SYSTEM")
});

test("repair patch cannot retcon identity history timeline windows or provenance",()=>{
 const base={
  worldName:"潮界",worldTheme:"天空潮",seedCompliance:{theme:{value:"天空潮"}},
  worldHistory:[{id:"HIST-1",title:"舊史"}],worldCalendar:{name:"潮曆"},
  worldBible:{startingRegion:"灰岸",startingSettlement:"燈港",startingLocation:"潮門",magicCost:"舊代價"},
  worldTimeline:[{id:"TL-1",earliestDay:2,latestDay:4,links:{historyRefs:["HIST-1"]},title:"舊事件"}],
  generation:{npcs:[{name:"米拉",historyRefs:["HIST-1"],description:"舊描述"}]}
 };
 const out=applyWorldRepairPatch(base,{patch:{
  worldName:"被改名",worldHistory:[{id:"HIST-X"}],
  worldBible:{startingLocation:"別處",magicCost:"每次施術失去一段近期記憶"},
  worldTimeline:[{earliestDay:99,links:{historyRefs:["HIST-X"]},title:"新事件"}],
  generation:{npcs:[{name:"另一人",historyRefs:["HIST-X"],description:"新描述"}]}
 }});
 assert.equal(out.worldName,"潮界");
 assert.equal(out.worldHistory[0].id,"HIST-1");
 assert.equal(out.worldBible.startingLocation,"潮門");
 assert.equal(out.worldBible.magicCost,"每次施術失去一段近期記憶");
 assert.equal(out.worldTimeline[0].earliestDay,2);
 assert.deepEqual(out.worldTimeline[0].links.historyRefs,["HIST-1"]);
 assert.equal(out.generation.npcs[0].name,"米拉");
 assert.deepEqual(out.generation.npcs[0].historyRefs,["HIST-1"]);
 assert.equal(out.generation.npcs[0].description,"新描述")
});

test("fallback critic detects knowledge leak and generic future events",()=>{
 const d=createGenerationDiagnostics();
 recordGenerationStage(d,"FUTURE",{source:"FALLBACK",reason:"AI_TIMEOUT",fallbackUsed:true});
 const q=fallbackWorldEvaluation({
  worldName:"潮界",worldTheme:"天空潮",openingHook:"你在潮門醒來，這是潮界。",
  worldBible:{startingLocation:"潮門",magicCost:"任何超常力量都必須支付與世界主題相關的代價"},
  worldTimeline:[
   {observableEffect:"逐步出現可被居民察覺的變化"},
   {observableEffect:"逐步出現可被居民察覺的變化"}
  ],
  generation:{locations:[{name:"潮門"}],npcs:[],factions:[]}
 },d);
 assert.ok(q.overall<80);
 assert.ok(q.findings.some(x=>x.targetType==="KNOWLEDGE_BOUNDARY"))
});

test("runtime expansion requires valid history provenance and schedules maintenance",()=>{
 const state={world:{
  history:[{id:"HIST-1"}],quality:{overall:70},
  registry:{locations:[{name:"A",historyRefs:["HIST-1"]}],npcs:[],factions:[]},
  state:{clock:{totalMinutes:240},flags:{}},version:3,
  evolution:{lastMinute:0,lastVersion:1,count:0}
 }};
 const bad=validateExpansionProvenance(state,{locations:[{name:"B"}],npcs:[],factions:[],sideQuests:[]});
 assert.equal(bad.valid,false);
 const need=worldEvolutionNeed(state);
 assert.equal(need.required,true);
 assert.ok(need.reasons.includes("WORLD_QUALITY_DROP"));
 markWorldEvolution(state,{reason:need.reason});
 assert.equal(state.world.evolution.count,1)
});


test("canonization persists valid historyRefs on locations npcs factions and quests",()=>{
 const s=newGame({worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:10,prompt:""});
 s.world.history=[{id:"HIST-1",order:1,era:"舊紀",title:"舊遷徙",category:"遷徙",summary:"過去發生的大遷徙",causes:["危機"],legacies:["聚落形成"],regions:[],factions:[],discoverKeywords:["碑文"],mutable:false}];
 canonizeGeneration(s,{
  locations:[{name:"灰門",type:"聚落",description:"舊路旁形成的聚落",historyRefs:["HIST-1"],known:false}],
  factions:[{name:"守門會",goal:"維持舊路秩序",description:"由遷徙者後代組成",historyRefs:["HIST-1"],known:false}],
  npcs:[{name:"米拉",role:"守門人",description:"熟悉舊路",locationName:"灰門",factionName:"守門會",historyRefs:["HIST-1"],known:false}],
  sideQuests:[{title:"碑文殘片",objective:"找出舊遷徙留下的碑文",historyRefs:["HIST-1"],known:false,evidenceKeywords:["碑文"],target:1}]
 });
 assert.deepEqual(s.world.registry.locations[0].historyRefs,["HIST-1"]);
 assert.deepEqual(s.world.registry.factions[0].historyRefs,["HIST-1"]);
 assert.deepEqual(s.world.registry.npcs[0].historyRefs,["HIST-1"]);
 assert.deepEqual(s.world.registry.sideQuests[0].historyRefs,["HIST-1"])
});
