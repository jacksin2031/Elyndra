import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world creation splits heavy chronology into bounded history and future stages",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.ok(client.includes('WORLD_${stage}_FAILED'));
 for(const stage of ["CORE","HISTORY","FUTURE","REGION","CAST"])assert.match(client,new RegExp(`worldStage\\("${stage}"`));
 assert.match(client,/timeoutMs:95000/);
 assert.match(client,/timeoutMs:70000/);
 assert.match(client,/timeoutMs:65000/);
 assert.match(client,/timeoutMs:60000/);
 for(const budget of [2200,1800,1300,1600,1500,1100])assert.match(client,new RegExp(`maxOutputTokens:${budget}`));
 assert.doesNotMatch(client,/timeoutMs:120000,[\s\S]{0,500}World Architect/);
 assert.match(client,/generation:\{locations:region\.locations\.slice\(0,1\),npcs:cast\.npcs\.slice\(0,1\),factions:region\.factions\.slice\(0,1\),sideQuests:cast\.sideQuests\.slice\(0,1\)\}/);
 assert.match(client,/Promise\.all\(\[chronologyPromise,openingPromise\]\)/);
 assert.match(client,/timelineAuthoringSlots\(directive\.timelinePacing\)/);
 assert.match(client,/bindTimelineAuthoringSlots\(future\.worldTimeline,directive\.timelinePacing\)/);
 assert.doesNotMatch(client,/worldStage\("CHRONOLOGY"/);
 assert.match(client,/normalizeWorldCoreCandidate\(await worldStage\("CORE"/);
 assert.match(client,/worldStage\("CORE_REPAIR"/);
 assert.match(client,/timeoutMs:70000/);
 assert.match(client,/retryOnTimeout:false/);
 assert.match(client,/worldCoreIssues\(core\)/);
 assert.match(client,/return \{\.\.\.core,\.\.\.chronology,\.\.\.opening\}/);
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
 for(const p of [42,58,68,78,84])assert.match(client,new RegExp(`report\\(${p},`));
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
 assert.match(client,/ai-settings\.js\?v=272/);
 assert.match(client,/seed-contract\.js\?v=272/);
 assert.match(client,/recognition-engine\.js\?v=272/);
});
