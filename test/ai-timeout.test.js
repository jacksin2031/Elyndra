import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world generation uses recoverable bounded subcompiler timeouts instead of a 95s monolithic Core",async()=>{
 const [settings,client]=await Promise.all([
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.doesNotMatch(settings,/abort\(\),25000/);
 assert.match(settings,/AI_TIMEOUT: Provider/);
 assert.ok(client.includes('WORLD_${stage}_FAILED'));
 for(const stage of ["IDENTITY","CORE_RULES","CORE_ANCHOR","HISTORY","GEOGRAPHY","FUTURE","SOCIETY","CAST"])assert.match(client,new RegExp(`resilientWorldStage\\("${stage}"`));
 for(const timeout of [35000,50000,55000,65000])assert.match(client,new RegExp(`timeoutMs:${timeout}`));
 assert.doesNotMatch(client,/timeoutMs:95000/);
 assert.match(settings,/max_completion_tokens/);
 assert.match(settings,/maxOutputTokens/);
 assert.match(settings,/providerTokenBudget/);
 assert.match(settings,/Math\.max\(256,Math\.min\(8192/);
 assert.match(settings,/retryOnTimeout!==false/);
 assert.match(client,/retryOnTimeout:false/);
 assert.match(client,/compilerRecoverable/);
 assert.match(client,/INVALID_MODEL_JSON/);
 for(const legacy of ["CORE","CORE_REPAIR","CHRONOLOGY","REGION"])assert.doesNotMatch(client,new RegExp(`worldStage\\("${legacy}"`));
});

test("server world generation timeout is longer than ordinary narration",async()=>{
 const [core,world,turn,narrate,npc]=await Promise.all([
  readFile(new URL("../api/_ai.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn.js",import.meta.url),"utf8"),
  readFile(new URL("../api/narrate.js",import.meta.url),"utf8"),
  readFile(new URL("../api/npc.js",import.meta.url),"utf8")
 ]);
 assert.match(core,/timeoutMs=30000/);
 assert.match(core,/AI_TIMEOUT: upstream provider exceeded/);
 assert.match(world,/timeoutMs:120000/);
 assert.match(turn,/timeoutMs:35000/);
 assert.match(turn,/timeoutMs:50000/);
 assert.doesNotMatch(turn,/timeoutMs:60000/);
 assert.match(narrate,/timeoutMs:45000/);
 assert.match(npc,/timeoutMs:45000/);
});
