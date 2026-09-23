import test from "node:test";
import assert from "node:assert/strict";
import {randomAutotestWorldRaw,playerVisibleAutotestSnapshot,normalizeAutotestDecision,autotestStopReason,autotestStateFingerprint,autotestWorldSummary,autotestWorldCoherence,buildAutotestReport,autotestExportSelection} from "../src/ai-autotest.js";

function state(){
 return {
  world:{id:"W1",name:"Hidden Name",state:{day:2,clock:{hour:9,minute:5,totalMinutes:1985}},canon:{facts:[{id:"secret",text:"NEVER LEAK"}]},registry:{npcs:[{id:"N1",name:"Known",known:true},{id:"N2",name:"Hidden",known:false}],locations:[{id:"L1",name:"Camp",known:true},{id:"L2",name:"Secret Vault",known:false}]}},
  player:{name:"Tester",worldNameKnown:false,location:"Camp",hp:10,maxHp:10,status:"ACTIVE",level:2,xp:4,knowledgeScore:12,wallet:{}},
  quests:{main:{title:"Find shelter",stage:1,status:"ACTIVE",objectives:["Reach a safe place"]}},
  inventory:[{id:"I1",name:"Rope",quantity:1}],knowledge:[{id:"K1",title:"A visible clue",status:"KNOWN"}],discoveries:3,
  sceneTitle:"Morning",narrative:"You see a road.",suggestionIntents:[{label:"Follow the road",action:"沿路前進",risk:"LOW"}],events:[]
 }
}

test("random autotest world raw stays within accepted creation enums",()=>{
 const raw=randomAutotestWorldRaw(()=>0.42,3);
 assert.ok(["王道奇幻","黑暗奇幻","東方幻想","蒸汽魔法","末日異世界"].includes(raw.worldStyle));
 assert.ok(["小型","中型","大型"].includes(raw.worldScale));
 assert.ok(["easy","normal","hard","realistic"].includes(raw.difficulty));
 assert.equal(raw.magicLevelMode,"random");
 assert.ok(raw.unknownRatio>=10&&raw.unknownRatio<=95);
});

test("player-visible snapshot does not expose hidden canon, NPCs, locations, or world name",()=>{
 const snap=playerVisibleAutotestSnapshot(state());
 assert.equal(snap.world.name,"UNKNOWN");
 assert.deepEqual(snap.knownNpcs.map(x=>x.name),["Known"]);
 assert.deepEqual(snap.knownLocations.map(x=>x.name),["Camp"]);
 const serialized=JSON.stringify(snap);
 assert.equal(serialized.includes("NEVER LEAK"),false);
 assert.equal(serialized.includes("Secret Vault"),false);
 assert.equal(serialized.includes("Hidden Name"),false);
});

test("decision normalization supports suggestions, free actions and combat",()=>{
 const snap=playerVisibleAutotestSnapshot(state());
 assert.equal(normalizeAutotestDecision({mode:"suggestion",suggestionIndex:0},snap).action,"沿路前進");
 assert.equal(normalizeAutotestDecision({mode:"free",action:"檢查道路旁的腳印"},snap).mode,"free");
 const combat={...snap,combat:{active:true,enemy:{name:"Wolf",hp:5}}};
 assert.equal(normalizeAutotestDecision({mode:"free",action:"ignore"},combat).mode,"combat");
 assert.ok(["attack","defend","retreat"].includes(normalizeAutotestDecision({mode:"combat",combatAction:"defend"},combat).combatAction));
});

test("stop conditions are deterministic and turn limit is always enforced",()=>{
 const s=state();
 assert.equal(autotestStopReason(s,{turns:10},{maxTurns:10,stopCondition:"TURN_LIMIT"}),"TURN_LIMIT");
 assert.equal(autotestStopReason(s,{turns:2},{maxTurns:10,stopCondition:"KNOWLEDGE_SCORE",conditionTarget:10}),"KNOWLEDGE_SCORE");
 assert.equal(autotestStopReason(s,{turns:2},{maxTurns:10,stopCondition:"CUSTOM_AI"},{goalReached:true}),"CUSTOM_AI");
 assert.equal(autotestStopReason(s,{turns:2,errorCount:3},{maxTurns:10,stopCondition:"ERROR_COUNT",conditionTarget:3}),"ERROR_COUNT");
});

test("state fingerprint reacts to meaningful player-visible progress",()=>{
 const s=state(),before=autotestStateFingerprint(s);
 s.player.knowledgeScore=13;
 assert.notEqual(autotestStateFingerprint(s),before);
});

test("report identifies generation failures and stagnant runs",()=>{
 const fp=autotestStateFingerprint(state());
 const report=buildAutotestReport({config:{worldCount:2,maxTurns:10},startedAt:1,endedAt:100,worlds:[
  {index:1,status:"FAILED",phase:"GENERATION",error:"boom",actions:[]},
  {index:2,status:"COMPLETED",phase:"PLAY",actions:Array.from({length:5},(_,i)=>({worldIndex:2,turn:i+1,beforeFingerprint:fp,afterFingerprint:fp,decision:{action:"wait"}}))}
 ],telemetry:[]});
 assert.equal(report.summary.worldsFailed,1);
 assert.ok(report.issues.some(x=>x.type==="WORLD_GENERATION_FAILED"));
 assert.ok(report.issues.some(x=>x.type==="NO_STATE_PROGRESS"));
});


test("autotest report separates completed requests, failed attempts, timeouts and transport failures",()=>{
 const report=buildAutotestReport({
  config:{worldCount:1,maxTurns:30},startedAt:1,endedAt:100,
  worlds:[{index:1,status:"FAILED",phase:"GENERATION",error:"WORLD_HISTORY_FAILED: Failed to fetch",actions:[]}],
  telemetry:[
   {type:"AI_REQUEST",data:{task:"identity",status:"EMPTY",latencyMs:14976,usage:{input:10,output:5,reasoning:5,total:15}}},
   {type:"AI_REQUEST",data:{task:"identity",status:"SUCCESS",latencyMs:3033,usage:{input:10,output:5,total:15}}},
   {type:"AI_CALL_FAILED",data:{provider:"agnes",task:"core_rules",error:"AI_TIMEOUT: Provider 在 50 秒內未完成回應"}},
   {type:"AI_CALL_FAILED",data:{provider:"agnes",task:"core_anchor",error:"AI_TIMEOUT: Provider 在 50 秒內未完成回應"}},
   {type:"AI_CALL_FAILED",data:{provider:"agnes",task:"core_rules",error:"Failed to fetch"}},
   {type:"AUTOTEST_WORLD_FAILED",data:{error:"WORLD_HISTORY_FAILED: Failed to fetch"}}
  ]
 });
 assert.equal(report.summary.aiRequests,2);assert.equal(report.summary.aiSuccessfulResponses,1);assert.equal(report.summary.aiEmptyResponses,1);assert.equal(report.summary.aiAttempts,5);assert.equal(report.summary.aiFailures,3);assert.equal(report.summary.aiDegradedAttempts,4);
 assert.equal(report.summary.aiTimeouts,2);assert.equal(report.summary.aiTransportFailures,1);
 assert.equal(report.summary.stageBreakdown.identity.success,1);assert.equal(report.summary.stageBreakdown.identity.empty,1);
 assert.equal(report.issues.filter(x=>x.type==="WORLD_GENERATION_FAILED").length,1);
 assert.equal(report.issues.some(x=>x.type==="TELEMETRY_AUTOTEST_WORLD_FAILED"),false);
 assert.ok(report.issues.some(x=>x.type==="TELEMETRY_AI_CALL_FAILED"&&x.task==="core_rules"&&x.provider==="agnes"))
});


test("autotest export selection supports combined, debug-only and world-only output",()=>{
 assert.deepEqual(autotestExportSelection("both"),{mode:"both",debug:true,world:true});
 assert.deepEqual(autotestExportSelection("debug"),{mode:"debug",debug:true,world:false});
 assert.deepEqual(autotestExportSelection("world"),{mode:"world",debug:false,world:true});
 assert.deepEqual(autotestExportSelection("unexpected"),{mode:"both",debug:true,world:true})
});


test("autotest report exposes AI completion and fallback coverage from generation diagnostics",()=>{
 const diagnostics={quality:"DEGRADED",stages:{IDENTITY:{source:"AI"},CORE_RULES:{source:"AI"},FUTURE:{source:"FALLBACK"},SOCIETY:{source:"FALLBACK"}}};
 const report=buildAutotestReport({config:{worldCount:1},worlds:[{index:1,status:"COMPLETED",phase:"GENERATION",generation:{diagnostics},actions:[]}],telemetry:[]});
 assert.equal(report.summary.generationDegradedWorlds,1);
 assert.deepEqual(report.summary.generationStages,{total:4,ai:2,fallback:2,failed:0,aiCompletionRatePct:50,fallbackCoveragePct:50})
});


test("autotest anti-stall overrides repeated low-value observation with a fresh progression action",()=>{
 const s=state();s.suggestionIntents=[
  {label:"繼續看地面",action:"繼續看地面",kind:"OBSERVE",progression:false,risk:"LOW"},
  {label:"走向出口",action:"走向出口",kind:"TRAVEL",progression:true,risk:"LOW"}
 ];
 const snap=playerVisibleAutotestSnapshot(s),recent=[{action:"看牆",progressed:false},{action:"看地面",progressed:false}];
 const out=normalizeAutotestDecision({mode:"suggestion",suggestionIndex:0},snap,recent);
 assert.equal(out.action,"走向出口");assert.equal(out.kind,"TRAVEL");assert.equal(out.progression,true)
});

test("autotest meaningful fingerprint ignores clock-only passage",()=>{
 const s=state(),before=autotestStateFingerprint(s);s.world.state.clock.totalMinutes+=15;s.world.state.clock.hour=9;s.world.state.clock.minute=20;
 assert.equal(autotestStateFingerprint(s),before)
});

test("autotest report separates intentional foreground preemption from real AI failures",()=>{
 const report=buildAutotestReport({config:{worldCount:1},worlds:[{index:1,status:"COMPLETED",phase:"PLAY",actions:[]}],telemetry:[
  {type:"AI_REQUEST",data:{task:"action",status:"SUCCESS",latencyMs:10,usage:{total:1}}},
  {type:"AI_CALL_FAILED",data:{task:"quality",aborted:true,error:"AI_ABORTED: request cancelled by higher-priority gameplay"}}
 ]});
 assert.equal(report.summary.aiAttempts,2);assert.equal(report.summary.aiFailures,0);assert.equal(report.summary.aiPreemptedAttempts,1);assert.equal(report.summary.aiDegradedAttempts,0);
 assert.equal(report.summary.stageBreakdown.quality.preempted,1);assert.equal(report.issues.some(x=>x.type==="TELEMETRY_AI_CALL_FAILED"),false)
});

function coherenceState(){
 return {
  world:{id:"WC",name:"Coherence",state:{day:1,clock:{day:1,hour:8,minute:0,totalMinutes:0}},registry:{locations:[],npcs:[],factions:[],sideQuests:[]},generationClaims:{claims:[]},catalog:{civilizations:[],species:[],languages:[]},economy:{currencyExists:false,currencyModel:"NO_CURRENCY"},quality:{status:"PASS",source:"AI",pending:false,overall:90},creation:{difficultyRules:{hunger:true,fatigue:true,statusEffects:true}}},
  player:{name:"Tester",hp:100,maxHp:100,level:1,knowledgeScore:0,location:"",survival:{satiety:100,fatigue:0,exposure:0,injury:0,conditions:[]}},
  quests:{main:{title:"",stage:0,status:"ACTIVE",objectives:[]}},inventory:[],knowledge:[],events:[],discoveries:0
 }
}

test("autotest world coherence treats unmaterialized blueprint claims as deferred-by-design, not errors",()=>{
 const s=coherenceState();
 s.world.generationClaims.claims=[{id:"C1",type:"BLUEPRINT_DEFINITION",status:"UNMATERIALIZED"}];
 const out=autotestWorldCoherence(s);
 assert.equal(out.status,"PASS");
 assert.equal(out.generationClaims.UNMATERIALIZED,1);
 assert.equal(out.generationClaims.pendingDefinitions,1);
 assert.equal(out.generationClaims.deferredByDesign,1);
 assert.equal(out.issues.length,0)
});

test("autotest world coherence reports failed claims, unresolved reservations, economy, NPC and difficulty contradictions",()=>{
 const s=coherenceState();
 s.world.generationClaims.claims=[
  {id:"CF",type:"REQUIRED_ELEMENT",status:"FAILED"},
  {id:"CR",type:"REQUIRED_ELEMENT",status:"RESERVED"}
 ];
 s.world.registry.locations.push({id:"L1",name:"市集",trade:{mode:"currency",currencies:[{id:"CUR-1",name:"燈票"}]}});
 s.world.registry.npcs.push({id:"N1",name:"守門人",known:true,encountered:false,memories:[]});
 s.events.push({id:"E1",type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:"N1"});
 s.world.creation.difficultyRules={hunger:false,fatigue:false,statusEffects:false};
 s.player.survival={satiety:80,fatigue:10,exposure:0,injury:0,conditions:["疲勞"]};
 const out=autotestWorldCoherence(s),types=new Set(out.issues.map(x=>x.type));
 assert.equal(out.status,"FAIL");
 for(const type of ["GENERATION_CLAIM_FAILED","GENERATION_CLAIM_RESERVED_AT_EXPORT","ECONOMY_CURRENCY_REGISTRY_MISMATCH","NPC_CONVERSATION_ENCOUNTER_MISMATCH","NPC_CONVERSATION_MEMORY_MISMATCH","DIFFICULTY_SURVIVAL_RULE_MISMATCH"])assert.ok(types.has(type),type)
});

test("autotest summary embeds coherence and report promotes coherence issues",()=>{
 const s=coherenceState();
 s.world.generationClaims.claims=[{id:"CF",type:"REQUIRED_ELEMENT",status:"FAILED"}];
 const summary=autotestWorldSummary(s);
 assert.equal(summary.coherence.status,"FAIL");
 const report=buildAutotestReport({config:{worldCount:1,maxTurns:1},startedAt:1,endedAt:2,worlds:[{index:1,status:"COMPLETED",phase:"PLAY",turns:1,actions:[],summary}],telemetry:[]});
 assert.ok(report.issues.some(x=>x.type==="WORLD_COHERENCE_GENERATION_CLAIM_FAILED"&&x.worldIndex===1))
});
