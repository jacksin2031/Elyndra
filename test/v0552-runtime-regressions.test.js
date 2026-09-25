import test from "node:test";
import assert from "node:assert/strict";
import {buildContextualActionSet,evaluateSuggestionRequirements,groundedSuggestionFailForward} from "../src/contextual-actions.js";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {planLazyGeneration,commitLazyGeneration} from "../src/lazy-generation.js";
import {firstButtonAutotestDecision,autotestStateFingerprint,buildAutotestReport} from "../src/ai-autotest.js";
import {saveAISettings,directChat,clearAISettings} from "../src/ai-settings.js";

function actionState(){
 return {
  player:{location:"宿主廢棄靈能閥屋",status:"ALIVE",skills:{OBSERVE:1,SOCIAL:1},magic:{knownSpells:[],attunements:[]},talents:[],capabilities:[]},
  world:{id:"W",state:{day:1,location:"宿主廢棄靈能閥屋"},registry:{locations:[{id:"L1",name:"宿主廢棄靈能閥屋",known:true,visibilityLock:"KNOWN",description:"閥屋有裂縫、出入口與金屬微粒。"}],npcs:[{id:"N1",name:"閥-04-靜默觀測者",known:true,alive:true,locationId:"L1"}],factions:[],sideQuests:[]}},
  quests:{main:{title:"在異世界建立第一段關係",objectives:["找到可以交流的人"]}},inventory:[],events:[]
 }
}

test("v0.55.2 Engine rejects AI suggestions that invent inventory or unowned powers",()=>{
 const s=actionState();
 const powder={label:"用黃銅粉擦腳",action:"從口袋或隨身物品中取出黃銅粉，小心地擦去腳底灰塵。",kind:"GENERAL",risk:"LOW",progression:true,causalBasis:"當地禮儀",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]};
 const psychic={label:"掃描觀測者",action:"利用靈能感知針對閥-04-靜默觀測者進行非侵入性掃描。",kind:"OBSERVE",risk:"LOW",progression:true,causalBasis:"語言無效",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]};
 assert.equal(evaluateSuggestionRequirements(s,powder).ok,false);
 assert.match(evaluateSuggestionRequirements(s,powder).reasons.join(" "),/IMPLIED_ITEM_MISSING/);
 assert.equal(evaluateSuggestionRequirements(s,psychic).ok,false);
 assert.match(evaluateSuggestionRequirements(s,psychic).reasons.join(" "),/IMPLIED_CAPABILITY_MISSING/);
 const set=buildContextualActionSet(s,[powder,psychic]);
 assert.equal(set.all.some(x=>/黃銅粉|靈能感知/.test(x.action)),false)
});

test("v0.55.2 social suggestions infer the canonical present NPC and gain grounded fail-forward evidence",()=>{
 const s=actionState();s.world.registry.npcs[0].nameKnown=true;const input={label:"詢問觀測者",action:"向閥-04-靜默觀測者詢問剛才最值得注意的變化，只說能確認的部分",kind:"SOCIAL",risk:"LOW",progression:true,causalBasis:"NPC 在場",requirementsSatisfied:true};
 const set=buildContextualActionSet(s,[input]),row=set.all.find(x=>x.action.includes("閥-04-靜默觀測者"));
 assert.ok(row);assert.equal(row.targetId,"N1");assert.equal(row.affordance?.sourceKind,"NPC");
 const fact=groundedSuggestionFailForward(s,row,{success:true});assert.ok(fact);assert.equal(fact.sourceId,"N1");assert.equal(fact.evidenceType,"HEARD")
});

test("v0.55.2 stall recovery expansion exposes one newly generated reachable location without exposing its lore",()=>{
 const seed={worldviewMode:"style",genre:"王道奇幻",scale:"小型",danger:2,magic:2,politics:2,playHours:8,prompt:"recovery regression"},s=newGame(seed);
 s.world.state.region="測試區";s.world.state.location="起點";s.player.location="起點";s.world.history=[];s.world.creation={constitution:{hardRules:[]}};s.world.registry??={};s.world.registry.locations=[{id:"L-START",name:"起點",region:"測試區",known:true,visibilityLock:"KNOWN"}];s.world.registry.npcs=[];s.world.registry.factions=[];s.world.registry.sideQuests=[];s.world.travel={version:1,routes:[]};
 const plan=planLazyGeneration(s,{reason:"FIRST_BUTTON_STALL_RECOVERY"});
 const generation={locations:[{name:"灰樺鎮蒸汽調節節點",type:"INDUSTRIAL_HUB",region:"測試區",description:"新的調節節點",historyRefs:[],known:false,lore:{story:"仍然應保持隱藏的 lore",unlockKeywords:["銘牌"],minMatches:1}}],npcs:[],factions:[],sideQuests:[],definitions:[]};
 const added=canonizeGeneration(s,generation);assert.equal(added.locations.length,1);s.world.travel.routes.push({id:"R1",fromId:"L-START",toId:added.locations[0].id,open:true,baseMinutes:30});
 const out=commitLazyGeneration(s,plan,generation,added,{sourceProvider:"test",sourceModel:"test"});assert.equal(out.ok,true,out.errors?.join(",")||"");assert.equal(out.recoveryAffordance?.id,added.locations[0].id);assert.equal(added.locations[0].known,true);assert.equal(added.locations[0].visibilityLock,"KNOWN");assert.notEqual(added.locations[0].lore?.known,true)
});

test("v0.57.13 FIRST_BUTTON switches strategy after five stagnant turns",()=>{
 const s=actionState();s.world.registry.locations.push({id:"L2",name:"灰樺鎮蒸汽調節節點",known:true,visibilityLock:"KNOWN"});s.world.travel={routes:[{id:"R1",fromId:"L1",toId:"L2",open:true}]};s.suggestionIntents=[{label:"再問一次",action:"再問閥-04一次",kind:"SOCIAL",progression:true,targetId:"N1"}];
 const recent=Array.from({length:5},(_,i)=>({turn:i+1,progressed:false,action:"再問一次",kind:"SOCIAL"})),decision=firstButtonAutotestDecision(s,recent);
 assert.equal(decision.firstButton,true);assert.equal(decision.firstButtonOverride,true);assert.equal(decision.reason,"FIRST_BUTTON_STALL_RECOVERY");assert.equal(decision.suggestionIndex,null);assert.equal(decision.kind,"TRAVEL");assert.equal(decision.action,"前往灰樺鎮蒸汽調節節點");assert.equal(decision.targetId,"L2")
});

test("v0.55.2 autotest fingerprint ignores clock-only advancement",()=>{
 const a=actionState(),b=structuredClone(a);a.world.state.clock={totalMinutes:20};b.world.state.clock={totalMinutes:40};
 assert.equal(autotestStateFingerprint(a),autotestStateFingerprint(b))
});

test("v0.55.2 seven stagnant turns degrade the world instead of reporting COMPLETED",()=>{
 const actions=Array.from({length:7},(_,i)=>({worldIndex:1,turn:i+1,beforeFingerprint:"SAME",afterFingerprint:"SAME",decision:{action:"重複行動"}}));
 const world={index:1,status:"COMPLETED",phase:"PLAY",turns:7,stopReason:"TURN_LIMIT",actions,generation:{diagnostics:{quality:"HEALTHY",stages:{}}},summary:{coherence:{status:"PASS",issues:[],quality:{pending:false}}}};
 const report=buildAutotestReport({config:{worldCount:1},worlds:[world],telemetry:[],startedAt:1,endedAt:2});assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsDegraded,1);assert.equal(report.worlds[0].status,"DEGRADED");assert.ok(report.issues.some(x=>x.type==="STATE_PROGRESS_RECOVERY_FAILED"&&x.severity==="ERROR"))
});

test("v0.55.2 failed final quality critic cannot be represented as a clean settlement",()=>{
 const world={index:1,status:"COMPLETED",phase:"PLAY",turns:1,actions:[],generation:{diagnostics:{quality:"HEALTHY",stages:{}}},summary:{coherence:{status:"WARN",issues:[],quality:{pending:true}}}};
 const telemetry=[{at:10,type:"BACKGROUND_QUALITY_CRITIC_FAILED",data:{error:"AI_HTTP_429"}},{at:11,type:"AUTOTEST_FINAL_QUALITY_SETTLED",data:{qualitySettled:true}}];
 const report=buildAutotestReport({config:{worldCount:1},worlds:[world],telemetry,startedAt:1,endedAt:12});assert.equal(report.worlds[0].status,"DEGRADED");assert.ok(report.issues.some(x=>x.type==="FINAL_QUALITY_SETTLEMENT_INVALID"&&x.severity==="ERROR"))
});

test("v0.55.2 429 opens backpressure and sheds subsequent low-priority work",async()=>{
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};globalThis.__ELYNDRA_PROVIDER_RATE_LIMITS__={};clearAISettings();saveAISettings({provider:"openai",apiKey:"test",endpoint:"https://example.invalid/v1/chat/completions"});
 let calls=0;const priorFetch=globalThis.fetch;globalThis.fetch=async()=>{calls++;return {ok:false,status:429,headers:{get:n=>String(n).toLowerCase()==="retry-after"?"1":null},json:async()=>({error:{message:"rate limited"}}),text:async()=>"rate limited"}};
 try{await assert.rejects(()=>directChat({aiTask:"turn_deferred",system:"s",user:"u",retryOnTimeout:false,timeoutMs:5000}),/AI_RATE_LIMIT_BACKPRESSURE/);assert.equal(calls,1);await assert.rejects(()=>directChat({aiTask:"runtime_quality",system:"s",user:"u",retryOnTimeout:false,timeoutMs:5000}),/AI_RATE_LIMIT_BACKPRESSURE/);assert.equal(calls,1)}finally{globalThis.fetch=priorFetch;clearAISettings();delete globalThis.__ELYNDRA_PROVIDER_RATE_LIMITS__}
});
