import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world compiler routes descriptive stages fast and canon-critical stages deep",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 for(const [stage,task] of Object.entries({IDENTITY:"identity",GEOGRAPHY:"geography",SOCIETY:"society",CAST:"cast",CORE_RULES:"core_rules",CORE_ANCHOR:"core_anchor",HISTORY:"history",FUTURE:"future",QUALITY_CRITIC:"quality",WORLD_RECOVERY:"recovery",RUNTIME_QUALITY_CRITIC:"runtime_quality",RUNTIME_REPAIR:"runtime_repair"}))assert.match(client,new RegExp(stage+':"'+task+'"'));
 assert.match(client,/aiTask:args\?\.aiTask\|\|worldStageTask\(stage\)/)
});

test("runtime calls explicitly label latency-sensitive and balanced tasks",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 for(const task of ["narration","npc","helper","action","scene","turn_state_fast","turn_state_deep","turn_deferred"])assert.match(client,new RegExp('aiTask:"'+task+'"'))
});

test("turn director routing lives in shared Engine module",async()=>{
 const [client,outcome]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/turn-outcome.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/export const turnDirectorMode=sharedTurnDirectorMode/);
 assert.match(outcome,/return "FAST"/);
 assert.match(outcome,/return "DEFERRED"/);
 assert.match(outcome,/return "DEEP"/);
 assert.match(client,/directorMode==="DEEP"\?deepStatePromise\(\):fastStatePromise\(\)/);
 assert.match(client,/generateDeferredTurnEffects/)
});
