import test from "node:test";
import assert from "node:assert/strict";
import {ensureWorldRegistry,repairPlayerLocation,ensureCurrentLocationVisible} from "../src/v06030-world-registry-hotfix.js";
import {groundStatePatch,deterministicObservationFallback} from "../src/v06030-state-sync-hotfix.js";

function state({known=true,npc=false,knowledge=[]}={}){
 return {
  player:{location:"霧の崖道"},
  world:{state:{location:"霧の崖道",day:1},registry:{locations:[{id:"LOC-START",name:"霧の崖道",description:"濡れた石畳には細い排水溝があり、崖側には低い石壁が続いている。",known}],npcs:npc?[{id:"NPC-LOCAL",name:"旅人",locationId:"LOC-START",known:false,alive:true}]:[],factions:[],sideQuests:[]}},
  knowledge:[...knowledge],events:[],inventory:[]
 };
}
const observeContext={action:"足元と周囲を詳しく観察する",roll:{success:true,profile:{kind:"OBSERVE"}},evidencePhase:"STATE_PENDING"};

test("v0.60.30 physically occupied canonical location is always player-visible",()=>{
 const s=state({known:false});
 const out=ensureCurrentLocationVisible(s);
 assert.equal(out.changed,true);assert.equal(s.world.registry.locations[0].known,true);
 s.world.registry.locations[0].known=false;ensureWorldRegistry(s);assert.equal(s.world.registry.locations[0].known,true);
 s.world.registry.locations[0].known=false;repairPlayerLocation(s);assert.equal(s.world.registry.locations[0].known,true);
});

test("v0.60.30 successful OBSERVE with an empty StatePatch records existing current-location Canon",()=>{
 globalThis.ELYNDRA_LOCALE="ja";
 const s=state();
 const grounded=groundStatePatch(s,{baseRevision:0,operations:[]},observeContext);
 assert.equal(grounded.patch.operations.length,1);
 const op=grounded.patch.operations[0];assert.equal(op.op,"DISCOVER_FACT");assert.equal(op.sourceKind,"LOCATION");assert.equal(op.sourceId,"LOC-START");
 assert.match(op.text,/濡れた石畳/);assert.doesNotMatch(op.text,/方向|人数|時刻/);
});

test("v0.60.30 successful OBSERVE prefers a physically present hidden NPC before generic location detail",()=>{
 const s=state({npc:true});
 const op=deterministicObservationFallback(s,observeContext);
 assert.equal(op.op,"REVEAL_ENTITY");assert.equal(op.kind,"npc");assert.equal(op.id,"NPC-LOCAL");
});

test("v0.60.30 does not fabricate repeat observation progress after the local Canon detail is already recorded",()=>{
 const s=state({knowledge:[{sourceRef:{kind:"LOCATION",id:"LOC-START"},text:"already known"}]});
 assert.equal(deterministicObservationFallback(s,observeContext),null);
 const grounded=groundStatePatch(s,{baseRevision:0,operations:[]},observeContext);assert.equal(grounded.patch.operations.length,0);
});

test("v0.60.30 failed observations never receive deterministic success progress",()=>{
 const s=state(),context={...observeContext,roll:{success:false,profile:{kind:"OBSERVE"}}};
 assert.equal(deterministicObservationFallback(s,context),null);
 const grounded=groundStatePatch(s,{baseRevision:0,operations:[]},context);assert.equal(grounded.patch.operations.length,0);
});
