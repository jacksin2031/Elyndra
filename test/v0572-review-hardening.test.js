import test from "node:test";
import assert from "node:assert/strict";
import {acceptNpcSideQuest} from "../src/npc-quest-interaction.js";
import {completeSideQuest} from "../src/quest-engine.js";
import {resolveNpcCommitment} from "../src/npc-cognition.js";
import {validateSaveState} from "../src/state-validator.js";

function state(){return {world:{id:"W",name:"測試界",state:{day:1},canon:{facts:[]},registry:{locations:[],npcs:[],factions:[],sideQuests:[]}},player:{name:"測試者",worldNameKnown:false,calendarKnown:false,hp:10,maxHp:10,gold:0,knowledgeScore:0,location:"",wallet:{}},inventory:[],knowledge:[],events:[],npcs:{},quests:{main:{objectives:[]}},suggestions:[],narrative:""}}
function npc(s,id="NPC-A"){const n={id,name:"甲",trust:50,memories:[],behaviorProfile:{promises:[],grudges:[]}};s.world.registry.npcs.push(n);return n}
function quest(s,n){const q={id:"Q-1",title:"測試任務",objective:"完成測試",issuerNpcId:n.id,known:true,status:"OFFERED",progress:0,target:1,evidence:[],conditions:[],matchedConditions:[],matchedKeywords:[]};s.world.registry.sideQuests.push(q);return q}

test("v0.57.4 validator accepts a consistent quest commitment graph",()=>{const s=state(),n=npc(s),q=quest(s,n);const a=acceptNpcSideQuest(s,q.id,n.id);assert.equal(a.ok,true);const result=validateSaveState(s);assert.equal(result.valid,true,result.errors.join(","))});
test("v0.57.4 validator rejects a commitment owned by the wrong NPC target",()=>{const s=state(),n=npc(s),q=quest(s,n);const a=acceptNpcSideQuest(s,q.id,n.id);a.commitment.targetId="NPC-B";const result=validateSaveState(s);assert.equal(result.valid,false);assert.ok(result.errors.includes("QUEST_COMMITMENT_LINK_INVALID"))});
test("v0.57.4 validator rejects a missing quest issuer",()=>{const s=state(),n=npc(s),q=quest(s,n);q.issuerNpcId="NPC-MISSING";const result=validateSaveState(s);assert.equal(result.valid,false);assert.ok(result.errors.includes("QUEST_ISSUER_INVALID"))});
test("v0.57.4 completion fails closed when linked commitment was already broken",()=>{const s=state(),n=npc(s),q=quest(s,n);const a=acceptNpcSideQuest(s,q.id,n.id);q.progress=1;resolveNpcCommitment(s,n,a.commitment.id,"BROKEN","先前已違約");assert.equal(a.commitment.status,"BROKEN");assert.equal(completeSideQuest(s,q.id),false);assert.equal(q.status,"ACTIVE");assert.equal(s.events.some(e=>e.type==="QUEST_COMPLETED"),false)});
