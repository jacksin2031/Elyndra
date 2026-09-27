import test from "node:test";
import assert from "node:assert/strict";
import {resolveSocialAction,socialActionDc,socialConflictSnapshot} from "../src/social-conflict-engine.js";

function stateWithNpc(overrides={}){
 const npc={id:"npc-1",name:"灰港守衛",role:"守衛",goal:"維持城門秩序",trust:overrides.trust??25,cognition:{version:1,memory:{recent:[],longTerm:[]},beliefs:[],relationships:{player:{trust:overrides.trust??25,respect:overrides.respect??30,fear:overrides.fear??10,obligation:overrides.obligation??0},npcs:{},factions:{}},commitments:[],planner:{goal:"維持城門秩序",currentPlan:"",nextStep:"",priority:"GOAL",updatedMinute:0}}};
 return {state:{world:{state:{day:3,clock:{totalMinutes:480}},registry:{npcs:[npc]}},player:{},events:[]},npc}
}
const resolution=(tier,goalAchieved)=>({tier,goalAchieved});

test("Social Conflict 2.0 persuasion builds trust while intimidation builds fear and costs trust",()=>{
 const a=stateWithNpc({trust:30,respect:35,fear:5}),targetA={id:"npc-1",name:"灰港守衛"};
 const p=resolveSocialAction(a.state,targetA,{raw:"我冷靜說服守衛讓我通過",approach:"PERSUASION"},resolution("SUCCESS",true));
 assert.equal(p.ok,true);assert.equal(p.tactic,"PERSUASION");assert.ok(p.relationship.trust>30);assert.ok(p.relationship.respect>35);
 const b=stateWithNpc({trust:30,respect:35,fear:5}),targetB={id:"npc-1",name:"灰港守衛"};
 const i=resolveSocialAction(b.state,targetB,{raw:"我威脅守衛立刻讓路",approach:"INTIMIDATION"},resolution("SUCCESS",true));
 assert.equal(i.tactic,"INTIMIDATION");assert.ok(i.relationship.fear>5);assert.ok(i.relationship.trust<30);
});

test("Social DC is relationship-aware and intimidation becomes easier against a fearful target",()=>{
 const calm=stateWithNpc({trust:10,respect:10,fear:5});
 const fearful=stateWithNpc({trust:10,respect:10,fear:75});
 const intent={raw:"威脅他停止抵抗",approach:"INTIMIDATION"};
 const calmDc=socialActionDc(calm.state,{id:"npc-1",name:"灰港守衛"},intent,{combat:true,moraleBefore:50});
 const fearDc=socialActionDc(fearful.state,{id:"npc-1",name:"灰港守衛"},intent,{combat:true,moraleBefore:50});
 assert.ok(fearDc<calmDc);
});

test("successful social pressure can force surrender in combat without directly applying combat state",()=>{
 const {state}=stateWithNpc({trust:5,respect:20,fear:82});const target={id:"npc-1",name:"灰港守衛",combatState:"ACTIVE"};
 const first=resolveSocialAction(state,target,{raw:"你已經沒有勝算，放下武器",approach:"INTIMIDATION"},resolution("SUCCESS",true),{combat:true,moraleBefore:22});
 assert.equal(first.surrendered,true);assert.equal(first.outcome,"SURRENDER");assert.equal(first.moraleDelta,-100);assert.equal(target.combatState,"ACTIVE");
});

test("deception failure raises suspicion and damages persistent trust",()=>{
 const {state}=stateWithNpc({trust:55,respect:30,fear:5});const target={id:"npc-1",name:"灰港守衛"};
 const r=resolveSocialAction(state,target,{raw:"我說謊聲稱自己是領主派來的人",approach:"DECEPTION"},resolution("CRITICAL_FAILURE",false));
 const snap=socialConflictSnapshot(state,target);
 assert.equal(r.outcome,"ESCALATE");assert.ok(snap.suspicion>=20);assert.ok(snap.relationship.trust<55);
});

test("anonymous combatants still receive deterministic social state without inventing NPC canon",()=>{
 const state={world:{state:{day:1,clock:{totalMinutes:0}},registry:{npcs:[]}},player:{},events:[]};const target={id:"enemy-x",name:"蒙面傭兵",combatState:"ACTIVE"};
 const r=resolveSocialAction(state,target,{raw:"我提出交換條件，讓他離開",approach:"PERSUASION"},resolution("MIXED",true),{combat:true,moraleBefore:60});
 assert.equal(r.ok,true);assert.ok(["COUNTEROFFER","WAVER","CONCEDE"].includes(r.outcome));assert.equal(state.world.registry.npcs.length,0);assert.ok(target.socialConflict);
});
