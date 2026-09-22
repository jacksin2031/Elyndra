import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const STAGES=["IDENTITY","CORE_RULES","CORE_ANCHOR","HISTORY","GEOGRAPHY","FUTURE","SOCIETY","CAST"];

test("v0.54.9 direct world creation is strictly sequential and dependency-locked",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const start=client.indexOf("export async function generateWorldCandidate"),end=client.indexOf("export async function generateHistoryDeepening",start),block=client.slice(start,end);
 assert.doesNotMatch(block,/Promise\.all\(\[/);
 const positions=STAGES.map(stage=>block.indexOf('resilientWorldStage("'+stage+'"'));
 assert.ok(positions.every((x,i)=>x>=0&&(i===0||x>positions[i-1])),positions.join(","));
 assert.match(block,/lockedRules:rules\.worldBible/);
 assert.match(block,/JSON\.stringify\(\{anchor,history,playerOrigin:/);
 assert.match(block,/future:\{worldTimeline:future\.worldTimeline\.map/);
});

test("v0.54.9 server world creation mirrors the staged pipeline instead of one giant request",async()=>{
 const world=await readFile(new URL("../api/world.js",import.meta.url),"utf8");
 assert.doesNotMatch(world,/timeoutMs:120000/);
 const positions=STAGES.map(stage=>world.indexOf('stageJSON(diagnostics,"'+stage+'"'));
 assert.ok(positions.every((x,i)=>x>=0&&(i===0||x>positions[i-1])),positions.join(","));
 assert.match(world,/lockedRules:rulesRaw\.worldBible/);
 assert.match(world,/history,playerOrigin:/);
 assert.match(world,/future:\{worldTimeline:future\.worldTimeline\.map/);
 assert.match(world,/validateWorldCreationCandidate\(seed,candidate\)/);
});

test("v0.54.9 keeps runtime expansion independently staged after creation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const block=client.slice(client.indexOf("export async function generateRegionExpansion"));
 for(const stage of ["RUNTIME_GEOGRAPHY","RUNTIME_SOCIETY","RUNTIME_CAST","RUNTIME_QUESTS"])assert.match(block,new RegExp(stage));
 assert.match(block,/validateLazyGenerationCandidate\(state,generation,plan\)/);
 assert.doesNotMatch(block,/worldStage\("RUNTIME_EXPANSION"/);
 assert.doesNotMatch(block,/worldStage\("RUNTIME_REPAIR"/);
});
