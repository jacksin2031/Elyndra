import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world generation receives a long direct-AI timeout and clear timeout error",async()=>{
 const [settings,client]=await Promise.all([
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.doesNotMatch(settings,/abort\(\),25000/);
 assert.match(settings,/AI_TIMEOUT: Provider/);
 assert.doesNotMatch(client,/timeoutMs:120000[\s\S]*World Architect/);
 assert.ok(client.includes('WORLD_${stage}_FAILED'));
 for(const stage of ["CORE","CHRONOLOGY","REGION","CAST"])assert.match(client,new RegExp(`worldStage\\("${stage}"`));
 assert.match(client,/timeoutMs:65000/);
 assert.match(client,/timeoutMs:60000/);
 assert.match(client,/timeoutMs:55000/);
 assert.match(client,/timeoutMs:50000/);
 assert.match(settings,/max_completion_tokens/);
 assert.match(settings,/maxOutputTokens/);
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
 assert.match(turn,/timeoutMs:60000/);
 assert.match(narrate,/timeoutMs:45000/);
 assert.match(npc,/timeoutMs:45000/);
});
