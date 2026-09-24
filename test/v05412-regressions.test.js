import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeRuntimeLocation,bindRuntimeClaims} from "../src/runtime-generation-normalizer.js";
import {parseModelJSON} from "../src/model-json.js";
import {groundStatePatch} from "../src/state-sync.js";

test("v0.54.12 normalizes common runtime Location shape drift before strict validation",()=>{
 const row={name:"晶脈裂谷",description:"灰蝕晶層形成的裂谷。",historyRefs:["HIST-1"],claimRefs:[],lore:"舊世界觀測站在此崩解。",weatherProfile:{dominantPhenomena:["WTH-2","WTH-VEIL"],description:"晶化雨頻繁"},accessRequirements:["需穿戴防切割裝備","需在低潮進入"]};
 const out=normalizeRuntimeLocation(row,["WTH-1","WTH-2","WTH-VEIL"]);
 assert.equal(out.lore.story,"舊世界觀測站在此崩解。");assert.deepEqual(out.weatherProfile.affinities,["WTH-2","WTH-VEIL"]);assert.deepEqual(out.accessRequirements,[]);assert.deepEqual(out.accessNotes,["需穿戴防切割裝備","需在低潮進入"])
});

test("v0.54.12 Engine removes mismatched causal claim refs and binds them to a satisfying row",()=>{
 const plan={claims:[{id:"C-F",type:"FUTURE_ANCHOR",historyRefs:["HIST-1"]},{id:"C-H",type:"HISTORY_ANCHOR",sourceRef:"HIST-1",historyRefs:["HIST-1"]}]};
 const rows=[{name:"錯誤地點",description:"x",historyRefs:["HIST-3"],claimRefs:["C-F"]},{name:"正確地點",description:"y",historyRefs:["HIST-1"],claimRefs:[]}];
 const out=bindRuntimeClaims(plan,"locations",rows);
 assert.deepEqual(out[0].claimRefs,[]);assert.deepEqual(new Set(out[1].claimRefs),new Set(["C-F","C-H"]));
 const definitions=bindRuntimeClaims(plan,"definitions",[{kind:"LANGUAGE",name:"史語",description:"x",historyRefs:["HIST-1"],claimRefs:["C-F"]}]);assert.deepEqual(definitions[0].claimRefs,[])
});

test("v0.54.12 parser repairs missing commas between model-generated array objects",()=>{
 assert.deepEqual(parseModelJSON('{"suggestions":[{"label":"A"}\n{"label":"B"}]}'),{suggestions:[{label:"A"},{label:"B"}]})
});

test("v0.54.12 StatePatch rejects MOVE_PLAYER to current or non-canonical locations",()=>{
 const state={player:{location:"礦坑"},world:{state:{location:"礦坑"},registry:{locations:[{id:"L1",name:"礦坑"},{id:"L2",name:"哨站"}]}}};
 let r=groundStatePatch(state,{operations:[{op:"MOVE_PLAYER",location:"礦坑"}]},{action:"前進"});assert.equal(r.patch.operations.length,0);assert.equal(r.rejected[0].reason,"MOVE_TARGET_UNCHANGED");
 r=groundStatePatch(state,{operations:[{op:"MOVE_PLAYER",location:"不存在"}]},{action:"前進"});assert.equal(r.patch.operations.length,0);assert.equal(r.rejected[0].reason,"MOVE_TARGET_NOT_CANONICAL");
 r=groundStatePatch(state,{operations:[{op:"MOVE_PLAYER",location:"哨站"}]},{action:"前進"});assert.equal(r.patch.operations.length,1);
 r=groundStatePatch(state,{operations:[{op:"GENERATE_CONTENT",generation:{locations:[{name:"新區"}]}},{op:"MOVE_PLAYER",location:"新區"}]},{action:"探索未知新區"});assert.equal(r.patch.operations.some(x=>x.op==="MOVE_PLAYER"),true)
});

test("v0.54.12 ai-client release edges and runtime prompt remain parse-safe",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/\.\/turn-outcome\.js\?v=57002/);
 assert.match(client,/\.\/ai-runtime-contracts\.js\?v=57002/);
 assert.match(client,/accessRequirements 只能是空陣列/)
});
