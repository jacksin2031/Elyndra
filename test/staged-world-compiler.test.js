import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world creation uses linked waves with at most two AI requests in parallel",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.ok(client.includes('WORLD_${stage}_FAILED'));
 for(const stage of ["IDENTITY","CORE_RULES","CORE_ANCHOR","HISTORY","GEOGRAPHY","FUTURE","SOCIETY","CAST"])assert.match(client,new RegExp(`resilientWorldStage\\("${stage}"`));
 for(const timeout of [35000,50000,55000,65000])assert.match(client,new RegExp(`timeoutMs:${timeout}`));
 for(const budget of [500,900,1000,1200,800,1450,950])assert.match(client,new RegExp(`maxOutputTokens:${budget}`));
 assert.match(client,/generation:\{locations:region\.locations\.slice\(0,1\),npcs:cast\.npcs\.slice\(0,1\),factions:region\.factions\.slice\(0,1\),sideQuests:cast\.sideQuests\.slice\(0,1\)\}/);
 const worldBlock=client.slice(client.indexOf("export async function generateWorldCandidate"),client.indexOf("export async function talkToNpc"));
 assert.equal([...worldBlock.matchAll(/Promise\.all\(\[/g)].length,3);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("CORE_RULES"[\s\S]*resilientWorldStage\("CORE_ANCHOR"/);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("HISTORY"[\s\S]*resilientWorldStage\("GEOGRAPHY"/);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("FUTURE"[\s\S]*resilientWorldStage\("SOCIETY"/);
 assert.doesNotMatch(worldBlock,/Promise\.allSettled/);
 assert.match(client,/const WORLD_AI_CONCURRENCY=2/);
 assert.match(client,/withWorldAiSlot\(async\(\)=>parseJSON\(await directChat\(args\)\)\)/);
 assert.match(client,/normalizeWorldIdentity\(identityRaw,expected,seed\)/);
 assert.match(client,/mergeCoreWave\(identity,expected,rules,coreAnchor\)/);
 assert.match(client,/coreWaveIssues\(identity,rules,coreAnchor,core\)/);
 assert.match(client,/buildWorldAnchorContract\(core,directive\.timelinePacing\)/);
 assert.match(client,/worldGenerationLinkIssues\(/);
 assert.match(client,/timelineAuthoringSlots\(directive\.timelinePacing\)/);
 assert.match(client,/bindTimelineAuthoringSlots\(futureRaw\?\.worldTimeline,directive\.timelinePacing\)/);
 for(const legacy of ["CORE","CORE_REPAIR","CHRONOLOGY","REGION"])assert.doesNotMatch(client,new RegExp(`worldStage\\("${legacy}"`));
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
 for(const p of [42,47,52,56,64,74,84])assert.match(client,new RegExp(`report\\(${p},`));
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
 assert.match(client,/ai-settings\.js\?v=276/);
 assert.match(client,/seed-contract\.js\?v=276/);
 assert.match(client,/recognition-engine\.js\?v=276/);
});
