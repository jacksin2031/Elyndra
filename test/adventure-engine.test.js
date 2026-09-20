import test from "node:test";import assert from "node:assert/strict";import {newGame} from "../src/world-engine.js";import {applyTurnCandidate,buildSnapshot,validateTurnCandidate} from "../src/adventure-engine.js";
const seed={genre:"王道奇幻",theme:"失落文明",scale:"中型",danger:3,magic:4,politics:3,prompt:""};
test("snapshot never exposes hidden canon",()=>{const s=newGame(seed),snap=buildSnapshot(s);assert.deepEqual(snap.hiddenFacts,[]);assert.ok(!snap.knownFacts.includes(s.world.canon.facts.find(f=>f.visibility==="hidden").text))});
test("AI turn can extend adventure safely before any companion exists",()=>{const s=newGame(seed);applyTurnCandidate(s,{narrative:"你找到新的道路。",location:"古道",discoveries:[{title:"古道碑文",text:"碑文記錄一場舊戰爭。"}],items:[{name:"破損地圖",description:"北境地圖"}],npcChanges:[{key:"lia",trustDelta:2}],quest:{title:"前往舊城",objective:"沿古道前進"},suggestions:["閱讀地圖"]});assert.equal(s.player.location,"古道");assert.ok(s.inventory.some(i=>i.name==="破損地圖"));assert.equal(s.npcs.lia,undefined);assert.equal(s.suggestions[0],"閱讀地圖")});
test("invalid AI turn is rejected",()=>assert.equal(validateTurnCandidate({}).valid,false));
test("new canon lore unlocks locally when the same turn supplies its clue",()=>{
 const s=newGame(seed);
 applyTurnCandidate(s,{
  narrative:"你在門框下找到一枚商隊徽章，店主的神情變了。",
  discoveries:[{title:"商隊徽章",text:"這枚徽章屬於失蹤商隊。"}],
  generation:{npcs:[{name:"艾琳",role:"旅店主人",description:"沉默的店主",known:true,lore:{story:"她曾是失蹤商隊的護衛。",unlockKeywords:["商隊徽章"],minMatches:1}}]},
  suggestions:["詢問她是否認得徽章"]
 });
 const npc=s.world.registry.npcs.find(x=>x.name==="艾琳");
 assert.ok(npc);
 assert.equal(npc.lore.known,true);
 assert.ok(s.knowledge.some(k=>k.id===`LORE-${npc.id}`&&/護衛/.test(k.text)));
});

test("unknown registry entities stay hidden from player but remain reusable by Director",()=>{
 const s=newGame(seed);
 s.world.registry.locations.push({id:"LOC-secret",name:"黑塔",type:"塔",description:"未發現",known:false});
 s.world.registry.factions.push({id:"FAC-secret",name:"夜盟",goal:"未知",description:"未發現",known:false,resources:50,influence:25,playerReputation:0,relations:{}});
 const snap=buildSnapshot(s);
 assert.equal(snap.registry.locations.some(x=>x.name==="黑塔"),false);
 assert.equal(snap.registry.factions.some(x=>x.name==="夜盟"),false);
 assert.equal(snap.factions.some(x=>x.name==="夜盟"),false);
 assert.ok(snap.directorRegistry.locations.some(x=>x.id==="LOC-secret"&&x.name==="黑塔"&&x.known===false));
 assert.ok(snap.directorRegistry.factions.some(x=>x.id==="FAC-secret"&&x.name==="夜盟"&&x.known===false));
});

test("entityReveals exposes existing canon without regenerating it",()=>{
 const s=newGame(seed);
 s.world.registry.npcs.push({id:"NPC-hidden",name:"賽恩",role:"守門人",description:"尚未遇見",known:false,alive:true,trust:0,memories:[],knowledgeScope:[]});
 const before=s.world.registry.npcs.length;
 applyTurnCandidate(s,{narrative:"霧後走出一名守門人。",entityReveals:[{kind:"npc",id:"NPC-hidden"}],suggestions:["向他打招呼"]});
 assert.equal(s.world.registry.npcs.length,before);
 assert.equal(s.world.registry.npcs[0].known,true);
 assert.ok(s.events.some(e=>e.type==="ENTITY_REVEALED"));
});