import test from "node:test";
import assert from "node:assert/strict";
import {auditStateTransition} from "../src/runtime-integrity.js";

function state(){
 return {stateSync:{revision:7,history:[]},world:{id:"W",name:"W",state:{day:3,clock:{totalMinutes:3000,day:3,hour:2,minute:0}},canon:{facts:[]},registry:{locations:[{id:"L1",name:"村莊"}],npcs:[{id:"N1",name:"守衛",alive:true,companion:{status:"NONE"}}],factions:[],sideQuests:[]}},player:{name:"玩家",status:"ALIVE",hp:12,maxHp:20,gold:0,knowledgeScore:0,location:"村莊",locationId:"L1",worldNameKnown:false,calendarKnown:false},inventory:[],knowledge:[],events:[],npcs:{},quests:{main:{objectives:[]}},suggestions:[],narrative:""};
}
function check(mutator){const before=state(),after=structuredClone(before);after.stateSync.revision++;mutator(after);return auditStateTransition(before,after,{patch:{operations:[]},plan:{capabilities:[]}})}
test("PR invariant: HP over maximum is rejected before committing",()=>{const r=check(s=>s.player.hp=21);assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.validationCode==="PLAYER_HP_INVALID"))});
test("PR invariant: world day never moves backwards",()=>{const r=check(s=>s.world.state.day=2);assert.ok(r.issues.some(x=>x.code==="WORLD_DAY_REGRESSED"))});
test("PR invariant: world clock never moves backwards",()=>{const r=check(s=>s.world.state.clock.totalMinutes=2500);assert.ok(r.issues.some(x=>x.code==="WORLD_TIME_REGRESSED"))});
test("PR invariant: duplicate NPC ids are rejected",()=>{const r=check(s=>s.world.registry.npcs.push({id:"N1",name:"另一角色"}));assert.ok(r.issues.some(x=>x.code==="DUPLICATE_ENTITY_IDS"))});
test("PR invariant: player location id must resolve",()=>{const r=check(s=>s.player.locationId="GHOST");assert.ok(r.issues.some(x=>x.code==="PLAYER_LOCATION_DANGLING"))});
test("PR invariant: dead NPC must not remain an active companion",()=>{const r=check(s=>{s.world.registry.npcs[0].alive=false;s.world.registry.npcs[0].companion.status="ACTIVE"});assert.ok(r.issues.some(x=>x.code==="DEAD_NPC_ACTIVE_COMPANION"))});
test("PR invariant: valid state transition remains accepted",()=>{const r=check(s=>s.player.hp=11);assert.equal(r.ok,true,JSON.stringify(r.issues))});
