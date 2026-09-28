import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildContextualActionSet,v06027RecentSuggestionExclusions,v06027JapaneseSuggestionLabel} from "../src/v06027-contextual-actions-hotfix.js";
import {performAction} from "../src/v06027-game-engine-hotfix.js";
import {newGame} from "../src/world-engine.js";

const withJa=async fn=>{const prev=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE="ja";try{return await fn()}finally{globalThis.ELYNDRA_LOCALE=prev}};
function unknownState(){return {world:{id:"W",createdAt:Date.now(),state:{day:1,location:"潮霧津 北側灯台の最下段の石段付近"},registry:{locations:[],npcs:[],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}},travel:{routes:[]}},player:{location:"潮霧津 北側灯台の最下段の石段付近",status:"ACTIVE",difficulty:"normal",skills:{OBSERVE:2,SOCIAL:1,TRAVEL:0,RISKY:0},magic:{knownSpells:[]},worldNameKnown:false},quests:{main:{title:"見知らぬ世界で生き延びる",objectives:["周囲の状況を確認し、次に取れる行動を見極める"],status:"ACTIVE"}},events:[]}}

test("v0.60.27 Japanese contextual suggestions do not immediately recycle the clicked engine action",()=>withJa(()=>{
 const state=unknownState(),first=buildContextualActionSet(state,[]);
 assert.equal(first.primary.length,3);
 assert.equal(new Set(first.primary.map(x=>x.label)).size,3);
 const clicked=first.primary[0];
 state.events.push({id:"P1",type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",customText:clicked.action,originalAction:clicked.action});
 assert.ok(v06027RecentSuggestionExclusions(state,first.all).includes(clicked.engineAction));
 const second=buildContextualActionSet(state,first.all);
 assert.equal(second.all.some(x=>x.engineAction===clicked.engineAction),false);
 assert.notDeepEqual(second.primary.map(x=>x.label),first.primary.map(x=>x.label));
 assert.equal(new Set(second.primary.map(x=>x.label)).size,second.primary.length)
}));

test("v0.60.27 Japanese projection gives distinct semantics instead of collapsing different engine actions to one generic label",()=>withJa(()=>{
 const rows=[
  {engineAction:"保持可撤退距離，觀察未知地點的出入口、人流與最新痕跡，先確認哪個方向最值得行動",action:"目の前で確認できることを一つ試す",kind:"OBSERVE",approach:"STEADY"},
  {engineAction:"在未知地點比較最新痕跡與周圍環境，找出最不自然的一處",action:"目の前で確認できることを一つ試す",kind:"OBSERVE",approach:"STEADY"},
  {engineAction:"只利用未知地點目前可見的人流、聲音或遮蔽物，以不消耗未知資源的另一種方式測試環境反應",action:"目の前で確認できることを一つ試す",kind:"GENERAL",approach:"CREATIVE"}
 ];
 const labels=rows.map(v06027JapaneseSuggestionLabel);
 assert.deepEqual(labels,["退路を確保しながら出入口と新しい痕跡を観察する","新しい痕跡と周囲の環境を見比べる","別の方法で周囲の反応を確かめる"]);
 assert.equal(new Set(labels).size,3)
}));

test("v0.60.27 game engine persists canonical suggestion action beside the Japanese player-visible action",()=>withJa(()=>{
 const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:""},state=newGame(seed),prior=Math.random;
 Math.random=()=>0.6;
 try{
  const visible="周囲の環境を利用して観察の機会を作る",engine="利用未知地點現有的人流、遮蔽物或聲音製造一個小干擾，藉機觀察誰會對異常作出反應";
  performAction(state,"free",visible,{verdict:"ALLOW",kind:"GENERAL",normalizedAction:visible,playerVisibleAction:visible,engineNormalizedAction:engine,actionIntent:{kind:"GENERAL",intent:"GENERAL",raw:visible}});
  const event=[...state.events].reverse().find(x=>x.type==="PLAYER_ACTION");
  assert.ok(event);assert.equal(event.playerVisibleAction,visible);assert.equal(event.engineAction,engine)
 }finally{Math.random=prior}
}));

test("v0.60.27 source contract confirms Debug baseline is raw Engine location while HUD uses player-visible projection",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/location:String\(state\.player\?\.location\|\|state\.world\?\.state\?\.location\|\|""\)/);
 assert.match(app,/recordDebug\("GAME_STATE_BASELINE",\{worldId:next\.worldId,location:next\.location/);
 assert.match(app,/\$\("#location"\)\.textContent=safeVisibleText\(playerVisibleLocationName\(gameState\),"location"\)/);
 assert.match(app,/\$\("#topLocation"\)\.textContent=safeVisibleText\(playerVisibleLocationName\(gameState\),"location"\)/)
});

test("v0.60.27 release wiring installs suggestion diversity and canonical action persistence wrappers",async()=>{
 const [html,pkgText,version,workflow,contextual,game]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8"),readFile(new URL("../src/v06027-contextual-actions-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06027-game-engine-hotfix.js",import.meta.url),"utf8")
 ]);
 assert.equal(JSON.parse(pkgText).version,"0.60.27");assert.match(version,/APP_VERSION="0\.60\.27"/);
 assert.match(html,/v06027-contextual-actions-hotfix\.js\?v=60027/);assert.match(html,/v06027-game-engine-hotfix\.js\?v=60027/);assert.match(html,/app\.js\?v=60019/);assert.match(html,/version\.js\?v=60027/);
 assert.match(contextual,/v06021-contextual-actions-hotfix\.js\?v=60021/);assert.match(game,/v06025-game-engine-hotfix\.js\?v=60025/);
 assert.match(workflow,/Focused v0\.60\.27 regressions/);assert.match(workflow,/v06027-contextual-suggestion-diversity\.test\.js/);assert.match(workflow,/version\.js\?v=60027/);assert.match(workflow,/v0\\\.60\\\.27/)
});
