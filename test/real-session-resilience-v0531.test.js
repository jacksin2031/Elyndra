import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.53.1 lets core world compiler retry once after parallel provider timeouts",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/CORE_TIMEOUT_RETRY=new Set\(\["CORE_RULES","CORE_ANCHOR"\]\)/);
 assert.match(client,/allowCoreTimeoutRetry=timedOut&&CORE_TIMEOUT_RETRY\.has\(stage\)/);
 assert.match(client,/noteGenerationSuccess\(\)/);
 assert.match(client,/circuit\.timeoutCount=0;circuit\.timeoutStages=\[\];circuit\.transportCount=0;circuit\.transportStages=\[\];circuit\.coreFailureStages=\[\];circuit\.open=false/);
 assert.match(client,/Math\.min\(35000,Number\(args\.timeoutMs\)/)
});

test("v0.53.1 local fallback never invents a confirmed discovery from dice success alone",async()=>{
 const game=await readFile(new URL("../src/game-engine.js",import.meta.url),"utf8");
 assert.doesNotMatch(game,/並取得可以直接確認的進展/);
 assert.match(game,/是否出現新的可確認資訊，仍以實際觀察與世界狀態為準/)
});

test("v0.53.1 contextual fallback remembers recently executed actions",async()=>{
 const actions=await readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8");
 assert.match(actions,/function recentPlayerActions/);
 assert.match(actions,/PROGRESSION_EVENT_TYPES\.has/);
 assert.match(actions,/isFresh=x=>freshSuggestion\(recent,x\)/)
});

test("v0.53.1 debug bundle separates current-session summary from retained history",async()=>{
 const debug=await readFile(new URL("../src/debug-telemetry.js",import.meta.url),"utf8");
 assert.match(debug,/currentEntries=entries\.filter\(x=>x\.sessionId===SESSION_ID\)/);
 assert.match(debug,/historyEntryCount:entries\.length/)
});
