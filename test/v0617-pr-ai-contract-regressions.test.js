import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {verifiedStatePatch} from "../src/ai-client.js";
import {sceneTurnPreview} from "../src/turn-compiler.js";
import {fallbackOriginCompliance,evaluateOriginOpeningCompliance} from "../src/origin-opening-compliance.js";
import {consumeDistributedRate,methodGuard} from "../api/_ai.js";
import turnHandler from "../api/turn.js";

test("PR: repaired State Patch cannot quietly discard its last operation",()=>{
 const context={plan:{baseRevision:4,capabilities:["REVEAL_ENTITY"]},snapshot:{registry:{locations:[],npcs:[],factions:[],sideQuests:[]}},turnId:"REV-4"};
 assert.throws(()=>verifiedStatePatch({baseRevision:4,operations:[{op:"REVEAL_ENTITY",kind:"npc",id:"nonexistent"}]},context),/STATE_PATCH_ALL_OPERATIONS_REJECTED/);
 assert.deepEqual(verifiedStatePatch({baseRevision:4,operations:[]},context).operations,[]);
});
test("PR: AI outcome contradiction shows fallback with explicit source",()=>{
 const result=sceneTurnPreview({narrative:"你成功打開上鎖的門",outcome:"SUCCESS",suggestions:[]},{success:false},{action:"開門"});
 assert.equal(result.narrativeSource,"ENGINE_FALLBACK");
 assert.equal(result.narrativeRejected,true);
 assert.notEqual(result.narrative,"你成功打開上鎖的門");
});
test("PR: semantic Origin degradation never masquerades as PASS",()=>{
 const origin={spawnPolicy:"FIXED",equipmentPolicy:"NONE",narrativeIdentity:{coreTension:"ISOLATION",requiredSignals:["PROOF"]}};
 const report=evaluateOriginOpeningCompliance({openingHook:"你醒來後看見眼前道路崩裂，遠方傳來急促警鐘聲；你可以繞路、尋找掩護或者查找聲音來源。",originOpening:origin,reported:fallbackOriginCompliance(origin),semanticSource:"FALLBACK"});
 assert.equal(report.status,"PARTIAL");
 assert.notEqual(report.status,"PASS");
});
test("PR: official world creation blocks non-PASS Origin",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/ORIGIN_OPENING_NOT_VERIFIED/);
 assert.match(app,/AUTOTEST_ORIGIN_OPENING_NOT_VERIFIED/);
});
test("PR: Redis gate uses atomic EVAL and shared SHA-256 key",async()=>{
 let captured;const fetchImpl=async(url,init)=>{captured={url,init};return {ok:true,json:async()=>({result:2})}};
 const approved=await consumeDistributedRate("ip-sensitive",{url:"https://redis.example",token:"private",limit:2,fetchImpl});
 assert.equal(approved,true);
 const args=JSON.parse(captured.init.body);
 assert.equal(args[0],"EVAL");
 assert.equal(args[2],"1");
 assert.match(args[3],/^elyndra:api:ratelimit:[a-f0-9]{64}$/);
 assert.equal(captured.init.headers.Authorization,"Bearer private");
 const rejected=await consumeDistributedRate("ip-sensitive",{url:"https://redis.example",token:"private",limit:1,fetchImpl});
 assert.equal(rejected,false);
});
test("PR: Redis outage fails closed",async()=>{
 await assert.rejects(()=>consumeDistributedRate("ip",{url:"https://redis.example",token:"private",fetchImpl:async()=>{throw new Error("OFFLINE")}}),/OFFLINE/);
 await assert.rejects(()=>consumeDistributedRate("ip",{url:"http://redis.example",token:"private"}),/HTTPS/);
});

test("PR: turn API rejects a failed scene even when State Patch succeeds",async()=>{
 const keys=["ELYNDRA_SERVER_TOKEN","AI_API_URL","AI_MODEL","VERCEL","UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"];
 const prior=Object.fromEntries(keys.map(key=>[key,process.env[key]])),oldFetch=globalThis.fetch;
 try{
  process.env.ELYNDRA_SERVER_TOKEN="local-pr-test";process.env.AI_API_URL="https://example.invalid/ai";process.env.AI_MODEL="test";delete process.env.VERCEL;delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
  let calls=0;
  globalThis.fetch=async()=>{calls++;if(calls===1)throw new Error("SCENE_DOWN");return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({baseRevision:1,operations:[]})}}]})}};
  const req={method:"POST",headers:{authorization:"Bearer local-pr-test"},body:{action:"觀察",roll:{success:true,profile:{kind:"OBSERVE"}},snapshot:{stateRevision:1,world:{day:1,location:"村莊"},player:{location:"村莊",hp:10,maxHp:10}}},socket:{remoteAddress:"127.0.0.231"}};
  const res={statusCode:0,setHeader(){},end(content){this.body=JSON.parse(content)}};
  await turnHandler(req,res);
  assert.equal(calls,2);
  assert.equal(res.statusCode,502);
  assert.equal(res.body.error,"SCENE_GENERATION_FAILED");
  assert.equal(res.body.patchCommitted,false);
 }finally{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key]}globalThis.fetch=oldFetch}
});
test("PR: serverless API fails closed when shared Redis is not configured",async()=>{
 const keys=["ELYNDRA_SERVER_TOKEN","VERCEL","UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"],prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  process.env.ELYNDRA_SERVER_TOKEN="local-pr-test";process.env.VERCEL="1";delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const req={method:"POST",headers:{authorization:"Bearer local-pr-test"},body:{action:"觀察"},socket:{remoteAddress:"127.0.0.2"}},res={statusCode:0,setHeader(){},end(content){this.body=JSON.parse(content)}};
  assert.equal(await methodGuard(req,res),false);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.error,"RATE_LIMIT_UNAVAILABLE");
 }finally{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key]}}
});
