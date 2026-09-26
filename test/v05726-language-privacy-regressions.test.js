import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {applyOriginRuntime,originNpcContext} from "../src/origin-runtime.js";
import {npcLanguageContext} from "../src/npc-conversation.js";
import {deriveAcquisitionNotifications} from "../src/acquisition-notifier.js";

function make(originType,difficulty){
 const seed=compileWorldCreation(createWorldCreationDraft({worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:12,difficulty,originType,playerRole:"ordinary",masterSeed:`v05726-${originType}-${difficulty}`}));
 const state=newGame(seed);applyWorldCreationState(state,seed);applyOriginRuntime(state,{phase:"POST_CANON"});return state
}

test("v0.57.26 real resolver keeps Hard + AMNESIA + HIGH at GESTURE",()=>{
 const state=make("amnesia","hard");
 assert.equal(state.world.creation.difficultyRules.languageBarrier,"HIGH");
 assert.equal(state.player.originRuntime.knowledgePolicy,"AMNESIA");
 assert.equal(originNpcContext(state,{id:"NPC-A",languages:["COMMON"]}).languageMode,"GESTURE")
});

test("v0.57.26 real resolver keeps Realistic + PARTIAL_LOCAL + HIGH at FRAGMENTED",()=>{
 const state=make("reincarnation","realistic");
 assert.equal(state.world.creation.difficultyRules.languageBarrier,"HIGH");
 assert.equal(state.player.originRuntime.knowledgePolicy,"PARTIAL_LOCAL");
 assert.equal(originNpcContext(state,{id:"NPC-N",languages:["COMMON"]}).languageMode,"FRAGMENTED")
});

test("v0.57.26 languageContext is enum/boolean only and contains no free text",()=>{
 const state=make("amnesia","hard"),ctx=npcLanguageContext(state,{id:"NPC-A",name:"不可記錄的名字",languages:["COMMON"],secret:"不可記錄的秘密"});
 assert.deepEqual(Object.keys(ctx).sort(),["barrier","languagePolicy","mode","originPolicy","readLanguageMatch","spokenLanguageMatch"].sort());
 for(const [key,value] of Object.entries(ctx))assert.ok(typeof value==="boolean"||/^[A-Z0-9_]+$/.test(value),key);
 assert.equal(JSON.stringify(ctx).includes("不可記錄"),false)
});

test("v0.57.26 GAME_NPC_ENCOUNTERED display/toast keeps unknown canonical name private",()=>{
 const prev={npcs:{}},next={npcs:{N1:{id:"N1",name:"瑟琳",displayName:"瑟琳",nameKnown:false,encountered:true,role:"旅人"}}};
 const rows=deriveAcquisitionNotifications(prev,next),npc=rows.find(x=>x.type==="NPC");
 assert.ok(npc);assert.equal(npc.name,"眼前的陌生人");assert.doesNotMatch(JSON.stringify(npc),/瑟琳/)
});
