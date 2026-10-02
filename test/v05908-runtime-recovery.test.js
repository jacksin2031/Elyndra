import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {bindTimelineAuthoringSlots,createTimelinePacing,validateWorldTimeline} from "../src/world-timeline.js";
import {autotestStateFingerprint,deterministicAutotestDecision} from "../src/ai-autotest.js";

const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("v0.59.8 targetless hard recovery never claims TRAVEL",()=>{
 const snapshot={world:{location:"裂隙前"},quest:{title:"調查異常",objectives:["找出異常來源"]},suggestions:[],combat:{active:false}};
 const recent=Array.from({length:7},(_,i)=>({action:`停滯-${i}`,kind:"OBSERVE",progressed:false,targetId:null}));
 const decision=deterministicAutotestDecision(snapshot,recent,"stall");
 assert.equal(decision.mode,"free");
 assert.notEqual(decision.kind,"TRAVEL");
 assert.equal(decision.targetId,null);
 assert.match(decision.action,/出口|通道|位置/);
});

test("v0.61.2 autotest fingerprint ignores clock-only passage but counts meaningful event progress",()=>{
 const base={world:{id:"W",state:{clock:{totalMinutes:10}},registry:{npcs:[],locations:[],sideQuests:[]}},player:{location:"L",hp:10,status:"OK",level:1,xp:0,knowledgeScore:0},quests:{main:{stage:0,status:"ACTIVE",objectives:[]}},inventory:[],knowledge:[],events:[],discoveries:0,combat:{active:false}};
 const timeMoved=structuredClone(base);timeMoved.world.state.clock.totalMinutes=20;
 const eventMoved=structuredClone(base);eventMoved.events.push({type:"TICK"});
 assert.equal(autotestStateFingerprint(base),autotestStateFingerprint(timeMoved));
 assert.notEqual(autotestStateFingerprint(base),autotestStateFingerprint(eventMoved));
});

test("v0.59.8 future compiler fills only missing timeline slots",async()=>{
 const src=await read("../src/ai-client.js");
 assert.match(src,/futureFallbackCandidate=futureFallback/);
 assert.match(src,/futureRows=timelineAuthoringSlots/);
 assert.match(src,/futureFallbackCandidate\.worldTimeline\[i\]/);
});

test("v0.59.8 Agnes keeps enough FUTURE output and waits through normal critical cooldown",async()=>{
 const src=await read("../src/ai-settings.js");
 assert.match(src,/future:4096/);
 assert.match(src,/PLAYER_CRITICAL_BACKPRESSURE_MAX_MS=6000/);
 assert.match(src,/AI_PLAYER_CRITICAL_BACKPRESSURE_WAIT/);
 assert.doesNotMatch(src,/SHED_ON_RATE_LIMIT=new Set\(\[[^\]]*runtime_expansion/);
});

test("v0.59.8 Japanese fixed world strings bypass AI translation repair",async()=>{
 const src=await read("../src/locale-runtime.js");
 assert.match(src,/JAPANESE_ORIGIN_NAMES/);
 assert.match(src,/現在地、道筋、現地の基本的な決まりを把握する/);
 assert.match(src,/具体的な身分、開始地点、因果関係/);
});


test("v0.59.10 grounded recovery and Japanese UI contracts",async()=>{
 const auto=await read("../src/ai-autotest.js"),app=await read("../app.js"),extra=await read("../src/ui-translations-extra.js"),fixed=await read("../src/v0594-static-i18n.js");
 for(const value of ["FIRST_BUTTON_UNAVAILABLE_TRAVEL","targetId:destination.target.id","未探索の通行可能な出口または通路"])assert.ok(auto.includes(value),value);
 for(const value of ["waitForAutotestActionReady(config.disableTimeout===true?90000:38000)","AUTOTEST_PLAYER_ACTION_STILL_RUNNING",'suggestion:{label:decision.action||"",action:decision.action||"",kind:decision.kind',"travelSnapshot(gameState,{director:true}).routes.length===0","esc(lt(region.region))",'staticText("起源決定你一開始能知道甚麼；長期選擇則會形成你自己的做事方式。")'])assert.ok(app.includes(value),value);
 for(const value of ["テストモード","自動テスト開始","起源の記憶","成長ルート","既知の世界地図","世界地図"])assert.ok(extra.includes(value)||fixed.includes(value)||auto.includes(value),value);
});
