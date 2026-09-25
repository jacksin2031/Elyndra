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
