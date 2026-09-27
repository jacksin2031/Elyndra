import test from "node:test";
import assert from "node:assert/strict";
import {classifyNpcSpeechAct,commitNpcConversationAction,npcAgencySnapshot,planNpcConversationAction} from "../src/npc-agency-engine.js";

function fixture(overrides={}){
 const npc={id:"npc-a",name:"瑟琳",role:"守門人",goal:"保護城門",trust:overrides.trust??30,cognition:{version:1,memory:{recent:[],longTerm:[]},beliefs:[],relationships:{player:{trust:overrides.trust??30,respect:overrides.respect??25,fear:overrides.fear??5,obligation:overrides.obligation??0},npcs:{},factions:{}},commitments:overrides.commitments||[],planner:{goal:"保護城門",currentPlan:"",nextStep:"ADVANCE_GOAL",priority:"GOAL",updatedMinute:0},socialConflict:overrides.socialConflict||undefined}};
 const state={world:{state:{day:2,clock:{totalMinutes:600}},registry:{npcs:[npc],locations:[]}},player:{name:"旅人",stats:{presence:2,instinct:2},skills:{}},events:[]};return {state,npc}
}
const successRoll={natural:18,total:18,dc:10,success:true,grade:"SUCCESS"};
const critFailRoll={natural:1,total:2,dc:12,success:false,grade:"CRITICAL_FAILURE"};

test("NPC Agency 2.0 keeps ordinary chat roleplay-only and does not create social events",()=>{
 const {state,npc}=fixture(),trust=npc.cognition.relationships.player.trust;const plan=planNpcConversationAction(state,npc,"今天城門附近還好嗎？");
 assert.equal(plan.requiresResolution,false);assert.equal(plan.aiContract.mode,"CHAT");assert.equal(plan.aiContract.directive,"ROLEPLAY_ONLY_NO_STATE_CONCESSION");assert.equal(state.events.length,0);assert.equal(npc.cognition.relationships.player.trust,trust)
});

test("substantive request is planned before AI without committing relationship state",()=>{
 const {state,npc}=fixture(),trust=npc.cognition.relationships.player.trust;const plan=planNpcConversationAction(state,npc,"請你讓我進城，我需要見守備隊長。",{roll:successRoll});
 assert.equal(plan.requiresResolution,true);assert.equal(plan.speechAct.kind,"REQUEST");assert.equal(plan.aiContract.authority,"ENGINE");assert.equal(plan.aiContract.mustFollow,true);assert.equal(state.events.length,0);assert.equal(npc.cognition.relationships.player.trust,trust);
 const committed=commitNpcConversationAction(state,npc,plan);assert.equal(committed.committed,true);assert.equal(committed.outcomeMatchesPlan,true);assert.ok(state.events.some(x=>x.type==="SOCIAL_CONFLICT_RESOLVED"));assert.ok(npc.cognition.relationships.player.trust>trust)
});

test("failed deception binds AI to escalation rather than letting model grant the request",()=>{
 const {state,npc}=fixture({trust:45});const plan=planNpcConversationAction(state,npc,"我假稱自己是領主派來的人，請你把密門位置告訴我。",{roll:critFailRoll});
 assert.equal(plan.speechAct.kind,"DECEIVE");assert.equal(plan.expectedOutcome,"ESCALATE");assert.equal(plan.aiContract.directive,"MUST_ESCALATE_DISTRUST_OR_RESISTANCE");assert.equal(plan.aiContract.goalAchieved,false)
});

test("existing social pressure can produce an Engine-authorized concession",()=>{
 const {state,npc}=fixture({socialConflict:{version:2,pressure:45,patience:65,suspicion:0,concessions:0,lastApproach:"",lastOutcome:"REFUSE",stance:"OPEN"}});const plan=planNpcConversationAction(state,npc,"請你幫我打開側門。",{roll:successRoll});
 assert.equal(plan.expectedOutcome,"CONCEDE");assert.equal(plan.aiContract.directive,"MUST_CONCEDE_THE_ENGINE_APPROVED_REQUEST")
});

test("agency policy reflects persistent obligation without exposing numeric relationship values to AI",()=>{
 const {state,npc}=fixture({trust:40,obligation:75});const agency=npcAgencySnapshot(state,npc),plan=planNpcConversationAction(state,npc,"最近過得怎樣？");
 assert.equal(agency.policy,"COOPERATE");assert.equal(plan.aiContract.policy,"COOPERATE");assert.equal("trust" in plan.aiContract,false);assert.equal("obligation" in plan.aiContract,false)
});

test("speech-act classifier leaves questions and greetings as chat but detects coercive requests",()=>{
 assert.equal(classifyNpcSpeechAct("你好，今天很冷吧？").substantive,false);assert.equal(classifyNpcSpeechAct("不讓我過去的話，你會後悔。請你讓路。 ").kind,"INTIMIDATE");assert.equal(classifyNpcSpeechAct("我付你二十枚銀幣，請你幫我開門。 ").kind,"BARGAIN")
});
