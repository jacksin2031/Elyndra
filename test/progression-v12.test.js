import test from "node:test";
import assert from "node:assert/strict";
import {ensureSurvival,tickSurvival,survivalActionGate,survivalSnapshot} from "../src/survival-engine.js";
import {addInventoryItem,useItem,learnRecipe,craftRecipe,presentItemToNpc,ensureItemRuntime} from "../src/item-engine.js";
import {evaluateQuestState} from "../src/quest-engine.js";
import {locationAccessStatus} from "../src/travel-engine.js";
import {modernEarthOriginProfile} from "../src/player-origin.js";
import {migrateSave} from "../src/storage.js";
import {performAction} from "../src/game-engine.js";
import {newGame} from "../src/world-engine.js";

function state(){
 return {
  world:{id:"W",name:"測試界",seedContract:{genre:"奇幻",theme:"測試",scale:"小型",danger:3,magic:3,politics:3,targetPlayHours:15},state:{day:1,location:"廣場",region:"城區",clock:{day:1,hour:8,minute:0,totalMinutes:0},simulation:{tension:10,lastEventMinute:0,lastTickMinute:0,npcCursor:0,factionCursor:0,flags:{}},flags:{}},registry:{locations:[{id:"LOC-1",name:"廣場",type:"廣場",region:"城區",description:"石造廣場",known:true,worldState:{safety:60,prosperity:50,supply:50,infrastructure:60,stability:60,statusTags:[]}}],npcs:[],factions:[],sideQuests:[]},canon:{facts:[]},history:[],travel:{version:1,routes:[]},bible:{weatherSystem:{phenomena:[]}},weather:{version:1,currentId:"",startedMinute:0,nextChangeMinute:999999,locationKey:"",sequence:0,history:[],legacyNeutral:true}},
  player:{name:"測試者",worldNameKnown:false,calendarKnown:false,hp:100,maxHp:100,gold:0,wallet:{},knowledgeScore:0,location:"廣場",stats:{strength:2,agility:2,mind:2,presence:2,instinct:2},skills:{OBSERVE:1,SOCIAL:1,TRAVEL:0,RISKY:0,GENERAL:1},skillProgress:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0},origin:modernEarthOriginProfile(),magic:{capacity:100,strain:0,knownSpells:[],attunements:[]}},
  inventory:[],crafting:{version:1,recipes:[]},knowledge:[],events:[],npcs:{},quests:{main:{id:"Q-main",stage:0,status:"ACTIVE",objectives:[]}},suggestions:[],narrative:""
 }
}

test("player survival uses satiety where 100 is full and time lowers it",()=>{
 const s=state(),surv=ensureSurvival(s);
 assert.equal(surv.satiety,100);
 tickSurvival(s,360,{kind:"GENERAL"});
 assert.equal(Math.round(survivalSnapshot(s).satiety),99);
 s.player.survival.satiety=5;
 const gate=survivalActionGate(s,"TRAVEL");
 assert.equal(gate.ok,false);
 assert.equal(gate.reason,"TOO_HUNGRY")
});

test("legacy v11 hunger migrates losslessly to v12 satiety",()=>{
 const legacy={formatVersion:11,world:{state:{day:1,clock:{totalMinutes:0}},registry:{locations:[],npcs:[],factions:[],sideQuests:[]}},player:{name:"舊角色",survival:{hunger:35,fatigue:10,exposure:0,injury:0,conditions:[],lastMinute:0}},inventory:[]};
 const out=migrateSave(legacy);
 assert.equal(out.formatVersion,12);
 assert.equal(out.player.survival.satiety,65);
 assert.equal("hunger" in out.player.survival,false);
 assert.equal(out.player.origin.id,"MODERN_EARTH_ORDINARY")
});

test("food restores satiety and consumables are consumed",()=>{
 const s=state();ensureSurvival(s);s.player.survival.satiety=30;
 const item=addInventoryItem(s,{name:"乾糧",category:"CONSUMABLE",quantity:2,useEffects:[{type:"RESTORE_SATIETY",amount:25}]});
 const r=useItem(s,item.id);
 assert.equal(r.ok,true);
 assert.equal(s.player.survival.satiety,55);
 assert.equal(s.inventory.find(x=>x.name==="乾糧").quantity,1);
 assert.ok(s.events.some(e=>e.type==="ITEM_USED"&&e.itemName==="乾糧"))
});

test("legacy REDUCE_HUNGER item effect is normalized into RESTORE_SATIETY",()=>{
 const s=state();ensureSurvival(s);s.player.survival.satiety=40;
 const item=addInventoryItem(s,{name:"舊版食物",category:"CONSUMABLE",useEffects:[{type:"REDUCE_HUNGER",amount:20}]});
 assert.equal(item.useEffects[0].type,"RESTORE_SATIETY");
 useItem(s,item.id);
 assert.equal(s.player.survival.satiety,60)
});

test("crafting verifies quantities, consumes materials, and creates output",()=>{
 const s=state();
 addInventoryItem(s,{name:"月草",category:"MATERIAL",quantity:2});
 addInventoryItem(s,{name:"清水",category:"MATERIAL",quantity:1});
 const learned=learnRecipe(s,{name:"月草藥水",inputs:[{name:"月草",quantity:2},{name:"清水",quantity:1}],output:{name:"月草藥水",category:"CONSUMABLE",quantity:1,useEffects:[{type:"RESTORE_HP",amount:20}]},minutes:25});
 assert.equal(learned.ok,true);
 const made=craftRecipe(s,learned.recipe.id);
 assert.equal(made.ok,true);
 assert.equal(s.inventory.some(x=>x.name==="月草"),false);
 assert.equal(s.inventory.some(x=>x.name==="清水"),false);
 assert.equal(s.inventory.find(x=>x.name==="月草藥水").category,"CONSUMABLE");
 assert.ok(s.events.some(e=>e.type==="ITEM_CRAFTED"))
});

test("showing and giving a related item creates NPC-aware events and can satisfy quest conditions",()=>{
 const s=state(),loc=s.world.registry.locations[0];
 s.world.registry.npcs.push({id:"NPC-1",name:"守門人",role:"守衛",locationId:loc.id,known:true,encountered:true,alive:true,trust:0,historyRefs:["HIST-1"],knowledgeScope:[],memories:[],companion:{status:"NONE"}});
 s.world.registry.sideQuests.push({id:"Q-1",title:"交出舊徽章",objective:"把徽章交給守門人",known:true,status:"ACTIVE",progress:0,target:1,evidence:[],evidenceKeywords:[],matchedKeywords:[],matchedConditions:[],conditions:[{type:"ITEM_GIVEN",id:"舊徽章"}]});
 const item=addInventoryItem(s,{name:"舊徽章",category:"QUEST",quantity:1,historyRefs:["HIST-1"]});
 const shown=presentItemToNpc(s,item.id,"NPC-1",{give:false});
 assert.equal(shown.ok,true);
 assert.equal(shown.special,true);
 assert.ok(s.events.some(e=>e.type==="ITEM_SHOWN"));
 const given=presentItemToNpc(s,item.id,"NPC-1",{give:true});
 assert.equal(given.ok,true);
 assert.equal(s.inventory.some(x=>x.name==="舊徽章"),false);
 evaluateQuestState(s);
 assert.equal(s.world.registry.sideQuests[0].status,"COMPLETED")
});

test("canonical location access can require a specific owned item",()=>{
 const s=state(),locked={id:"LOC-2",name:"封印門",accessRequirements:[{type:"ITEM_OWNED",id:"青銅通行證",hint:"需要青銅通行證"}]};
 assert.equal(locationAccessStatus(s,locked).allowed,false);
 addInventoryItem(s,{name:"青銅通行證",category:"KEY"});
 assert.equal(locationAccessStatus(s,locked).allowed,true)
});

test("Engine independently confirms impossible movement even when AI proposes BLOCK",()=>{
 const s=state(),before=s.world.state.clock.totalMinutes;
 const r=performAction(s,"free","徒手飛上天空",{verdict:"BLOCK",kind:"RISKY",reason:"你沒有飛行能力。",requirements:["飛行能力"],confidence:99});
 assert.equal(r.blocked,true);
 assert.equal(r.roll,null);
 assert.equal(s.world.state.clock.totalMinutes,before);
 assert.ok(s.events.some(e=>e.type==="PLAYER_ACTION_REJECTED"&&e.authority==="ENGINE"))
});

test("AI BLOCK proposal cannot veto a harmless action without an Engine reason",()=>{
 const s=state(),before=s.world.state.clock.totalMinutes;
 const r=performAction(s,"free","觀察天空",{verdict:"BLOCK",kind:"OBSERVE",reason:"AI 建議阻止",requirements:[],confidence:99,actionIntent:{intent:"OBSERVE"}});
 assert.equal(Boolean(r.feasibilityBlocked),false);
 assert.ok(r.roll);
 assert.ok(s.world.state.clock.totalMinutes>before)
});

test("inventory status rest equipment and safe known travel complete without AI turn",()=>{
 const s=state(),item=addInventoryItem(s,{name:"旅人外套",category:"EQUIPMENT"});
 let before=s.world.state.clock.totalMinutes,r=performAction(s,"free","查看背包");
 assert.equal(r.deterministic,true);assert.equal(r.roll,null);assert.equal(s.world.state.clock.totalMinutes,before);assert.match(r.text,/旅人外套/);
 r=performAction(s,"free","裝備旅人外套");assert.equal(r.deterministic,true);assert.equal(s.inventory.find(x=>x.id===item.id).equipped,true);
 ensureSurvival(s).fatigue=80;before=s.world.state.clock.totalMinutes;r=performAction(s,"free","睡覺");
 assert.equal(r.deterministic,true);assert.equal(r.roll,null);assert.equal(s.world.state.clock.totalMinutes,before+480);assert.ok(ensureSurvival(s).fatigue<80);
 s.world.registry.locations.push({id:"LOC-2",name:"河岸村",type:"村",region:"城區",description:"河邊小村",known:true,worldState:{safety:70,prosperity:50,supply:50,infrastructure:60,stability:60,statusTags:[]}});
 before=s.world.state.clock.totalMinutes;r=performAction(s,"free","前往河岸村");
 assert.equal(r.deterministic,true);assert.equal(r.roll,null);assert.equal(s.player.location,"河岸村");assert.ok(s.world.state.clock.totalMinutes>before)
});

test("new protagonist is an ordinary modern-Earth person with zero isekai knowledge",()=>{
 const s=newGame({playerName:"旅人",worldviewMode:"style",genre:"奇幻",scale:"小型",danger:3,magic:3,politics:3,playHours:15,prompt:""});
 assert.equal(s.player.origin.id,"MODERN_EARTH_ORDINARY");
 assert.equal(s.player.worldNameKnown,false);
 assert.equal(s.player.knowledgeScore,0);
 assert.equal(s.player.skills.OBSERVE,1);
 assert.equal(s.player.skills.SOCIAL,1);
 assert.equal(s.player.skills.RISKY,0);
 assert.match(s.player.origin.worldKnowledgeBoundary,/初始知識為零/)
});


test("survival subsystem is safe during transient world reset windows",()=>{
 assert.equal(ensureSurvival(null),null);
 assert.equal(tickSurvival(null,30),null);
 assert.deepEqual(survivalActionGate(null,"TRAVEL"),{ok:true});
 assert.deepEqual(survivalSnapshot(null),{satiety:100,fatigue:0,exposure:0,injury:0,conditions:[]})
});
