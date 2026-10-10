import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnPreview,mergeTurnCandidates} from "../src/turn-compiler.js";
import {evaluateOriginOpeningCompliance,fallbackOriginCompliance} from "../src/origin-opening-compliance.js";
import {auditStateTransition} from "../src/runtime-integrity.js";
import {consumeDistributedRate} from "../api/_ai.js";

test("PR fix: mismatched scene uses explicit Engine fallback provenance",()=>{
 const result=sceneTurnPreview({narrative:"AI says the failed action succeeded",outcome:"SUCCESS",suggestions:[]},{success:false},{action:"open door"});
 assert.equal(result.narrativeSource,"ENGINE_FALLBACK");
 assert.equal(result.narrativeRejectReason,"OUTCOME_MISMATCH");
 assert.equal(result.narrativeRejected,true);
 assert.doesNotMatch(result.narrative,/succeeded/);
});
test("PR fix: accepted AI narrative and empty AI narrative have distinct provenance",()=>{
 const ok=sceneTurnPreview({narrative:"可觀察到一扇封閉的門。",outcome:"FAILURE"},{success:false},{action:"開門"});
 assert.equal(ok.narrativeSource,"AI");
 const empty=sceneTurnPreview({narrative:"",outcome:"FAILURE"},{success:false},{action:"開門"});
 assert.equal(empty.narrativeSource,"ENGINE_FALLBACK");
 assert.equal(empty.narrativeRejectReason,"EMPTY_OR_INVALID_AI_NARRATIVE");
 const merged=mergeTurnCandidates({narrative:"可觀察到一扇封閉的門。",outcome:"FAILURE"},{},{success:false},{action:"開門"});
 assert.equal(merged.narrativeRejected,false);
 assert.equal(merged.narrativeSource,"AI");
});
test("PR fix: Origin partial never becomes verified release acceptance",async()=>{
 const opening={worldNameKnown:false,spawnPolicy:"UNKNOWN_LOCATION",equipmentPolicy:"NONE",narrativeIdentity:{coreTension:"DISPLACEMENT",requiredSignals:["OUTSIDER_COGNITIVE_DISCONTINUITY"]}};
 const report=evaluateOriginOpeningCompliance({openingHook:"你來到一個陌生地方，前方機械忽然停止運作，地面傳來震動，還有一道可以檢查的入口。",originOpening:opening,reported:fallbackOriginCompliance(opening),semanticSource:"FALLBACK"});
 assert.equal(report.status,"PARTIAL");
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/ORIGIN_OPENING_NOT_VERIFIED/);
 assert.match(app,/AUTOTEST_ORIGIN_OPENING_NOT_VERIFIED/);
 const world=await readFile(new URL("../src/world-engine.js",import.meta.url),"utf8");
 assert.match(world,/originOpeningAcceptance/);
 assert.match(world,/status==="PASS"\?"VERIFIED":"NOT_VERIFIED"/);
});
test("PR fix: scene mismatch and state rejection have explicit ERROR telemetry",async()=>{
 const source=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/PLAYER_ACTION_SCENE_OUTPUT_MISMATCH/);
 assert.match(source,/PLAYER_ACTION_SCENE_ENGINE_FALLBACK/);
 assert.match(source,/STATE_SYNC_AI_DEGRADED/);
 assert.match(source,/groundingFailed\|\|committed\.auditFailed/);
});
test("PR fix: State audit detects HP overflow, backward time and duplicated IDs",()=>{
 const before={stateSync:{revision:4},world:{state:{day:3,clock:{totalMinutes:400}},canon:{facts:[]},registry:{locations:[{id:"L1",name:"Village"}],npcs:[],factions:[],sideQuests:[]}},player:{location:"Village",locationId:"L1",hp:10,maxHp:10}};
 const after=structuredClone(before);after.stateSync.revision=5;after.player.hp=15;after.world.state.clock.totalMinutes=399;after.world.registry.locations.push({id:"L1",name:"Duplicate"});
 const result=auditStateTransition(before,after,{patch:{operations:[]},plan:{capabilities:[]}});
 assert.equal(result.ok,false);
 assert.ok(result.issues.some(x=>x.validationCode==="PLAYER_HP_INVALID"));
 assert.ok(result.issues.some(x=>x.code==="WORLD_TIME_REGRESSED"));
 assert.ok(result.issues.some(x=>x.code==="DUPLICATE_ENTITY_IDS"));
});
test("PR fix: combined turn API does not conceal missing scene in HTTP 200",async()=>{
 const source=await readFile(new URL("../api/turn.js",import.meta.url),"utf8");
 assert.match(source,/sceneResult\.status!=="fulfilled"\)return json\(res,502,/);
 assert.match(source,/patchCommitted:false/);
});
test("PR fix: distributed limiter enforces atomic count and rejects failures",async()=>{
 let sent;
 const fetchImpl=async (_url,opts)=>{sent=JSON.parse(opts.body);return {ok:true,json:async()=>({result:4})}};
 assert.equal(await consumeDistributedRate("trusted-client",{url:"https://example.org",token:"test-token",limit:3,fetchImpl}),false);
 assert.equal(sent[0],"EVAL");
 assert.equal(sent[2],"1");
 assert.match(sent[3],/^elyndra:api:ratelimit:[0-9a-f]{64}$/);
 await assert.rejects(consumeDistributedRate("key",{url:"http://insecure.org",token:"x",fetchImpl}),/HTTPS/);
 await assert.rejects(consumeDistributedRate("key",{url:"https://example.org",token:"x",fetchImpl:async()=>({ok:true,json:async()=>({result:null})})}),/INVALID_RESULT/);
});
test("PR fix: every protected API awaits the shared rate-limit decision",async()=>{
 const names=["action","helper","history-deepen","narrate","npc","summarize","translate","turn-scene","turn-state","turn","world"];
 for(const name of names){const content=await readFile(new URL("../api/"+name+".js",import.meta.url),"utf8");assert.match(content,/await methodGuard\(req,res\)/,name)}
});
