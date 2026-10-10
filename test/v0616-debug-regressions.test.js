import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {groundStatePatch} from "../src/state-sync.js";
import {parseModelJSON} from "../src/model-json.js";
import {validateSceneProvenance} from "../src/scene-provenance.js";
import {firstButtonAutotestDecision} from "../src/ai-autotest.js";
import {planLazyGeneration} from "../src/lazy-generation.js";
import {fallbackWorldDesignLogic,repairWorldDesignLogic} from "../src/world-architect-skill.js";

const seed={worldviewMode:"style",genre:"奇幻",scale:"小型",danger:2,magic:2,politics:2,playHours:8,prompt:"v0.61.6 regression"};

test("v0.61.6 repairs only missing World Architect sections instead of replacing the full AI design",()=>{
 const identity={worldTheme:"空脈斷裂",magic:2,danger:3},base=fallbackWorldDesignLogic(identity,{}),source=structuredClone(base);
 source.coreFantasy="AI 保留：在逐漸下沉的浮島上，用有限航路選擇誰能繼續生存。";
 delete source.mysteryArchitecture;
 const repaired=repairWorldDesignLogic({designLogic:source},identity,{});
 assert.equal(repaired.value.coreFantasy,source.coreFantasy);
 assert.ok(repaired.repairedFields.includes("mysteryArchitecture"));
 assert.equal(repaired.issuesAfter.length,0)
});

test("v0.61.6 stall recovery plans do not spawn another side quest",()=>{
 const s=newGame(seed);s.world.state.region="測試區";
 const plan=planLazyGeneration(s,{reason:"FIRST_BUTTON_STALL_RECOVERY"});
 assert.equal(plan.reason,"STALL_RECOVERY");
 assert.equal(plan.requestedReason,"FIRST_BUTTON_STALL_RECOVERY");
 assert.equal(plan.slots.sideQuests,0);
 assert.ok(plan.slots.locations<=1&&plan.slots.npcs<=1)
});
test("v0.61.6 pending discoveries wait for scene evidence without becoming rejected errors",()=>{
 const state={player:{location:"眼前的陌生地點"},world:{state:{location:"眼前的陌生地點"},registry:{locations:[{id:"LOC-1",name:"眼前的陌生地點",known:true}],npcs:[]},canon:{facts:[]}},narrative:"",events:[],inventory:[]};
 const patch={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"脈霧紋理的可觀察變化",text:"地面脈霧紋理朝同一方位匯聚。",factId:"",evidenceType:"OBSERVED",sourceKind:"LOCATION",sourceId:"LOC-1"}]};
 const pending=groundStatePatch(state,patch,{roll:{success:true},evidencePhase:"STATE_PENDING",observableText:""});
 assert.equal(pending.patch.operations.length,0);
 assert.equal(pending.rejected.length,0);
 assert.equal(pending.deferredEvidence.length,1);
 const grounded=groundStatePatch(state,patch,{roll:{success:true},evidencePhase:"SCENE",observableText:"你看見地面脈霧紋理朝同一方位匯聚，走向清晰可辨。"});
 assert.equal(grounded.rejected.length,0);
 assert.equal(grounded.patch.operations.length,1)
});

test("v0.61.6 successful local route discovery is not rejected as a pre-existing foreign container",()=>{
 const scope={currentLocation:"眼前的陌生地點",locationDescription:"灰白脈霧覆蓋地面。",presentNpcNames:[],allNpcNames:[],knownLocations:["眼前的陌生地點"],visibleEventTexts:[],action:"沿著脈霧紋理前進，尋找通道斷點",actionKind:"OBSERVE",rollSuccess:true};
 const ok=validateSceneProvenance({sceneTitle:"脈霧通道斷點",narrative:"你沿著紋理前進後，看見匯聚處形成一個可辨認的通道斷點。"},scope);
 assert.equal(ok.valid,true,JSON.stringify(ok.issues));
 const bad=validateSceneProvenance({sceneTitle:"陌生石室",narrative:"你突然已經站在一間陌生石室中央。"},{...scope,action:"觀察脈霧",rollSuccess:true});
 assert.equal(bad.valid,false);
 assert.ok(bad.issues.some(x=>x.type==="SCENE_CONTAINER_UNGROUNDED"&&x.value==="石室"))
});
test("v0.61.6 FIRST_BUTTON uses a grounded route only after sustained stall and no travel button",()=>{
 const s={world:{id:"W1",state:{day:1,location:"起點",clock:{hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"LOC-1",name:"起點",known:true},{id:"LOC-2",name:"側路",known:false,accessRequirements:[]}],npcs:[],factions:[],sideQuests:[]},travel:{routes:[{id:"R1",fromId:"LOC-1",toId:"LOC-2",open:true}]}},player:{location:"起點",locationId:"LOC-1",hp:100,maxHp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0,wallet:{}},quests:{main:{title:"離開起點",stage:0,status:"ACTIVE",objectives:["尋找出口"]}},inventory:[],knowledge:[],discoveries:0,events:[],sceneTitle:"起點",narrative:"你仍在原地。",suggestionIntents:[]};
 const recent=[1,2,3,4,5].map(i=>({action:"觀察 "+i,kind:"OBSERVE",targetId:null,progressed:false}));
 const decision=firstButtonAutotestDecision(s,recent);
 assert.equal(decision.mode,"free");
 assert.equal(decision.kind,"TRAVEL");
 assert.equal(decision.reason,"FIRST_BUTTON_STALL_ROUTE_RECOVERY");
 assert.equal(decision.targetId,null)
});

test("v0.61.6 model JSON repair closes a truncated NPC wrapper instead of parsing an inner object",()=>{
 const raw='{"npcs":[{"name":"盲耳","agency":{"want":"活下去"},"lore":{"story":"裂谷守門人","unlockKeywords":["共振"],"minMatches":1}]}';
 const parsed=parseModelJSON(raw);
 assert.equal(parsed.npcs.length,1);
 assert.equal(parsed.npcs[0].name,"盲耳");
 assert.equal(parsed.npcs[0].lore.story,"裂谷守門人")
});

test("v0.61.6 runtime expansion binds legacy echo ids and history retries compactly",async()=>{
 const source=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(source,/echoRefs 只能逐字使用 payload\.lazyPlan \/ legacyEchoes 提供的真實 echo id/);
 assert.match(source,/bindRuntimeLegacyEchoKind\(plan,runtimeRows\(value,"npcs",slots\.npcs\)/);
 assert.match(source,/resilientWorldStage\("HISTORY",\{\s*timeoutMs:50000,retryOnTimeout:true,maxOutputTokens:1200/);
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/STATE_PATCH_DEFERRED_EVIDENCE_REJECTED/);
 assert.match(app,/SCENE_PROVENANCE_OR_STALE_REJECTED/);
 assert.match(app,/SCENE_DEADLINE_FALLBACK/);
 assert.match(app,/SCENE_RATE_LIMIT_FAST_FALLBACK/)
});
