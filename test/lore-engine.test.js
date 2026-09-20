import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {revealStoredLore,resolveLocalLoreAction,visibleLore} from "../src/lore-engine.js";

const seed={genre:"王道奇幻",theme:"失落文明",scale:"中型",danger:3,magic:3,politics:3,prompt:""};

test("stored entity lore unlocks locally once required knowledge exists",()=>{
 const s=newGame(seed);
 canonizeGeneration(s,{npcs:[{name:"艾琳",role:"旅店主人",description:"沉默的旅店主人",known:false,lore:{story:"她曾是失蹤商隊的護衛。",unlockKeywords:["商隊徽章"],minMatches:1}}]});
 const npc=s.world.registry.npcs[0];
 assert.equal(npc.known,false);
 assert.equal(visibleLore(npc),"");
 assert.deepEqual(revealStoredLore(s),[]);
 s.world.canon.facts.push({id:"FACT-BADGE",type:"clue",visibility:"public",text:"商隊徽章可確認屬於失蹤商隊。",canonical:true});s.knowledge.push({id:"K-badge",title:"商隊徽章",text:"你確認這枚徽章屬於失蹤商隊。",factId:"FACT-BADGE",status:"VERIFIED",score:2});
 const first=revealStoredLore(s);
 assert.equal(first.length,1);
 assert.equal(npc.known,true);
 assert.equal(npc.lore.known,true);
 assert.match(visibleLore(npc),/失蹤商隊/);
 const count=s.knowledge.filter(k=>k.id===`LORE-${npc.id}`).length;
 assert.equal(count,1);
 assert.deepEqual(revealStoredLore(s),[]);
 assert.equal(s.knowledge.filter(k=>k.id===`LORE-${npc.id}`).length,1);
});

test("known item description and unlocked lore resolve without generation",()=>{
 const s=newGame(seed);
 s.inventory.push({id:"ITEM-map",name:"破損地圖",description:"一張缺角的舊地圖。",identified:true,lore:{story:"它原屬第三軍團最後一名斥候。",unlockKeywords:["第三軍團"],minMatches:1}});
 const surface=resolveLocalLoreAction(s,"查看破損地圖");
 assert.equal(surface.source,"stored-description");
 assert.match(surface.text,/缺角/);
 s.world.canon.facts.push({id:"FACT-LEGION",type:"history",visibility:"public",text:"第三軍團曾在此活動。",canonical:true});s.knowledge.push({id:"K-legion",title:"第三軍團",text:"你已確認第三軍團曾在此活動。",factId:"FACT-LEGION",status:"VERIFIED",score:2});
 revealStoredLore(s);
 const story=resolveLocalLoreAction(s,"查看破損地圖的來歷");
 assert.equal(story.source,"stored-lore");
 assert.match(story.text,/最後一名斥候/);
});

test("unknown lore query does not fake an answer",()=>{
 const s=newGame(seed);
 assert.equal(resolveLocalLoreAction(s,"調查從未見過的王冠"),null);
});
