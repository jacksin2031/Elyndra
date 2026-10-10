import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {autotestWorldSummary,buildAutotestReport} from "../src/ai-autotest.js";

const source=fs.readFileSync(new URL("../src/ai-client.js",import.meta.url),"utf8");
const lazy=fs.readFileSync(new URL("../src/lazy-generation.js",import.meta.url),"utf8");

test("v0.61.6 runtime Society requires autonomous faction agency",()=>{
 assert.match(source,/RUNTIME_SOCIETY_FACTION_AGENCY/);
 assert.match(source,/nextActionIfPlayerDoesNothing/);
 assert.match(source,/internalConflicts:\[1項\]/);
});

test("v0.61.6 runtime Cast requires autonomous NPC agency",()=>{
 assert.match(source,/RUNTIME_CAST_NPC_AGENCY/);
 assert.match(source,/lifeWithoutPlayer/);
 assert.match(source,/agency:\{want,fear,secret,boundary,currentPlan,lifeWithoutPlayer\}/);
});

test("runtime expansion replay contract advances with the new agency schema",()=>{
 assert.match(lazy,/RUNTIME_EXPANSION_V5/);
 assert.match(lazy,/LAZY_VALIDATION_V6/);
});


test("background quality repair grounds named unseen findings to canonical ids",()=>{
 assert.match(source,/qualityPools=\{LOCATION:unseen\.locations/);
 assert.match(source,/finding\.targetIds=\[matches\[0\]\.id\]/);
 assert.match(source,/evaluation\.findings\.targetIds/);
});


test("autotest reports architecture review and critic repair as degraded health",()=>{
 const state={world:{id:"W",name:"N",state:{day:1,clock:{totalMinutes:0}},registry:{locations:[],npcs:[],factions:[],sideQuests:[]},generationClaims:{claims:[]},catalog:{},quality:{status:"REPAIR_REQUIRED",overall:68},storyArchitectureEvaluation:{status:"REVIEW",reason:"DEGRADED_GENERATION_PROVENANCE"}},player:{status:"ALIVE",hp:100,level:1,knowledgeScore:0,survival:{}},quests:{main:{}},inventory:[],knowledge:[],events:[]};
 const summary=autotestWorldSummary(state);
 assert.equal(summary.storyArchitectureEvaluation.status,"REVIEW");
 assert.ok(summary.coherence.issues.some(x=>x.type==="WORLD_STORY_ARCHITECTURE_REVIEW"));
 assert.ok(summary.coherence.issues.some(x=>x.type==="WORLD_QUALITY_REPAIR_REQUIRED"));
 const report=buildAutotestReport({config:{worldCount:1,totalWorldCount:1},worlds:[{index:1,status:"COMPLETED",phase:"PLAY",turns:1,summary,generation:{diagnostics:{quality:"HEALTHY"}},actions:[{turn:1}]}],telemetry:[],startedAt:1,endedAt:2});
 assert.equal(report.worlds[0].status,"DEGRADED");
});


test("direct Core Rules recovers only missing designLogic instead of discarding valid AI core fields",()=>{
 assert.match(source,/DESIGN_LOGIC_PARTIAL_REPAIR/);
 assert.match(source,/repairWorldDesignLogic\(rules,identity,directive\.blueprintProfile\)/);
 assert.match(source,/if\(!coreRuleShapeInvalid&&rules\?\.worldBible\?\.designLogic&&designLogicIssues\.length\)/);
 assert.match(source,/if\(coreRuleShapeInvalid\|\|designLogicIssues\.length\)\{markWorldFallback/);
});
