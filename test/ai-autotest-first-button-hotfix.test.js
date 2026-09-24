import test from "node:test";
import assert from "node:assert/strict";
import {firstButtonAutotestDecision,autotestPlayStrategy,buildAutotestReport} from "../src/ai-autotest.js";

function state(){
 return {
  world:{id:"W-FIRST",name:"測試界",state:{day:1,clock:{hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"LOC-1",name:"起點",known:true}],npcs:[],factions:[],sideQuests:[]}},
  player:{name:"Tester",worldNameKnown:false,location:"起點",hp:100,maxHp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0,wallet:{}},
  quests:{main:{title:"測試",stage:0,status:"ACTIVE",objectives:["向前走"]}},inventory:[],knowledge:[],discoveries:0,events:[],sceneTitle:"起點",narrative:"前方有路。",
  suggestionIntents:[
   {label:"第一個",action:"檢查左邊的門",kind:"OBSERVE",progression:false,risk:"LOW",targetId:"LOC-1"},
   {label:"第二個",action:"走向右邊的路",kind:"TRAVEL",progression:true,risk:"LOW",targetId:"LOC-1"}
  ]
 }
}

test("first-button strategy always returns suggestion index zero",()=>{
 const decision=firstButtonAutotestDecision(state());
 assert.equal(decision.mode,"suggestion");
 assert.equal(decision.suggestionIndex,0);
 assert.equal(decision.action,"檢查左邊的門");
 assert.equal(decision.reason,"FIRST_BUTTON");
 assert.equal(decision.firstButton,true)
});

test("first-button strategy uses Attack as the first combat action",()=>{
 const s=state();s.combat={active:true,enemy:{name:"敵人",hp:10}};
 const decision=firstButtonAutotestDecision(s);
 assert.equal(decision.mode,"combat");
 assert.equal(decision.combatAction,"attack");
 assert.equal(decision.firstButton,true)
});

test("first-button strategy has a safe fallback when no action button exists",()=>{
 const s=state();s.suggestionIntents=[];s.suggestions=[];
 const decision=firstButtonAutotestDecision(s);
 assert.equal(decision.mode,"free");
 assert.equal(decision.firstButtonUnavailable,true);
 assert.match(decision.action,/觀察四周/)
});

test("autotest report exposes the effective play strategy",()=>{
 assert.equal(autotestPlayStrategy(),"AI_DECISION");
 const report=buildAutotestReport({config:{worldCount:1,maxTurns:1},worlds:[],telemetry:[],startedAt:1,endedAt:2});
 assert.equal(report.config.playStrategy,"AI_DECISION")
});


test("first-button remains pinned to index zero even after repeated stalled turns",()=>{const s=state();s.world.registry.locations.push({id:"LOC-2",name:"側路",known:true});s.suggestionIntents=[{label:"再問一次",action:"再次詢問同一名 NPC",kind:"SOCIAL",progression:true,risk:"LOW",targetId:"NPC-1"},{label:"改走側路",action:"離開對話並走向側路",kind:"TRAVEL",progression:true,risk:"LOW",targetId:"LOC-2"}];const recent=[1,2,3,4,5].map(i=>({action:"詢問 NPC "+i,kind:"SOCIAL",targetId:"NPC-1",progressed:false}));const decision=firstButtonAutotestDecision(s,recent);assert.equal(decision.mode,"suggestion");assert.equal(decision.suggestionIndex,0);assert.equal(decision.action,"再次詢問同一名 NPC");assert.equal(decision.kind,"SOCIAL");assert.equal(decision.targetId,"NPC-1");assert.equal(decision.firstButton,true);assert.notEqual(decision.firstButtonOverride,true)})
