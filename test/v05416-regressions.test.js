import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inferActionKind} from "../src/action-intent.js";
import {groundedTravelDestination} from "../src/contextual-actions.js";
import {parseModelJSON} from "../src/model-json.js";

test("v0.54.16 travel semantics beat abandoned social clauses and embedded observation",()=>{
 assert.equal(inferActionKind("閉上眼睛，依靠嗅覺追蹤那股金屬味最濃的方向，謹慎地踏出碎石堆，嘗試尋找味道的源頭。"),"TRAVEL");
 assert.equal(inferActionKind("不再繼續追問引路人的問題，轉身跟上他急促的步伐，朝斷崖谷邊緣指定的深處前進"),"TRAVEL");
 assert.equal(inferActionKind("停止繼續詢問，轉而以實體移動來測試，沿著引路人所指的擴散方向，小心踏出一步"),"TRAVEL");
 assert.equal(inferActionKind("走到守衛面前詢問他出口在哪"),"SOCIAL");
});

test("v0.54.16 grounded travel only resolves a unique or explicitly named adjacent canon destination",()=>{
 const a={id:"L-A",name:"起點",known:true},b={id:"L-B",name:"裂隙觀測台",known:false,accessRequirements:[]},c={id:"L-C",name:"山門",known:false,accessRequirements:[]};
 const state={player:{location:"起點"},world:{state:{location:"起點"},registry:{locations:[a,b]},travel:{routes:[{id:"R1",fromId:"L-A",toId:"L-B",open:true}]}}};
 assert.equal(groundedTravelDestination(state,"沿著指定方向前進",{success:true},{kind:"TRAVEL",intent:"TRAVEL"})?.name,"裂隙觀測台");
 state.world.registry.locations.push(c);state.world.travel.routes.push({id:"R2",fromId:"L-A",toId:"L-C",open:true});
 assert.equal(groundedTravelDestination(state,"沿著指定方向前進",{success:true},{kind:"TRAVEL",intent:"TRAVEL"}),null);
 assert.equal(groundedTravelDestination(state,"前往裂隙觀測台",{success:true},{kind:"TRAVEL",intent:"TRAVEL"})?.name,"裂隙觀測台");
 assert.equal(groundedTravelDestination(state,"前往裂隙觀測台",{success:false},{kind:"TRAVEL",intent:"TRAVEL"}),null);
});

test("v0.54.16 model JSON repairs only unfinished tail closers",()=>{
 assert.deepEqual(parseModelJSON('{"sceneTitle":"測試","suggestions":[{"label":"前進","requirementsSatisfied":true}]'),{sceneTitle:"測試",suggestions:[{label:"前進",requirementsSatisfied:true}]});
 assert.throws(()=>parseModelJSON('{"worldBible":{"era":"潮紀",,"tone":"灰暗"}}'),/INVALID_MODEL_JSON/);
});

test("v0.54.16 app commits grounded progression for ENGINE_ONLY and grounded travel after empty State Sync",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/STATE_SYNC_ENGINE_ONLY_GROUNDED/);
 assert.match(app,/function commitGroundedTravelFallback/);
 assert.match(app,/ENGINE_GROUNDED_TRAVEL_APPLIED/);
 assert.match(app,/locationBeforeSync/);
 assert.match(app,/groundedTravel:Boolean\(travel\.applied\)/);
});
