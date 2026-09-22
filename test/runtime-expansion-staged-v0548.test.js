import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inferActionKind} from "../src/action-intent.js";
import {providerTokenBudget} from "../src/ai-settings.js";

test("v0.54.8 compound movement keeps TRAVEL semantics",()=>{
 assert.equal(inferActionKind("離開裂谷，沿地勢尋找能通往高處的出口"),"TRAVEL");
 assert.equal(inferActionKind("前往橋邊查看破損痕跡"),"TRAVEL");
 assert.equal(inferActionKind("潛入倉庫觀察守衛"),"RISKY")
});

test("v0.54.8 runtime world expansion is staged instead of one-shot generation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const start=client.indexOf("export async function generateRegionExpansion"),block=client.slice(start);
 for(const stage of ["RUNTIME_GEOGRAPHY","RUNTIME_SOCIETY","RUNTIME_CAST","RUNTIME_QUESTS"])assert.match(block,new RegExp(stage));
 assert.match(block,/validateLazyGenerationCandidate\(state,generation,plan\)/);
 assert.match(block,/remainingClaims/);
 assert.match(block,/locationDetails/);
 assert.doesNotMatch(block,/worldStage\("RUNTIME_EXPANSION"/);
 assert.doesNotMatch(block,/worldStage\("RUNTIME_REPAIR"/)
});

test("v0.54.8 autotest awaits necessary progressive expansion and player-action scene completion",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/async function expandDeveloperAutotestWorld/);
 assert.match(app,/await expandDeveloperAutotestWorld\("WORLD_EDGE_UNDERDEFINED"\)/);
 assert.match(app,/waitForAutotestIdle\(config\.disableTimeout===true\?90000:38000\)/)
});

test("v0.54.8 Agnes preserves enough visible JSON budget for cast and runtime stages",()=>{
 assert.equal(providerTokenBudget("agnes","adaptive","cast",950),1800);
 assert.equal(providerTokenBudget("agnes","adaptive","runtime_expansion",900),1600)
});
