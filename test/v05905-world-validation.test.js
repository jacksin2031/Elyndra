import test from "node:test";
import assert from "node:assert/strict";
import {parseMagicLaw,resolveMagicAction} from "../src/magic-engine.js";
import {simplifiedChineseLeak} from "../src/traditional-chinese-guard.js";
import {mergeOpeningRegion,normalizeGeneratedLocationType} from "../src/world-compiler.js";

function magicState(cost){
 return {
  world:{seedContract:{magic:3},bible:{magicCost:cost},state:{day:1},canon:{facts:[]}},
  player:{hp:100,survival:{conditions:[]},magic:{capacity:100,strain:0,knownSpells:[{id:"S1",name:"火花術",cost:10,effect:"火花"}],attunements:[]}},
  inventory:[],events:[],knowledge:[]
 }
}

test("v0.59.5 zh-Hant guard catches observed final-canon leakage",()=>{
 assert.deepEqual(simplifiedChineseLeak({ancientTruth:"維持世界運作的關键"})?.character,"键");
 assert.deepEqual(simplifiedChineseLeak({description:"長期侵蝕而产生裂紋"})?.character,"产");
 assert.equal(simplifiedChineseLeak({description:"長期侵蝕而產生裂紋"}),null)
});

test("v0.59.5 location metadata cannot echo schema instructions into registry",()=>{
 const leaked="具體地點用途或形態；不得輸出「地點類型」";
 assert.equal(normalizeGeneratedLocationType(leaked,"廢棄貨運列車艙內"),"廢棄貨運列車艙內");
 const merged=mergeOpeningRegion(
  {startingLocation:"廢棄貨運列車艙內",startingRegion:"焦灰回廊"},
  {openingHook:"艙門突然劇烈震動。",location:{name:"廢棄貨運列車艙內",type:leaked,region:"焦灰回廊",historyRefs:[]}},
  {}
 );
 assert.equal(merged.locations[0].type,"廢棄貨運列車艙內");
 assert.doesNotMatch(merged.locations[0].type,/不得輸出|地點類型|具體地點用途或形態/)
});

test("v0.59.5 per-cast memory loss becomes a persistent Engine consequence",()=>{
 const law=parseMagicLaw("每次施術都會失去一段最近形成的清晰記憶；休息只能停止惡化。");
 assert.equal(law.status,"EXECUTABLE");
 assert.deepEqual(law.effect,{type:"MEMORY_LOSS",amount:1});
 const state=magicState(law.text),result=resolveMagicAction(state,"施法 火花術",{success:true});
 assert.equal(result.lawExecution.status,"EXECUTED");
 assert.equal(state.player.magic.memoryLoss,1);
 assert.ok(state.player.survival.conditions.includes("MAGIC_MEMORY_LOSS"))
});

test("v0.59.5 corruption and body-cost laws persist without inventing numeric HP damage",()=>{
 let law=parseMagicLaw("任何高階施法都會加速區域內的虛空侵蝕，過度使用會造成現實結構不穩定。");
 assert.deepEqual(law.effect,{type:"CORRUPTION",amount:1});
 let state=magicState(law.text),result=resolveMagicAction(state,"施法 火花術",{success:true});
 assert.equal(result.lawExecution.status,"EXECUTED");
 assert.equal(state.player.magic.corruption,1);
 assert.equal(state.player.hp,100);

 law=parseMagicLaw("所有魔法在施展時，術者身體組織或生命能量會被強制轉化為魔法燃料。");
 assert.deepEqual(law.effect,{type:"BODY_COST",amount:1});
 state=magicState(law.text);result=resolveMagicAction(state,"施法 火花術",{success:true});
 assert.equal(result.lawExecution.status,"EXECUTED");
 assert.equal(state.player.magic.bodyCost,1);
 assert.equal(state.player.hp,100)
});

test("v0.59.5 ambiguous alternative magic costs remain narrative-only",()=>{
 const law=parseMagicLaw("每施展一次需燃燒自身生命力或稀缺燃料，導致施法者虛弱或永久失去部分感官。");
 assert.equal(law.status,"NARRATIVE_ONLY")
});
