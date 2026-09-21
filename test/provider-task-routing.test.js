import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world compiler routes descriptive stages fast and canon-critical stages deep",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/IDENTITY:"identity"/);
 assert.match(client,/GEOGRAPHY:"geography"/);
 assert.match(client,/SOCIETY:"society"/);
 assert.match(client,/CAST:"cast"/);
 assert.match(client,/CORE_RULES:"core_rules"/);
 assert.match(client,/CORE_ANCHOR:"core_anchor"/);
 assert.match(client,/HISTORY:"history"/);
 assert.match(client,/FUTURE:"future"/);
 assert.match(client,/QUALITY_CRITIC:"quality"/);
 assert.match(client,/WORLD_RECOVERY:"recovery"/);
 assert.match(client,/RUNTIME_QUALITY_CRITIC:"runtime_quality"/);
 assert.match(client,/RUNTIME_REPAIR:"runtime_repair"/);
 assert.match(client,/aiTask:args\?\.aiTask\|\|worldStageTask\(stage\)/)
});

test("runtime calls explicitly label latency-sensitive and balanced tasks",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 for(const task of ["narration","npc","helper","action","scene","turn_state"])assert.match(client,new RegExp('aiTask:"'+task+'"'))
});
