import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnPreview} from "../src/turn-compiler.js";

test("runtime world evolution is automatic background work and never awaited by runAction",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("async function runAction");
 const end=app.indexOf('$("#newWorldBtn")',start);
 const run=app.slice(start,end);
 assert.match(app,/async function runBackgroundWorldEvolution\(\)/);
 assert.match(app,/scheduleWorldEvolution\("gameplay_idle",1800\)/);
 assert.match(app,/generateRegionExpansion\(gameState,reason,\{signal:ctrl\.signal\}\)/);
 assert.match(app,/WORLD_EVOLUTION_BACKGROUND_STARTED/);
 assert.match(app,/WORLD_EVOLUTION_BACKGROUND_APPLIED/);
 assert.match(app,/preemptBackgroundWorldEvolution\(\)/);
 assert.doesNotMatch(run,/await generateRegionExpansion\(/);
 assert.match(run,/scheduleWorldEvolution\(effective\|\|"player_exploration",700\)/)
});

test("foreground AI preempts low-priority background world work",async()=>{
 const [app,settings,client]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/if\(on\)preemptBackgroundAI\(\)/);
 assert.match(settings,/parentSignal=args\?\.signal/);
 assert.match(settings,/AI_ABORTED: request cancelled by higher-priority gameplay/);
 assert.match(client,/generateRegionExpansion\(state,reason="player_exploration",options=\{\}\)/);
 assert.match(client,/const signal=options\?\.signal/);
 assert.match(client,/signal,timeoutMs:45000,retryOnTimeout:false/);
 assert.match(client,/signal,timeoutMs:25000,retryOnTimeout:false/);
 assert.match(client,/signal,timeoutMs:35000,retryOnTimeout:false/);
 assert.match(app,/deferredDirector\.queue\.length/);
 assert.match(app,/preemptDeferredDirector\(\)/)
});


test("timed-out background world evolution enters exponential cooldown instead of immediately retrying",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/worldBackground=\{timer:0,running:false,controller:null,lastReason:"background_gameplay",queued:false,failures:0,cooldownUntil:0\}/);
 assert.match(app,/const cooldown=Math\.max\(0,Number\(worldBackground\.cooldownUntil\|\|0\)-Date\.now\(\)\)/);
 assert.match(app,/timedOut=\/AI_TIMEOUT\/\.test\(error\)/);
 assert.match(app,/2\*60\*1000\*\(2\*\*\(worldBackground\.failures-1\)\)/);
 assert.match(app,/cooldownRemainingMs/);
});

test("scene narration can preview before State Director finishes",async()=>{
 const [app,client]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/options\?\.onScene\?\.\(scene\)/);
 assert.match(app,/sceneTurnPreview\(scene,roll/);
 assert.match(app,/void refresh\(\)/);
 const preview=sceneTurnPreview({narrative:"你看見門後有微光。",sceneTitle:"檢查門後",suggestions:["靠近觀察","先後退"]},{success:true},{action:"看門",priorSuggestions:[]});
 assert.equal(preview.narrative,"你看見門後有微光。");
 assert.equal(preview.sceneTitle,"檢查門後");
 assert.deepEqual(preview.suggestions,["靠近觀察","先後退"])
});
