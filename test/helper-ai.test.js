import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration,resolvePlayerLocation,revealRegistryEntities} from "../src/world-registry.js";
import {helperSnapshot} from "../src/helper-context.js";
import {deriveSceneTitle,sanitizeSceneTitle} from "../src/runtime-guard.js";
import {applyTurnCandidate} from "../src/adventure-engine.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:""};

function makeState(){
 const s=newGame(seed);
 canonizeGeneration(s,{locations:[
  {name:"石門廣場",type:"廣場",description:"灰石廣場，中央有乾涸水池。",known:true},
  {name:"北方關口",type:"關口",description:"通往山地的舊關口。",known:true}
 ],npcs:[
  {name:"艾琳",role:"旅人",description:"正在石門廣場整理行囊。",locationName:"石門廣場",known:false},
  {name:"洛安",role:"商人",description:"常在北方關口交易。",locationName:"北方關口",known:false}
 ]});
 resolvePlayerLocation(s,"石門廣場");
 const a=s.world.registry.npcs.find(x=>x.name==="艾琳"),b=s.world.registry.npcs.find(x=>x.name==="洛安");
 a.nameKnown=true;b.nameKnown=true;
 revealRegistryEntities(s,[{kind:"npc",id:a.id}]);
 resolvePlayerLocation(s,"北方關口");revealRegistryEntities(s,[{kind:"npc",id:b.id}]);resolvePlayerLocation(s,"石門廣場");
 s.world.secretDirectorValue="NEVER_EXPOSE";
 s.world.state.directorTimeline=[{directorTruth:"秘密真相"}];
 s.world.canon.facts.push({id:"SECRET",text:"玩家不知道的秘密"});
 s.knowledge.push({id:"K1",title:"廣場石碑",text:"你已確認石碑上刻有舊王朝的符號。",factId:null});
 s.narrative="你站在石門廣場，北面有一條狹窄街道。";
 s.sceneTitle="調查廣場周圍";
 return s
}

test("travel helper snapshot is strictly read-only",()=>{
 const s=makeState(),before=JSON.stringify(s);
 helperSnapshot(s);
 assert.equal(JSON.stringify(s),before);
});

test("travel helper exposes only player-known and currently local NPC context",()=>{
 const s=makeState(),snap=helperSnapshot(s);
 assert.equal(snap.rule,"ONLY_PLAYER_KNOWN");
 assert.equal(snap.world.currentLocation.name,"石門廣場");
 assert.deepEqual(snap.knowledge.nearbyNpcs.map(x=>x.name),["艾琳"]);
 assert.ok(snap.knowledge.knownLocations.some(x=>x.name==="北方關口"));
 assert.equal("directorTimeline" in snap,false);
 assert.equal(JSON.stringify(snap).includes("NEVER_EXPOSE"),false);
 assert.equal(JSON.stringify(snap).includes("玩家不知道的秘密"),false);
 s.knowledge.push({id:"K-rumor",title:"酒館傳聞",text:"有人說北門下面埋著王室寶藏。",status:"TESTIMONY",score:0});const rumorSnap=helperSnapshot(s);assert.equal(rumorSnap.knowledge.facts.at(-1).status,"TESTIMONY");
});

test("travel helper UI and client path do not perform game mutations",async()=>{
 const [app,client,api]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/helper.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/id="helperBtn"|#helperBtn/);
 const block=app.slice(app.indexOf("function helperModalHtml"),app.indexOf("const STAT_LABEL"));
 for(const forbidden of ["performAction(","applyTurnCandidate(","combatAction(","persist()","advanceTime("])assert.equal(block.includes(forbidden),false,forbidden);
 assert.match(client,/export async function askTravelHelper/);
 assert.match(client,/helperSnapshot\(state\)/);
 assert.doesNotMatch(client.slice(client.indexOf("export async function askTravelHelper"),client.indexOf("export async function generateTurn")),/post\("\/api\/turn"/);
 assert.match(api,/旅途輔助 AI/);
});

test("helper prompt explicitly forbids hidden knowledge and nearby leakage",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const block=client.slice(client.indexOf("export async function askTravelHelper"),client.indexOf("export async function generateTurn"));
 assert.match(block,/未發現地點、未遇 NPC/);
 assert.match(block,/knowledge\.nearbyNpcs/);
 assert.match(block,/knownLocations 只代表玩家知道那些地方存在，不代表它們在附近/);
 assert.match(block,/不可以改變劇情、時間、骰子、HP、物品、任務、NPC 關係、戰鬥或任何 Canon/);
});

test("scene title is a current objective rather than a fixed chapter title",()=>{
 const s=makeState();s.quests.main.objectives=["找到可以打開北門的鑰匙"];
 assert.equal(deriveSceneTitle(s),"找到可以打開北門的鑰匙");
 s.combat={active:true,enemy:{name:"灰牙獸"}};
 assert.equal(deriveSceneTitle(s),"應對灰牙獸");
 assert.equal(sanitizeSceneTitle("夜色中的危機",s),"應對灰牙獸");
});

test("AI scene title persists when safe, while missing title falls back to current objective",()=>{
 const s=makeState();s.quests.main.objectives=["調查石門廣場的異常鐘聲"];
 applyTurnCandidate(s,{sceneTitle:"追查鐘聲來源",narrative:"鐘聲再次從北面傳來。",suggestions:["前往北街","詢問艾琳"]},{action:"聽鐘聲",roll:{success:true}});
 assert.equal(s.sceneTitle,"追查鐘聲來源");
 applyTurnCandidate(s,{narrative:"你停下來整理已知線索。",suggestions:["檢查石碑","觀察北街"]},{action:"整理線索",roll:{success:true}});
 assert.equal(s.sceneTitle,deriveSceneTitle(s));
});

test("static HTML no longer ships with the old first-day scene title",async()=>{
 const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.doesNotMatch(html,/陌生世界的第一天/);
 assert.match(html,/id="helperBtn">旅途助手</);
});
