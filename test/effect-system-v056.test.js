import test from "node:test";
import assert from "node:assert/strict";
import {validateAiEffectProposal,severityFromIntensity} from "../src/effect-schema.js";
import {ensureEffectRuntime,applyEffect,getEffect,getEffects,setEffectIntensity,applyEffectTreatment,tickEffects,syncEffectsFromSurvival,effectObservations,validateEffectRuntime,evaluateEffectCondition} from "../src/effect-engine.js";
import {ensureSurvival,survivalSnapshot} from "../src/survival-engine.js";

function state({difficulty="normal",rules={hunger:true,fatigue:true,statusEffects:true,injuryRecovery:"STANDARD"}}={}){
 return {
  world:{creation:{basic:{difficulty},difficultyRules:rules},state:{day:1,clock:{day:1,hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"LOC-1",name:"廣場",known:true,worldState:{safety:60,infrastructure:60}}]},bible:{weatherSystem:{phenomena:[]}},weather:{version:1,currentId:"",startedMinute:0,nextChangeMinute:999999,locationKey:"",sequence:0,history:[],legacyNeutral:true}},
  player:{id:"PLAYER",name:"測試者",location:"廣場",hp:100,maxHp:100},inventory:[]
 }
}

test("v0.56 effect runtime initializes deterministically",()=>{
 const s=state(),r=ensureEffectRuntime(s);assert.equal(r.version,1);assert.deepEqual(r.active,[]);assert.deepEqual(r.stats,{created:0,recovered:0,expired:0,escalated:0,transformed:0,invalidRejected:0})
});

test("AI effect proposal cannot write numeric authority",()=>{
 const v=validateAiEffectProposal({type:"INJURY",semanticSeverity:"MODERATE",intensity:80,hpDelta:-20});assert.equal(v.valid,false);assert.ok(v.errors.some(x=>x.includes("AI_NUMERIC_AUTHORITY_FORBIDDEN")))
});

test("AI semantic proposal is resolved by engine",()=>{
 const s=state(),r=applyEffect(s,{type:"INJURY",semanticSeverity:"MODERATE",suggestedTags:["LEFT_ARM"],reason:"blade impact"},{ai:true,source:{kind:"AI",id:"TURN"}});assert.equal(r.ok,true);assert.equal(r.effect.severity,2);assert.equal(r.effect.intensity,30);assert.ok(r.effect.tags.includes("LEFT_ARM"))
});

test("severity bands stay within 0-5",()=>{
 assert.deepEqual([0,1,20,40,65,85,100].map(severityFromIntensity),[0,1,2,3,4,5,5])
});

test("same type and target stack without duplicate instances",()=>{
 const s=state();applyEffect(s,{type:"POISON",semanticSeverity:"MINOR"});applyEffect(s,{type:"POISON",semanticSeverity:"SEVERE"});assert.equal(getEffects(s).filter(x=>x.type==="POISON").length,1);assert.equal(getEffect(s,"POISON").severity,3)
});

test("HP recovery does not erase persistent injury",()=>{
 const s=state();s.player.hp=40;s.player.survival={satiety:100,fatigue:0,exposure:0,injury:70,conditions:["傷勢"],lastMinute:0};ensureSurvival(s);s.player.hp=100;ensureSurvival(s);assert.equal(s.player.survival.injury,70);assert.ok(getEffect(s,"INJURY"))
});

test("legacy survival values bridge into unified effects",()=>{
 const s=state();s.player.survival={satiety:10,fatigue:80,exposure:75,injury:60,conditions:[],lastMinute:0};syncEffectsFromSurvival(s,{statusEffects:true,hunger:true,fatigue:true});assert.deepEqual(new Set(getEffects(s).map(x=>x.type)),new Set(["HUNGER","FATIGUE","COLD","INJURY"]))
});

test("easy statusEffects=false suppresses survival bridge",()=>{
 const s=state({difficulty:"easy",rules:{hunger:false,fatigue:false,statusEffects:false,injuryRecovery:"FAST"}});s.player.survival={satiety:5,fatigue:99,exposure:90,injury:90,conditions:["傷勢"],lastMinute:0};ensureSurvival(s);assert.equal(getEffects(s).length,0);assert.deepEqual(survivalSnapshot(s).conditions,[])
});

test("untreated injury escalates over time",()=>{
 const s=state();applyEffect(s,{type:"INJURY",semanticSeverity:"MODERATE"});const before=getEffect(s,"INJURY").intensity;tickEffects(s,1440);assert.ok(getEffect(s,"INJURY").intensity>before);assert.ok(s.effects.stats.escalated>=1)
});

test("clean wound prevents untreated escalation",()=>{
 const s=state();applyEffect(s,{type:"INJURY",semanticSeverity:"MODERATE"});applyEffectTreatment(s,"CLEAN_WOUND",{power:1});const e=getEffect(s,"INJURY"),before=e.intensity;tickEffects(s,1440);assert.ok(getEffect(s,"INJURY").intensity<=before)
});

test("bandage reduces bleeding",()=>{
 const s=state();applyEffect(s,{type:"BLEEDING",semanticSeverity:"SEVERE"});const before=getEffect(s,"BLEEDING").intensity;applyEffectTreatment(s,"BANDAGE",{power:20});const after=getEffect(s,"BLEEDING")?.intensity||0;assert.ok(after<before)
});

test("antidote can resolve poison",()=>{
 const s=state();applyEffect(s,{type:"POISON",semanticSeverity:"MODERATE"});applyEffectTreatment(s,"ANTIDOTE",{power:30});assert.equal(getEffect(s,"POISON"),null);assert.ok(s.effects.stats.recovered>=1)
});

test("wet condition accelerates cold",()=>{
 const s=state();applyEffect(s,{type:"COLD",semanticSeverity:"MODERATE"});applyEffect(s,{type:"WET",semanticSeverity:"MINOR"});const before=getEffect(s,"COLD").intensity;tickEffects(s,360);assert.ok(getEffect(s,"COLD").intensity>before)
});

test("warmth recovers cold",()=>{
 const s=state();applyEffect(s,{type:"COLD",semanticSeverity:"SEVERE"});const before=getEffect(s,"COLD").intensity;tickEffects(s,240,{warmth:true});assert.ok((getEffect(s,"COLD")?.intensity||0)<before)
});

test("critical bleeding has engine-owned HP consequence",()=>{
 const s=state();applyEffect(s,{type:"BLEEDING",semanticSeverity:"DANGEROUS"});const before=s.player.hp;tickEffects(s,120);assert.ok(s.player.hp<before)
});

test("hidden effect exposes manifestation but not mechanical identity",()=>{
 const s=state();applyEffect(s,{type:"POISON",semanticSeverity:"MINOR",visibility:"HIDDEN"});const row=effectObservations(s)[0];assert.equal(row.effectId,null);assert.equal(row.type,null);assert.equal(row.visibility,"MANIFESTATION");assert.ok(row.text.length>0)
});

test("duration expiry removes effect from active registry",()=>{
 const s=state();applyEffect(s,{type:"WELL_RESTED",semanticSeverity:"MINOR",expiresAtMinute:10});s.world.state.clock.totalMinutes=10;tickEffects(s,0);assert.equal(getEffect(s,"WELL_RESTED"),null);assert.equal(s.effects.stats.expired,1)
});

test("condition engine supports compound predicates",()=>{
 const c={all:[{fact:"terrain",operator:"IN",value:["FOREST","MUD"]},{fact:"temperature",operator:"LT",value:5}]};assert.equal(evaluateEffectCondition(c,{terrain:"FOREST",temperature:2}),true);assert.equal(evaluateEffectCondition(c,{terrain:"CITY",temperature:2}),false)
});

test("effect runtime validator rejects invalid magnitude",()=>{
 const s=state();applyEffect(s,{type:"INJURY",semanticSeverity:"MINOR"});assert.equal(validateEffectRuntime(s.effects).valid,true);s.effects.active[0].severity=9;assert.equal(validateEffectRuntime(s.effects).valid,false)
});

test("effect statistics record rejected proposals",()=>{
 const s=state();applyEffect(s,{type:"NOT_REAL",semanticSeverity:"MINOR"});assert.equal(s.effects.stats.invalidRejected,1)
});
