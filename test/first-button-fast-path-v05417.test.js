import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Regression guard: FIRST_BUTTON is a latency benchmark and must not wait for runtime expansion.
test("FIRST_BUTTON fast path never blocks on runtime expansion before visible actions",async()=>{
 const source=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/const firstButtonFast=config\.playStrategy===\"FIRST_BUTTON\"/);
 assert.match(source,/!firstButtonFast&&needsExpansion\(gameState\)\)await expandDeveloperAutotestWorld/);
 assert.match(source,/AUTOTEST_RUNTIME_EXPANSION_SKIPPED/);
 const turnGate='developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON";if(!firstButtonFast&&needsExpansion(gameState))await expandDeveloperAutotestWorld';
 assert.ok(source.includes(turnGate),"turn loop must gate blocking expansion behind non-FIRST_BUTTON strategy");
});
