import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.54.19 FIRST_BUTTON stall recovery bypasses only the generic expansion gate",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/pending=pendingRuntimeGenerationPlan\(state\),force=options\?\.force===true/);
 assert.match(app,/\(!force&&!needsExpansion\(state\)&&!pending\)/);
 assert.match(app,/const forcedRecovery=\/STALL_RECOVERY\/\.test\(String\(reason\|\|""\)\)/);
 assert.match(app,/\(!forcedRecovery&&!needsExpansion\(gameState\)\)/);
 assert.match(app,/expandDeveloperAutotestWorld\(reason,\{background:true,signal:ctrl\.signal,force:forcedRecovery\}\)/);
});

test("v0.54.19 computes FIRST_BUTTON stalls even when needsExpansion is false",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/const firstButtonFast=config\.playStrategy==="FIRST_BUTTON",stall=autotestRecentStallCount\(recentActions\),expansionNeeded=needsExpansion\(gameState\)/);
 assert.match(app,/if\(stall>=3\)expansionReason=firstButtonFast\?"FIRST_BUTTON_STALL_RECOVERY":"AUTOTEST_STALL_RECOVERY"/);
 assert.match(app,/else if\(expansionNeeded&&\(firstButtonFast\?sparseWorld:true\)\)expansionReason=firstButtonFast\?"FIRST_BUTTON_SPARSE_WORLD":"WORLD_EDGE_UNDERDEFINED"/);
 assert.doesNotMatch(app,/else if\(firstButtonFast&&needsExpansion\(gameState\)\)/);
});


test("sparse stalled worlds settle generation before selecting the next action",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf('developerAutotest.turn=turn;const firstButtonFast=');
 const decision=app.indexOf('const decision=await decideAutotestAction(gameState',start);
 const recovery=app.indexOf('await expandDeveloperAutotestWorld(expansionReason,{force:true})',start);
 assert.ok(start>=0&&recovery>start&&decision>recovery);
 assert.match(app.slice(start,decision),/firstButtonFast&&sparseWorld/);
 assert.doesNotMatch(app.slice(start,decision),/Date\\.now\\(\\)>=Number\\(autotestRuntimeExpansion\\.cooldownUntil/);
});


test("high-politics opening recovers missing Society faction before world validation",async()=>{
 const ai=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const fallback=ai.indexOf('if(politics>=4&&!String(society?.faction?.name||"").trim())');
 const merge=ai.indexOf('let region=mergeOpeningRegion(anchor,geography,society)',fallback);
 assert.ok(fallback>=0&&merge>fallback);
 assert.match(ai.slice(fallback,merge),/society=societyFallback\\(anchor,history,geography\\)/);
});
