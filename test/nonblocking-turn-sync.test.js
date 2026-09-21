import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("State Director sync does not lock player controls",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/let gameState=null,aiStatus=.*aiBusy=false,turnSyncBusy=false/);
 assert.match(app,/function setTurnSyncing\(on,label=/);
 assert.match(app,/turnSyncBusy=Boolean\(on\)/);
 const syncStart=app.indexOf("function setTurnSyncing");
 const syncEnd=app.indexOf("function queueForegroundTask",syncStart);
 const syncBlock=app.slice(syncStart,syncEnd);
 assert.doesNotMatch(syncBlock,/\.disabled=/);
 assert.match(app,/free\.disabled=aiBusy\|\|Boolean\(gameState\.combat\?\.active\)/);
 assert.match(app,/狀態同步中，可繼續輸入/);
});

test("actions entered during State Director sync are queued FIFO",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/const foregroundQueue=\[\],MAX_FOREGROUND_QUEUE=3/);
 assert.match(app,/async function drainForegroundQueue\(\)/);
 assert.match(app,/while\(gameState&&foregroundQueue\.length&&!aiBusy&&!turnSyncBusy\)/);
 const start=app.indexOf("async function runAction");
 const end=app.indexOf('$("#newWorldBtn")',start);
 const run=app.slice(start,end);
 assert.match(run,/if\(turnSyncBusy\)\{queueForegroundTask\(\{type:"action",action,customText\}\);return\}/);
 assert.match(app,/async function submitNpcConversation\(npcId,q\).*turnSyncBusy/s);
 assert.match(app,/async function runCombatAction\(action\).*turnSyncBusy/s);
 assert.match(run,/void drainForegroundQueue\(\)/);
});

test("D20 result unlocks controls before State Director finishes",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("async function runAction");
 const end=app.indexOf('$("#newWorldBtn")',start);
 const run=app.slice(start,end);
 const sync=run.indexOf("setTurnSyncing(true");
 const unlock=run.indexOf("setAIThinking(false)",sync);
 const generate=run.indexOf("await generateTurn",sync);
 assert.ok(sync>=0);
 assert.ok(unlock>sync);
 assert.ok(generate>unlock);
 assert.match(run,/await persist\(\);await refresh\(\);\n if\(turnSyncBusy\)setTurnSyncing\(false\)/);
});

test("background world evolution waits for pending turn Canon sync",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/if\(aiBusy\|\|turnSyncBusy\|\|deferredDirector\.running\|\|deferredDirector\.queue\.length\|\|gameState\.combat\?\.active\|\|document\.hidden\)/);
 assert.match(app,/!aiBusy&&!turnSyncBusy\)scheduleWorldEvolution/);
});


test("queued player input records wait diagnostics",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/type:"ACTION_QUEUED"/);
 assert.match(app,/type:"ACTION_QUEUE_DRAINED"/);
 assert.match(app,/waitMs:Math\.max\(0,Date\.now\(\)-Number\(next\.queuedAt/)
});
