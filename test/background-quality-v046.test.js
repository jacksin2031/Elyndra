import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {backgroundQualityNeed,applyUnseenWorldRepair,recordBackgroundQualityReview} from "../src/world-quality.js";

const seed={worldviewMode:"style",genre:"奇幻",scale:"小型",danger:2,magic:2,politics:2,playHours:8,prompt:"quality"};
function state(){const s=newGame(seed);canonizeGeneration(s,{locations:[{name:"灰港",type:"港鎮",region:"灰岸",description:"海風中的港口",known:true},{name:"霧林",type:"森林",region:"灰岸",description:"未探索森林",known:false}],npcs:[{name:"守門人",role:"守衛",location:"灰港",known:true}],factions:[]});return s}

test("background quality need detects unresolved generation fallback",()=>{const s=state();s.world.generationDiagnostics={degraded:true,unresolvedFallbackStages:["CAST"]};const need=backgroundQualityNeed(s);assert.equal(need.required,true);assert.equal(need.reason,"GENERATION_FALLBACK_UNRESOLVED")});

test("background quality repair may change unseen descriptive fields but not observed canon",()=>{
 const s=state(),known=s.world.registry.locations.find(x=>x.name==="灰港"),hidden=s.world.registry.locations.find(x=>x.name==="霧林");
 const beforeKnown=structuredClone(known),out=applyUnseenWorldRepair(s,{locations:[{id:known.id,description:"被改寫"},{id:hidden.id,description:"霧中有古老石碑",atmosphere:"潮濕寂靜"}]});
 assert.equal(out.applied,true);assert.equal(known.description,beforeKnown.description);assert.equal(hidden.description,"霧中有古老石碑");assert.equal(hidden.atmosphere,"潮濕寂靜")
});

test("quality review records successful background evaluation",()=>{const s=state();recordBackgroundQualityReview(s,{evaluation:{overall:87},repair:{applied:true,modified:["LOC-X"]}});assert.equal(s.world.quality.background.lastScore,87);assert.equal(s.world.quality.background.lastRepairCount,1)});

test("background Critic is post-entry, preemptible and stale-version gated",async()=>{
 const [app,client]=await Promise.all([readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")]);
 assert.match(app,/const worldQualityBackground=\{/);
 assert.match(app,/function preemptBackgroundWorldQuality\(\)/);
 assert.match(app,/preemptBackgroundAI\(\).*preemptBackgroundWorldQuality\(\)/);
 assert.match(app,/scheduleWorldQualityCritic\("post_creation",1000\)/);
 assert.match(app,/scheduleWorldQualityCritic\("continue_world",1200\)/);
 assert.match(app,/const state=gameState,sessionToken=captureStateSession\(\)/);
 assert.match(app,/runWorldQualityCritic\(state,\{signal:ctrl\.signal\}\)/);
 assert.match(app,/ctrl\.signal\.aborted\|\|!isCurrentStateSession\(sessionToken\)\|\|state\.world\?\.id!==worldId/);
 assert.match(app,/BACKGROUND_QUALITY_CRITIC_STALE_DISCARDED/);
 assert.match(app,/applyUnseenWorldRepair\(state,result\.repairPatch\)/);
 assert.match(client,/export async function runWorldQualityCritic/);
 assert.match(client,/unseenRepairTargets/);assert.match(client,/signal,timeoutMs:45000,retryOnTimeout:false/)
});
