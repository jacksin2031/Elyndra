import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeRuntimeSideQuest} from "../src/runtime-generation-normalizer.js";
import {validateGeneration} from "../src/world-registry.js";
import {autotestStateFingerprint} from "../src/ai-autotest.js";

test("v0.54.14 normalizes Runtime SideQuest target drift before strict validation",()=>{
 const cases=[
  {target:"蒼-K-77",conditions:["A","B"],evidenceKeywords:["地脈"]},
  {target:{type:"CONVERSATION",entityName:"蒼-K-77"},conditions:"完成靜脈冥想",evidenceKeywords:"晶化果實"},
  {target:["錯誤結構"],conditions:["A","B","C","D"],evidenceKeywords:["x","y"]}
 ];
 const rows=cases.map((x,i)=>normalizeRuntimeSideQuest({title:"任務"+(i+1),objective:"完成可驗證目標",known:false,...x}));
 assert.deepEqual(rows.map(x=>x.target),[2,1,3]);
 assert.ok(rows.every(x=>Array.isArray(x.conditions)&&Array.isArray(x.evidenceKeywords)));
 assert.equal(validateGeneration({sideQuests:rows}).valid,true);
});

test("v0.54.14 preserves a legitimate numeric Runtime SideQuest target",()=>{
 assert.equal(normalizeRuntimeSideQuest({target:5,conditions:[],evidenceKeywords:[]}).target,5);
 assert.equal(normalizeRuntimeSideQuest({target:"4",conditions:[],evidenceKeywords:[]}).target,4);
 assert.equal(normalizeRuntimeSideQuest({target:9,conditions:[],evidenceKeywords:[]}).target,5);
});

function state(){return {world:{id:"W",state:{clock:{day:1,hour:8,minute:0,totalMinutes:0}},registry:{locations:[],npcs:[],sideQuests:[]}},player:{location:"起點",hp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0},quests:{main:{stage:0,status:"ACTIVE",objectives:["調查"]}},inventory:[],knowledge:[],discoveries:0,combat:{active:false}}}

test("v0.54.14 Autotest fingerprint treats visible knowledge as state progress",()=>{
 const a=state(),before=autotestStateFingerprint(a);
 a.knowledge.push({id:"K-1",title:"新觀察",status:"UNCONFIRMED",score:0});
 assert.notEqual(autotestStateFingerprint(a),before);
 const b=state(),clockOnly=autotestStateFingerprint(b);b.world.state.clock.totalMinutes=45;b.world.state.clock.hour=8;b.world.state.clock.minute=45;
 assert.equal(autotestStateFingerprint(b),clockOnly);
});

test("v0.54.14 Runtime Quest prompt makes target numeric and normalizes before validation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/target 是完成任務所需的進度／證據門檻，只能是 1-5 的整數/);
 assert.match(client,/runtimeRows\(value,"sideQuests",slots\.sideQuests\)\.map\(normalizeRuntimeSideQuest\)/);
 assert.match(client,/runtime-generation-normalizer\.js\?v=57011/);
 assert.match(client,/resilientWorldStage\("HISTORY",\{\s*timeoutMs:75000/);
});
