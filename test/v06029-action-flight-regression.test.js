import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("v0.60.29 stale Scene cleanup cannot unlock a newer player action flight", () => {
  const finishStart = app.indexOf('function finishPlayerActionFlight');
  const finishEnd = app.indexOf('function setPlayerActionControlsLocked', finishStart);
  const finishBlock = app.slice(finishStart, finishEnd);
  assert.match(finishBlock, /expectedEpoch=null/);
  assert.match(finishBlock, /playerActionFlight\.epoch!==expectedEpoch/);
  assert.match(finishBlock, /PLAYER_ACTION_UNLOCK_STALE_IGNORED/);
  const narrationStart = app.indexOf('function startNonblockingPlayerNarration');
  const narrationEnd = app.indexOf('function removePersistedDeferredTurn', narrationStart);
  const narrationBlock = app.slice(narrationStart, narrationEnd);
  assert.match(narrationBlock, /actionFlightEpoch=null/);
  assert.match(narrationBlock, /finishPlayerActionFlight\(action,ctrl\.signal\.aborted\?"scene_aborted":"scene_settled",actionFlightEpoch\)/);
  assert.match(app, /finishPlayerActionFlight\(playerActionFlight\.label,"global_watchdog",epoch\)/);
  assert.match(app, /startNonblockingPlayerNarration\(\{action:effective,[^\n]+actionFlightEpoch\}\)/);
  assert.match(app, /finishPlayerActionFlight\(effective,ctrl\.signal\.aborted\?"scene_aborted":"scene_settled",actionFlightEpoch\)/);
});

test("v0.60.29 AutoTest waits for the entire foreground action and treats timeout as failure", () => {
  const idleStart = app.indexOf('function autotestForegroundIdle');
  const idleEnd = app.indexOf('function cancelAutotestBackgroundWork', idleStart);
  const idleBlock = app.slice(idleStart, idleEnd);
  assert.match(idleBlock, /!aiBusy&&!turnSyncBusy&&!playerActionFlight\.active&&!nonblockingScene\.controller&&!deferredDirector\.running/);
  assert.match(app, /AUTOTEST_FOREGROUND_STILL_RUNNING/);
  const loopStart = app.indexOf('for(let turn=1;turn<=config.maxTurns;turn++)');
  const loopEnd = app.indexOf('result.status=', loopStart);
  const loopBlock = app.slice(loopStart, loopEnd);
  assert.ok(loopStart >= 0, 'AutoTest turn loop missing');
  assert.ok((loopBlock.match(/if\(!ready\)throw new Error\("AUTOTEST_PLAYER_ACTION_STILL_RUNNING"\)/g)||[]).length >= 2,
    'FIRST_BUTTON must check readiness before and after the action');
  assert.ok((loopBlock.match(/if\(!ready\)throw new Error\("AUTOTEST_FOREGROUND_STILL_RUNNING"\)/g)||[]).length >= 2,
    'AI decision mode must check foreground idle before and after the action');
});

test("v0.60.29 release wiring uses cache token 60029", async () => {
  const [pkg, version, index] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../src/version.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);
  assert.equal(JSON.parse(pkg).version, "0.60.29");
  assert.match(version, /APP_VERSION="0\.60\.29"/);
  assert.match(index, /app\.js\?v=60029/);
  assert.match(index, /\.\/src\/version\.js\?v=60029/);
});
