import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.54.19 keeps turn latency fast but settles world quality before autotest export",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/async function runBackgroundWorldQualityCritic\(options=\{\}\)/);
 assert.match(app,/const allowAutotest=options\?\.allowAutotest===true/);
 assert.match(app,/developerAutotestActive&&!allowAutotest/);
 assert.match(app,/async function finalizeDeveloperAutotestWorld\(config=\{\}\)/);
 assert.match(app,/!autotestRuntimeExpansion\.running/);
 assert.match(app,/await runBackgroundWorldQualityCritic\(\{allowAutotest:true\}\)/);
 assert.match(app,/AUTOTEST_FINAL_QUALITY_STARTED/);
 assert.match(app,/AUTOTEST_FINAL_QUALITY_SETTLED/);
 assert.match(app,/if\(config\.mode==="worlds"\)\{\s*const finalSettled=await finalizeDeveloperAutotestWorld\(config\)/);
 assert.match(app,/AUTOTEST_FINALIZATION_INCOMPLETE/);
 const playCompletion=app.indexOf('result.stopReason=result.stopReason||"TURN_LIMIT"');
 assert.ok(playCompletion>0);
 assert.ok(app.lastIndexOf("await finalizeDeveloperAutotestWorld(config);",playCompletion)>0);
});

test("manual stop does not wait for final quality work",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("async function finalizeDeveloperAutotestWorld"),end=app.indexOf("async function waitForAutotestActionReady",start),block=app.slice(start,end);
 assert.match(block,/developerAutotest\.stopRequested/);
 assert.match(block,/developerAutotest\.batchController\?\.signal\?\.aborted/);
});
