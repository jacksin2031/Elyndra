import test from "node:test";
import assert from "node:assert/strict";
import {sanitizeSuggestion,sanitizePlayerText} from "../src/runtime-guard.js";
import {normalizeContextualSuggestion,regenerateContextualActionSet} from "../src/contextual-actions.js";
import {canonicalizeNpcIdentityText,playerVisibleNpcName,revealNpcNameFromEvidence} from "../src/player-entity-visibility.js";

function state(){return {world:{id:"W1",state:{day:1},registry:{locations:[{id:"L1",name:"石橋",known:true}],npcs:[],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},player:{location:"石橋",difficulty:"normal",skills:{OBSERVE:1,SOCIAL:1,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},quests:{main:{title:"",objectives:[],status:"ACTIVE"}},events:[]}}

test("v0.57.19 player-facing locale normalizes observed Simplified variants",()=>{
 assert.equal(sanitizeSuggestion("沿著模糊轮廓对此繼續追查"),"沿著模糊輪廓對此繼續追查");
 assert.equal(sanitizePlayerText("先看轮廓，再对此作出判斷",120,""),"先看輪廓，再對此作出判斷");
 assert.equal(sanitizeSuggestion("將手掌緊貼牆面 previously 觸摸過的區域"),"將手掌緊貼牆面 先前 觸摸過的區域");
 assert.equal(sanitizeSuggestion("沿著 wall trace 繼續找證據"),"")
});

test("v0.57.19 meta interaction classification never becomes a player suggestion",()=>{
 const leaked="沿著『玩家在當前場景主動嘗試與眼前的陌生人互動：詢問道路』留下的影響追查下去";
 assert.equal(normalizeContextualSuggestion({label:leaked,action:leaked,kind:"OBSERVE",risk:"LOW",requirementsSatisfied:true,causalBasis:"最近事件"}),null);
 const s=state();s.events.push({id:"E1",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",summary:"玩家在當前場景主動嘗試與眼前的陌生人互動：「詢問道路」"});
 const set=regenerateContextualActionSet(s);assert.equal(set.primary.length,3);for(const row of set.all)assert.doesNotMatch(row.label+" "+row.action,/玩家在當前場景主動嘗試|NPC_INTERACTION|PLAYER_ACTION/)
});

test("v0.57.19 refresh suggestions use player-visible NPC identity",()=>{
 const s=state(),npc={id:"N1",name:"瑟琳",known:true,nameKnown:false,alive:true,locationId:"L1"};s.world.registry.npcs.push(npc);
 const set=regenerateContextualActionSet(s);assert.equal(playerVisibleNpcName(s,npc),"眼前的陌生人");for(const row of set.all)assert.doesNotMatch(row.label+" "+row.action,/瑟琳/)
});

test("v0.57.19 NPC self-name near-variant follows canonical identity without accidental prefix reveal",()=>{
 const known=state(),npc={id:"N1",name:"瑟琳",known:true,nameKnown:true};known.world.registry.npcs.push(npc);
 assert.equal(canonicalizeNpcIdentityText(known,npc,"賽琳：我知道一條路。"),"瑟琳：我知道一條路。");
 assert.equal(canonicalizeNpcIdentityText(known,npc,"我是賽琳，你可以跟著我。"),"我是瑟琳，你可以跟著我。");
 const hidden=state(),hiddenNpc={id:"N2",name:"瑟琳",known:true,nameKnown:false};hidden.world.registry.npcs.push(hiddenNpc);
 assert.equal(canonicalizeNpcIdentityText(hidden,hiddenNpc,"賽琳：我知道一條路。"),"賽琳：我知道一條路。");
 const selfIntro=canonicalizeNpcIdentityText(hidden,hiddenNpc,"我是賽琳，你可以叫我賽琳。");
 assert.equal(selfIntro,"我是瑟琳，你可以叫我瑟琳。");
 assert.equal(revealNpcNameFromEvidence(hidden,hiddenNpc,{answer:selfIntro}),true);
 assert.equal(playerVisibleNpcName(hidden,hiddenNpc),"瑟琳")
});


test("v0.57.19 suggestions ignore prior-world and wrong-scene events while preferring the current NPC clue",()=>{
 const s=state();s.world.id="WORLD-B";s.world.createdAt=2000;s.player.location="石橋";
 s.events=[
  {id:"OLD",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"WORLD-A",location:"裂隙",summary:"遠處輪廓逐漸變得模糊。",at:2500},
  {id:"OLD-UNSCOPED",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",summary:"眼前的裂隙持續擴張。",at:1500},
  {id:"OTHER-SCENE",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"WORLD-B",location:"L2",summary:"另一區域的鐘聲突然停止。",at:2600},
  {id:"CLUE",type:"NPC_CLUE_CONFIRMED",visibility:"PLAYER_KNOWN",worldId:"WORLD-B",location:"石橋",npcId:"N2",summary:"聽準頻率轉調的那個點，順著嗡鳴消失的方向走，你會找到我上次卡住的符號。",at:2700}
 ];
 const set=regenerateContextualActionSet(s),text=set.all.map(x=>x.label+" "+x.action).join("\n");
 assert.match(text,/嗡鳴消失|剛取得的線索/);
 assert.doesNotMatch(text,/遠處輪廓|眼前的裂隙|另一區域的鐘聲/)
});

test("v0.57.19 app resets world-bound caches and discards stale NPC async responses",async()=>{
 const {readFile}=await import("node:fs/promises"),app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/STATE_BOUND_UI_CACHE_RESET/);assert.match(app,/helperHistory=\[\]/);assert.match(app,/suggestionRefresh\.rejected=\[\]/);assert.match(app,/suggestionRefresh\.exclude=\[\]/);
 assert.match(app,/NPC_CONVERSATION_STALE_DISCARDED/);assert.match(app,/isCurrentStateSession\(conversationSession\)/);assert.match(app,/AUTOTEST_WORLD_SCOPE_READY/)
});
