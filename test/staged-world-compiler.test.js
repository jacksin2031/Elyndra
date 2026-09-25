import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world creation uses bounded two-AI waves with Engine validation between waves",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.ok(client.includes('WORLD_${stage}_FAILED'));
 for(const stage of ["IDENTITY","CORE_RULES","CORE_ANCHOR","HISTORY","GEOGRAPHY","FUTURE","SOCIETY","CAST"])assert.match(client,new RegExp(`resilientWorldStage\\("${stage}"`));
 for(const timeout of [35000,50000,55000,70000,75000])assert.match(client,new RegExp(`timeoutMs:${timeout}`));
 for(const budget of [500,800,900,1000,1100,1400,1600,3000])assert.match(client,new RegExp(`maxOutputTokens:${budget}`));
 assert.match(client,/generatedTemplateLeak/);assert.match(client,/weatherProfileConflict/);
 assert.match(client,/generation:\{locations:region\.locations\.slice\(0,1\),npcs:cast\.npcs\.slice\(0,1\),factions:region\.factions\.slice\(0,1\),sideQuests:cast\.sideQuests\.slice\(0,1\)\}/);
 const worldBlock=client.slice(client.indexOf("export async function generateWorldCandidate"),client.indexOf("export async function talkToNpc"));
 assert.match(worldBlock,/resilientWorldStage\("FUTURE",\{[\s\S]*?timeoutMs:70000,retryOnTimeout:false,maxOutputTokens:3000/);
 assert.equal([...worldBlock.matchAll(/Promise\.all\(\[/g)].length,3);
 assert.doesNotMatch(worldBlock,/Promise\.allSettled/);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("CORE_RULES"[\s\S]*?resilientWorldStage\("CORE_ANCHOR"/);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("HISTORY"[\s\S]*?resilientWorldStage\("GEOGRAPHY"/);
 assert.match(worldBlock,/Promise\.all\(\[\s*resilientWorldStage\("FUTURE"[\s\S]*?resilientWorldStage\("SOCIETY"/);
 assert.match(worldBlock,/const historyReport=validateWorldHistory/);
 assert.match(worldBlock,/worldGenerationLinkIssues\(\{anchor,history,geography,society,future\}\)/);
 assert.match(client,/const WORLD_AI_CONCURRENCY=2/);
 assert.match(client,/withWorldAiSlot\(async\(\)=>parseJSON\(await directChat\(\{\.\.\.args,aiTask:args\?\.aiTask\|\|worldStageTask\(stage\)\}\)\)\)/);
 assert.match(client,/normalizeWorldIdentity\(identityRaw,expected,seed\)/);
 assert.match(client,/mergeCoreWave\(identity,expected,rules,coreAnchor\)/);
 assert.match(client,/coreWaveIssues\(identity,rules,coreAnchor,core\)/);
 assert.match(client,/buildWorldAnchorContract\(core,directive\.timelinePacing\)/);
 assert.match(client,/worldGenerationLinkIssues\(/);
 assert.match(client,/normalizeFutureLinksToAnchor\(/);
 assert.match(client,/societyIssues=linkIssues\.filter\(x=>x\.startsWith\("SOCIETY_"\)\)/);
 assert.match(client,/futureIssues=linkIssues\.filter\(x=>x\.startsWith\("FUTURE_"\)\)/);
 assert.doesNotMatch(client,/markWorldFallback\("SOCIETY",reason\);markWorldFallback\("FUTURE",reason\)/);
 assert.match(client,/timelineAuthoringSlots\(directive\.timelinePacing\)/);
 assert.match(client,/bindTimelineAuthoringSlots\(futureRaw\?\.worldTimeline,directive\.timelinePacing\)/);
 for(const legacy of ["CORE","CORE_REPAIR","CHRONOLOGY","REGION"])assert.doesNotMatch(client,new RegExp(`worldStage\\("${legacy}"`));
 assert.match(client,/resilientWorldStage\("CAST"/);
 assert.match(client,/worldHistory/);
 assert.match(client,/QUALITY_CRITIC/);
 assert.match(client,/QUALITY_REPAIR/);
 assert.match(client,/RUNTIME_QUALITY_CRITIC/);
 assert.match(client,/generationDiagnostics/);
 assert.match(client,/worldQuality/);
 assert.match(client,/civilization/);
 assert.match(client,/weatherSystem/);
 assert.match(client,/weatherProfile/);
 assert.match(client,/compactRetryArgs/);
 assert.match(client,/EMPTY_AI_RESPONSE/);
 assert.match(client,/disableOptimization:true/);
 assert.match(client,/compactRetryArgs\(args,firstReason\)/);
 assert.match(client,/generationCircuitOpen\(\)/);
 assert.match(client,/PROVIDER_TIMEOUT_CIRCUIT_OPEN/);
 assert.match(client,/retryOnTimeout===false/);
 assert.match(client,/WORLD_RECOVERY/);
 assert.match(client,/applyFallbackRecoveryPatch/);
 assert.match(client,/fallbackStages\.length<4/);
 assert.match(client,/markWorldFallback\("FUTURE","CROSS_STAGE_LINK_INVALID:"\+futureIssues\.join\(","\)\)/);
 assert.match(client,/markWorldFallback\("CAST","CROSS_STAGE_LINK_INVALID:/);
 assert.doesNotMatch(client,/\}\s*下維持生存與秩序/);
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/randomWorldBtn/);
 assert.match(app,/compileWorldCreation/);
 assert.doesNotMatch(app,/aiWorldviewAuto/);
 assert.doesNotMatch(app,/aiWorldviewBtn/);
});

test("world creation progress represents real compiler boundaries instead of a fake 72 percent pulse",async()=>{
 const [client,app]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 for(const p of [42,47,52,56,64,74,84])assert.match(client,new RegExp(`report\\(${p},`));
 assert.doesNotMatch(app,/let pulse=38/);
 assert.doesNotMatch(app,/setInterval\(\(\)=>\{pulse=/);
 assert.match(app,/generateWorldCandidate\(seed,gameState\.world\.constitution,p=>worldProgress\(Math\.max\(28,p\.progress\),p\.label,p\.detail\)\)/);
 const appProgress=[...app.matchAll(/worldProgress\((\d+),/g)].map(x=>Number(x[1]));
 assert.ok(appProgress.includes(86));
 assert.ok(appProgress.includes(90));
 assert.ok(appProgress.includes(93));
 assert.ok(appProgress.includes(96));
 assert.ok(appProgress.includes(98));
});

test("World Compiler preserves must-exist labels in Canon prompts",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/blueprintProfile\.mustExist 是硬性世界要素/);
 assert.match(client,/blueprintProfile\.mustExist 的每一項都必須在世界 Canon 實際存在/);
 assert.match(client,/blueprintProfile:directive\.blueprintProfile/)
});

test("staged compiler loads timeout settings through current cache generation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/ai-settings\.js\?v=57021/);
 assert.match(client,/seed-contract\.js\?v=57021/);
 assert.match(client,/world-compiler\.js\?v=57021/);
 assert.match(client,/recognition-engine\.js\?v=57021/);
});


test("compiler schema prompts forbid literal placeholder echoes",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/不得輸出「地點類型」/);
 assert.match(client,/不得輸出「簡短」/);
 assert.match(client,/不得輸出「角色」/)
});


test("v0.54.11 normalizes valid top-level Core Rules before structure fallback",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/export function normalizeCoreRulesStage/);
 assert.match(client,/let rules=normalizeCoreRulesStage\(rulesRaw\)/)
});
