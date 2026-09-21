import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {turnDirectorMode} from "../src/turn-outcome.js";

test("world compiler routes descriptive stages fast and canon-critical stages deep",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 for(const token of ["IDENTITY:\"identity\"","GEOGRAPHY:\"geography\"","SOCIETY:\"society\"","CAST:\"cast\"","CORE_RULES:\"core_rules\"","CORE_ANCHOR:\"core_anchor\"","HISTORY:\"history\"","FUTURE:\"future\"","QUALITY_CRITIC:\"quality\"","WORLD_RECOVERY:\"recovery\"","RUNTIME_QUALITY_CRITIC:\"runtime_quality\"","RUNTIME_REPAIR:\"runtime_repair\""])assert.ok(client.includes(token),token);
 assert.match(client,/aiTask:args\?\.aiTask\|\|worldStageTask\(stage\)/)
});

test("runtime calls explicitly label latency-sensitive and balanced tasks",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 for(const task of ["narration","npc","helper","action","scene","turn_state_fast","turn_state_deep","turn_deferred"])assert.match(client,new RegExp('aiTask:"'+task+'"'))
});

test("shared turn director selects FAST DEFERRED and DEEP modes",()=>{
 assert.equal(turnDirectorMode("仔細觀察門上的痕跡",{profile:{kind:"OBSERVE"}},{}),"FAST");
 assert.equal(turnDirectorMode("說服守衛放我們通過",{profile:{kind:"SOCIAL"}},{}),"DEFERRED");
 assert.equal(turnDirectorMode("摧毀整座城的核心並推翻王國",{profile:{kind:"RISKY"}},{}),"DEEP")
});

test("ai-client consumes shared turnDirectorMode instead of owning duplicate routing logic",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/turnDirectorMode as sharedTurnDirectorMode/);
 assert.match(client,/export const turnDirectorMode=sharedTurnDirectorMode/);
 assert.match(client,/directorMode=sharedTurnDirectorMode\(action,roll,snapshot\)/);
 assert.match(client,/generateDeferredTurnEffects/)
});
