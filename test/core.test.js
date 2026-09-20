import test from "node:test";import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";import {validateSaveState} from "../src/state-validator.js";import {validateTurnCandidate,applyTurnCandidate,buildSnapshot} from "../src/adventure-engine.js";import {maintainSession} from "../src/session-maintenance.js";
const seed={genre:"王道奇幻",theme:"失落文明",scale:"中型",danger:3,magic:3,politics:3,prompt:""};
test("new game is a valid persistent state",()=>{assert.equal(validateSaveState(newGame(seed)).valid,true)});
test("invalid imported state is rejected",()=>{assert.equal(validateSaveState({world:{}}).valid,false)});
test("AI candidate rejects unsafe NPC mutation",()=>{assert.equal(validateTurnCandidate({narrative:"ok",npcChanges:[{key:"lia",trustDelta:99}]}).valid,false)});
test("AI candidate applies bounded data",()=>{const s=newGame(seed);applyTurnCandidate(s,{narrative:"新的道路出現在霧中。",discoveries:[{title:"石碑",text:"上面刻有古老文字。"}],items:[{name:"石片"}],npcChanges:[{key:"lia",trustDelta:2}],suggestions:["前進"]});assert.equal(s.npcs.lia.trust,20);assert.equal(s.suggestions.length,1);assert.equal(validateSaveState(s).valid,true)});
test("long sessions create runtime summary used by snapshot",()=>{const s=newGame(seed);for(let i=0;i<50;i++)s.events.push({type:"PLAYER_ACTION",day:1});maintainSession(s);assert.ok(s.runtimeSummary);assert.equal(buildSnapshot(s).runtimeSummary,s.runtimeSummary)});
