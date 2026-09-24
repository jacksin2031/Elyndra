import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {turnDirectorMode} from "../src/turn-outcome.js";
import {fastTurnStateSnapshot} from "../src/turn-compiler.js";

test("turn director exposes ENGINE_ONLY FAST DEFERRED and DEEP",()=>{
 assert.equal(turnDirectorMode("查看桌面",{success:true,profile:{kind:"OBSERVE"}},{}),"ENGINE_ONLY");
 assert.equal(turnDirectorMode("仔細觀察門上的新痕跡",{success:true,profile:{kind:"OBSERVE"}},{}),"FAST");
 assert.equal(turnDirectorMode("說服守衛放我們通過",{success:true,profile:{kind:"SOCIAL"}},{}),"DEFERRED");
 assert.equal(turnDirectorMode("學習石碑上的魔法",{success:true,profile:{kind:"GENERAL"}},{}),"DEFERRED");
 assert.equal(turnDirectorMode("摧毀整座城的核心並推翻王國",{success:true,profile:{kind:"RISKY"}},{}),"DEEP")
});

test("Fast State snapshot keeps revision while excluding heavy director context",()=>{
 const src={stateRevision:8,world:{location:"A"},player:{hp:10},knownFacts:["x"],knowledge:{facts:[]},inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:{npcs:[]},companions:[],priorSuggestions:[],directorCanon:[{id:"F1"}],directorTimeline:[{id:"T1"}],directorHistory:[{id:"H1"}],directorRegistry:{locations:[{id:"L1"}]},culture:{heavy:true},market:{heavy:true},dungeon:{heavy:true},worldImpact:{capability:{maxScope:"LOCAL"}},travel:{},survival:{},magic:{}};
 const out=fastTurnStateSnapshot(src,{capabilities:["DISCOVER_FACT"]});
 assert.equal(out.stateRevision,8);assert.deepEqual(out.directorCanon,[{id:"F1"}]);
 for(const key of ["directorTimeline","directorHistory","directorRegistry","culture","market","dungeon"])assert.equal(key in out,false)
});

test("Deferred Director uses revision-aware StatePatch and persisted retry queue",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/scheduleDeferredDirector\(\{action:effective,roll,intent:assessment\?\.actionIntent,plan:syncPlan,queuedAt:Date\.now\(\)\},1200\)/);
 assert.match(app,/generateStatePatch\(task\.action,task\.roll,snapshot,plan/);
 assert.match(app,/commitStatePatch\(state,patch,plan/);
 assert.match(app,/deferredPlanFrom\(basePlan,currentStateRevision\(state\)\)/);
 assert.match(app,/type:"DEFERRED_TURN_STARTED"/);assert.match(app,/type:"DEFERRED_TURN_FAILED"/);
 assert.match(app,/world\.deferredTurns/);assert.match(app,/resumeDeferredDirectorQueue\(\)/)
});

test("FAST can schedule only its persistent tail as Deferred consequence",async()=>{
 const [app,stateSync]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/state-sync.js",import.meta.url),"utf8")
 ]);
 assert.match(stateSync,/hasDeferredConsequences:mode==="FAST"&&deferredCapabilities\.length>0/);
 assert.match(app,/if\(syncPlan\.hasDeferredConsequences\)scheduleDeferredDirector/)
});

test("director diagnostics include mode Dirty Flags and revision",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/STATE_SYNC_PLAN/);assert.match(app,/dirtyFlags:syncPlan\.dirtyFlags/);assert.match(app,/revision:baseRevision/);assert.match(app,/type:"TURN_DIRECTOR_MODE"/)
});
