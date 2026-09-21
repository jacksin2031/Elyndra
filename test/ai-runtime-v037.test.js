import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeActionIntent} from "../src/action-intent.js";
import {buildTurnOutcomeKernel,validateKernelBoundaries} from "../src/turn-outcome.js";
import {buildKnowledgeLayers} from "../src/knowledge-layers.js";
import {normalizeWorldTimeline,triggerDueTimelineEvents,timelineConditionSnapshot} from "../src/world-timeline.js";
import {ACTION_ASSESS_SYSTEM,sceneNarratorSystem,stateDirectorSystem} from "../src/ai-runtime-contracts.js";

test("compound free text becomes one structured Action Intent shared by the turn",()=>{
 const snapshot={registry:{npcs:[{id:"guard_12",name:"守衛",present:true}],locations:[]},knowledge:{knownLocations:[]}};
 const intent=normalizeActionIntent({
  intent:"STEAL",method:"DISTRACTION",subActions:["假裝喝醉","接近守衛","偷取鑰匙"]
 },"我假裝喝醉撞到守衛，順手偷他的鑰匙","RISKY",snapshot);
 assert.equal(intent.intent,"STEAL");
 assert.equal(intent.kind,"RISKY");
 assert.equal(intent.targetId,"guard_12");
 assert.equal(intent.method,"DISTRACTION");
 assert.deepEqual(intent.subActions,["假裝喝醉","接近守衛","偷取鑰匙"])
});

test("Outcome Kernel owns roll interpretation before parallel AIs",()=>{
 const snapshot={knownFacts:["石門可以推動"],world:{location:"古道"},registry:{npcs:[]},companions:[]};
 const kernel=buildTurnOutcomeKernel({action:"檢查石門後面",intent:{intent:"OBSERVE",kind:"OBSERVE"},roll:{success:true,grade:"SUCCESS",natural:17,total:19,dc:14,profile:{kind:"OBSERVE"}},snapshot});
 assert.equal(kernel.result.success,true);
 assert.equal(kernel.result.natural,17);
 assert.match(kernel.confirmedOutcome,/Engine 已確認/);
 assert.ok(kernel.authority.engineOwns.includes("roll"));
 assert.ok(kernel.authority.engineOwns.includes("confirmedOutcome"));
 assert.ok(kernel.forbiddenClaims.some(x=>x.includes("未知建造者")));
 assert.equal(validateKernelBoundaries({worldNameKnown:false},kernel).valid,true)
});

test("Canon Director and Player knowledge are explicit separate layers",()=>{
 const state={
  world:{canon:{facts:[
   {id:"F-P",type:"rule",visibility:"public",text:"鐘聲後城門會打開"},
   {id:"F-H",type:"secret",visibility:"hidden",text:"鐘聲其實由古代裝置控制"}
  ]},history:[{id:"H-1"}],timeline:[{id:"T-1",status:"SCHEDULED"}],registry:{locations:[{id:"L-1"}],npcs:[{id:"N-1"}],factions:[]}},
  knowledge:[{id:"K-1",status:"VERIFIED",factId:"F-P",title:"城門規律"}]
 };
 const layers=buildKnowledgeLayers(state);
 assert.ok(layers.canonTruth.facts.some(x=>x.id==="F-H"));
 assert.ok(layers.directorKnowledge.hiddenFactIds.includes("F-H"));
 assert.deepEqual(layers.playerKnowledge.verifiedFactIds,["F-P"]);
 assert.equal(layers.playerKnowledge.verifiedFactIds.includes("F-H"),false)
});

test("future Timeline waits for activation and can be cancelled by player-caused state",()=>{
 const pacing={targetPlayHours:10,majorEventCount:1,horizonDays:8,averageGapDays:2,phases:{early:{fromDay:2,toDay:3},middle:{fromDay:3,toDay:6},late:{fromDay:6,toDay:8}}};
 const event=normalizeWorldTimeline([{
  title:"王國戰爭可能升級",category:"WAR",earliestDay:2,latestDay:4,
  directorTruth:"邊境派系準備利用事故擴大衝突。",observableEffect:"邊境開始增派守軍與檢查商隊。",
  pressure:6,activationConditions:["EVENT:BORDER_INCIDENT"],cancelConditions:["EVENT:PEACE_TREATY"],escalationConditions:["FLAG:war_tension"],playerCanPrevent:true,playerCanAccelerate:true
 }],pacing)[0];
 const state={world:{state:{day:event.triggerDay,flags:{}},timeline:[event]},player:{location:"邊境"},events:[],knowledge:[]};
 assert.equal(timelineConditionSnapshot(state,event).activationMet,false);
 assert.equal(triggerDueTimelineEvents(state),null);
 state.events.push({id:"E1",type:"BORDER_INCIDENT"});
 const triggered=triggerDueTimelineEvents(state);
 assert.equal(triggered?.id,event.id);
 assert.equal(triggered?.status,"TRIGGERED");

 const cancelEvent=normalizeWorldTimeline([{
  title:"另一場衝突",category:"WAR",earliestDay:2,latestDay:4,
  directorTruth:"另一派系正在等待開戰機會。",observableEffect:"道路檢查逐漸增加。",
  pressure:5,activationConditions:[],cancelConditions:["EVENT:PEACE_TREATY"],playerCanPrevent:true
 }],pacing)[0];
 const cancelState={world:{state:{day:cancelEvent.triggerDay,flags:{}},timeline:[cancelEvent]},player:{location:"邊境"},events:[{type:"PEACE_TREATY"}],knowledge:[]};
 assert.equal(triggerDueTimelineEvents(cancelState),null);
 assert.equal(cancelEvent.status,"CANCELLED")
});

test("shared AI contracts make player.origin authoritative and suggestions structured",()=>{
 assert.match(ACTION_ASSESS_SYSTEM,/player\.origin 是玩家起源的唯一權威/);
 assert.match(sceneNarratorSystem(),/不得自行假設玩家來自現代地球/);
 assert.match(sceneNarratorSystem(),/4 個高品質結構化候選/);
 assert.match(sceneNarratorSystem(),/progression=true/);
 assert.match(sceneNarratorSystem(),/causalBasis/);
 assert.match(sceneNarratorSystem(),/requirementsSatisfied=true/);
 assert.match(stateDirectorSystem("DEEP"),/knowledgeLayers\.directorKnowledge/);
 assert.match(stateDirectorSystem("DEEP"),/knowledgeLayers\.playerKnowledge/)
});

test("Direct and Server transports consume shared turn contracts instead of duplicated prompts",async()=>{
 const [client,serverAction,serverTurn]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/action.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/SHARED_ACTION_ASSESS_SYSTEM/);
 assert.match(client,/sceneNarratorSystem\(\)/);
 assert.match(client,/stateDirectorSystem\("FAST"\)/);
 assert.match(serverAction,/ACTION_ASSESS_SYSTEM/);
 assert.match(serverTurn,/sceneNarratorSystem\(\)/);
 assert.match(serverTurn,/stateDirectorSystem\(serverStateMode\)/)
});
