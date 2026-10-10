import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {planLazyGeneration,recordLazyGenerationCheckpoint,validateLazyGenerationCandidate} from "../src/lazy-generation.js";
import {canonizeGeneration,enrichGeneratedLocations} from "../src/world-registry.js";

test("v0.54.10 direct and server world creation use exactly three bounded two-AI waves",async()=>{
 const [client,world]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8")
 ]);
 const direct=client.slice(client.indexOf("export async function generateWorldCandidate"),client.indexOf("export async function generateHistoryDeepening"));
 assert.equal([...direct.matchAll(/Promise\.all\(\[/g)].length,3);
 assert.equal([...world.matchAll(/Promise\.all\(\[/g)].length,3);
 assert.match(client,/const WORLD_AI_CONCURRENCY=2/);
 for(const source of [direct,world]){
  assert.match(source,/CORE_RULES[\s\S]*CORE_ANCHOR/);
  assert.match(source,/HISTORY[\s\S]*GEOGRAPHY/);
  assert.match(source,/FUTURE[\s\S]*SOCIETY/);
 }
 assert.doesNotMatch(world,/timeoutMs:120000/)
});

test("v0.54.10 checkpointed Geography remains valid after it is written into Canon",()=>{
 const state=newGame({worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:12,prompt:"checkpoint test"});
 const plan=planLazyGeneration(state,{reason:"WORLD_EDGE_UNDERDEFINED"}),historyRef=plan.historyRefs?.[0]||"";
 const generation={
  locations:[{name:"灰港外環",type:"邊境道路",region:plan.region,description:"灰岩路沿著城外殘牆延伸。",historyRefs:historyRef?[historyRef]:[],claimRefs:[],echoRefs:[],known:false,weatherProfile:{zone:"外環",affinities:[],suppressions:[]},lore:{story:"舊路仍保留過去通行痕跡",unlockKeywords:["殘牆"],minMatches:1}}],
  npcs:[],factions:[],sideQuests:[],definitions:[]
 };
 const added=canonizeGeneration(state,generation),checkpoint=recordLazyGenerationCheckpoint(state,plan,{stage:"RUNTIME_GEOGRAPHY",generation,added});
 assert.equal(checkpoint.ok,true);
 const report=validateLazyGenerationCandidate(state,generation,plan);
 assert.equal(report.errors.includes("LAZY_STALE_WORLD_VERSION"),false,report.errors.join(","));
 assert.equal(report.errors.some(x=>x.startsWith("LAZY_DUPLICATE_ENTITY:locations:")),false,report.errors.join(","));
 enrichGeneratedLocations(state,[{name:"灰港外環",culture:{identity:"邊境搬運民"},trade:{mode:"barter",commonBarter:["鹽"],currencies:[],foreignAcceptance:[],priceCulture:"以實物議價",questReward:0,combatReward:0}}]);
 const loc=state.world.registry.locations.find(x=>x.name==="灰港外環");assert.equal(loc.culture.identity,"邊境搬運民");assert.equal(loc.trade.mode,"barter")
});

test("v0.54.10 selected player action remains frozen through intermediate refreshes",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/const playerActionFlight=\{active:false,label:"",startedAt:0,watchdog:0,timedOut:false,epoch:0\}/);
 assert.match(app,/beginPlayerActionFlight\(options\?\.suggestion\?\.label\|\|requested\)/);
 assert.match(app,/if\(playerActionFlight\.active&&!gameState\?\.combat\?\.active\)/);
 assert.match(app,/已選行動 · AI 處理中/);
 assert.match(app,/free\.disabled=playerActionControlState\(\)\.locked/);
 assert.match(app,/locked=Boolean\(aiBusy\|\|turnSyncBusy\|\|playerActionFlight\.active\|\|rate\.active\)/);
 assert.match(app,/finishPlayerActionFlight\(action,ctrl\.signal\.aborted\?"scene_aborted":"scene_settled"\)/)
});
