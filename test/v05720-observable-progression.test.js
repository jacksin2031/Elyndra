import test from "node:test";
import assert from "node:assert/strict";
import {regenerateContextualActionSet} from "../src/contextual-actions.js";

function state(){return {world:{id:"W20",createdAt:1000,state:{day:1},registry:{locations:[{id:"L1",name:"石橋",known:true}],npcs:[],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},player:{location:"石橋",difficulty:"normal",skills:{OBSERVE:1,SOCIAL:1,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},quests:{main:{title:"在異世界建立第一段關係",objectives:["找到可以交流的人，理解這裡的人如何生活。"],status:"ACTIVE"}},events:[]}}
function text(set){return set.all.map(x=>x.label+" "+x.action).join("\n")}

test("v0.57.20 quest title/status events are never presented as observable progression evidence",()=>{
 const s=state();const questText="在異世界建立第一段關係：找到可以交流的人，理解這裡的人如何生活。";
 s.events.push({id:"Q1",type:"MAIN_QUEST_STAGE_CHANGED",visibility:"PLAYER_KNOWN",worldId:"W20",location:"石橋",summary:questText,at:1200});
 s.events.push({id:"Q2",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"W20",location:"石橋",summary:questText,at:1300});
 const out=text(regenerateContextualActionSet(s));
 assert.doesNotMatch(out,/沿著最近事件|造成的可見影響/);assert.doesNotMatch(out,/在異世界建立第一段關係：/);assert.match(out,/石橋|觀察|尋找|檢查|探索/)
});

test("v0.57.20 progression events require current-scene provenance",()=>{
 const s=state();
 s.events.push({id:"UNSCOPED",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"W20",summary:"北側鐘聲突然停止，遠處傳來金屬敲擊聲。",at:1200});
 s.events.push({id:"OTHER",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"W20",location:"L2",summary:"另一區域的鐵門突然關閉。",at:1300});
 const out=text(regenerateContextualActionSet(s));assert.doesNotMatch(out,/北側鐘聲|另一區域的鐵門|沿著最近事件/)
});

test("v0.57.20 concrete observable event in the current scene may drive progression",()=>{
 const s=state();s.events.push({id:"OBS",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"W20",location:"石橋",summary:"北側鐵門突然關閉，門縫傳來反覆敲擊聲。",at:1400});
 const out=text(regenerateContextualActionSet(s));assert.match(out,/北側鐵門|敲擊聲/);assert.match(out,/沿著最近事件|追查/)
});
