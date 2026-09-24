import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.54.19 FIRST_BUTTON stall recovery bypasses only the generic expansion gate",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/pending=pendingRuntimeGenerationPlan\(state\),force=options\?\.force===true/);
 assert.match(app,/\(!force&&!needsExpansion\(state\)&&!pending\)/);
 assert.match(app,/const forcedRecovery=reason==="FIRST_BUTTON_STALL_RECOVERY"/);
 assert.match(app,/\(!forcedRecovery&&!needsExpansion\(gameState\)\)/);
 assert.match(app,/expandDeveloperAutotestWorld\(reason,\{background:true,signal:ctrl\.signal,force:forcedRecovery\}\)/);
});

test("v0.54.19 computes FIRST_BUTTON stalls even when needsExpansion is false",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/else if\(firstButtonFast\)\{const stall=autotestRecentStallCount\(recentActions\),expansionNeeded=needsExpansion\(gameState\)/);
 assert.match(app,/if\(stall>=3\)firstButtonExpansionReason="FIRST_BUTTON_STALL_RECOVERY"/);
 assert.match(app,/else if\(expansionNeeded&&sparseWorld\)firstButtonExpansionReason="FIRST_BUTTON_SPARSE_WORLD"/);
 assert.doesNotMatch(app,/else if\(firstButtonFast&&needsExpansion\(gameState\)\)/);
});
