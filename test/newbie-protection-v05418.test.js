import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createTimelinePacing,normalizeWorldTimeline,triggerDueTimelineEvents} from "../src/world-timeline.js";
import {eventDangerProfile,eventDangerTier,eventAllowedByPacing,pacedTimelinePressure} from "../src/world-pacing.js";
import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";

function state(day=1,danger=5){
 const pacing=createTimelinePacing(15);
 return {world:{seedContract:{danger},timelinePacing:pacing,state:{day,clock:{day,hour:8,minute:0,totalMinutes:(day-1)*1440},flags:{}},timeline:[]},player:{location:"起點"},knowledge:[],events:[]}
}

test("newbie protection caps world-driven danger on day 1 and ramps upward",()=>{
 const s=state(1,5),d1=eventDangerProfile(s);assert.equal(d1.newbieProtection,true);assert.equal(d1.maxDanger,1);assert.equal(d1.pressureCap,3);
 s.world.state.day=2;const d2=eventDangerProfile(s);assert.ok(d2.maxDanger>=1&&d2.maxDanger<=2);
 s.world.state.day=Math.max(3,s.world.timelinePacing.phases.middle.fromDay);const mid=eventDangerProfile(s);assert.ok(mid.maxDanger>=d2.maxDanger);
 s.world.state.day=s.world.timelinePacing.horizonDays;const late=eventDangerProfile(s);assert.equal(late.maxDanger,5)
});

test("high-danger timeline events wait until the danger curve allows them",()=>{
 const s=state(2,5),p=s.world.timelinePacing;
 const event=normalizeWorldTimeline([{title:"王都全面戰爭",category:"WAR",directorTruth:"兩軍準備全面交戰並波及整個國家。",observableEffect:"大批軍隊封鎖道路並開始攻城。",pressure:15,intensity:85,impactScope:"NATIONAL",activationConditions:["DAY>=2"],cancelConditions:[]}],{...p,majorEventCount:1})[0];
 event.triggerDay=2;event.baseTriggerDay=2;s.world.timeline=[event];
 assert.ok(eventDangerTier(event)>=4);assert.equal(eventAllowedByPacing(s,event),false);assert.equal(triggerDueTimelineEvents(s),null);assert.equal(event.status,"SCHEDULED");
 s.world.state.day=p.horizonDays;assert.equal(eventAllowedByPacing(s,event),true);assert.equal(triggerDueTimelineEvents(s)?.id,event.id)
});

test("negative cancel authoring is normalized into a positive cancellation condition",()=>{
 const p=createTimelinePacing(15),event=normalizeWorldTimeline([{title:"儀式潰散",directorTruth:"地下節點正在逐步失衡並可能引發儀式反噬。",observableEffect:"儀式場地面持續出現可感知的不穩定震動。",cancelConditions:["NOT:EVENT:RITUAL_REPAIR","NOT:FLAG:temple_retreat"]}],{...p,majorEventCount:1})[0];
 assert.deepEqual(event.cancelConditions,["EVENT:RITUAL_REPAIR","FLAG:temple_retreat"])
});

test("timeline cancellation is not evaluated before its earliest day",()=>{
 const s=state(1,5),p=s.world.timelinePacing,event=normalizeWorldTimeline([{title:"邊境騷動",directorTruth:"邊境地方衝突正在累積並可能擴大成公開對立。",observableEffect:"道路巡查與臨時檢查開始明顯增加。",earliestDay:2,latestDay:4,cancelConditions:["EVENT:PEACE_TREATY"]}],{...p,majorEventCount:1})[0];
 s.world.timeline=[event];s.events.push({type:"PEACE_TREATY"});triggerDueTimelineEvents(s);assert.equal(event.status,"SCHEDULED");
 s.world.state.day=2;triggerDueTimelineEvents(s);assert.equal(event.status,"CANCELLED")
});

test("SOCIAL/TALK actions bypass local lore fast path",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/const socialAction=assessment\?\.intent==="TALK"\|\|assessment\?\.kind==="SOCIAL"/);
 assert.match(app,/if\(!socialAction\)\{\s*const localLore=resolveLocalLoreAction/)
});

test("scene narrator keeps untriggered futures out of the opening scene",()=>{
 assert.match(sceneNarratorSystem(),/未觸發的 timeline／future/);assert.match(sceneNarratorSystem(),/新手期/)
});

test("early timeline pressure is capped by the same danger profile",()=>{
 const s=state(1,5);assert.ok(pacedTimelinePressure(s,20)<=3);s.world.state.day=s.world.timelinePacing.horizonDays;assert.ok(pacedTimelinePressure(s,20)>3)
});

test("non-contextual lexical anomalies are covered by fallback quality review",async()=>{
 const source=await readFile(new URL("../src/world-quality.js",import.meta.url),"utf8");assert.match(source,/LEXICAL_SANITY/);assert.match(source,/凝液、髓液、結晶液/)
});
