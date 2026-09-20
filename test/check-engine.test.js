import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {buildActionCheck,trainActionSkill,ensureCheckProfile,normalizeCheckBonuses} from "../src/check-engine.js";
import {performAction,actionProfile} from "../src/game-engine.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:""};
const state=()=>newGame(seed);

test("neutral new character no longer receives fixed action-type bonus",()=>{
 const s=state(),check=buildActionCheck(s,"觀察四周",actionProfile("觀察四周"));
 assert.equal(check.kind,"OBSERVE");
 assert.equal(check.modifiers.attribute,0);
 assert.equal(check.modifiers.skill,0);
 assert.equal(check.bonus,0);
 assert.equal(check.dc,10);
});

test("attributes skills and equipped tools combine into one bounded check bonus",()=>{
 const s=state();ensureCheckProfile(s);s.player.stats.mind=4;s.player.skills.OBSERVE=2;
 s.inventory.push({id:"tool",name:"精密單筒鏡",equipped:true,checkBonuses:{OBSERVE:2}});
 const check=buildActionCheck(s,"仔細觀察塔頂",actionProfile("仔細觀察塔頂"));
 assert.equal(check.modifiers.attribute,2);
 assert.equal(check.modifiers.skill,2);
 assert.equal(check.modifiers.equipment,2);
 assert.equal(check.bonus,6);
});

test("relevant active companions support checks but are capped",()=>{
 const s=state();s.world.registry.npcs.push(
  {id:"a",name:"斥候甲",role:"斥候",goal:"偵察道路",known:true,alive:true,trust:80,companion:{status:"ACTIVE"}},
  {id:"b",name:"斥候乙",role:"偵察員",goal:"追蹤",known:true,alive:true,trust:80,companion:{status:"ACTIVE"}}
 );
 const check=buildActionCheck(s,"搜索附近痕跡",actionProfile("搜索附近痕跡"));
 assert.equal(check.modifiers.companion,2);
});

test("explicit named NPC relationship affects social checks without global omniscience",()=>{
 const s=state();s.world.registry.npcs.push({id:"n",name:"艾琳",role:"旅店主人",known:true,alive:true,trust:75,companion:{status:"NONE"}});
 const named=buildActionCheck(s,"說服艾琳提供協助",actionProfile("說服艾琳提供協助"));
 const unnamed=buildActionCheck(s,"向陌生人打招呼",actionProfile("向陌生人打招呼"));
 assert.equal(named.modifiers.relationship,2);
 assert.equal(unnamed.modifiers.relationship,0);
});

test("danger crisis and physical condition dynamically change DC and situation modifier",()=>{
 const s=state();s.world.seedContract.danger=5;s.world.state.crisis={stage:"ENDGAME",pressure:90,history:[]};s.player.hp=20;
 const check=buildActionCheck(s,"強行破壞石門",actionProfile("強行破壞石門"));
 assert.equal(check.baseDC,14);
 assert.equal(check.difficulty,4);
 assert.equal(check.dc,18);
 assert.equal(check.modifiers.situation,-2);
});

test("successful use builds skill proficiency and critical success trains faster",()=>{
 const s=state();ensureCheckProfile(s);s.player.skillProgress.OBSERVE=3;
 const result=trainActionSkill(s,"OBSERVE",{success:true,grade:"CRITICAL_SUCCESS"});
 assert.equal(result.rankUp,true);
 assert.equal(s.player.skills.OBSERVE,1);
 assert.equal(s.player.skillProgress.OBSERVE,1);
});

test("equipment bonuses are normalized and capped by Engine",()=>{
 assert.deepEqual(normalizeCheckBonuses({OBSERVE:99,SOCIAL:-9,ALL:1,UNKNOWN:2}),{OBSERVE:2,SOCIAL:-2,ALL:1});
});

test("performAction exposes full modifier breakdown to AI and UI",()=>{
 const s=state(),old=Math.random;Math.random=()=>.55;
 try{
  const {roll}=performAction(s,"free","觀察周圍");
  assert.equal(roll.profile.kind,"OBSERVE");
  assert.equal(typeof roll.modifiers.attribute,"number");
  assert.equal(typeof roll.modifiers.skill,"number");
  assert.equal(typeof roll.baseDC,"number");
  assert.equal(typeof roll.difficulty,"number");
 }finally{Math.random=old}
});
