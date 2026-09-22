import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("all player actions keep a single-flight UI lock until their visible result settles",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function setPlayerActionControlsLocked\(locked,reason=/);
 assert.match(app,/const playerActionFlight=\{active:false,label:"",startedAt:0\}/);
 assert.match(app,/beginPlayerActionFlight\(requested\)/);
 assert.match(app,/pending-action-group/);
 assert.match(app,/finishPlayerActionFlight\(action,ctrl\.signal\.aborted\?"scene_aborted":"scene_settled"\)/);
 assert.match(app,/playerActionFlight\.active\|\|Boolean\(gameState\.combat\?\.active\)/)
});

test("blocking State Sync rejects repeated actions without an action queue",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 assert.match(run,/if\(turnSyncBusy\)\{recordDebug\("PLAYER_ACTION_BLOCKED_STATE_SYNC"/);
 assert.match(app,/PLAYER_NPC_ACTION_BLOCKED_STATE_SYNC/);assert.match(app,/PLAYER_COMBAT_ACTION_BLOCKED_STATE_SYNC/);
 assert.doesNotMatch(app,/ACTION_QUEUED/);assert.doesNotMatch(app,/foregroundQueue/);assert.doesNotMatch(app,/queueForegroundTask/)
});

test("ENGINE_ONLY and DEFERRED narration remains async internally but keeps player controls locked",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function startNonblockingPlayerNarration/);assert.match(app,/currentStateRevision\(gameState\)!==revision/);
 assert.match(app,/PLAYER_ACTION_AI_STALE_DISCARDED/);assert.match(app,/preemptNonblockingScene\(\)/);
 assert.match(app,/STATE_SYNC_ENGINE_ONLY/);assert.match(app,/STATE_SYNC_DEFERRED/);
 assert.match(app,/finishPlayerActionFlight\(action,ctrl\.signal\.aborted\?"scene_aborted":"scene_settled"\)/)
});

test("FAST and DEEP commit StatePatch without waiting for Player Action narration",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 const stateAwait=run.indexOf("await stateSyncResult"),commit=run.indexOf("commitStatePatch",stateAwait),sceneContinuation=run.indexOf("void pendingPlayerActionResult.then");
 assert.ok(stateAwait>=0&&commit>stateAwait&&sceneContinuation>commit);assert.doesNotMatch(run,/await playerActionResult/);
 assert.match(run,/playerActionResult=jobs\.playerAction\.then\(/);assert.match(run,/stateSyncResult=jobs\.stateSync\.then\(/);assert.match(run,/STATE_SYNC_AI_COMPLETED/)
});

test("foreground gameplay preempts nonblocking narration Deferred and world background work",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function preemptBackgroundAI\(\)\{preemptNonblockingScene\(\);preemptBackgroundWorldEvolution\(\);preemptBackgroundWorldQuality\(\);preemptBackgroundHistory\(\);preemptDeferredDirector\(\)\}/);
 assert.match(app,/async function runAction\(action,customText="",options=\{\}\)\{\s*if\(!gameState\)return;markForegroundActivity\(\);preemptBackgroundAI\(\)/);
 assert.match(app,/async function submitNpcConversation\(npcId,q\)\{markForegroundActivity\(\);preemptBackgroundAI\(\)/);assert.match(app,/async function runCombatAction\(action\)\{markForegroundActivity\(\);preemptBackgroundAI\(\)/)
});

test("background world evolution waits for Player Action and Deferred work",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/if\(aiBusy\|\|turnSyncBusy\|\|nonblockingScene\.controller\|\|deferredDirector\.running\|\|deferredDirector\.queue\.length\|\|worldQualityBackground\.running\|\|historyBackground\.running\|\|gameState\.combat\?\.active\|\|document\.hidden\)/)
});
