import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {openingCastChronologyIssues,worldGenerationLinkIssues} from "../src/world-compiler.js";

const anchor={
 startingLocation:"中央祭壇",startingRegion:"核心區",startingSettlement:"銹蝕前哨",
 magicCost:"施術會消耗殘魂並造成感官損耗。",
 currentCrisis:"引擎開始出現自我意識。"
};
const history=[
 {id:"HIST-1",era:"三百年前",title:"初代鐵環建成",summary:"三百年前，第一批共振鐵環工程師完成核心穩定裝置。"},
 {id:"HIST-2",era:"近年",title:"邊境封鎖",summary:"近年因資源不足而開始封鎖。"}
];

test("opening cast rejects a first-hand founder tied to century-old history without a lifespan mechanism",()=>{
 const cast={npcs:[{name:"雙轉零九",historyRefs:["HIST-1"],lore:{story:"他曾是初代共振鐵環的研發工程師，親歷核心啟動。"}}]};
 assert.deepEqual(openingCastChronologyIssues(anchor,history,cast),["CAST_NPC_0_TEMPORAL_PLAUSIBILITY"]);
});

test("opening cast allows descendants or inheritors of old founders",()=>{
 const cast={npcs:[{name:"雙轉零九",historyRefs:["HIST-1"],lore:{story:"他是初代共振鐵環工程師的後代，繼承祖先留下的維修手冊。"}}]};
 assert.deepEqual(openingCastChronologyIssues(anchor,history,cast),[]);
});

test("opening cast rejects first-hand ancient witnesses when only global longevity is grounded",()=>{
 const longLived={...anchor,magicCost:"共振術能延壽，但每十年會永久失去一種感官。"};
 const cast={npcs:[{name:"雙轉零九",historyRefs:["HIST-1"],lore:{story:"他曾是初代共振鐵環的研發工程師。"}}]};
 assert.deepEqual(openingCastChronologyIssues(longLived,history,cast),["CAST_NPC_0_TEMPORAL_PLAUSIBILITY"]);
});

test("opening cast chronology guard ignores unrelated old history not referenced by the NPC",()=>{
 const cast={npcs:[{name:"新任技師",historyRefs:["HIST-2"],lore:{story:"他是目前工坊的初代工程師，負責新設施。"}}]};
 assert.deepEqual(openingCastChronologyIssues(anchor,history,cast),[]);
});

test("world generation link validation promotes chronology contradictions to a Cast pre-canon error",()=>{
 const geography={location:{name:"中央祭壇",region:"核心區"}};
 const society={locationRef:"中央祭壇",historyRefs:["HIST-1"],faction:{name:"鐵環教團",locationName:"中央祭壇",historyRefs:["HIST-1"]}};
 const future={worldTimeline:[]};
 const cast={npcs:[{name:"雙轉零九",role:"工程師",locationName:"中央祭壇",historyRefs:["HIST-1"],lore:{story:"他曾是初代共振鐵環的研發工程師。"}}],sideQuests:[],suggestions:[]};
 const issues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast});
 assert.ok(issues.includes("CAST_NPC_0_TEMPORAL_PLAUSIBILITY"),issues.join(","));
});

test("Opening Cast AI contract prevents century-old founder survival unless chronology is grounded",()=>{
 const client=readFileSync(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/historyRefs 指向百年以上的歷史/);
 assert.match(client,/長壽、延命、休眠、時間停滯/);
 assert.match(client,/後代、傳承者、繼承人、記錄持有人/);
});
