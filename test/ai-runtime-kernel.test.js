import test from "node:test";
import assert from "node:assert/strict";
import {normalizeActionIntent} from "../src/action-intent.js";
import {buildTurnOutcomeKernel,validateKernelBoundaries} from "../src/turn-outcome.js";
import {buildKnowledgeLayers} from "../src/knowledge-layers.js";
import {normalizeSuggestionIntents,sceneTurnSnapshot} from "../src/turn-compiler.js";
import {createTimelinePacing,normalizeWorldTimeline,triggerDueTimelineEvents,timelineConditionSnapshot} from "../src/world-timeline.js";

test("complex free text becomes one structured Action Intent",()=>{
 const snapshot={registry:{npcs:[{id:"NPC-12",name:"守衛"}]}};
 const intent=normalizeActionIntent({intent:"STEAL",method:"DISTRACTION",subActions:["假裝喝醉","接近守衛","偷取鑰匙"]},"我假裝喝醉撞到守衛，順手偷他的鑰匙","RISKY",snapshot);
 assert.equal(intent.intent,"STEAL");
 assert.equal(intent.kind,"RISKY");
 assert.equal(intent.targetId,"NPC-12");
 assert.equal(intent.method,"DISTRACTION");
 assert.deepEqual(intent.subActions,["假裝喝醉","接近守衛","偷取鑰匙"])
});

test("Outcome Kernel is Engine-owned and forbids Scene from reinterpreting a failed roll",()=>{
 const kernel=buildTurnOutcomeKernel({action:"檢查石門後面",intent:{intent:"OBSERVE",kind:"OBSERVE"},roll:{success:false,grade:"FAILURE",natural:4,total:7,dc:12,profile:{kind:"OBSERVE"}},snapshot:{world:{location:"石廊"},knownFacts:["石門表面有人工刻痕"]}});
 assert.equal(kernel.result.success,false);
 assert.equal(kernel.result.dc,12);
 assert.match(kernel.confirmedOutcome,/未達成預期目的/);
 assert.ok(kernel.authority.engineOwns.includes("confirmedOutcome"));
 assert.ok(kernel.forbiddenClaims.some(x=>x.includes("未知建造者")));
 const report=validateKernelBoundaries({worldNameKnown:true},kernel);
 assert.equal(report.valid,false);
 assert.ok(report.errors.includes("KERNEL_FAILURE_WORLD_NAME_REVEAL"))
});

test("knowledge layers keep Canon Truth Director Knowledge and Player Knowledge separate",()=>{
 const state={
  world:{canon:{facts:[{id:"PUB",type:"rule",visibility:"public"},{id:"SEC",type:"truth",visibility:"hidden"}]},history:[{id:"H1"}],timeline:[{id:"T1",status:"SCHEDULED"}],registry:{locations:[{id:"L1"}],npcs:[{id:"N1"}],factions:[{id:"F1"}]}},
  knowledge:[{id:"K1",factId:"PUB",status:"VERIFIED",title:"已驗證規則"}]
 };
 const layers=buildKnowledgeLayers(state);
 assert.ok(layers.canonTruth.facts.some(x=>x.id==="SEC"));
 assert.ok(layers.directorKnowledge.hiddenFactIds.includes("SEC"));
 assert.deepEqual(layers.playerKnowledge.verifiedFactIds,["PUB"]);
 const scene=sceneTurnSnapshot({world:{},player:{},knownFacts:[],knowledge:state.knowledge,knowledgeLayers:layers,inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:{npcs:[]},companions:[],recognition:{tier:"UNKNOWN",titles:[],activeRumors:[]}});
 assert.equal(scene.knowledgeLayers.directorKnowledge,undefined);
 assert.deepEqual(scene.knowledgeLayers.playerKnowledge.verifiedFactIds,["PUB"])
});

test("structured contextual suggestions preserve UI label separately from Engine action",()=>{
 const out=normalizeSuggestionIntents([{label:"跟著血跡追過去",action:"沿著血跡追蹤留下痕跡的人",kind:"OBSERVE",risk:"MEDIUM",skillHint:"生存"}]);
 assert.equal(out.length,1);
 assert.equal(out[0].label,"跟著血跡追過去");
 assert.equal(out[0].action,"沿著血跡追蹤留下痕跡的人");
 assert.equal(out[0].risk,"MEDIUM")
});

test("future Timeline is potential: activation can block it and cancel conditions can prevent it",()=>{
 const pacing=createTimelinePacing(5);
 const raw=Array.from({length:pacing.majorEventCount},(_,i)=>({
  title:"事件"+i,directorTruth:"這是只有 Director 知道的完整事件原因。",observableEffect:"居民開始明顯改變日常行動與資源分配。",
  activationConditions:i===0?["FLAG:war_ready"]:[],cancelConditions:i===0?["EVENT:PEACE_TREATY"]:[],escalationConditions:["FLAG:war_tension"],playerCanPrevent:true,playerCanAccelerate:true
 }));
 const timeline=normalizeWorldTimeline(raw,pacing);
 const first=timeline[0],state={world:{state:{day:first.triggerDay,flags:{}},timeline},player:{location:""},knowledge:[],events:[]};
 assert.equal(timelineConditionSnapshot(state,first).activationMet,false);
 assert.equal(triggerDueTimelineEvents(state),null);
 state.events.push({id:"E1",type:"PEACE_TREATY"});
 assert.equal(triggerDueTimelineEvents(state),null);
 assert.equal(first.status,"CANCELLED")
});
