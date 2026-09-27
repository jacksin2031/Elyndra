import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {combatAction,combatSnapshot,startCombat,startEncounter} from "../src/combat-engine.js";
import {activeEnemies,applyEnemyMorale,createEncounterFrame,ensureEncounterFrame,movePlayerZone,selectCombatTarget} from "../src/encounter-engine.js";

const seed={playerName:"測試者",worldviewMode:"style",genre:"奇幻",scale:"小型",danger:3,magic:3,politics:2,playHours:8,prompt:"combat v0601"};
function state(){const s=newGame(seed);s.player.hp=200;s.player.maxHp=200;s.events??=[];s.inventory??=[];return s}
function enemies(){return [
 {id:"GOB-A",name:"哥布林戰士",hp:90,defense:10,damage:1,level:1,loot:"粗製短刀"},
 {id:"GOB-B",name:"哥布林弓手",hp:90,defense:10,damage:1,level:1}
]}

test("Combat 2.0 startEncounter creates a multi-enemy Encounter while preserving combat.enemy alias",()=>{
 const s=state(),combat=startEncounter(s,enemies(),{environment:[{id:"CHANDELIER",name:"吊燈",tags:["OVERHEAD"],hazardPower:8}],objectives:[{type:"PROTECT",description:"保護入口"}]});
 assert.equal(combat.version,2);assert.equal(combat.active,true);assert.equal(combat.combatants.length,2);assert.equal(combat.enemy.id,"GOB-A");assert.equal(combat.encounter.version,2);assert.deepEqual(combat.encounter.combatantIds,["GOB-A","GOB-B"]);assert.equal(combat.encounter.environment[0].name,"吊燈");assert.equal(combat.encounter.objectives[0].type,"PROTECT");assert.equal(combat.encounter.positions.PLAYER,"NEAR");assert.ok(combat.encounter.threat.total>0)
});

test("Combat 2.0 keeps legacy single-enemy startCombat contract",()=>{
 const s=state(),combat=startCombat(s,{id:"WOLF",name:"狼",hp:20,defense:9,damage:1,level:1});
 assert.equal(combat.enemy.name,"狼");assert.equal(combat.combatants.length,1);assert.equal(combat.combatants[0],combat.enemy);assert.equal(combatSnapshot(s).combatants.length,1)
});

test("Encounter migration upgrades an old combat.enemy save without deleting the alias",()=>{
 const legacy={active:true,enemy:{id:"OLD",name:"舊敵人",hp:12,maxHp:12,damage:2,defense:10,statuses:[]},round:3,log:[]};
 const frame=ensureEncounterFrame(legacy);assert.equal(frame.version,2);assert.equal(frame.round,3);assert.equal(legacy.combatants.length,1);assert.equal(legacy.enemy.id,"OLD");assert.equal(activeEnemies(legacy).length,1)
});

test("Encounter zones, morale and target selection are deterministic Engine state",()=>{
 const rows=enemies().map(x=>({...x,maxHp:x.hp,statuses:[],combatState:"ACTIVE"})),combat={active:true,enemy:rows[0],combatants:rows,round:1,log:[],encounter:createEncounterFrame(rows)};
 assert.deepEqual(movePlayerZone(combat,"MOVE","我向後退並拉開距離"),{from:"NEAR",to:"FAR"});
 const target=selectCombatTarget(combat,{targetIds:["GOB-B"]});assert.equal(target.id,"GOB-B");
 const morale=applyEnemyMorale(combat,target,-35,"threatened");assert.equal(morale.before,100);assert.equal(morale.after,65);assert.equal(combat.encounter.morale.enemies,83)
});

test("freeform combat action can target a non-primary enemy and runs through Intent + Resolution",()=>{
 const s=state();startEncounter(s,enemies());
 const result=combatAction(s,"我故意向左假攻，逼哥布林弓手移動重心，再去絆它的腿");
 assert.equal(result.intent.combatAction,"TECHNIQUE");assert.equal(result.intent.targetId,"GOB-B");assert.equal(s.combat.enemy.id,"GOB-B");assert.ok(["CRITICAL_SUCCESS","STRONG_SUCCESS","SUCCESS_WITH_COST","FAILURE_WITH_OPPORTUNITY","CRITICAL_FAILURE"].includes(result.resolution.tier));assert.equal(result.enemyTurns.length,2);assert.equal(result.encounter?.version,2);assert.equal(result.encounter?.combatants.length,2)
});

test("legacy quick combat actions remain accepted alongside expanded combat verbs",()=>{
 for(const action of ["attack","defend","technique","move","interact","assist","social"]){const s=state();startEncounter(s,enemies(),{environment:[{name:"木箱",cover:1}]});const result=combatAction(s,action);assert.ok(result.roll);assert.ok(result.resolution);assert.ok(result.intent);assert.equal(typeof result.summary,"string")}
});


test("Combat 2.0 UI exposes expanded tactical actions and routes freeform input through combatAction",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/combatSnapshot\(gameState\)/);
 for(const action of ["attack","technique","move","defend","interact","assist","social","retreat"])assert.match(app,new RegExp(`data-combat-action="${action}"`));
 assert.match(app,/gameState\?\.combat\?\.active\)await runCombatAction\(value,value\)/);
 assert.doesNotMatch(app,/free\.disabled=aiBusy\|\|turnSyncBusy\|\|playerActionFlight\.active\|\|Boolean\(gameState\.combat\?\.active\)/);
 assert.match(app,/combat-engine\.js\?v=60002/);
});
