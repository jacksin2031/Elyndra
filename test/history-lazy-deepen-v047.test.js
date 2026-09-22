import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {ensureHistoryFutureLinks,recordHistoryClueEvidence} from "../src/history-future.js";
import {ensureHistoryDepth,signalHistoryResearch,historyDeepeningNeed,planHistoryDeepening,validateHistoryDeepeningCandidate,commitHistoryDeepening,abortHistoryDeepening,historyDepthSnapshot} from "../src/history-depth.js";
import {registerDocument,readDocument,registerHistoryDeepeningDocuments} from "../src/document-engine.js";
import {registerHistoryRelicSeeds,ensureItemHeritage} from "../src/item-heritage.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:12,prompt:"History Depth 測試"};
function state(){
 const s=newGame(seed);s.world.version=5;
 s.world.history=[{id:"HIST-A",order:1,era:"舊紀",title:"灰塔崩落",category:"DISASTER",summary:"灰塔在失控儀式後崩落。",causes:["封印失衡"],legacies:["北境留下灰色晶層"],regions:["北境"],factions:["守塔會"],discoverKeywords:["灰塔碎碑","灰晶"],canonical:true,mutable:false}];
 s.world.futures=[{id:"FUT-A",title:"灰潮再現",hiddenCause:"舊封印鬆動",pressure:10,stage:"DORMANT",earliestDay:2,latestDay:10,activationConditions:[],cancelConditions:[],escalationConditions:[],historicalLinks:["HIST-A"],impactScope:"REGIONAL",affectedRegions:["北境"],intensity:50,domains:["MAGIC"],playerCanPrevent:true,playerCanAccelerate:true,playerCanMitigate:true,playerCanRedirect:true,pressureLog:[]}];
 ensureHistoryFutureLinks(s);return s
}
function candidate(plan){
 const clueId=plan.clues[0].id,futureId=plan.skeleton.futureRefs[0];
 return {historyId:plan.historyId,targetDepth:plan.targetDepth,additions:{
  actors:[{name:"末代守塔人",role:"維持封印的人",allegiance:"守塔會",motive:"阻止灰潮",fate:"失蹤",clueRefs:[clueId]}],
  places:[{name:"內環觀測室",role:"監測封印",modernTrace:"牆內仍有規律裂紋",clueRefs:[clueId]}],
  chronology:[{sequence:1,event:"觀測室先出現異常回聲。",causes:["封印失衡"],consequences:["守塔人封閉內環"],clueRefs:[clueId]}],
  accounts:[{perspective:"守塔會殘卷",claim:"崩落是為了阻止更大爆發。",reliability:"MEDIUM",bias:"替守塔會辯護",clueRefs:[clueId]}],
  documents:[{title:"灰塔最後值守簿",author:"不詳",era:"舊紀",culture:"北境",language:"COMMON",reliability:"PRIMARY_SOURCE",bias:"守塔會內部記錄",claims:[{text:"崩落前三日封印讀數持續上升。",clueId,disputes:false}]}],
  relics:[{label:"裂紋測量環",description:"帶灰晶刻度的金屬環。",culture:"北境",era:"舊紀",significance:"可比對今日灰潮前兆。",clueRefs:[clueId],futureRefs:[futureId]}],
  solutionClues:[{clueId,interpretation:"灰晶裂紋可作為灰潮壓力的早期指標。",futureRefs:[futureId]}]
 }}
}

test("History starts as Skeleton and does not deepen before research",()=>{
 const s=state(),root=ensureHistoryDepth(s),r=root.records[0];
 assert.equal(r.depth,"SKELETON");assert.equal(r.requestedDepth,"SKELETON");assert.equal(historyDeepeningNeed(s).required,false);
 assert.deepEqual(historyDepthSnapshot(s)[0],{historyId:"HIST-A",depth:"SKELETON",requestedDepth:"SKELETON",status:"IDLE",generated:false})
});

test("research signals request depth according to evidence strength",()=>{
 const s=state(),clue=s.world.history[0].clues[0];
 signalHistoryResearch(s,"HIST-A",{reason:"FIRST_LOOK",targetDepth:"OUTLINE"});assert.equal(historyDeepeningNeed(s).targetDepth,"OUTLINE");
 clue.status="CORROBORATED";signalHistoryResearch(s,"HIST-A",{reason:"CORROBORATED_CLUE"});assert.equal(historyDeepeningNeed(s).targetDepth,"DEEP");
 clue.status="VERIFIED";signalHistoryResearch(s,"HIST-A",{reason:"VERIFIED_CLUE"});assert.equal(historyDeepeningNeed(s).targetDepth,"FULL")
});

test("History Deepening plan is deterministic and quota-bound",()=>{
 const s=state();signalHistoryResearch(s,"HIST-A",{targetDepth:"OUTLINE"});
 const a=planHistoryDeepening(s),b=planHistoryDeepening(s,"HIST-A");
 assert.equal(a.id,b.id);assert.equal(a.historyId,"HIST-A");assert.equal(a.targetDepth,"OUTLINE");assert.equal(a.baseWorldVersion,5);
 assert.ok(a.quotas.actors>0&&a.quotas.documents>0);assert.equal(a.skeleton.summary,"灰塔在失控儀式後崩落。")
});

test("candidate cannot mutate Skeleton, exceed quota or invent clue/future refs",()=>{
 const s=state();signalHistoryResearch(s,"HIST-A",{targetDepth:"OUTLINE"});const plan=planHistoryDeepening(s),ok=candidate(plan);
 assert.equal(validateHistoryDeepeningCandidate(s,plan,ok).valid,true);
 const mutation={...structuredClone(ok),summary:"改寫舊歷史"};assert.ok(validateHistoryDeepeningCandidate(s,plan,mutation).errors.some(x=>x.includes("HISTORY_SKELETON_MUTATION_FORBIDDEN")));
 const bad=structuredClone(ok);bad.relics=undefined;bad.additions.relics[0].futureRefs=["FUT-FAKE"];assert.ok(validateHistoryDeepeningCandidate(s,plan,bad).errors.some(x=>x.includes("HISTORY_DEEPENING_FUTURE_REF_INVALID")));
 const quota=structuredClone(ok);quota.additions.documents.push(structuredClone(quota.additions.documents[0]));assert.ok(validateHistoryDeepeningCandidate(s,plan,quota).errors.some(x=>x.includes("HISTORY_DEEPENING_QUOTA_EXCEEDED")))
});

test("commit creates hidden Canon detail without granting player Knowledge",()=>{
 const s=state();signalHistoryResearch(s,"HIST-A",{targetDepth:"OUTLINE"});const plan=planHistoryDeepening(s),beforeKnowledge=s.knowledge.length,beforeSkeleton=structuredClone(s.world.history[0]);
 const out=commitHistoryDeepening(s,plan,candidate(plan));assert.equal(out.ok,true);assert.equal(out.depth,"OUTLINE");assert.equal(s.knowledge.length,beforeKnowledge);
 assert.deepEqual(s.world.history[0],beforeSkeleton);assert.equal(s.world.version,6);
 const player=historyDepthSnapshot(s)[0],director=historyDepthSnapshot(s,{director:true})[0];
 assert.equal(player.generated,true);assert.equal("detail" in player,false);assert.equal(director.detail.actors[0].name,"末代守塔人")
});

test("deepened documents and relics remain hidden seeds until separately discovered",()=>{
 const s=state();signalHistoryResearch(s,"HIST-A",{targetDepth:"OUTLINE"});const plan=planHistoryDeepening(s),out=commitHistoryDeepening(s,plan,candidate(plan));
 const docs=registerHistoryDeepeningDocuments(s,"HIST-A",out.added.documents),relics=registerHistoryRelicSeeds(s,"HIST-A",out.added.relics);
 assert.equal(docs.length,1);assert.equal(relics.length,1);
 const doc=s.world.documents.documents.find(x=>x.id===docs[0]);assert.equal(doc.known,false);assert.equal(doc.read,false);assert.deepEqual(doc.historyRefs,["HIST-A"]);
 const relic=ensureItemHeritage(s).seeds.find(x=>x.id===relics[0]);assert.equal(relic.status,"UNMATERIALIZED");assert.deepEqual(relic.historyRefs,["HIST-A"]);
 assert.equal(s.inventory.length,0)
});

test("reading a History document creates research demand but not instant truth",()=>{
 const s=state(),clue=s.world.history[0].clues[0],doc=registerDocument(s,{title:"灰塔抄本",language:"COMMON",historyRefs:["HIST-A"],claims:[{text:"灰塔崩落前曾封閉內環。",historyId:"HIST-A",clueId:clue.id}]});
 const result=readDocument(s,doc.id);assert.equal(result.ok,true);
 const need=historyDeepeningNeed(s);assert.equal(need.required,true);assert.ok(["OUTLINE","DEEP","FULL"].includes(need.targetDepth));
 const evidence=s.knowledge.find(x=>result.evidenceRefs.includes(x.id));assert.notEqual(evidence.status,"VERIFIED")
});

test("aborted or stale History proposals cannot commit",()=>{
 const s=state();signalHistoryResearch(s,"HIST-A",{targetDepth:"OUTLINE"});const plan=planHistoryDeepening(s),c=candidate(plan);
 s.world.version++;assert.ok(validateHistoryDeepeningCandidate(s,plan,c).errors.includes("HISTORY_DEEPENING_STALE_WORLD"));
 abortHistoryDeepening(s,plan,"PLAYER_ACTION");assert.equal(historyDeepeningNeed(s).required,true)
});

test("app runs History Deepening only as preemptible background work",async()=>{
 const [app,client,api,worldEngine]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/history-deepen.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/const historyBackground=\{/);assert.match(app,/function preemptBackgroundHistory\(\)/);
 assert.match(app,/function preemptBackgroundAI\(\).*preemptBackgroundHistory\(\)/);
 assert.match(app,/scheduleHistoryDeepening\("knowledge_refresh",2100\)/);
 assert.match(app,/scheduleHistoryDeepening\("post_player_action",2200\)/);
 assert.match(app,/scheduleHistoryDeepening\("continue_world",1500\)/);
 assert.match(app,/scheduleHistoryDeepening\("post_creation",1500\)/);
 assert.match(app,/generateHistoryDeepening\(gameState,plan,\{signal:ctrl\.signal\}\)/);
 assert.match(app,/validateHistoryDeepeningCandidate\(gameState,plan,candidate\)/);assert.match(app,/commitHistoryDeepening\(gameState,plan,candidate\)/);
 assert.match(app,/registerHistoryDeepeningDocuments/);assert.match(app,/registerHistoryRelicSeeds/);
 assert.match(client,/export async function generateHistoryDeepening/);assert.match(client,/HISTORY_DEEPENING:"history_deepening"/);
 assert.match(client,/post\("\/api\/history-deepen",payload,\{signal\}\)/);
 assert.match(api,/History Deepening Architect/);assert.match(api,/生成本身絕不代表玩家知道/);
 assert.match(worldEngine,/History Skeleton/);assert.match(worldEngine,/生成隱藏細節本身不等於玩家已知/)
});
