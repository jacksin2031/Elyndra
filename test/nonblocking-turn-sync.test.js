import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("State Sync hard-locks every player action control",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function setPlayerActionControlsLocked\(locked,reason=/);
 assert.match(app,/#choices button,#freeActionForm button,#freeAction,#otherActionBtn,\[data-combat-action\]/);
 assert.match(app,/if\(turnSyncBusy\)\{preemptBackgroundAI\(\);setPlayerActionControlsLocked\(true,"STATE SYNC：完成後即可繼續行動"\)\}/);
 assert.match(app,/free\.disabled=aiBusy\|\|turnSyncBusy\|\|Boolean\(gameState\.combat\?\.active\)/);
 assert.doesNotMatch(app,/狀態同步中，可繼續輸入/)
});

test("State Sync rejects repeated player clicks instead of queueing them",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("async function runAction");
 const end=app.indexOf('$("#newWorldBtn")',start);
 const run=app.slice(start,end);
 assert.match(run,/if\(turnSyncBusy\)\{recordDebug\("PLAYER_ACTION_BLOCKED_STATE_SYNC"/);
 assert.doesNotMatch(run,/turnSyncBusy\)\{queueForegroundTask/);
 assert.match(app,/PLAYER_NPC_ACTION_BLOCKED_STATE_SYNC/);
 assert.match(app,/PLAYER_COMBAT_ACTION_BLOCKED_STATE_SYNC/)
});

test("Player Action AI is awaited before State Sync commit while both start together",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const runStart=app.indexOf("async function runAction");
 const runEnd=app.indexOf('$("#newWorldBtn")',runStart);
 const block=app.slice(runStart,runEnd);
 const playerAwait=block.indexOf("await playerActionResult");
 const stateAwait=block.indexOf("await stateSyncResult");
 const commit=block.indexOf("applyTurnCandidate");
 assert.ok(playerAwait>=0);
 assert.ok(stateAwait>playerAwait);
 assert.ok(commit>stateAwait);
 assert.match(block,/jobs\.playerAction\.then\(/);
 assert.match(block,/jobs\.stateSync\.then\(/);
 assert.match(block,/PLAYER_ACTION_AI_COMPLETED/);
 assert.match(block,/STATE_SYNC_AI_COMPLETED/)
});

test("status badge exposes PLAYER ACTION first then STATE SYNC",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/aiBusy&&turnSyncBusy\)\{badge\.textContent="PLAYER ACTION"/);
 assert.match(app,/else if\(turnSyncBusy\)\{badge\.textContent="STATE SYNC"/);
 assert.match(app,/setTurnSyncing\(true,"State Sync AI/);
 assert.match(app,/setAIThinking\(true,"PLAYER ACTION AI/)
});

test("foreground player work preempts background and background resumes with grace period",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/async function runAction\(action,customText="",options=\{\}\)\{\s*if\(!gameState\)return;preemptBackgroundAI\(\)/);
 assert.match(app,/async function submitNpcConversation\(npcId,q\)\{preemptBackgroundAI\(\)/);
 assert.match(app,/async function runCombatAction\(action\)\{preemptBackgroundAI\(\)/);
 assert.match(app,/scheduleWorldEvolution\(effective\|\|"player_exploration",5000\)/)
});

test("background world evolution waits for both Player Action and State Sync jobs",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/if\(aiBusy\|\|turnSyncBusy\|\|deferredDirector\.running\|\|deferredDirector\.queue\.length\|\|gameState\.combat\?\.active\|\|document\.hidden\)/)
});
