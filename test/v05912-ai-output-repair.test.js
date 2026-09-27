import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {repairAiOutput,repairSceneCandidate,repairStatePatchCandidate,repairWorldStageCandidate,sanitizeAiEntityName} from "../src/ai-output-repair.js";

test("v0.59.12 entity hygiene removes model punctuation without inventing a name",()=>{
 assert.equal(sanitizeAiEntityName('  斷脈礦工”， '),"斷脈礦工");
 assert.equal(sanitizeAiEntityName('「霧港守衛」'),"霧港守衛")
});

test("v0.59.12 state repair binds unique canonical ids and drops unauthorized mutations",()=>{
 const snapshot={registry:{npcs:[{id:"NPC-1",name:"霧港守衛"}],factions:[],locations:[],sideQuests:[]},directorCanon:[{id:"FACT-1",text:"鐘聲在午夜停止"}]};
 const plan={baseRevision:12,capabilities:["NPC_RELATIONSHIP_SIGNAL","DISCOVER_FACT"]};
 const raw={baseRevision:4,operations:[
  {op:"npc_relationship_signal",npcId:"「霧港守衛」",effect:"MINOR_POSITIVE"},
  {op:"DISCOVER_FACT",sourceKind:"CANON",sourceId:"鐘聲在午夜停止",title:"鐘聲",text:"鐘聲在午夜停止"},
  {op:"GENERATE_CONTENT",generation:{locations:[{name:"不存在地點"}]}}
 ]};
 const repaired=repairStatePatchCandidate(raw,{plan,snapshot});
 assert.equal(repaired.value.baseRevision,12);
 assert.equal(repaired.value.operations.length,2);
 assert.equal(repaired.value.operations[0].npcId,"NPC-1");
 assert.equal(repaired.value.operations[1].factId,"FACT-1");
 assert.equal(repaired.value.operations[1].sourceId,"FACT-1");
 assert.ok(repaired.dropped.some(x=>x.reason==="OP_NOT_AUTHORIZED"))
});

test("v0.59.12 scene repair makes Engine outcome authoritative and drops malformed suggestions",()=>{
 const raw={outcome:"SUCCESS",sceneTitle:"  霧中  ",narrative:"\u0000風聲逼近。",suggestions:[null,{label:"查看門口",action:"查看門口",kind:"observe",risk:"low",approach:"steady",requirementsSatisfied:true}]};
 const repaired=repairSceneCandidate(raw,{expectedOutcome:"FAILURE"});
 assert.equal(repaired.value.outcome,"FAILURE");
 assert.equal(repaired.value.narrative,"風聲逼近。");
 assert.equal(repaired.value.suggestions.length,1);
 assert.equal(repaired.value.suggestions[0].kind,"OBSERVE");
 assert.equal(repaired.value.suggestions[0].risk,"LOW");
 assert.ok(repaired.reasons.includes("OUTCOME_REBOUND"))
});

test("v0.59.12 world-stage repair cleans generated entity labels only",()=>{
 const raw={npcs:[{id:"NPC-X",name:"斷脈礦工”，",role:"礦工"}],sideQuests:[{id:"SQ-X",title:"「失落礦燈」。"}]};
 const repaired=repairWorldStageCandidate("CAST",raw);
 assert.equal(repaired.value.npcs[0].id,"NPC-X");
 assert.equal(repaired.value.npcs[0].name,"斷脈礦工");
 assert.equal(repaired.value.sideQuests[0].title,"失落礦燈");
 assert.equal(repaired.changed,true)
});

test("v0.59.12 repair dispatcher never asks another model",()=>{
 const result=repairAiOutput("SCENE",{outcome:"SUCCESS",narrative:"ok",suggestions:[]},{expectedOutcome:"SUCCESS"});
 assert.equal(result.value.outcome,"SUCCESS");
 assert.equal(result.changed,false)
});

test("v0.59.12 ai-client routes world/scene/state model JSON through deterministic repair",async()=>{
 const source=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(source,/ai-output-repair\.js\?v=59012/);
 assert.match(source,/repairAiOutput\("WORLD_STAGE"/);
 assert.match(source,/repairAiOutput\("SCENE"/);
 assert.match(source,/repairAiOutput\("STATE_PATCH"/)
});
