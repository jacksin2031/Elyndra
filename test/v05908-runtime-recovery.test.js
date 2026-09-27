import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {bindTimelineAuthoringSlots,createTimelinePacing,validateWorldTimeline} from "../src/world-timeline.js";

const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("v0.59.8 FIRST_BUTTON recovery never invents targetless TRAVEL",async()=>{
 const src=await read("../src/ai-autotest.js");
 assert.doesNotMatch(src,/kind:\"TRAVEL\",targetId:null,progression:true/);
 assert.match(src,/repeatedAutotestAction/);
 assert.match(src,/eventCount:list\(state\.events\)\.length/);
 assert.match(src,/totalMinutes:Number\(clock\.totalMinutes\)\|\|0/);
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

test("v0.59.8 deterministic origin background is localized before runtime translation",async()=>{
 const src=await read("../src/world-creation.js");
 assert.match(src,/originBackgroundText/);
 assert.match(src,/具体的な身分、開始位置、因果関係/);
 assert.match(src,/Specific identity, starting location, and causality/);
});
