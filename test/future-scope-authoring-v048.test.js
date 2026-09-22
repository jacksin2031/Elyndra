import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createTimelinePacing,timelineAuthoringSlots,bindTimelineAuthoringSlots,normalizeWorldTimeline} from "../src/world-timeline.js";
import {registerTimelineFutures,futureSnapshot} from "../src/future-engine.js";
import {normalizeFutureLinksToAnchor,worldGenerationLinkIssues} from "../src/world-compiler.js";
import {applyWorldRepairPatch} from "../src/world-quality.js";

function authoredTimeline(){
 const pacing=createTimelinePacing(12),slots=timelineAuthoringSlots(pacing);
 const rows=slots.map((slot,i)=>({
  slot:slot.slot,title:"事件"+(i+1),category:i===0?"WAR":"MIGRATION",directorTruth:"隱藏原因"+i,observableEffect:"可觀察影響"+i,pressure:5+i,
  impactScope:i===0?"NATIONAL":"REGIONAL",affectedRegions:["STARTING_REGION"],intensity:60+i,duration:4+i,
  domains:i===0?["SECURITY","FACTION","TRAVEL"]:["MIGRATION","ECONOMY"],
  activationConditions:["DAY>=2"],cancelConditions:[],escalationConditions:[],
  playerCanPrevent:true,playerCanAccelerate:i!==1,playerCanMitigate:true,playerCanRedirect:i===0,
  links:{historyRefs:["HIST-1"],locationRefs:["STARTING_REGION"]}
 }));
 return {pacing,timeline:normalizeWorldTimeline(bindTimelineAuthoringSlots(rows,pacing),pacing)}
}

test("World Timeline preserves authored Future scope metadata",()=>{
 const {timeline}=authoredTimeline(),first=timeline[0],second=timeline[1];
 assert.equal(first.impactScope,"NATIONAL");assert.deepEqual(first.affectedRegions,["STARTING_REGION"]);
 assert.equal(first.intensity,60);assert.equal(first.duration,4);assert.deepEqual(first.domains,["SECURITY","FACTION","TRAVEL"]);
 assert.equal(first.playerCanMitigate,true);assert.equal(first.playerCanRedirect,true);
 assert.equal(second.playerCanAccelerate,false);assert.equal(second.playerCanRedirect,false)
});

test("invalid scope normalizes safely while keeping a usable domain and intensity",()=>{
 const pacing=createTimelinePacing(6),slots=timelineAuthoringSlots(pacing);
 const rows=slots.map((slot,i)=>({slot:slot.slot,title:"E"+i,directorTruth:"D"+i,observableEffect:"O"+i,pressure:3,impactScope:"GALACTIC",intensity:999,domains:[],links:{historyRefs:["HIST-1"],locationRefs:["STARTING_REGION"]}}));
 const timeline=normalizeWorldTimeline(bindTimelineAuthoringSlots(rows,pacing),pacing);
 assert.equal(timeline[0].impactScope,"REGIONAL");assert.equal(timeline[0].intensity,100);assert.deepEqual(timeline[0].domains,["SECURITY"])
});

test("Anchor normalization prevents Future scope from inventing opening regions",()=>{
 const {timeline}=authoredTimeline(),future={worldTimeline:structuredClone(timeline)};
 future.worldTimeline[0].affectedRegions=["不存在地區","STARTING_REGION"];
 const normalized=normalizeFutureLinksToAnchor(future,{startingLocation:"門城",startingSettlement:"門城聚落",startingRegion:"北境"},[{id:"HIST-1"}]);
 assert.deepEqual(normalized.worldTimeline[0].affectedRegions,["北境"]);
 assert.deepEqual(normalized.worldTimeline[0].links.locationRefs,["北境"]);
 const issues=worldGenerationLinkIssues({anchor:{startingLocation:"門城",startingSettlement:"門城聚落",startingRegion:"北境"},history:[{id:"HIST-1"}],geography:{location:{name:"門城",region:"北境"}},society:{locationRef:"門城",historyRefs:["HIST-1"]},future:normalized});
 assert.equal(issues.some(x=>x.includes("AFFECTED_REGION_INVALID")),false)
});

test("Timeline registration preserves scope metadata into Future Engine",()=>{
 const {timeline}=authoredTimeline(),state={knowledge:[],events:[],world:{state:{day:1},timeline,futures:[]}};
 registerTimelineFutures(state);const f=futureSnapshot(state,{director:true})[0];
 assert.equal(f.impactScope,"NATIONAL");assert.deepEqual(f.affectedRegions,["STARTING_REGION"]);assert.equal(f.intensity,60);assert.equal(f.duration,4);
 assert.deepEqual(f.domains,["SECURITY","FACTION","TRAVEL"]);assert.equal(f.playerCanMitigate,true);assert.equal(f.playerCanRedirect,true)
});

test("Quality repair cannot rewrite Canonized Future scope metadata",()=>{
 const {timeline}=authoredTimeline(),base={worldTimeline:structuredClone(timeline)};
 const patch={worldTimeline:timeline.map(x=>({...x,title:"可修描述",impactScope:"WORLD",affectedRegions:["偷改區域"],intensity:1,duration:99,domains:["MAGIC"],playerCanPrevent:false,playerCanAccelerate:false,playerCanMitigate:false,playerCanRedirect:false}))};
 const repaired=applyWorldRepairPatch(base,patch),before=timeline[0],after=repaired.worldTimeline[0];
 assert.equal(after.title,"可修描述");assert.equal(after.impactScope,before.impactScope);assert.deepEqual(after.affectedRegions,before.affectedRegions);
 assert.equal(after.intensity,before.intensity);assert.equal(after.duration,before.duration);assert.deepEqual(after.domains,before.domains);
 assert.equal(after.playerCanPrevent,before.playerCanPrevent);assert.equal(after.playerCanAccelerate,before.playerCanAccelerate);assert.equal(after.playerCanMitigate,before.playerCanMitigate);assert.equal(after.playerCanRedirect,before.playerCanRedirect)
});

test("AI authoring contracts include complete Future scope fields in direct and server modes",async()=>{
 const [client,api,quality,futureEngine]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/world.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),readFile(new URL("../src/future-engine.js",import.meta.url),"utf8")
 ]);
 for(const source of [client,api]){assert.match(source,/impactScope/);assert.match(source,/affectedRegions/);assert.match(source,/playerCanMitigate/);assert.match(source,/playerCanRedirect/)}
 assert.match(client,/不可全部填成同一值/);assert.match(api,/不可把全部事件都填成相同 Scope 或 Domain/);
 assert.match(quality,/playerCanMitigate/);assert.match(quality,/playerCanRedirect/);
 assert.doesNotMatch(futureEngine,/impactScope:"REGIONAL",intensity:Math\.min/);
 assert.match(futureEngine,/impactScope:row\.impactScope\|\|"REGIONAL"/)
});
