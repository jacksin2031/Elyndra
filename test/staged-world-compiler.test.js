import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world creation uses linked waves with at most two AI requests in parallel",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.ok(client.includes('WORLD_${stage}_FAILED'));
 assert.match(client,/worldStage\("CORE"/);assert.match(client,/worldStage\("CORE_REPAIR"/);for(const stage of ["HISTORY","GEOGRAPHY","FUTURE","SOCIETY","CAST"])assert.match(client,new RegExp(`resilientWorldStage\\("${stage}"`));
 assert.match(client,/timeoutMs:95000/);
 assert.match(client,/timeoutMs:65000/);
 assert.match(client,/timeoutMs:50000/);
 assert.match(client,/timeoutMs:55000/);
 for(const budget of [2200,1800,1200,800,1450,950])assert.match(client,new RegExp(`maxOutputTokens:${budget}`));
 assert.doesNotMatch(client,/timeoutMs:120000,[\s\S]{0,500}World Architect/);
 assert.match(client,/generation:\{locations:region\.locations\.slice\(0,1\),npcs:cast\.npcs\.slice\(0,1\),factions:region\.factions\.slice\(0,1\),sideQuests:cast\.sideQuests\.slice\(0,1\)\}/);
 const worldBlock=client.slice(client.indexOf("export async function generateWorldCandidate"),client.indexOf("export async function talkToNpc"));
 const parallelCalls=[...worldBlock.matchAll(/Promise\.all\(\[/g)];
 assert.equal(parallelCalls.length,2);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("HISTORY"[\s\S]*resilientWorldStage\("GEOGRAPHY"/);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("FUTURE"[\s\S]*resilientWorldStage\("SOCIETY"/);
 assert.doesNotMatch(worldBlock,/Promise\.allSettled/);
 assert.match(client,/const WORLD_AI_CONCURRENCY=2/);
 assert.match(client,/withWorldAiSlot\(async\(\)=>parseJSON\(await directChat\(args\)\)\)/);
 assert.match(client,/timelineAuthoringSlots\(directive\.timelinePacing\)/);
 assert.match(client,/bindTimelineAuthoringSlots\(futureRaw\?\.worldTimeline,directive\.timelinePacing\)/);
 assert.doesNotMatch(client,/worldStage\("CHRONOLOGY"/);
 assert.doesNotMatch(client,/worldStage\("REGION"/);
 assert.match(client,/normalizeWorldCoreCandidate\(await worldStage\("CORE"/);
 assert.match(client,/worldStage\("CORE_REPAIR"/);
 assert.match(client,/timeoutMs:70000/);
 assert.match(client,/retryOnTimeout:false/);
 assert.match(client,/worldCoreIssues\(core\)/);
 assert.match(client,/buildWorldAnchorContract\(core,directive\.timelinePacing\)/);
 assert.match(client,/worldGenerationLinkIssues\(/);
 assert.match(client,/resilientWorldStage\("CAST"/);
 assert.match(client,/worldHistory/);
 assert.match(client,/civilization/);
 assert.match(client,/weatherSystem/);
 assert.match(client,/weatherProfile/);
});

test("world creation progress represents real compiler boundaries instead of a fake 72 percent pulse",async()=>{
 const [client,app]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 for(const p of [42,56,64,74,84])assert.match(client,new RegExp(`report\\(${p},`));
 assert.doesNotMatch(app,/let pulse=38/);
 assert.doesNotMatch(app,/setInterval\(\(\)=>\{pulse=/);
 assert.match(app,/generateWorldCandidate\(seed,WORLD_CONSTITUTION,p=>worldProgress\(p\.progress,p\.label,p\.detail\)\)/);
 const appProgress=[...app.matchAll(/worldProgress\((\d+),/g)].map(x=>Number(x[1]));
 assert.ok(appProgress.includes(86));
 assert.ok(appProgress.includes(90));
 assert.ok(appProgress.includes(94));
 assert.ok(appProgress.includes(97));
});

test("staged compiler loads timeout settings through current cache generation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/ai-settings\.js\?v=273/);
 assert.match(client,/seed-contract\.js\?v=273/);
 assert.match(client,/recognition-engine\.js\?v=273/);
});
