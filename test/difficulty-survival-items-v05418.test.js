import test from "node:test";
import assert from "node:assert/strict";
import {ensureSurvival,survivalSnapshot} from "../src/survival-engine.js";
import {addInventoryItem,useItem} from "../src/item-engine.js";

function easyState(){
 return {
  world:{
   creation:{difficultyRules:{hunger:false,fatigue:false,statusEffects:false,environment:"RELAXED"}},
   state:{day:1,clock:{day:1,hour:8,minute:0,totalMinutes:0}},
   registry:{locations:[{id:"LOC-1",name:"廣場",known:true,worldState:{safety:60,infrastructure:60}}]},
   bible:{weatherSystem:{phenomena:[]}},weather:{version:1,currentId:"",startedMinute:0,nextChangeMinute:999999,locationKey:"",sequence:0,history:[],legacyNeutral:true}
  },
  player:{name:"測試者",location:"廣場",hp:100,maxHp:100,magic:{capacity:100,strain:0,knownSpells:[],attunements:[]}},
  inventory:[],crafting:{version:1,recipes:[]},events:[]
 }
}

test("using an item on easy cannot resurrect disabled survival conditions",()=>{
 const s=easyState(),surv=ensureSurvival(s);
 surv.exposure=80;surv.injury=60;surv.conditions=["環境暴露","傷勢"];
 const item=addInventoryItem(s,{name:"防護藥",category:"CONSUMABLE",useEffects:[{type:"REDUCE_EXPOSURE",amount:10}]});
 const result=useItem(s,item.id);
 assert.equal(result.ok,true);
 const snapshot=survivalSnapshot(s);
 assert.equal(snapshot.satiety,100);
 assert.equal(snapshot.fatigue,0);
 assert.deepEqual(snapshot.conditions,[]);
 assert.equal(snapshot.exposure,70);
});
