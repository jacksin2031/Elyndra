import test from "node:test";
import assert from "node:assert/strict";
import {roleplayFallbackSuggestions} from "../src/player-experience.js";

function state(){return {world:{id:"W20",state:{day:1},registry:{locations:[{id:"L1",name:"藍光街角",known:true}],npcs:[]}},player:{location:"藍光街角"},events:[],suggestions:[]}}

test("v0.57.21 prior suggestion is never recursively quoted as the next fallback action",()=>{
 const s=state(),prior="沿著『皮膚刺痛、空氣中有金屬燒焦味、視線受藍光干擾。』留下的影響追查下去";
 s.suggestions=[prior];
 const out=roleplayFallbackSuggestions(s,{action:prior}).join("\n");
 assert.doesNotMatch(out,/回頭檢查/);assert.doesNotMatch(out,/沿著[「『].*沿著[「『]/);assert.doesNotMatch(out,/皮膚刺痛.*留下的影響追查下去/);
 assert.match(out,/藍光街角|地面|附近物件|人流|出入口/)
});

test("v0.57.21 template-like visible event cannot become nested progression suggestion",()=>{
 const s=state(),prior="沿著『金屬燒焦味』留下的影響追查下去";s.suggestions=[prior];
 s.events.push({id:"E1",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"W20",location:"藍光街角",summary:`回頭檢查『${prior}』之後現場多了甚麼變化`,at:2});
 const out=roleplayFallbackSuggestions(s,{}).join("\n");
 assert.doesNotMatch(out,/回頭檢查|金屬燒焦味|留下的影響追查下去/);assert.match(out,/藍光街角|地面|附近物件/)
});

test("v0.57.21 concrete current-scene observable event remains usable without nested quotation",()=>{
 const s=state();s.events.push({id:"E2",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"W20",location:"L1",summary:"北側牆面出現新裂痕，裂縫正滲出淡藍色煙霧。",at:3});
 const out=roleplayFallbackSuggestions(s,{}).join("\n");assert.match(out,/北側牆面|新裂痕|淡藍色煙霧/);assert.doesNotMatch(out,/回頭檢查/)
});
