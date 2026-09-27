import test from "node:test";
import assert from "node:assert/strict";
import {repairAiOutput,verifyRepairIdempotence} from "../src/ai-output-repair.js";
import {auditStateTransition} from "../src/runtime-integrity.js";
import {summarizeRuntimeObservability} from "../src/runtime-observability.js";
import {telemetryEntries,clearDebugTelemetry} from "../src/debug-telemetry.js";
import {buildAutotestReport} from "../src/ai-autotest.js";

function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}

test("v0.59.13 repair is idempotent for state, scene, and world output",()=>{
 const snapshot={registry:{npcs:[{id:"NPC-1",name:"守衛"}],factions:[],locations:[],sideQuests:[]},directorCanon:[]},plan={baseRevision:3,capabilities:["NPC_RELATIONSHIP_SIGNAL"]};
 const state=verifyRepairIdempotence("STATE_PATCH",{baseRevision:1,operations:[{op:"npc_relationship_signal",npcId:"「守衛」",effect:"MINOR_POSITIVE"}]},{plan,snapshot});
 const scene=verifyRepairIdempotence("SCENE",{outcome:"SUCCESS",narrative:" ok ",suggestions:[{label:"看",action:"看",kind:"observe",risk:"low",approach:"steady"}]},{expectedOutcome:"SUCCESS"});
 const world=verifyRepairIdempotence("WORLD_STAGE",{npcs:[{name:"「礦工」"}]},{stage:"CAST"});
 assert.equal(state.ok,true);assert.equal(scene.ok,true);assert.equal(world.ok,true)
});

test("v0.59.13 separates recoverable normalization from masking and hard reject",()=>{
 const cosmetic=repairAiOutput("WORLD_STAGE",{npcs:[{name:"「礦工」"}]},{stage:"CAST"});assert.equal(cosmetic.masking,false);assert.ok(cosmetic.issues.some(x=>x.severity==="RECOVERABLE"));
 const plan={baseRevision:1,capabilities:["NPC_RELATIONSHIP_SIGNAL"]},snapshot={registry:{npcs:[]}};
 const hard=repairAiOutput("STATE_PATCH",{baseRevision:1,operations:[{op:"NPC_RELATIONSHIP_SIGNAL",npcId:"ghost",effect:"POSITIVE"}]},{plan,snapshot});assert.equal(hard.masking,true);assert.ok(hard.issues.some(x=>x.severity==="HARD_REJECT"));assert.equal(hard.value.operations.length,0)
});

test("v0.59.13 invariant audit blocks canon mutation, dangling references, and failed-outcome success effects",()=>{
 const before={stateSync:{revision:4},world:{canon:{facts:[{id:"F1",text:"fixed"}]},registry:{locations:[{id:"L1",name:"村"}],npcs:[],factions:[],sideQuests:[]}},player:{location:"村"}},plan={capabilities:["MOVE_PLAYER","ACQUIRE_ITEM"]};
 const safe=structuredClone(before);safe.stateSync.revision=5;assert.equal(auditStateTransition(before,safe,{patch:{operations:[]},plan}).ok,true);
 const canon=structuredClone(safe);canon.world.canon.facts[0].text="mutated";assert.ok(auditStateTransition(before,canon,{patch:{operations:[]},plan}).issues.some(x=>x.code==="IMMUTABLE_CANON_CHANGED"));
 const dangling=structuredClone(safe);dangling.player.location="不存在";assert.ok(auditStateTransition(before,dangling,{patch:{operations:[{op:"MOVE_PLAYER",location:"不存在"}]},plan,context:{roll:{success:true}}}).issues.some(x=>x.code==="DANGLING_REFERENCE_AFTER_APPLY"));
 const failed=structuredClone(safe);assert.ok(auditStateTransition(before,failed,{patch:{operations:[{op:"ACQUIRE_ITEM",item:{name:"x"}}]},plan,context:{roll:{success:false}}}).issues.some(x=>x.code==="FAILED_OUTCOME_SUCCESS_SIDE_EFFECT"))
});

test("v0.59.13 repair Debug events carry a stable pipeline correlation chain",()=>{
 const prior=globalThis.localStorage;globalThis.localStorage=memoryStorage();try{clearDebugTelemetry();const result=repairAiOutput("SCENE",{outcome:"SUCCESS",narrative:"x",suggestions:[]},{expectedOutcome:"FAILURE",turnId:"TURN-7"}),rows=telemetryEntries().filter(x=>["AI_OUTPUT_RECEIVED","AI_OUTPUT_REPAIRED"].includes(x.type));assert.equal(rows.length,2);assert.equal(rows[0].data.pipelineId,rows[1].data.pipelineId);assert.equal(rows[0].data.correlationId,rows[1].data.correlationId);assert.equal(rows[1].data.turnId,"TURN-7");assert.equal(result.masking,true)}finally{globalThis.localStorage=prior}
});

test("v0.59.13 AutoTest makes unsafe commit rate the P0 KPI and exposes upstream drift",()=>{
 const telemetry=[];for(let i=0;i<10;i++)telemetry.push({type:"AI_OUTPUT_RECEIVED",at:i,data:{repairKind:"SCENE"}});for(let i=0;i<4;i++)telemetry.push({type:"AI_OUTPUT_REPAIRED",at:20+i,data:{masking:true,hardRejects:0,issues:[{code:"OUTCOME_REBOUND",severity:"CONTRACT_VIOLATION"}]}});for(let i=0;i<5;i++)telemetry.push({type:"STATE_COMMIT_SAFE",at:40+i,data:{}});
 const summary=summarizeRuntimeObservability(telemetry);assert.equal(summary.unsafeCommitRate,0);assert.equal(summary.runtimeSafety,"HEALTHY");assert.equal(summary.repairMasking,4);assert.ok(summary.driftSignatures.some(x=>x.code==="OUTCOME_REBOUND"));
 const worlds=[{index:1,status:"COMPLETED",phase:"PLAY",turns:1,actions:[{turn:1,beforeFingerprint:"a",afterFingerprint:"b"}],summary:{coherence:{status:"PASS",issues:[]}},generation:{diagnostics:{quality:"HEALTHY",stages:{}}}}],report=buildAutotestReport({config:{worldCount:1},worlds,telemetry,startedAt:1,endedAt:100});assert.equal(report.summary.runtimeIntegrity.unsafeCommitRate,0);assert.ok(report.issues.some(x=>x.type==="UPSTREAM_CONTRACT_DRIFT"))
});
