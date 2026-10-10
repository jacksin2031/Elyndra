import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {BROWSER_DECISION_TASK_BENCHMARK,summarizeBrowserDecisionTaskBenchmark} from "../src/browser-decision-task-benchmark.js";
import {BROWSER_DECISION_MODE} from "../src/browser-decision-contract.js";

test("v0.61.9 local gate benchmark covers all four shadow tasks",()=>{
 assert.equal(BROWSER_DECISION_TASK_BENCHMARK.length,25);
 assert.deepEqual(new Set(BROWSER_DECISION_TASK_BENCHMARK.map(x=>x.task)),new Set([
  "ACTION_LEGALITY","ORIGIN_COMPLIANCE","NARRATIVE_CONSISTENCY","AI_OUTPUT_ACCEPTANCE"
 ]));
 const result=summarizeBrowserDecisionTaskBenchmark({results:BROWSER_DECISION_TASK_BENCHMARK.map(x=>({task:x.task,ok:true,confidence:.9}))});
 assert.equal(result.byTask.ACTION_LEGALITY.cases,6);
 assert.equal(result.byTask.ORIGIN_COMPLIANCE.cases,6);
 assert.equal(result.byTask.NARRATIVE_CONSISTENCY.cases,6);
 assert.equal(result.byTask.AI_OUTPUT_ACCEPTANCE.cases,7);
 for(const row of Object.values(result.byTask)){assert.equal(row.accuracy,1);assert.equal(row.confidentAccuracy,1)}
});

test("v0.61.9 all local decision gates remain shadow-only and nonblocking",async()=>{
 const [app,ai,runtime,settings]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/browser-decision-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/browser-decision-settings.js",import.meta.url),"utf8")
 ]);
 assert.equal(BROWSER_DECISION_MODE.SHADOW_ONLY,"SHADOW_ONLY");
 assert.match(settings,/mode:"SHADOW_ONLY"/);
 assert.match(runtime,/mode:BROWSER_DECISION_MODE\.SHADOW_ONLY/);
 assert.match(app,/void evaluateActionLegalityShadow\(requested,actionState\)\.then/);
 assert.doesNotMatch(app,/await\s+evaluateActionLegalityShadow/);
 assert.match(app,/void evaluateNarrativeConsistencyShadow\(preview,/);
 assert.doesNotMatch(app,/await\s+evaluateNarrativeConsistencyShadow/);
 assert.match(ai,/void evaluateOriginComplianceShadow\(/);
 assert.doesNotMatch(ai,/await\s+evaluateOriginComplianceShadow/);
 assert.match(ai,/void evaluateAiOutputAcceptanceShadow\("SCENE"/);
 assert.match(ai,/void evaluateAiOutputAcceptanceShadow\("STATE_PATCH"/);
 assert.doesNotMatch(ai,/await\s+evaluateAiOutputAcceptanceShadow/);
});

test("v0.61.9 authoritative Engine validators still decide acceptance",async()=>{
 const [app,ai]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/sceneCheck=validateSceneProvenance\(preview,scope\)/);
 assert.match(app,/if\(!sceneCheck\.valid\)/);
 assert.match(ai,/repaired=repairAiOutput\("SCENE",raw,context\)/);
 assert.match(ai,/repaired=repairAiOutput\("STATE_PATCH",normalized,context\)/);
 assert.match(ai,/if\(!accepted\)/);
 assert.match(ai,/throw new Error\("STATE_PATCH_ALL_OPERATIONS_REJECTED"\)/);
});

test("v0.61.9 worker implements all four gate evaluators with uncertain fail-safe",async()=>{
 const worker=await readFile(new URL("../src/browser-decision-worker.js",import.meta.url),"utf8");
 for(const fn of ["evaluateActionLegality","evaluateOriginCompliance","evaluateNarrativeConsistency","evaluateAiOutputAcceptance"])assert.match(worker,new RegExp("async function "+fn+"\\("));
 for(const task of ["ACTION_LEGALITY","ORIGIN_COMPLIANCE","NARRATIVE_CONSISTENCY","AI_OUTPUT_ACCEPTANCE"])assert.match(worker,new RegExp('task==="'+task+'"'));
 assert.match(worker,/decisionResult\("ACTION_LEGALITY",reject\?"REJECT":accept\?"ACCEPT":"UNCERTAIN"/);
 assert.match(worker,/decisionResult\("ORIGIN_COMPLIANCE",accept\?"ACCEPT":"UNCERTAIN"/);
 const fallback=worker.indexOf("TASK_MODEL_NOT_IMPLEMENTED");assert.ok(fallback>0);
 for(const task of ["ACTION_LEGALITY","ORIGIN_COMPLIANCE","NARRATIVE_CONSISTENCY","AI_OUTPUT_ACCEPTANCE"])assert.ok(worker.indexOf(`if(task==="${task}")`)<fallback)
});
