import test from "node:test";
import assert from "node:assert/strict";
import {ensureSurvival,tickSurvival,survivalActionGate,survivalModifier,survivalSnapshot} from "../src/survival-engine.js";

function state(difficultyRules){
 return {
  world:{
   creation:{difficultyRules},
   state:{day:1,clock:{day:1,hour:8,minute:0,totalMinutes:0}},
   registry:{locations:[{id:"LOC-1",name:"廣場",known:true,worldState:{safety:60,infrastructure:60}}]},
   bible:{weatherSystem:{phenomena:[]}},
   weather:{version:1,currentId:"",startedMinute:0,nextChangeMinute:999999,locationKey:"",sequence:0,history:[],legacyNeutral:true}
  },
  player:{name:"測試者",location:"廣場",hp:100,maxHp:100},
  inventory:[]
 }
}

test("easy difficulty does not consume satiety or accumulate fatigue",()=>{
 const s=state({hunger:false,fatigue:false,statusEffects:false,environment:"RELAXED"});
 s.player.survival={satiety:4,fatigue:99,exposure:0,injury:0,conditions:["飢餓","疲勞"],lastMinute:0};
 const normalized=ensureSurvival(s);
 assert.equal(normalized.satiety,100);
 assert.equal(normalized.fatigue,0);
 assert.deepEqual(normalized.conditions,[]);
 tickSurvival(s,1440,{kind:"TRAVEL"});
 const snapshot=survivalSnapshot(s);
 assert.equal(snapshot.satiety,100);
 assert.equal(snapshot.fatigue,0);
 assert.equal(s.player.hp,100);
 assert.deepEqual(survivalActionGate(s,"TRAVEL"),{ok:true});
 assert.equal(survivalModifier(s,"GENERAL"),0);
});

test("easy statusEffects=false suppresses general survival condition tags",()=>{
 const s=state({hunger:false,fatigue:false,statusEffects:false,environment:"RELAXED"});
 const surv=ensureSurvival(s);surv.exposure=80;surv.injury=60;surv.conditions=["環境暴露","傷勢"];
 tickSurvival(s,0,{kind:"GENERAL"});
 assert.deepEqual(survivalSnapshot(s).conditions,[]);
});

test("normal difficulty keeps hunger and fatigue simulation enabled",()=>{
 const s=state({hunger:true,fatigue:true,statusEffects:true,environment:"STANDARD"});
 tickSurvival(s,360,{kind:"GENERAL"});
 const snapshot=survivalSnapshot(s);
 assert.equal(snapshot.satiety,99);
 assert.ok(snapshot.fatigue>0);
 s.player.survival.satiety=5;
 assert.equal(survivalActionGate(s,"TRAVEL").reason,"TOO_HUNGRY");
});
