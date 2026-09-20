import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {applyTurnCandidate,buildSnapshot,validateTurnCandidate} from "../src/adventure-engine.js";

const seed={genre:"王道奇幻",theme:"失落文明",scale:"中型",danger:3,magic:4,politics:3,prompt:""};

test("snapshot never exposes hidden canon",()=>{
 const s=newGame(seed),snap=buildSnapshot(s);
 assert.deepEqual(snap.hiddenFacts,[]);
 assert.ok(!snap.knownFacts.includes(s.world.canon.facts.find(f=>f.visibility==="hidden").text));
});

test("AI turn mutates any known NPC by id instead of a fixed companion key",()=>{
 const s=newGame(seed);
 s.world.registry.npcs.push({id:"NPC-guide",name:"引路人",role:"旅人",description:"沉默的旅人",known:true,alive:true,trust:18,memories:[],knowledgeScope:[]});
 applyTurnCandidate(s,{narrative:"對方接受了你的解釋。",npcChanges:[{npcId:"NPC-guide",trustDelta:2}],suggestions:["繼續交談"]});
 assert.equal(s.world.registry.npcs[0].trust,20);
 assert.equal(s.suggestions[0],"繼續交談");
});

test("invalid AI turn is rejected",()=>assert.equal(validateTurnCandidate({}).valid,false));

test("new canon lore unlocks locally when the same turn supplies its clue",()=>{
 const s=newGame(seed);
 applyTurnCandidate(s,{
  narrative:"你找到一枚帶有特殊記號的物件，眼前的人神情變了。",
  discoveries:[{title:"特殊記號",text:"這個記號與一支失蹤隊伍有關。"}],
  generation:{npcs:[{name:"艾琳",role:"旅店主人",description:"沉默的店主",known:true,lore:{story:"她曾是那支失蹤隊伍的護衛。",unlockKeywords:["特殊記號"],minMatches:1}}]},
  suggestions:["詢問她是否認得記號"]
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
 applyTurnCandidate(s,{narrative:"一名守門人從遮蔽物後走出來。",entityReveals:[{kind:"npc",id:"NPC-hidden"}],suggestions:["向他打招呼"]});
 assert.equal(s.world.registry.npcs.length,before);
 assert.equal(s.world.registry.npcs[0].known,true);
 assert.ok(s.events.some(e=>e.type==="ENTITY_REVEALED"&&e.visibility==="PLAYER_KNOWN"));
});

test("internal autonomous events never enter the player turn snapshot",()=>{
 const s=newGame(seed);
 s.events.push({id:"internal",type:"NPC_AUTONOMOUS_ACTION",visibility:"INTERNAL",day:1,summary:"秘密人物正在行動"});
 s.events.push({id:"visible",type:"WORLD_EVENT",visibility:"OBSERVABLE",day:1,summary:"你聽到遠處的聲響"});
 const snap=buildSnapshot(s);
 assert.equal(snap.recentEvents.some(e=>/秘密人物/.test(e.summary||"")),false);
 assert.equal(snap.recentEvents.some(e=>/遠處的聲響/.test(e.summary||"")),true);
});

test("AI turn can start a world-specific combat encounter",()=>{
 const s=newGame(seed);
 applyTurnCandidate(s,{narrative:"一個敵對存在擋住去路。",encounter:{type:"combat",enemy:{name:"玻璃甲蟲",level:1,hp:8,defense:9,damage:2,loot:"透明甲殼"}},suggestions:["防禦"]});
 assert.equal(s.combat.active,true);
 assert.equal(s.combat.enemy.name,"玻璃甲蟲");
});
test("Adventure Director can propose companion offer and calendar discovery without forcing join",()=>{
 const s=newGame(seed);s.world.registry.npcs.push({id:"NPC-comp",name:"薇塔",role:"採集者",description:"熟悉附近地形",known:true,alive:true,trust:45,memories:[],knowledgeScope:[],companionProfile:{joinThreshold:35,leaveThreshold:8,motives:["共同探索"],boundaries:[]},companion:{status:"NONE",joinedDay:null,leftDay:null,offeredDay:null,reason:""}});applyTurnCandidate(s,{narrative:"她表示願意同行，並向你解釋了當地如何記錄時序。",calendarKnown:true,companionChanges:[{npcId:"NPC-comp",action:"OFFER",reason:"共同探索符合她目前的目標"}],suggestions:["回應她的提議"]});assert.equal(s.player.calendarKnown,true);assert.equal(s.world.registry.npcs[0].companion.status,"OFFERED");const snap=buildSnapshot(s);assert.ok(snap.companions.some(x=>x.id==="NPC-comp"&&x.status==="OFFERED"));
});