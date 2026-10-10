import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateSceneProvenance,validateSuggestionProvenance} from "../src/scene-provenance.js";

const scope={currentLocation:"眼前的裂隙",knownLocations:[],presentNpcNames:[],allNpcNames:[]};

test("v0.61.6 exploratory or negated container wording is not a provenance hallucination",()=>{
 assert.equal(validateSuggestionProvenance({kind:"OBSERVE",action:"伸手接觸裂隙邊緣，尋找可能的安全通道。"},scope).valid,true);
 assert.equal(validateSceneProvenance({narrative:"仔細尋找後，並未見階梯或安全通道。"},scope).valid,true);
 assert.equal(validateSceneProvenance({narrative:"前方是一條安全通道，確認可以通行。"},scope).valid,false);
});

test("v0.61.6 StatePatch grounding resynchronizes current location before validation",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("function commitStatePatch"),end=app.indexOf("function commitSceneGroundedEvidence",start),block=app.slice(start,end);
 assert.match(block,/repairPlayerLocation\(state\);[\s\S]*groundStatePatch\(state,patch,context\)/);
});

test("v0.61.6 aborted nonblocking Scene cannot keep AutoTest permanently non-idle",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function autotestForegroundIdle\(\)\{return !aiBusy&&!turnSyncBusy&&\(!nonblockingScene\.controller\|\|nonblockingScene\.controller\.signal\?\.aborted===true\)&&!deferredDirector\.running\}/);
 assert.match(app,/if\(nonblockingScene\.controller===foregroundSceneCtrl\)preemptNonblockingScene\(\);finishPlayerActionFlight/);
});

test("v0.61.6 final AutoTest export cannot silently preserve PENDING quality after settle timeout",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("async function finalizeDeveloperAutotestWorld"),end=app.indexOf("async function waitForAutotestActionReady",start),block=app.slice(start,end);
 assert.match(block,/recordBackgroundQualityReview\(gameState,\{error:"AUTOTEST_FINAL_SETTLE_TIMEOUT"\}\)/);
 assert.match(block,/AUTOTEST_FINAL_QUALITY_UNAVAILABLE/);
 assert.match(app,/const finalSettled=await finalizeDeveloperAutotestWorld\(config\)/);
 assert.match(app,/AUTOTEST_FINALIZATION_INCOMPLETE/);
});
