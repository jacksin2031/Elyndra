import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// FIRST_BUTTON is a latency benchmark: visible controls, not background AI idleness, define readiness.
test("FIRST_BUTTON runner config preserves selected strategy",async()=>{
 const source=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/autotestExportSelection,autotestPlayStrategy/);
 assert.match(source,/playStrategy:autotestPlayStrategy\(\)/);
 assert.match(source,/const firstButtonFast=config\.playStrategy===\"FIRST_BUTTON\"/);
 assert.match(source,/AUTOTEST_RUNTIME_EXPANSION_SKIPPED/);
});

test("FIRST_BUTTON waits for visible action readiness, not whole background idle",async()=>{
 const source=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/async function waitForAutotestActionReady\(timeoutMs=38000\)/);
 assert.match(source,/if\(!playerActionFlight\.active\)return true/);
 assert.match(source,/AUTOTEST_ACTION_READY_TIMEOUT/);
 assert.match(source,/if\(firstButtonFast\)await waitForAutotestActionReady\(config\.disableTimeout===true\?90000:38000\);else await waitForAutotestIdle/);
});

test("FIRST_BUTTON initial and per-turn expansion paths are nonblocking",async()=>{
 const source=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/config\.mode!==\"worlds\"&&!firstButtonFast&&needsExpansion\(gameState\)\)await expandDeveloperAutotestWorld/);
 assert.match(source,/!firstButtonFast&&needsExpansion\(gameState\)\)await expandDeveloperAutotestWorld/);
 const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/app\.js\?v=54019/);
});