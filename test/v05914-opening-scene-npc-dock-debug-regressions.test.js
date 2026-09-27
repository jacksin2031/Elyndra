import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {repairSceneCandidate,repairStatePatchCandidate,repairWorldStageCandidate} from "../src/ai-output-repair.js";
import {newGame} from "../src/world-engine.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {applyOriginRuntime} from "../src/origin-runtime.js";
import {tickMainQuest} from "../src/quest-engine.js";

function reincarnationState(){const seed=compileWorldCreation(createWorldCreationDraft({worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:12,difficulty:"normal",originType:"reincarnation",playerRole:"ordinary",masterSeed:"v05914-origin"}));const s=newGame(seed);applyWorldCreationState(s,seed);s.world.bible={...(s.world.bible||{}),startingLocation:"出生村",startingSettlement:"出生村",startingRegion:"北境",weatherSystem:{phenomena:[]}};s.world.state.location="出生村";s.player.location="出生村";s.world.registry={locations:[{id:"L-HOME",name:"出生村",known:true}],npcs:[],factions:[],sideQuests:[]};s.world.canon.facts=[{id:"F-LOCAL",visibility:"public",type:"public",text:"出生村的水井每天清晨開放。"},{id:"F-GLOBAL",visibility:"public",type:"public",text:"遙遠帝都的皇室掌握世界級秘密。"}];return s}

test("v0.59.14 opening CAST never auto-exposes its generated NPC",()=>{const out=repairWorldStageCandidate("CAST",{npcs:[{name:"米拉",known:true}],suggestions:["向眼前的陌生人問路","檢查破裂管道","確認出口"]},{locale:"zh-Hant"});assert.equal(out.value.npcs[0].known,false);assert.equal(out.value.suggestions.some(x=>String(x).includes("陌生人")),false);assert.ok(out.reasons.includes("OPENING_NPC_VISIBILITY_DEFERRED"))});

test("v0.59.14 truncated suggestion fragment is not accepted as a Scene",()=>{const out=repairSceneCandidate({label:"觀察門口",action:"觀察門口",kind:"OBSERVE"},{expectedOutcome:"SUCCESS",locale:"zh-Hant"});assert.equal(out.value,null);assert.ok(out.reasons.includes("SCENE_SHAPE_INCOMPLETE"))});

test("v0.59.14 zh-Hant scene repair deterministically removes Simplified leakage",()=>{const out=repairSceneCandidate({outcome:"SUCCESS",narrative:"机械声的频率变化很明显。",suggestions:[{label:"观察机械声",action:"观察机械声的变化",kind:"OBSERVE",risk:"LOW",approach:"STEADY"}]},{expectedOutcome:"SUCCESS",locale:"zh-Hant"});assert.equal(out.value.narrative,"機械聲的頻率變化很明顯。");assert.match(out.value.suggestions[0].action,/觀察機械聲的變化/);assert.ok(out.reasons.includes("LANGUAGE_TRADITIONALIZED"))});

test("v0.59.14 StatePatch canonical binding can use hidden director registry",()=>{const out=repairStatePatchCandidate({baseRevision:4,operations:[{op:"REVEAL_ENTITY",kind:"location",id:"隱藏工房"}]},{plan:{baseRevision:4,capabilities:["REVEAL_ENTITY"]},snapshot:{registry:{locations:[]},directorRegistry:{locations:[{id:"LOC-HIDDEN",name:"隱藏工房"}]}}});assert.equal(out.value.operations.length,1);assert.equal(out.value.operations[0].id,"LOC-HIDDEN");assert.equal(out.hardRejects??0,0)});

test("v0.59.14 reincarnation receives local facts only and no automatic full calendar",()=>{const s=reincarnationState();applyOriginRuntime(s,{phase:"POST_CANON"});assert.equal(s.player.calendarKnown,false);assert.ok(s.knowledge.some(k=>k.factId==="F-LOCAL"));assert.equal(s.knowledge.some(k=>k.factId==="F-GLOBAL"),false)});

test("v0.59.14 origin knowledge alone cannot skip main quest investigation",()=>{const s=reincarnationState();applyOriginRuntime(s,{phase:"POST_CANON"});s.world.registry.npcs=[{id:"NPC-1",name:"居民",known:true,encountered:true,alive:true,companion:{status:"NONE"},memories:[],trust:0}];s.world.state.clock.totalMinutes=1;tickMainQuest(s);s.world.state.clock.totalMinutes=2;tickMainQuest(s);assert.equal(s.quests.main.stage,2);s.world.state.clock.totalMinutes=3;tickMainQuest(s);assert.equal(s.quests.main.stage,2);s.knowledge.push({id:"K-NEW",factId:"F-GLOBAL",status:"VERIFIED",sourceRef:{kind:"NPC",id:"NPC-1"}});s.world.state.clock.totalMinutes=4;tickMainQuest(s);assert.equal(s.quests.main.stage,3)});

test("v0.59.14 NPC dialogue dock is below dice and not inside sidebar",async()=>{const [html,css]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8")]);const sidebar=html.slice(html.indexOf('<aside class="sidebar">'),html.indexOf('</aside>')+8);assert.doesNotMatch(sidebar,/id="npcDock"/);assert.ok(html.indexOf('id="npcDock"')>html.indexOf('id="diceBox"'));assert.match(html,/class="decision-side"/);assert.match(css,/v0.59.14 NPC dialogue dock placement/);assert.match(css,/#game .decision-side .npc-dock{margin-top:0!important/)});

test("v0.59.14 opening compiler no longer forces visible stranger and scene repair carries turn correlation",async()=>{const src=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");assert.doesNotMatch(src,/可直接看見，因此 known 必須為 true/);assert.match(src,/known 必須為 false/);assert.match(src,/repairTurnId=.*plan.baseRevision/);assert.match(src,/AI_SCENE_REJECTED/)});
