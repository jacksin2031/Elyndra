import test from "node:test";
import assert from "node:assert/strict";
import {openingCastFutureIssues,worldGenerationLinkIssues} from "../src/world-compiler.js";

const future={worldTimeline:[{
 id:"TL-1",title:"記憶霾霧滲透",earliestDay:2,latestDay:3,
 directorTruth:"記憶霾霧會滲入中央祭壇，令受侵蝕的變異生物聚集。",
 observableEffect:"祭壇窗外的記憶霾霧變厚，被侵蝕的變異生物開始撞擊防護窗。",
 affectedRegions:["核心區"],links:{historyRefs:["HIST-1"],locationRefs:["中央祭壇"]}
}]};

test("opening cast rejects Day 2+ future events written as already happening on Day 1",()=>{
 const cast={npcs:[{goal:"目前記憶霾霧已經滲入中央祭壇，被侵蝕的變異生物正在撞擊防護窗。"}],sideQuests:[],suggestions:[]};
 assert.deepEqual(openingCastFutureIssues(cast,future),["CAST_FUTURE_0_PREMATURE_CURRENT_STATE"]);
});

test("opening cast allows warnings and preventive goals about scheduled future events",()=>{
 const cast={npcs:[{goal:"擔心記憶霾霧可能滲入中央祭壇，因此準備阻止變異生物靠近防護窗。"}],sideQuests:[],suggestions:[]};
 assert.deepEqual(openingCastFutureIssues(cast,future),[]);
});

test("opening cast future guard ignores events explicitly allowed from Day 1",()=>{
 const dayOne={worldTimeline:[{...future.worldTimeline[0],earliestDay:1}]};
 const cast={npcs:[{goal:"目前記憶霾霧已經滲入中央祭壇，被侵蝕的變異生物正在撞擊防護窗。"}],sideQuests:[],suggestions:[]};
 assert.deepEqual(openingCastFutureIssues(cast,dayOne),[]);
});

test("world generation link validation includes premature cast chronology errors",()=>{
 const anchor={startingLocation:"中央祭壇",startingRegion:"核心區",startingSettlement:"銹蝕前哨"};
 const history=[{id:"HIST-1"}];
 const geography={location:{name:"中央祭壇",region:"核心區"}};
 const society={locationRef:"中央祭壇",historyRefs:["HIST-1"],faction:{name:"鐵環教團",locationName:"中央祭壇",historyRefs:["HIST-1"]}};
 const cast={npcs:[{name:"守窗人",role:"祭壇守衛",locationName:"中央祭壇",historyRefs:["HIST-1"],goal:"目前記憶霾霧已經滲入中央祭壇，被侵蝕的變異生物正在撞擊防護窗。"}],sideQuests:[],suggestions:[]};
 const issues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast});
 assert.ok(issues.includes("CAST_FUTURE_0_PREMATURE_CURRENT_STATE"),issues.join(","));
});
