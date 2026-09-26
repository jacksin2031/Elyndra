import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {applyOriginRuntime,originNpcContext,originRuntimeSnapshot} from "../src/origin-runtime.js";

function make(originType,difficulty){
 const seed=compileWorldCreation(createWorldCreationDraft({worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:12,difficulty,originType,playerRole:"ordinary",masterSeed:`v05724-${originType}-${difficulty}`}));
 const state=newGame(seed);applyWorldCreationState(state,seed);applyOriginRuntime(state,{phase:"POST_CANON"});return state
}

test("v0.57.25 FIRST_BUTTON loop has no stale undefined expansion variable",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.doesNotMatch(app,/\bfirstButtonExpansionReason\b/);
 assert.match(app,/let expansionReason="";/);
 assert.match(app,/scheduleDeveloperAutotestExpansion\(expansionReason,turn\)/)
});

test("v0.57.25 hard and realistic directly enforce HIGH spoken-language degradation",()=>{
 for(const difficulty of ["hard","realistic"]){
  const native=make("native",difficulty),nativeRt=originRuntimeSnapshot(native,{director:true});
  assert.equal(native.world.creation.difficultyRules.languageBarrier,"HIGH",difficulty);
  assert.equal(nativeRt.languageBarrier,"HIGH",difficulty);
  assert.ok(native.player.spokenLanguages.includes("COMMON"),difficulty+" keeps origin language knowledge");
  assert.equal(native.player.languages.includes("COMMON"),false,difficulty+" blocks common literacy");
  assert.equal(originNpcContext(native,{id:"NPC-N",languages:["COMMON"]}).languageMode,"FRAGMENTED",difficulty+" must not stay FLUENT");

  const amnesia=make("amnesia",difficulty),amnesiaRt=originRuntimeSnapshot(amnesia,{director:true});
  assert.equal(amnesiaRt.languageBarrier,"HIGH",difficulty);
  assert.ok(amnesia.player.spokenLanguages.includes("COMMON"),difficulty+" retains fragmented remembered speech capability");
  assert.equal(amnesia.player.languages.includes("COMMON"),false,difficulty+" blocks reading");
  assert.equal(originNpcContext(amnesia,{id:"NPC-A",languages:["COMMON"]}).languageMode,"GESTURE",difficulty+" AMNESIA+HIGH must be stricter than normal FRAGMENTED")
 }
});

test("v0.57.25 normal difficulty preserves the existing origin language baseline",()=>{
 const native=make("native","normal"),amnesia=make("amnesia","normal");
 assert.equal(originNpcContext(native,{id:"NPC-N",languages:["COMMON"]}).languageMode,"FLUENT");
 assert.equal(originNpcContext(amnesia,{id:"NPC-A",languages:["COMMON"]}).languageMode,"FRAGMENTED")
});
