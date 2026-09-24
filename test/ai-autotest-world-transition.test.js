import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("multi-world AutoTest transitions to every requested world without turning TURN_LIMIT into batch stop",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const finalizeStart=app.indexOf("async function finalizeDeveloperAutotestWorld"),finalizeEnd=app.indexOf("async function waitForAutotestActionReady",finalizeStart),finalize=app.slice(finalizeStart,finalizeEnd);
 assert.match(finalize,/async function finalizeDeveloperAutotestWorld\(config=\{\}\)/);
 assert.match(finalize,/fastTransition=developerAutotest\.worldIndex<Math\.max\(1,Number\(config\.worldCount\)\|\|1\)/);
 assert.match(finalize,/cancelAutotestBackgroundWork\(\{transition:true\}\)/);
 assert.match(finalize,/timeoutMs=fastTransition\?2500:/);
 assert.match(finalize,/AUTOTEST_FINAL_QUALITY_DEFERRED/);
 assert.match(finalize,/AUTOTEST_WORLD_TRANSITION_READY/);

 const cancelStart=app.indexOf("function cancelAutotestBackgroundWork"),cancelEnd=app.indexOf("async function createDeveloperAutotestWorld",cancelStart),cancel=app.slice(cancelStart,cancelEnd);
 assert.match(cancel,/transition&&autotestRuntimeExpansion\.controller===expansionCtrl/);
 assert.match(cancel,/AUTOTEST_WORLD_BACKGROUND_CANCELLED/);

 const runnerStart=app.indexOf("async function startDeveloperAutotest"),runnerEnd=app.indexOf("$(\"#aiSettingsBtn\")",runnerStart),runner=app.slice(runnerStart,runnerEnd);
 assert.equal((runner.match(/await finalizeDeveloperAutotestWorld\(config\);/g)||[]).length,2);
 assert.match(runner,/AUTOTEST_NEXT_WORLD_STARTED/);
 assert.doesNotMatch(runner,/developerAutotest\.stopRequested\s*=\s*true/);
});

test("stale world expansion completion cannot unlock a newer world's expansion",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("function scheduleDeveloperAutotestExpansion"),end=app.indexOf("async function executeDeveloperAutotestDecision",start),block=app.slice(start,end);
 assert.match(block,/if\(autotestRuntimeExpansion\.controller===ctrl\)\{autotestRuntimeExpansion\.controller=null;autotestRuntimeExpansion\.running=false;autotestRuntimeExpansion\.reason="";autotestRuntimeExpansion\.turn=0\}/);
});
