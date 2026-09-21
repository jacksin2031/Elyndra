import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration,revealRegistryEntities,resolvePlayerLocation,repairPlayerLocation,canInteractWithNpc,npcInteractionMode} from "../src/world-registry.js";
import {applyNpcConversationTurn} from "../src/npc-conversation.js";
import {applyTurnCandidate} from "../src/adventure-engine.js";
import {sanitizePlayerText,sanitizeSuggestion} from "../src/runtime-guard.js";
import {routeAction} from "../src/jev-router.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:""};
function world(){
 const s=newGame(seed);
 canonizeGeneration(s,{locations:[
  {name:"石門廣場",type:"廣場",region:"中央",description:"灰石鋪成的廣場",known:true},
  {name:"河岸小徑",type:"道路",region:"中央",description:"沿河延伸的小徑",known:true}
 ],npcs:[
  {name:"艾琳",role:"旅人",description:"正在觀察四周",locationName:"石門廣場",known:false},
  {name:"洛安",role:"商人",description:"在河岸整理貨物",locationName:"河岸小徑",known:false}
 ]});
 resolvePlayerLocation(s,"石門廣場");
 return s
}

test("NPC becomes interactable only after an actual nearby reveal and stops being interactable after leaving",()=>{
 const s=world(),a=s.world.registry.npcs.find(x=>x.name==="艾琳");
 revealRegistryEntities(s,[{kind:"npc",id:a.id}]);
 assert.equal(a.known,true);
 assert.equal(a.encountered,true);
 assert.equal(canInteractWithNpc(s,a),true);
 resolvePlayerLocation(s,"河岸小徑");
 assert.equal(canInteractWithNpc(s,a),false);
});

test("after a real local conversation a civilization-supported contact can remain remotely reachable",()=>{
 const s=world(),a=s.world.registry.npcs.find(x=>x.name==="艾琳");
 s.world.bible={civilization:{level:3},communication:{name:"共鳴台",medium:"魔導節點",description:"區域短訊",latency:"NEAR_INSTANT",range:"REGIONAL",constraints:"需先建立聯絡"}};
 revealRegistryEntities(s,[{kind:"npc",id:a.id}]);
 applyNpcConversationTurn(s,a,"你好","艾琳點頭回應。");
 resolvePlayerLocation(s,"河岸小徑");
 assert.equal(npcInteractionMode(s,a),"REMOTE");
 assert.equal(canInteractWithNpc(s,a),true);
});

test("hearing about a remote NPC does not make that NPC directly interactable",()=>{
 const s=world(),b=s.world.registry.npcs.find(x=>x.name==="洛安");
 revealRegistryEntities(s,[{kind:"npc",id:b.id}]);
 assert.equal(b.known,true);
 assert.equal(b.encountered,false);
 assert.equal(canInteractWithNpc(s,b),false);
});

test("corrupted saved locations repair to a canonical known location",()=>{
 const s=world();s.player.location="\uFFFD[bad-location]";s.world.state.location=s.player.location;
 const fixed=repairPlayerLocation(s);
 assert.ok(fixed);
 assert.ok(["石門廣場","河岸小徑"].includes(s.player.location));
 assert.equal(s.player.location,s.world.state.location);
});

test("turn location changes accept only canonical registry locations",()=>{
 const s=world(),before=s.player.location;
 applyTurnCandidate(s,{narrative:"你向前走了幾步，重新確認周圍環境。",location:"\uFFFD{broken}",suggestions:["看看左邊","看看右邊"]},{action:"向前走",roll:{success:true}});
 assert.equal(s.player.location,before);
 applyTurnCandidate(s,{narrative:"你沿著道路來到河邊，水聲逐漸清晰。",location:"河岸小徑",suggestions:["觀察河面","沿河前進"]},{action:"沿路前進",roll:{success:true,profile:{kind:"TRAVEL"}}});
 assert.equal(s.player.location,"河岸小徑");
});

test("player-facing narrative strips system labels and rejects foreign-language leakage",()=>{
 const s=world();
 applyTurnCandidate(s,{narrative:"【世界動向】遠處傳來沉重鐘聲，附近的人開始停下腳步。",suggestions:["觀察人群","留意鐘聲方向"]},{action:"觀察",roll:{success:true}});
 assert.equal(s.narrative.includes("世界動向"),false);
 assert.match(s.narrative,/遠處傳來/);
 assert.equal(sanitizePlayerText("あなたは森の中を歩いています。",200,"語言輸出異常，請重新觀察眼前環境。"),"語言輸出異常，請重新觀察眼前環境。");
 assert.equal(sanitizeSuggestion("다음 장소로 이동합니다"),"");
});

test("identical AI suggestions are replaced so action buttons do not stay stale",()=>{
 const s=world();s.suggestions=["仔細觀察剛才行動造成的變化","沿著目前可見的方向繼續探索","尋找附近可以直接交流的人"];
 const before=[...s.suggestions];
 applyTurnCandidate(s,{narrative:"你停下來重新整理眼前的線索。",suggestions:before},{action:"整理線索",roll:{success:true}});
 assert.notDeepEqual(s.suggestions,before);
 assert.ok(s.suggestions.length>=3);
});

test("world inspection is generative rather than the old insufficient-condition local route",async()=>{
 const s=world(),r=await routeAction("查看周圍有沒有可疑痕跡",s);
 assert.equal(r.route,"ADVENTURE");
 assert.equal(r.needsGeneration,true);
 const source=await readFile(new URL("../src/game-engine.js",import.meta.url),"utf8");
 assert.equal(source.includes("但目前條件不足"),false);
});

test("UI keeps wallet assets visible before considering local barter mode",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const balances=app.indexOf('if(balances.length)');
 const barter=app.indexOf('else if(trade?.mode==="barter")');
 assert.ok(balances>=0&&barter>balances);
 assert.match(app,/currencyLabel"\)\.textContent="資產"/);
});

test("combat uses main action buttons and no longer has an automatic combat modal",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/data-combat-action="attack"/);
 assert.match(app,/data-combat-action="defend"/);
 assert.match(app,/data-combat-action="retreat"/);
 assert.doesNotMatch(app,/function openCombat\(/);
 assert.doesNotMatch(app,/openCombat\(\)/);
});

test("NPC contact dock filters through local-or-canonical-remote interaction boundary",async()=>{
 const [app,html]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8")
 ]);
 assert.match(html,/CONTACTS/);
 assert.match(app,/npcs\.filter\(x=>canInteractWithNpc\(gameState,x\)\)/);
});
