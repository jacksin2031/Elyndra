import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildContextualActionSet,regenerateContextualActionSet,suggestionPresentation} from "../src/contextual-actions.js";

function baseState(overrides={}){
 const state={world:{id:"W1",state:{day:2,location:"起點"},travel:{routes:[{id:"R1",fromId:"L1",toId:"L2",open:true}]},registry:{locations:[{id:"L1",name:"起點",known:true},{id:"L2",name:"河岸",known:true},{id:"L3",name:"封閉塔樓",known:true}],npcs:[{id:"N1",name:"巡路人",known:true,nameKnown:true,alive:true,locationId:"L1"}],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},player:{location:"起點",status:"ACTIVE",difficulty:"normal",skills:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},quests:{main:{title:"找出異常來源",objectives:["確認河谷異常的可驗證來源"],status:"ACTIVE"}},inventory:[{id:"I1",name:"觀測筆記",quantity:1,category:"DOCUMENT"}],events:[],suggestions:[],suggestionIntents:[]};
 return Object.assign(state,overrides)
}

test("suggestion refresh returns exactly three grounded alternatives without mutating world state",()=>{
 const s=baseState(),before=structuredClone(s),old=[{label:"舊建議",action:"在起點觀察同一塊石頭"}],set=regenerateContextualActionSet(s,{exclude:old});
 assert.equal(set.primary.length,3);assert.equal(set.all.length,3);assert.equal(set.highRisk.length,0);assert.equal(new Set(set.all.map(x=>x.action)).size,3);assert.ok(set.all.every(x=>x.prevalidated===true&&x.requirementsSatisfied===true));assert.equal(set.all.some(x=>x.action===old[0].action||x.label===old[0].label),false);assert.deepEqual(s,before)
});

test("refresh candidates use only reachable locations, present NPCs and owned items",()=>{
 const routeOnly=baseState({quests:{main:{objectives:[],status:"ACTIVE"}},inventory:[]});routeOnly.world.registry.npcs=[];const travel=regenerateContextualActionSet(routeOnly).all.find(x=>x.kind==="TRAVEL");assert.equal(travel?.targetId,"L2");assert.match(travel?.action||"",/河岸/);assert.doesNotMatch(travel?.action||"",/封閉塔樓/);
 const npcOnly=baseState({quests:{main:{objectives:[],status:"ACTIVE"}},inventory:[]});npcOnly.world.travel.routes=[];const social=regenerateContextualActionSet(npcOnly).all.find(x=>x.kind==="SOCIAL");assert.equal(social?.targetId,"N1");assert.match(social?.action||"",/巡路人/);npcOnly.world.registry.npcs[0].nameKnown=false;const hiddenSocial=regenerateContextualActionSet(npcOnly).all.find(x=>x.kind==="SOCIAL");assert.equal(hiddenSocial?.targetId,"N1");assert.match(`${hiddenSocial?.label||""} ${hiddenSocial?.action||""}`,/眼前的陌生人/);assert.doesNotMatch(`${hiddenSocial?.label||""} ${hiddenSocial?.action||""}`,/巡路人/);
 const itemOnly=baseState({quests:{main:{objectives:[],status:"ACTIVE"}}});itemOnly.world.travel.routes=[];itemOnly.world.registry.npcs=[];const item=regenerateContextualActionSet(itemOnly).all.find(x=>(x.requiredItemIds||[]).includes("I1"));assert.ok(item);assert.match(item.action,/觀測筆記/)
});

test("UI refresh preserves free action and does not execute or advance a turn",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),start=app.indexOf("function refreshSuggestedActions"),end=app.indexOf("function renderSuggestions",start),block=app.slice(start,end);
 assert.ok(start>=0&&end>start);assert.match(app,/id="refreshSuggestionsBtn"/);assert.match(app,/重新產生建議行動/);assert.match(app,/id="otherActionBtn"/);assert.match(block,/previousIntents=structuredClone/);assert.match(block,/已保留原本建議/);assert.match(block,/gameState\.suggestionIntents=previousIntents/);
 for(const forbidden of ["runAction(","performAction(","combatAction(","bumpStateRevision(","persist(","advanceTime("])assert.equal(block.includes(forbidden),false,forbidden)
});

test("rejected action is remembered for the next refresh exclusion set",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/if\(actionResult\.blocked\)rememberRejectedSuggestion\(effective\)/);assert.match(app,/suggestionRefresh\.rejected/);assert.match(app,/regenerateContextualActionSet\(gameState,\{exclude\}\)/)
});


test("unknown canonical NPC identity is redacted from AI suggestions and presentation, then restored after evidence",()=>{
 const s=baseState(),npc=s.world.registry.npcs[0];npc.name="灰岩巡哨";npc.nameKnown=false;
 const candidate={label:"問灰岩巡哨剛才最在意的是哪件事",action:"向灰岩巡哨詢問剛才最值得注意的變化",kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",targetId:"N1",requirementsSatisfied:true,causalBasis:"NPC 正在場",source:"AI"};
 const hidden=buildContextualActionSet(s,[candidate]).all.find(x=>x.kind==="SOCIAL"&&x.targetId==="N1");
 assert.ok(hidden);
 assert.doesNotMatch(`${hidden.label} ${hidden.action}`,/灰岩巡哨/);
 assert.match(`${hidden.label} ${hidden.action}`,/眼前的陌生人/);
 assert.doesNotMatch(suggestionPresentation(s,candidate).label,/灰岩巡哨/);
 s.events.push({type:"NPC_NAME_REVEALED",npcId:"N1"});
 const revealed=buildContextualActionSet(s,[candidate]).all.find(x=>x.kind==="SOCIAL"&&x.targetId==="N1");
 assert.ok(revealed);
 assert.match(`${revealed.label} ${revealed.action}`,/灰岩巡哨/);
 assert.match(suggestionPresentation(s,candidate).label,/灰岩巡哨/)
});
