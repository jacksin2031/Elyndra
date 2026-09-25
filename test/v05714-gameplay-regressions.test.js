import test from "node:test";
import assert from "node:assert/strict";
import {firstButtonAutotestDecision,buildAutotestReport,autotestWorldCoherence} from "../src/ai-autotest.js";
import {parseModelJSON} from "../src/model-json.js";
import {sanitizeSuggestion} from "../src/runtime-guard.js";

function state(){return {world:{id:"W",name:"測試界",state:{day:1,location:"起點",region:"區",clock:{day:1,hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"L1",name:"起點",region:"區",known:true,accessRequirements:[]},{id:"L2",name:"側路",region:"區",known:true,accessRequirements:[]}],npcs:[],factions:[],sideQuests:[]},travel:{version:1,routes:[]}},player:{name:"P",location:"起點",hp:100,maxHp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0},quests:{main:{title:"主線",stage:1,status:"ACTIVE",objectives:["找到新線索"]}},inventory:[],knowledge:[],events:[],discoveries:0,suggestionIntents:[{label:"再問一次",action:"再次詢問艾琳",kind:"SOCIAL",progression:true,targetId:"N1"},{label:"看看側路",action:"查看側路",kind:"OBSERVE",progression:false,targetId:"L2"}]}}

test("v0.57.18 FIRST_BUTTON retreats when combat HP is at or below safety threshold",()=>{const s=state();s.player.hp=29;s.combat={active:true,enemy:{name:"敵人",hp:40}};const d=firstButtonAutotestDecision(s,[]);assert.equal(d.combatAction,"retreat");assert.equal(d.firstButtonOverride,true);assert.equal(d.reason,"FIRST_BUTTON_COMBAT_SAFETY_RECOVERY")});

test("v0.57.18 FIRST_BUTTON still attacks in combat when HP is healthy",()=>{const s=state();s.combat={active:true,enemy:{name:"敵人",hp:40}};assert.equal(firstButtonAutotestDecision(s,[]).combatAction,"attack")});

test("v0.57.18 stalled recovery materializes route and chooses an exact known destination",()=>{const s=state(),recent=[1,2,3,4,5].map(i=>({action:"詢問 "+i,kind:"SOCIAL",targetId:"N1",progressed:false}));const d=firstButtonAutotestDecision(s,recent);assert.equal(d.kind,"TRAVEL");assert.equal(d.targetId,"L2");assert.equal(d.action,"前往側路");assert.ok(s.world.travel.routes.length>=1)});

test("v0.57.18 repeated target triggers destination recovery even with incidental state changes",()=>{const s=state(),recent=[1,2,3,4,5].map((i)=>({action:"詢問不同細節 "+i,kind:"SOCIAL",targetId:"N1",progressed:i===3}));const d=firstButtonAutotestDecision(s,recent);assert.equal(d.firstButtonOverride,true);assert.equal(d.kind,"TRAVEL");assert.equal(d.targetId,"L2")});

test("v0.57.18 parsed model strings normalize observed Simplified-Chinese leakage",()=>{const row=parseModelJSON('{"text":"确认记录本的保存状态；石阶旁生长；管理体系；仅限；报告中断"}');assert.equal(row.text,"確認記錄本的保存狀態；石階旁生長；管理體系；僅限；報告中斷");assert.equal(sanitizeSuggestion("向灰斑确认记录本的保存状态"),"")});

test("v0.57.18 advisory world quality does not erase completed execution status",()=>{const base={index:1,status:"COMPLETED",phase:"PLAY",turns:30,stopReason:"TURN_LIMIT",actions:[{turn:1,beforeFingerprint:"a",afterFingerprint:"b"}],generation:{diagnostics:{quality:"HEALTHY",stages:{}}},summary:{coherence:{status:"WARN",issues:[{severity:"WARN",type:"WORLD_QUALITY_UNAVAILABLE"}],quality:{pending:false,unavailable:true}}}};const report=buildAutotestReport({config:{worldCount:1,maxTurns:30,playStrategy:"FIRST_BUTTON"},worlds:[base],telemetry:[],startedAt:1,endedAt:2});assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsHealthy,0);assert.equal(report.summary.worldsDegraded,1)});

test("v0.57.18 grounded local NPC interaction counts as conversation continuity",()=>{const s=state();s.world.registry.npcs=[{id:"N1",name:"艾琳",known:true,encountered:true,memories:[{type:"interaction",grounded:true}]}];s.events=[{type:"NPC_INTERACTION",npcId:"N1"}];const c=autotestWorldCoherence(s);assert.equal(c.npcConversations.count,1);assert.equal(c.npcConversations.memoryMismatch,0)});
