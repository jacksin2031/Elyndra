import test from "node:test";
import assert from "node:assert/strict";
import {tokenBudgetSnapshot} from "../src/context-manager.js";
import {normalizeSuggestionIntent,sceneTurnPreview,mergeTurnCandidates} from "../src/turn-compiler.js";
import {buildContextualActionSet} from "../src/contextual-actions.js";
import {evaluateQuestEvidence} from "../src/quest-engine.js";
import {groundStatePatch} from "../src/state-sync.js";

test("v0.55.0 context budget preserves current location, present NPC, useful facts and reports degradation",()=>{
 const registry={locations:Array.from({length:14},(_,i)=>({id:`L${i}`,name:i===2?"目前地點":`地點${i}`,description:"地形".repeat(40)})),npcs:Array.from({length:14},(_,i)=>({id:`N${i}`,name:i===1?"在場者":`人物${i}`,locationId:i===1?"L2":`L${i%14}`,present:i===1,description:"人物資料".repeat(35)})),factions:[],sideQuests:[]};
 const snap={world:{name:"測試界",day:1,location:"目前地點",summary:"世界摘要"},player:{hp:100,knowledgeScore:0},knownFacts:Array.from({length:12},(_,i)=>`已知事實${i}`),knowledge:Array.from({length:12},(_,i)=>({title:`知識${i}`,text:"可驗證資料"})),inventory:[],recentEvents:Array.from({length:8},(_,i)=>({type:"OBSERVE",summary:`事件${i}`})),registry,travel:{currentLocationId:"L2",routes:[]},directorCanon:Array.from({length:80},(_,i)=>({id:`F${i}`,text:"Director 背景".repeat(15)})),directorRegistry:{locations:[],npcs:[],factions:[]},directorTimeline:[],directorHistory:[],companions:[],factions:[],knowledgeGraph:{nodes:[],edges:[],expansions:[]},hiddenFacts:[]};
 const got=tokenBudgetSnapshot(snap,5600);assert.ok(got.registry.locations.some(x=>x.id==="L2"));assert.ok(got.registry.npcs.some(x=>x.id==="N1"));assert.ok(got.knownFacts.length>0);assert.ok(got.knowledge.length>0);assert.equal(got.contextMeta.degraded,true);assert.ok(got.contextMeta.degradationReasons.length>0)
});

test("v0.55.0 AI suggestions require explicit requirement confirmation and real required items",()=>{
 const missing=normalizeSuggestionIntent({label:"拿出紙筆",action:"拿出紙筆記下牆上的符號",kind:"GENERAL",risk:"LOW"});assert.equal(missing.requirementsSatisfied,false);
 const state={world:{id:"W1",state:{day:1},registry:{locations:[],npcs:[]}},player:{location:"石室"},inventory:[],events:[],quests:{main:{objectives:["觀察石室"]}}};
 const set=buildContextualActionSet(state,[{label:"拿出紙筆",action:"拿出紙筆記下牆上的符號",kind:"GENERAL",risk:"LOW",requirementsSatisfied:true,requiredItemIds:["ITEM-paper"],causalBasis:"想記錄符號"}]);assert.equal(set.all.some(x=>x.label==="拿出紙筆"),false)
});

test("v0.55.0 failure rolls cannot apply success prose or item-acquisition prose",()=>{
 const scene={outcome:"SUCCESS",sceneTitle:"撬門",narrative:"你成功撬開石門，陌生守衛把紅鑰匙交給你。",suggestions:[]},roll={success:false,grade:"FAILURE",natural:5,total:7,dc:15};
 const preview=sceneTurnPreview(scene,roll,{action:"撬開石門"});assert.equal(preview.outcome,"FAILURE");assert.equal(preview.narrativeRejected,true);assert.doesNotMatch(preview.narrative,/成功撬開|紅鑰匙/);
 const merged=mergeTurnCandidates(scene,{outcomeSummary:"你成功取得紅鑰匙",items:[{name:"紅鑰匙"}]},roll,{action:"撬開石門"});assert.equal(merged.outcome,"FAILURE");assert.doesNotMatch(merged.narrative,/成功取得|紅鑰匙/)
});

test("v0.55.0 denied NPC testimony does not advance keyword quests",()=>{
 const q={id:"Q1",title:"藍光徽記",objective:"確認徽記",known:true,status:"ACTIVE",progress:0,target:2,evidence:[],evidenceKeywords:["藍光徽記"],matchedKeywords:[],conditions:[],matchedConditions:[]};
 const state={world:{state:{day:1},registry:{locations:[],npcs:[{id:"NPC-1",name:"線人",known:true,encountered:true}],factions:[],sideQuests:[q]},canon:{facts:[]},history:[]},player:{},knowledge:[],inventory:[],events:[],quests:{}};
 evaluateQuestEvidence(state,"我不知道甚麼藍光徽記，從未聽過。",{source:"NPC_TESTIMONY",npcId:"NPC-1"});assert.equal(q.progress,0);assert.deepEqual(q.matchedKeywords,[]);
 evaluateQuestEvidence(state,"我昨天在北門親眼看過藍光徽記。",{source:"NPC_TESTIMONY",npcId:"NPC-1"});assert.equal(q.progress,1)
});

test("v0.55.0 uniquely normalizes NPC display-name whitespace to canonical evidence IDs",()=>{
 const state={player:{location:"北門"},world:{state:{day:1},registry:{locations:[{id:"L1",name:"北門",known:true}],npcs:[{id:"NPC-1",name:"維安協員 瑟倫",known:true,encountered:true,alive:true,locationId:"L1"}],factions:[],sideQuests:[]},canon:{facts:[]}},events:[],inventory:[],knowledge:[]};
 const patch={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"鐘聲異常",text:"維安協員瑟倫指出北門鐘聲突然停止。",factId:"",evidenceType:"HEARD",sourceKind:"NPC",sourceId:"維安協員瑟倫"}]};
 const grounded=groundStatePatch(state,patch,{observableText:"維安協員瑟倫指出北門鐘聲突然停止，值得繼續追查。"});assert.equal(grounded.rejected.length,0);assert.equal(grounded.patch.operations[0].sourceId,"NPC-1")
});

test("v0.55.0 non-positive quantities do not satisfy required-item suggestions",()=>{
 const suggestion={label:"拿出紙筆",action:"拿出紙筆記下牆上的符號",kind:"GENERAL",risk:"LOW",requirementsSatisfied:true,requiredItemIds:["ITEM-paper"],causalBasis:"想記錄符號"};
 const state={world:{id:"W1",state:{day:1},registry:{locations:[],npcs:[]}},player:{location:"石室"},inventory:[{id:"ITEM-paper",name:"紙筆",quantity:0}],events:[],quests:{main:{objectives:["觀察石室"]}}};
 let set=buildContextualActionSet(state,[suggestion]);assert.equal(set.all.some(x=>x.label==="拿出紙筆"),false);
 state.inventory[0].quantity=-1;set=buildContextualActionSet(state,[suggestion]);assert.equal(set.all.some(x=>x.label==="拿出紙筆"),false)
});


test("v0.55.0 failed outcomes cannot acquire items or complete travel at state commit",()=>{
 const state={player:{location:"起點"},world:{state:{day:1},registry:{locations:[{id:"L1",name:"起點",known:true},{id:"L2",name:"終點",known:true}],npcs:[],factions:[],sideQuests:[]},canon:{facts:[]}},events:[],inventory:[],knowledge:[]};
 const patch={baseRevision:0,operations:[
  {op:"ACQUIRE_ITEM",item:{name:"紅鑰匙",quantity:1}},
  {op:"MOVE_PLAYER",location:"終點"}
 ]};
 const grounded=groundStatePatch(state,patch,{action:"拿起紅鑰匙並前往終點",roll:{success:false,grade:"CRITICAL_FAILURE"},intent:{kind:"TRAVEL"},observableText:"你看見紅鑰匙與通往終點的道路。"});
 assert.equal(grounded.patch.operations.length,0);
 assert.equal(grounded.rejected.length,2);
 assert.deepEqual(grounded.rejected.map(x=>x.reason),["ENGINE_OUTCOME_FAILURE","ENGINE_OUTCOME_FAILURE"])
});
