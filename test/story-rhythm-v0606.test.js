import test from "node:test";
import assert from "node:assert/strict";
import {ensureStoryRhythm,rhythmSuggestionBias,storyRhythmSnapshot,syncStoryRhythm} from "../src/story-rhythm-engine.js";
import {newGame} from "../src/world-engine.js";

const seed={playerName:"節奏測試者",worldviewMode:"style",genre:"奇幻",scale:"小型",danger:3,magic:3,politics:2,playHours:8,prompt:"story rhythm v0606"};
function state(){const s=newGame(seed);s.events??=[];return s}
function push(s,type,summary,extra={}){const e={id:crypto.randomUUID(),type,visibility:"PLAYER_KNOWN",summary,day:s.world?.state?.day||1,at:Date.now(),...extra};s.events.push(e);return e}

test("Story Rhythm starts at the current event cursor and never replays old-save history",()=>{
 const s=state();push(s,"PLAYER_ACTION","你檢查了舊井旁的痕跡。",{customText:"檢查舊井"});ensureStoryRhythm(s);const before=storyRhythmSnapshot(s,{sync:false});assert.equal(before.recent.length,0);
 syncStoryRhythm(s);assert.equal(storyRhythmSnapshot(s,{sync:false}).recent.length,0);
 push(s,"NPC_CONVERSATION","你向守門人詢問昨晚的鐘聲。",{npcId:"NPC-GATE"});syncStoryRhythm(s);const after=storyRhythmSnapshot(s,{sync:false});assert.equal(after.recent.length,1);assert.equal(after.recent[0].mode,"SOCIAL")
});

test("Rhythm classification records player-facing modes without ingesting INTERNAL telemetry",()=>{
 const s=state();ensureStoryRhythm(s);push(s,"PLAYER_ACTION","你沿著河岸追查失蹤者留下的腳印。",{customText:"追查腳印"});push(s,"NPC_CLUE_CONFIRMED","漁夫確認失蹤者昨晚曾經過舊橋。",{npcId:"NPC-FISHER"});s.events.push({id:crypto.randomUUID(),type:"STATE_SYNC_PLAN",visibility:"INTERNAL",summary:"internal",day:1,at:Date.now()});push(s,"QUEST_COMPLETED","你把救回的孩子帶回家人身邊。");syncStoryRhythm(s);const snap=storyRhythmSnapshot(s,{sync:false});assert.deepEqual(snap.recent.map(x=>x.mode),["MYSTERY","SOCIAL","PAYOFF"]);assert.deepEqual(snap.recent.map(x=>x.narrativeFunction),["MYSTERY_PROGRESS","MYSTERY_PROGRESS","PAYOFF"]);assert.equal(snap.recent.some(x=>x.eventType==="STATE_SYNC_PLAN"),false)
});

test("three same-mode beats produce a soft DIVERSIFY directive instead of blocking the mode",()=>{
 const s=state();ensureStoryRhythm(s);for(let i=0;i<3;i++)push(s,"NPC_CONVERSATION",`你與守衛進行第 ${i+1} 輪交談。`,{npcId:"NPC-GATE"});syncStoryRhythm(s);const d=storyRhythmSnapshot(s,{sync:false}).directive;assert.equal(d.mode,"DIVERSIFY");assert.equal(d.avoid.includes("SOCIAL"),true);assert.ok(rhythmSuggestionBias(s,{kind:"SOCIAL",action:"繼續詢問守衛"})<rhythmSuggestionBias(s,{kind:"OBSERVE",action:"檢查城門旁的新痕跡"}))
});

test("sustained tension asks for RELEASE and favors downtime without mutating world danger",()=>{
 const s=state();ensureStoryRhythm(s);const dangerBefore=s.world?.seedContract?.danger;
 for(let i=0;i<4;i++)push(s,"WORLD_CONSEQUENCE",`危機第 ${i+1} 波逼近，追兵與爆炸令局勢更危險。`);syncStoryRhythm(s);const snap=storyRhythmSnapshot(s,{sync:false});assert.ok(snap.tension>=72);assert.equal(snap.directive.mode,"RELEASE");assert.equal(snap.directive.favor.includes("DOWNTIME"),true);assert.equal(snap.directive.avoid.includes("COMBAT"),true);assert.equal(s.world?.seedContract?.danger,dangerBefore)
});

test("progress without payoff accumulates debt and eventually requests PAYOFF",()=>{
 const s=state();ensureStoryRhythm(s);for(let i=0;i<4;i++)push(s,"NPC_CLUE_CONFIRMED",`第 ${i+1} 條線索讓案件向前推進。`,{npcId:"NPC-WITNESS"});syncStoryRhythm(s);let snap=storyRhythmSnapshot(s,{sync:false});assert.equal(snap.progressDebt,4);assert.equal(snap.directive.mode,"PAYOFF");
 push(s,"PLAYER_DRIVE_FULFILLED","你終於確認失蹤者平安，這段追尋告一段落。",{driveId:"DRV-1"});syncStoryRhythm(s);snap=storyRhythmSnapshot(s,{sync:false});assert.equal(snap.progressDebt,0);assert.equal(snap.recent.at(-1).mode,"PAYOFF")
});

test("scene sequence session arc and campaign counters advance through deterministic boundaries",()=>{
 const s=state();ensureStoryRhythm(s);for(let i=0;i<3;i++)push(s,"PLAYER_ACTION",`你在遺跡探索第 ${i+1} 處可見痕跡。`,{customText:"探索遺跡"});push(s,"NPC_CONVERSATION","你停下來向嚮導確認路線。",{npcId:"NPC-GUIDE"});syncStoryRhythm(s);let snap=storyRhythmSnapshot(s,{sync:false});assert.ok(snap.hierarchy.scene.index>=2);assert.ok(snap.hierarchy.sequence.sceneCount>=1);
 push(s,"SESSION_CHECKPOINT","旅程小結：你們在營火旁停下來整理今天的發現。",{reason:"停下來休息"});syncStoryRhythm(s);snap=storyRhythmSnapshot(s,{sync:false});assert.ok(snap.hierarchy.session.index>=2);assert.ok(snap.hierarchy.campaign.sceneCount>=1);assert.ok(snap.hierarchy.campaign.beatCount>=5)
});

test("rhythm bias never turns into an action permission or requirement bypass",()=>{
 const s=state();ensureStoryRhythm(s);for(let i=0;i<3;i++)push(s,"NPC_CONVERSATION",`交談 ${i+1}`,{npcId:"NPC-A"});syncStoryRhythm(s);const row={kind:"TRAVEL",action:"前往不存在的秘密城市",requirementsSatisfied:false};const score=rhythmSuggestionBias(s,row);assert.equal(typeof score,"number");assert.equal(row.requirementsSatisfied,false);assert.equal(row.prevalidated,undefined)
});
