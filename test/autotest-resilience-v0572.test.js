import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {recordBackgroundQualityReview} from "../src/world-quality.js";
import {autotestWorldCoherence,buildAutotestReport} from "../src/ai-autotest.js";

function baseState(){return {world:{id:"W",version:1,quality:{status:"PENDING",pending:true,backgroundPending:true,provisionalOverall:84},registry:{locations:[],npcs:[],factions:[]},generationClaims:{claims:[]},catalog:{civilizations:[],species:[],languages:[]},economy:{currencyExists:false},creation:{difficultyRules:{hunger:false,fatigue:false,statusEffects:false}},state:{day:1,clock:{totalMinutes:0}}},player:{status:"ALIVE",hp:100,level:1,knowledgeScore:0,survival:{satiety:100,fatigue:0,conditions:[]}},inventory:[],knowledge:[],events:[],discoveries:0,quests:{main:{title:"Q",stage:1,status:"ACTIVE",objectives:["O"]}}}}

test("background quality failure settles terminal UNAVAILABLE instead of permanent PENDING",()=>{
 const s=baseState();recordBackgroundQualityReview(s,{error:"AI_TIMEOUT"});
 assert.equal(s.world.quality.status,"UNAVAILABLE");assert.equal(s.world.quality.pending,false);assert.equal(s.world.quality.backgroundPending,false);assert.equal(s.world.quality.official,false);
 const coherence=autotestWorldCoherence(s);assert.equal(coherence.quality.pending,false);assert.equal(coherence.quality.unavailable,true);assert.ok(coherence.issues.some(x=>x.type==="WORLD_QUALITY_UNAVAILABLE"))
});

test("background quality success settles official top-level quality",()=>{
 const s=baseState();recordBackgroundQualityReview(s,{evaluation:{status:"PASS",source:"AI",overall:91,official:true},repair:{applied:false,modified:[]}});
 assert.equal(s.world.quality.status,"PASS");assert.equal(s.world.quality.pending,false);assert.equal(s.world.quality.overall,91);assert.equal(s.world.quality.official,true)
});

test("AutoTest reports execution completion separately from health",()=>{
 const s=baseState();recordBackgroundQualityReview(s,{error:"AI_TIMEOUT"});const summary={...s,summary:null};
 const report=buildAutotestReport({config:{worldCount:1,maxTurns:30},worlds:[{index:1,status:"COMPLETED",phase:"PLAY",turns:30,stopReason:"TURN_LIMIT",actions:[],summary:{...{worldId:"W",coherence:autotestWorldCoherence(s)}},generation:{diagnostics:{quality:"HEALTHY",stages:{}}}}],telemetry:[]});
 assert.equal(report.summary.worldsExecuted,1);assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsHealthy,0);assert.equal(report.summary.worldsDegraded,1)
});

test("zero-turn PLAY record is not counted as an executed world",()=>{
 const s=baseState();recordBackgroundQualityReview(s,{evaluation:{status:"PASS",source:"AI",overall:90,official:true}});
 const report=buildAutotestReport({config:{worldCount:1,maxTurns:30},worlds:[{index:1,status:"COMPLETED",phase:"PLAY",turns:0,stopReason:"",actions:[],summary:{worldId:"W",coherence:autotestWorldCoherence(s)},generation:{diagnostics:{quality:"HEALTHY",stages:{}}}}],telemetry:[]});
 assert.equal(report.summary.worldsExecuted,0)
});

test("AutoTest runtime enables provider pacing and sheds expansion during rate limit",async()=>{
 const ai=await readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(ai,/requestSpacingMs/);assert.doesNotMatch(ai,/SHED_ON_RATE_LIMIT=new Set\(\[.*runtime_expansion/);assert.match(ai,/AI_PLAYER_CRITICAL_BACKPRESSURE_WAIT/);assert.match(ai,/control\?\.signal\?1200:0/);assert.match(app,/setDirectAIRuntimeControl\(\{disableTimeout:config\.disableTimeout===true,signal:developerAutotest\.batchController\.signal\}\)/)
});
