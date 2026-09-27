// v0.59.14 PR validation trigger after bot-authored cache propagation.
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {worldEnrichmentPressure,markWorldEnrichmentScheduled} from "../src/world-enrichment.js";

function state({turns=10,locations=1,npcs=1,factions=0,sideQuests=0,stage=1,discoveries=0}={}){
 return {world:{registry:{locations:Array.from({length:locations},(_,i)=>({id:`L${i}`})),npcs:Array.from({length:npcs},(_,i)=>({id:`N${i}`})),factions:Array.from({length:factions},(_,i)=>({id:`F${i}`})),sideQuests:Array.from({length:sideQuests},(_,i)=>({id:`Q${i}`,status:"ACTIVE"}))},historyDepth:{records:[{historyId:"H1",depth:"SKELETON"}]},lazyGeneration:{plans:[]}},quests:{main:{stage}},discoveries,events:Array.from({length:turns},(_,i)=>({id:`E${i}`,type:"PLAYER_ACTION"}))}
}

test("v0.59.14 proactive enrichment schedules the thinnest world domain",()=>{
 const s=state({turns:12,locations:1,npcs:2,stage:1});const p=worldEnrichmentPressure(s,{now:1000000});
 assert.equal(p.required,true);assert.equal(p.domain,"GEOGRAPHY");assert.ok(p.pressure>=60);assert.ok(p.reasons.some(x=>x.startsWith("LOCATION_DEPTH_DEFICIT:")))
});

test("v0.59.14 scheduled enrichment imposes a deterministic turn cooldown",()=>{
 const s=state({turns:12,locations:1,npcs:2});const first=worldEnrichmentPressure(s,{now:1000000});markWorldEnrichmentScheduled(s,first);const second=worldEnrichmentPressure(s,{now:1000000});assert.equal(second.required,false);assert.ok(second.reasons.includes("ENRICHMENT_TURN_COOLDOWN"))
});

test("v0.59.14 provider failures back off proactive enrichment instead of hammering AI",()=>{
 const now=1000000,s=state({turns:20,locations:1});s.world.lazyGeneration.plans=[{status:"ABORTED",abortReason:"AI_HTTP_429",abortedAt:now-1000}];const p=worldEnrichmentPressure(s,{now});assert.equal(p.required,false);assert.equal(p.backoff,true);assert.ok(p.backoffUntil>now)
});

test("v0.59.14 lazy generation supports single-domain proactive plans",async()=>{
 const source=await readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8");assert.match(source,/PROACTIVE_ENRICHMENT/);assert.match(source,/domain=""/);assert.match(source,/d==="GEOGRAPHY"\?1:0/);assert.match(source,/selectedClaims=enrichmentDomain\?\[\]/)
});

test("v0.59.14 gameplay emits enrichment pressure lifecycle telemetry",async()=>{
 const source=await readFile(new URL("../app.js",import.meta.url),"utf8");for(const event of ["WORLD_ENRICHMENT_PRESSURE","WORLD_ENRICHMENT_SCHEDULED","WORLD_ENRICHMENT_SKIPPED","WORLD_ENRICHMENT_BACKOFF"])assert.match(source,new RegExp(event));assert.match(source,/worldEnrichmentPressure\(gameState\)/);assert.match(source,/scheduleHistoryDeepening\("proactive_enrichment",900\)/)
});
