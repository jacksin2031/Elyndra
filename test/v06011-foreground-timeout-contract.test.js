import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("foreground AI deadlines stay below the gameplay watchdog",async()=>{
 const [settings,app,client]=await Promise.all([
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(settings,/PLAYER_TASK_TIMEOUT_CEILINGS=\{action:7000,scene:8000,turn_state_fast:7000,turn_state_deep:9000\}/);
 assert.match(settings,/ceiling\?Math\.min\(requestedTimeout,ceiling\):requestedTimeout/);
 const watchdog=Number(app.match(/PLAYER_ACTION_HARD_DEADLINE_MS=(\d+)/)?.[1]||0);
 assert.equal(watchdog,55000);
 for(const value of [7000,35000,7000,45000])assert.ok(value<watchdog);
 assert.match(client,/aiTask:"scene",signal:options\?\.signal,timeoutMs:35000,retryOnTimeout:false/);
 assert.match(client,/timeoutMs:plan\.mode==="DEEP"\?45000:22000,retryOnTimeout:false/);
});
