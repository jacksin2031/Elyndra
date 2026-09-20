import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {normalizeCivilizationProfile,normalizeCommunicationSystem,worldCommunication,canRemoteContactNpc} from "../src/communication-engine.js";
import {canonizeGeneration,resolvePlayerLocation,revealRegistryEntities,npcInteractionMode} from "../src/world-registry.js";
import {applyNpcConversationTurn} from "../src/npc-conversation.js";
import {normalizeWorldHistory,validateWorldHistory} from "../src/world-history.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:1,politics:3,playHours:15,prompt:""};

test("low civilization and low magic downgrade impossible instant communication",()=>{
 const civ=normalizeCivilizationProfile({level:1,stage:"分散聚落"});
 const c=normalizeCommunicationSystem({name:"不合理網絡",latency:"INSTANT",range:"WORLD"},{magic:1},civ);
 assert.equal(c.latency,"DELAYED");
 assert.equal(c.range,"LOCAL");
 assert.equal(c.realtime,false);
 assert.equal(c.capability.downgraded,true);\n assert.notEqual(c.name,"不合理網絡");\n assert.match(c.medium,/信使|驛站|烽火/);
});

test("low civilization can still support fast contact when magic is sufficiently advanced",()=>{
 const civ=normalizeCivilizationProfile({level:2});
 const c=normalizeCommunicationSystem({name:"傳訊術",latency:"NEAR_INSTANT",range:"REGIONAL"},{magic:5},civ);
 assert.equal(c.latency,"NEAR_INSTANT");
 assert.equal(c.realtime,true);
 assert.equal(c.range,"REGIONAL");
});

test("world history normalizes into immutable canonical past events",()=>{
 const raw=Array.from({length:5},(_,i)=>({id:"H"+i,order:i+1,era:"舊紀",title:"事件"+i,summary:"這是已發生的歷史事件 "+i,causes:["原因"],legacies:["遺產"],discoverKeywords:["碑文"+i]}));
 const report=validateWorldHistory(raw);
 assert.equal(report.valid,true);
 assert.equal(report.history.length,5);
 assert.ok(report.history.every(x=>x.canonical===true&&x.mutable===false));
 assert.deepEqual(normalizeWorldHistory(raw),report.history);
});

test("NPC conversation advances time and world simulation, then establishes remote contact only when supported",()=>{
 const s=newGame({...seed,magic:5});
 s.world.bible={civilization:{level:2},communication:{name:"傳訊印",medium:"魔法印記",description:"區域傳訊",latency:"NEAR_INSTANT",range:"REGIONAL",constraints:"需先面談"}};
 canonizeGeneration(s,{locations:[{name:"石門廣場",type:"廣場",region:"中央",description:"廣場",known:true},{name:"河岸",type:"道路",region:"中央",description:"河岸",known:true}],npcs:[{name:"艾琳",role:"旅人",description:"旅人",locationName:"石門廣場",known:false}]});
 resolvePlayerLocation(s,"石門廣場");
 const npc=s.world.registry.npcs[0];revealRegistryEntities(s,[{kind:"npc",id:npc.id}]);
 assert.equal(npcInteractionMode(s,npc),"LOCAL");
 const before=s.world.state.clock.totalMinutes;
 const out=applyNpcConversationTurn(s,npc,"你知道附近的路嗎？","沿河往東可以找到舊橋。");
 assert.equal(out.mode,"LOCAL");
 assert.ok(s.world.state.clock.totalMinutes>before);
 assert.ok(s.events.some(e=>e.type==="NPC_CONVERSATION"));
 assert.equal(npc.memories.at(-1).type,"conversation");
 resolvePlayerLocation(s,"河岸");
 assert.equal(worldCommunication(s).realtime,true);
 assert.equal(canRemoteContactNpc(s,npc),true);
 assert.equal(npcInteractionMode(s,npc),"REMOTE");
});

test("delayed-contact civilization never becomes an instant remote NPC conversation",()=>{
 const s=newGame(seed);
 s.world.bible={civilization:{level:1},communication:{name:"驛使",medium:"信使",description:"步行送信",latency:"INSTANT",range:"WORLD",constraints:"需要時間"}};
 canonizeGeneration(s,{locations:[{name:"村口",type:"道路",region:"谷地",description:"村口",known:true},{name:"山路",type:"道路",region:"谷地",description:"山路",known:true}],npcs:[{name:"洛安",role:"商人",description:"商人",locationName:"村口",known:false}]});
 resolvePlayerLocation(s,"村口");const npc=s.world.registry.npcs[0];revealRegistryEntities(s,[{kind:"npc",id:npc.id}]);
 applyNpcConversationTurn(s,npc,"之後如何聯絡？","可以託驛使送信。");
 resolvePlayerLocation(s,"山路");
 assert.equal(worldCommunication(s).latency,"DELAYED");
 assert.equal(canRemoteContactNpc(s,npc),false);
 assert.equal(npcInteractionMode(s,npc),null);
});
