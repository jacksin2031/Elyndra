import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {BROWSER_ACTION_BENCHMARK,summarizeBrowserDecisionBenchmark} from "../src/browser-decision-benchmark.js";
import {BROWSER_DECISION_SETTINGS_DEFAULT,loadBrowserDecisionSettings,saveBrowserDecisionSettings} from "../src/browser-decision-settings.js";

test("v0.61.8 browser decision defaults fail safe and stay shadow-only",()=>{
 const settings=loadBrowserDecisionSettings();
 assert.equal(BROWSER_DECISION_SETTINGS_DEFAULT.enabled,false);
 assert.equal(settings.enabled,false);
 assert.equal(settings.mode,"SHADOW_ONLY");
 assert.equal(settings.model.id,"Xenova/paraphrase-multilingual-MiniLM-L12-v2");
 assert.equal(settings.model.webgpuDtype,"fp16");
 assert.equal(settings.model.wasmDtype,"q8");
 const saved=saveBrowserDecisionSettings({enabled:true,mode:"ENFORCE_LOW_RISK",minConfidence:.1});
 assert.equal(saved.enabled,true);
 assert.equal(saved.mode,"SHADOW_ONLY");
 assert.equal(saved.minConfidence,.5);
});

test("v0.61.8 multilingual action benchmark covers all routes and locales",()=>{
 assert.equal(BROWSER_ACTION_BENCHMARK.length,32);
 assert.deepEqual(new Set(BROWSER_ACTION_BENCHMARK.map(x=>x.expected)),new Set(["LOCAL","COMBAT","ADVENTURE"]));
 assert.deepEqual(new Set(BROWSER_ACTION_BENCHMARK.map(x=>x.lang)),new Set(["zh-Hant","ja","en"]));
 const result=summarizeBrowserDecisionBenchmark({results:BROWSER_ACTION_BENCHMARK.map((x,index)=>({ok:index!==0}))});
 assert.equal(result.byLanguage["zh-Hant"].cases,12);
 assert.equal(result.byLanguage.ja.cases,10);
 assert.equal(result.byLanguage.en.cases,10);
 assert.equal(result.byLanguage.en.accuracy,1);
});

test("v0.61.8 gameplay wiring runs browser classification asynchronously and only compares shadow output",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/browserDecisionShadow=classifyBrowserActionShadow\(requested,actionState\)/);
 assert.doesNotMatch(app,/await\s+classifyBrowserActionShadow\(requested,actionState\)/);
 assert.match(app,/void browserDecisionShadow\.then\(result=>recordBrowserDecisionAssessmentComparison/);
 assert.match(app,/classifyBrowserActionShadow\(label,gameState\)\.then\(result=>recordBrowserDecisionAssessmentComparison/);
 assert.match(app,/SHADOW_ONLY/);
});

test("v0.61.8 local model UI is opt-in and explains first-download behavior",async()=>{
 const [app,runtime,worker]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/browser-decision-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/browser-decision-worker.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/BROWSER LOCAL DECISION · EXPERIMENTAL/);
 assert.match(app,/第一次需要下載並快取模型/);
 assert.match(app,/browserDecisionEnabled/);
 assert.match(runtime,/if\(!settings\.enabled\)return null/);
 assert.match(runtime,/device:"auto"/);
 assert.match(worker,/WEBGPU_PROBE_FAILED/);
 assert.match(worker,/WEBGPU_MODEL_LOAD_FAILED/);
 assert.match(worker,/device="wasm"/);
 assert.match(worker,/MODEL_NOT_LOADED/);
 assert.match(worker,/TASK_MODEL_NOT_IMPLEMENTED/);
});
