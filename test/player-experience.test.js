import test from "node:test";
import assert from "node:assert/strict";
import {applyOpeningExperience,ensureNpcBehaviorProfile,npcBehaviorSnapshot,projectObservableWorldChanges,roleplayFallbackSuggestions,sessionCheckpoint} from "../src/player-experience.js";
import {fastLocalActionAssessment} from "../src/ai-client.js";

function baseState(){
 return {
  world:{
   id:"W1",
   state:{day:1,clock:{day:1,hour:8,minute:0,totalMinutes:0}},
   registry:{locations:[{id:"L1",name:"未知街角",known:true}],npcs:[],factions:[],sideQuests:[]},
   bible:{weatherSystem:{phenomena:[{id:"WX1",observableName:"逆向的風",sensoryCue:"塵埃忽然逆著風向滑過地面"}]}},
   weather:{currentId:"WX1"}
  },
  player:{location:"未知街角",status:"ACTIVE"},
  suggestions:[],
  events:[{id:"E0",type:"WORLD_CREATED",visibility:"PLAYER_KNOWN",day:1,at:1}]
 }
}

test("weak opening is upgraded into a grounded sensory hook without invented actors or events",()=>{
 const state=baseState();
 const out=applyOpeningExperience(state,"你在陌生地方醒來。",["觀察四周"]);
 assert.equal(out.quality.sensory,true);
 assert.match(out.narrative,/塵埃忽然逆著風向滑過地面|視線之外|聲音/);
 assert.doesNotMatch(out.narrative,/逃離|急促腳步|轉角後/);
 assert.ok(out.suggestions.length>=3);
 assert.doesNotMatch(out.suggestions.join("|"),/觀察四周|繼續探索|確認自己/);
 assert.equal(state.world.experience.opening.hookPresented,true);
 assert.ok(state.events.some(e=>e.type==="OPENING_HOOK_PRESENTED"&&e.visibility==="INTERNAL"))
});

test("NPC behavior profile is deterministic and keeps explicit behavior",()=>{
 const npc={id:"N1",name:"艾琳",role:"居民",personality:"謹慎",goal:"保護家人",behaviorProfile:{mannerisms:["緊張時整理左袖口"]}};
 const first=npcBehaviorSnapshot(npc),second=npcBehaviorSnapshot(npc);
 assert.deepEqual(first,second);
 assert.equal(first.mannerisms[0],"緊張時整理左袖口");
 assert.ok(first.speechPatterns.length);
 assert.ok(first.contradictions.length)
});

test("world impact projection enters normal narrative exactly once",()=>{
 const state=baseState();
 projectObservableWorldChanges(state,"原本的場景。");
 state.events.push({id:"E1",type:"WORLD_CONSEQUENCE_DISCOVERED",visibility:"PLAYER_KNOWN",summary:"市場重新開張，原本封住的攤檔再次亮起燈火。",day:1,at:2});
 const first=projectObservableWorldChanges(state,"你回到街上。");
 assert.equal(first.projected.length,1);
 assert.match(first.narrative,/你回到街上。\n\n你很快察覺到先前的選擇已留下具體痕跡：市場重新開張/);
 const second=projectObservableWorldChanges(state,first.narrative);
 assert.equal(second.projected.length,0);
 assert.equal(second.narrative,first.narrative)
});

test("roleplay fallback suggestions prefer scene-grounded actions",()=>{
 const state=baseState();
 state.world.registry.npcs.push({id:"N1",name:"艾琳",known:true,alive:true,locationId:"L1"});
 const suggestions=roleplayFallbackSuggestions(state,{action:"查看門口的泥痕"});
 assert.ok(suggestions.some(x=>x.includes("艾琳")||x.includes("泥痕")||x.includes("未知街角")));
 assert.doesNotMatch(suggestions.join("|"),/繼續探索|確認目前目標|整理情報/)
});

test("simple observe and basic talk bypass AI feasibility while consequential actions do not",()=>{
 const state=baseState();
 const observe=fastLocalActionAssessment(state,"檢查窗框上的新鮮刮痕");
 assert.equal(observe?.source,"ENGINE_FASTPATH");
 assert.equal(observe?.kind,"OBSERVE");
 const talk=fastLocalActionAssessment(state,"問附近的人剛才是否聽見鐘聲");
 assert.equal(talk?.source,"ENGINE_FASTPATH");
 assert.equal(fastLocalActionAssessment(state,"威脅守衛打開城門"),null);
 assert.equal(fastLocalActionAssessment(state,"偷走桌上的鑰匙"),null)
});

test("deterministic utility commands are recognized by the Engine fast path",()=>{
 const state=baseState();state.player.hp=10;state.player.maxHp=10;state.inventory=[{id:"I1",name:"短劍",category:"EQUIPMENT",quantity:1}];
 for(const action of ["查看角色狀態","查看任務","查看地圖","裝備短劍","睡覺"])assert.equal(fastLocalActionAssessment(state,action)?.source,"ENGINE_FASTPATH",action)
});

test("session checkpoint summarizes visible journey events",()=>{
 const state=baseState();
 state.events.push(
  {id:"E1",type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",summary:"你從居民口中知道北門昨晚曾短暫封閉。",day:1,at:2},
  {id:"E2",type:"WORLD_CONSEQUENCE",visibility:"OBSERVABLE",summary:"北門重新開放，商隊開始恢復通行。",day:1,at:3}
 );
 const recap=sessionCheckpoint(state,"休息");
 assert.ok(recap);
 assert.match(recap.summary,/北門/);
 assert.ok(recap.worldChanges.some(x=>x.includes("重新開放")));
 assert.ok(state.events.some(e=>e.type==="SESSION_CHECKPOINT"))
});
