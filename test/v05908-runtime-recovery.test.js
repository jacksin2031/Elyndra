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

test("v0.59.8 autotest fingerprint counts time and event progress",()=>{
 const base={world:{id:"W",state:{clock:{totalMinutes:10}},registry:{npcs:[],locations:[],sideQuests:[]}},player:{location:"L",hp:10,status:"OK",level:1,xp:0,knowledgeScore:0},quests:{main:{stage:0,status:"ACTIVE",objectives:[]}},inventory:[],knowledge:[],events:[],discoveries:0,combat:{active:false}};
 const timeMoved=structuredClone(base);timeMoved.world.state.clock.totalMinutes=20;
 const eventMoved=structuredClone(base);eventMoved.events.push({type:"TICK"});
 assert.notEqual(autotestStateFingerprint(base),autotestStateFingerprint(timeMoved));
 assert.notEqual(autotestStateFingerprint(base),autotestStateFingerprint(eventMoved));
});

test("v0.59.8 timeline authoring fills a single malformed or omitted AI slot",()=>{
 const pacing=createTimelinePacing(15);
 const base={title:"事件",directorTruth:"這是一段足夠長的隱藏因果內容",observableEffect:"這是一段足夠長的可觀察影響內容",links:{historyRefs:["HIST-1"],locationRefs:["STARTING_REGION"]},affectedRegions:["R1"],domains:["SECURITY"]};
 const input=Array.from({length:pacing.majorEventCount-1},(_,i)=>({...base,title:`事件 ${i+1}`}));
 const bound=bindTimelineAuthoringSlots(input,pacing);
 assert.equal(bound.length,pacing.majorEventCount);
 const report=validateWorldTimeline(bound,pacing);
 assert.equal(report.errors.includes("WORLD_TIMELINE_EVENT_COUNT_MISMATCH"),false);
 assert.equal(report.valid,true);
});

test("v0.59.8 Agnes keeps enough FUTURE output and waits through normal critical cooldown",async()=>{
 const src=await read("../src/ai-settings.js");
 assert.match(src,/future:4096/);
 assert.match(src,/PLAYER_CRITICAL_BACKPRESSURE_MAX_MS=20000/);
});
