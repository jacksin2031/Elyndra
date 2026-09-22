import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("only FAST and DEEP State Sync use the global action lock",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function setPlayerActionControlsLocked\(locked,reason=/);
 const engine=app.slice(app.indexOf('if(syncPlan.mode==="ENGINE_ONLY")'),app.indexOf('if(syncPlan.mode==="DEFERRED")'));
 const deferred=app.slice(app.indexOf('if(syncPlan.mode==="DEFERRED")'),app.indexOf("try{",app.indexOf('if(syncPlan.mode==="DEFERRED")')));
 assert.equal(engine.includes("setTurnSyncing(true"),false);assert.equal(deferred.includes("setTurnSyncing(true"),false);
 assert.match(app,/setTurnSyncing\(true,/)
});

test("blocking State Sync rejects repeated actions without an action queue",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 assert.match(run,/if\(turnSyncBusy\)\{recordDebug\("PLAYER_ACTION_BLOCKED_STATE_SYNC"/);
 assert.match(app,/PLAYER_NPC_ACTION_BLOCKED_STATE_SYNC/);assert.match(app,/PLAYER_COMBAT_ACTION_BLOCKED_STATE_SYNC/);
 assert.doesNotMatch(app,/ACTION_QUEUED/);assert.doesNotMatch(app,/foregroundQueue/);assert.doesNotMatch(app,/queueForegroundTask/)
});

test("ENGINE_ONLY and DEFERRED Player Action narration never blocks controls",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function startNonblockingPlayerNarration/);assert.match(app,/currentStateRevision\(gameState\)!==baseRevision/);
 assert.match(app,/PLAYER_ACTION_AI_STALE_DISCARDED/);assert.match(app,/preemptNonblockingScene\(\)/);
 assert.match(app,/STATE_SYNC_ENGINE_ONLY/);assert.match(app,/STATE_SYNC_DEFERRED/)
});

test("FAST and DEEP start Player Action and StatePatch together then commit after Player Action",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 const playerAwait=run.indexOf("await playerActionResult"),stateAwait=run.indexOf("await stateSyncResult"),commit=run.indexOf("commitStatePatch",stateAwait);
 assert.ok(playerAwait>=0&&stateAwait>playerAwait&&commit>stateAwait);
 assert.match(run,/jobs\.playerAction\.then\(/);assert.match(run,/jobs\.stateSync\.then\(/);assert.match(run,/STATE_SYNC_AI_COMPLETED/)
});

test("foreground gameplay preempts nonblocking narration Deferred and world background work",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/function preemptBackgroundAI\(\)\{preemptNonblockingScene\(\);preemptBackgroundWorldEvolution\(\);preemptBackgroundWorldQuality\(\);preemptBackgroundHistory\(\);preemptDeferredDirector\(\)\}/);
 assert.match(app,/async function runAction\(action,customText="",options=\{\}\)\{\s*if\(!gameState\)return;preemptBackgroundAI\(\)/);
 assert.match(app,/async function submitNpcConversation\(npcId,q\)\{preemptBackgroundAI\(\)/);assert.match(app,/async function runCombatAction\(action\)\{preemptBackgroundAI\(\)/)
});

test("background world evolution waits for Player Action and Deferred work",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/if\(aiBusy\|\|turnSyncBusy\|\|nonblockingScene\.controller\|\|deferredDirector\.running\|\|deferredDirector\.queue\.length\|\|worldQualityBackground\.running\|\|historyBackground\.running\|\|gameState\.combat\?\.active\|\|document\.hidden\)/)
});
