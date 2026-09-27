import test from "node:test";
import assert from "node:assert/strict";
import {buildContextualActionSet,normalizeContextualSuggestion,suggestionPresentation} from "../src/contextual-actions.js";

function japaneseState(){
 return {
  localization:{sourceLocale:"ja",displayLocale:"ja",translations:{ja:{}}},
  world:{id:"W-ja",state:{day:1},registry:{locations:[{id:"LOC-START",name:"古代魔導都市の断層跡",known:true,description:"崩れた石壁と古い通路が見える。"}],npcs:[],factions:[],sideQuests:[]},travel:{routes:[]},creation:{blueprint:{difficulty:"normal"}}},
  player:{location:"古代魔導都市の断層跡",difficulty:"normal",skills:{},magic:{knownSpells:[],attunements:[]},capabilities:[],talents:[]},
  quests:{main:{id:"Q-main",title:"見知らぬ世界で生き延びる",stage:0,status:"ACTIVE",objectives:["自分がどこにいるか把握し、まず行動できるようにする"]}},
  inventory:[],events:[],suggestions:[],suggestionIntents:[]
 }
}

test("v0.59.15 Japanese AI suggestions survive contextual normalization",()=>{
 const state=japaneseState();
 const row=normalizeContextualSuggestion({label:"周囲の新しい痕跡を調べる",action:"古代魔導都市の断層跡で、目の前に見える足跡と崩れた通路を確認する",kind:"OBSERVE",risk:"LOW",approach:"STEADY",causalBasis:"現在地で直接観察できる範囲",requirementsSatisfied:true,source:"AI"},{state,locale:"ja"});
 assert.ok(row);assert.match(row.label,/周囲/);assert.match(row.action,/確認する/);assert.match(row.causalBasis,/現在地/)
});

test("v0.59.15 Japanese locale still rejects obvious Chinese suggestion leakage",()=>{
 const state=japaneseState();
 const row=normalizeContextualSuggestion({label:"詢問陌生人",action:"向眼前的陌生人詢問目前目標",kind:"SOCIAL",causalBasis:"目前可見人物",requirementsSatisfied:true,source:"AI"},{state,locale:"ja"});
 assert.equal(row,null)
});

test("v0.59.15 Japanese first-turn action panel always has three primary actions",()=>{
 const state=japaneseState(),set=buildContextualActionSet(state,[]);
 assert.equal(set.primary.length,3);assert.ok(set.all.length>=3);
 for(const row of set.primary){assert.ok(row.label);assert.ok(row.action);assert.ok(suggestionPresentation(state,row).label)}
});

test("v0.59.15 Japanese model suggestions can populate primary action cards",()=>{
 const state=japaneseState(),input=[
  {label:"崩れた通路を観察する",action:"目の前の崩れた通路を観察し、安全に進める方向を確かめる",kind:"OBSERVE",risk:"LOW",approach:"STEADY",causalBasis:"現在地の通路は直接見えている",requirementsSatisfied:true,source:"AI",progression:true},
  {label:"周囲の音を聞き分ける",action:"その場で立ち止まり、近くから聞こえる音の方向と距離を確かめる",kind:"OBSERVE",risk:"LOW",approach:"CREATIVE",causalBasis:"現在地で音を直接確認できる",requirementsSatisfied:true,source:"AI"}
 ],set=buildContextualActionSet(state,input);
 assert.equal(set.primary.length,3);assert.ok(set.primary.some(x=>/崩れた通路/.test(x.label)))
});
