import {readFile,writeFile} from "node:fs/promises";

async function text(path){return readFile(path,"utf8")}
async function save(path,value){await writeFile(path,value,"utf8")}
function replaceRequired(source,oldValue,newValue,label=oldValue){
  if(!source.includes(oldValue))throw new Error(`MISSING_REPLACEMENT:${label}`);
  return source.replaceAll(oldValue,newValue);
}

let app=await text("app.js");
app=replaceRequired(app,
  'finishPlayerActionFlight(playerActionFlight.label,"global_watchdog")',
  'finishPlayerActionFlight(playerActionFlight.label,"global_watchdog",epoch)',
  "watchdog epoch ownership");
app=replaceRequired(app,
  'function finishPlayerActionFlight(action="",reason="completed"){\n if(!playerActionFlight.active)return;clearTimeout(playerActionFlight.watchdog);playerActionFlight.watchdog=0;',
  'function finishPlayerActionFlight(action="",reason="completed",expectedEpoch=null){\n if(expectedEpoch!=null&&playerActionFlight.epoch!==expectedEpoch){recordDebug("PLAYER_ACTION_UNLOCK_STALE_IGNORED",{action:String(action||"").slice(0,240),reason,expectedEpoch,currentEpoch:playerActionFlight.epoch,active:playerActionFlight.active});return false}\n if(!playerActionFlight.active)return false;clearTimeout(playerActionFlight.watchdog);playerActionFlight.watchdog=0;',
  "epoch-aware finishPlayerActionFlight");
app=replaceRequired(app,
  ' setPlayerActionControlsLocked(aiBusy||turnSyncBusy,aiBusy?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");updateAIStatusBadge()\n}',
  ' setPlayerActionControlsLocked(aiBusy||turnSyncBusy,aiBusy?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");updateAIStatusBadge();return true\n}',
  "finish return value");
app=replaceRequired(app,
  'function startNonblockingPlayerNarration({action,roll,snapshot,plan,intent,previousSuggestions,previousSuggestionIntents,startedAt,state=gameState,sessionToken=captureStateSession()}){',
  'function startNonblockingPlayerNarration({action,roll,snapshot,plan,intent,previousSuggestions,previousSuggestionIntents,startedAt,state=gameState,sessionToken=captureStateSession(),actionFlightEpoch=null}){',
  "scene flight epoch");
app=replaceRequired(app,
  'finishPlayerActionFlight(action,ctrl.signal.aborted?"scene_aborted":"scene_settled");updateAIStatusBadge();if(gameState)void refresh()',
  'finishPlayerActionFlight(action,ctrl.signal.aborted?"scene_aborted":"scene_settled",actionFlightEpoch);updateAIStatusBadge();if(gameState)void refresh()',
  "nonblocking scene guarded unlock");
for(const [oldValue,newValue,label] of [
  ['finishPlayerActionFlight(requested,"no_provider");','finishPlayerActionFlight(requested,"no_provider",actionFlightEpoch);',"no-provider unlock"],
  ['finishPlayerActionFlight(requested,"assessment_failed");','finishPlayerActionFlight(requested,"assessment_failed",actionFlightEpoch);',"assessment unlock"],
  ['finishPlayerActionFlight(effective,"local_engine");','finishPlayerActionFlight(effective,"local_engine",actionFlightEpoch);',"local unlock"],
  ['finishPlayerActionFlight(effective,actionResult.blocked?"blocked":"deterministic");','finishPlayerActionFlight(effective,actionResult.blocked?"blocked":"deterministic",actionFlightEpoch);',"deterministic unlock"],
  ['finishPlayerActionFlight(effective,"no_provider_scene");','finishPlayerActionFlight(effective,"no_provider_scene",actionFlightEpoch);',"scene no-provider unlock"],
  ['finishPlayerActionFlight(effective,"scene_deadline_fallback");','finishPlayerActionFlight(effective,"scene_deadline_fallback",actionFlightEpoch);',"scene deadline unlock"],
  ['finishPlayerActionFlight(effective,ctrl.signal.aborted?"scene_aborted":"scene_settled");','finishPlayerActionFlight(effective,ctrl.signal.aborted?"scene_aborted":"scene_settled",actionFlightEpoch);',"foreground scene guarded unlock"],
  ['finishPlayerActionFlight(effective,rateLimitFastFallback?"rate_limit_fallback":"scene_unavailable");','finishPlayerActionFlight(effective,rateLimitFastFallback?"rate_limit_fallback":"scene_unavailable",actionFlightEpoch);',"scene unavailable unlock"],
]) app=replaceRequired(app,oldValue,newValue,label);
app=replaceRequired(app,
  'startNonblockingPlayerNarration({action:effective,roll,snapshot:turnSnapshot,plan:syncPlan,intent:assessment?.actionIntent,previousSuggestions,previousSuggestionIntents,startedAt:debugTurnStarted,state:actionState,sessionToken:actionSession});',
  'startNonblockingPlayerNarration({action:effective,roll,snapshot:turnSnapshot,plan:syncPlan,intent:assessment?.actionIntent,previousSuggestions,previousSuggestionIntents,startedAt:debugTurnStarted,state:actionState,sessionToken:actionSession,actionFlightEpoch});',
  "handoff epoch");
app=replaceRequired(app,
  'function autotestForegroundIdle(){return !aiBusy&&!turnSyncBusy&&!nonblockingScene.controller&&!deferredDirector.running}',
  'function autotestForegroundIdle(){return !aiBusy&&!turnSyncBusy&&!playerActionFlight.active&&!nonblockingScene.controller&&!deferredDirector.running}',
  "AutoTest foreground barrier");
app=replaceRequired(app,
  'if(firstButtonFast){const ready=await waitForAutotestActionReady(config.disableTimeout===true?90000:38000);if(!ready)throw new Error("AUTOTEST_PLAYER_ACTION_STILL_RUNNING")}else await waitForAutotestIdle();',
  'if(firstButtonFast){const ready=await waitForAutotestActionReady(config.disableTimeout===true?90000:38000);if(!ready)throw new Error("AUTOTEST_PLAYER_ACTION_STILL_RUNNING")}else{const ready=await waitForAutotestIdle(config.disableTimeout===true?90000:38000);if(!ready)throw new Error("AUTOTEST_FOREGROUND_STILL_RUNNING")}',
  "AutoTest pre-turn timeout handling");
app=replaceRequired(app,
  'await executeDeveloperAutotestDecision(decision);if(firstButtonFast)await waitForAutotestActionReady(config.disableTimeout===true?90000:38000);else await waitForAutotestIdle(config.disableTimeout===true?90000:38000);',
  'await executeDeveloperAutotestDecision(decision);if(firstButtonFast){const ready=await waitForAutotestActionReady(config.disableTimeout===true?90000:38000);if(!ready)throw new Error("AUTOTEST_PLAYER_ACTION_STILL_RUNNING")}else{const ready=await waitForAutotestIdle(config.disableTimeout===true?90000:38000);if(!ready)throw new Error("AUTOTEST_FOREGROUND_STILL_RUNNING")}',
  "AutoTest post-turn timeout handling");
await save("app.js",app);

const pkg=JSON.parse(await text("package.json"));pkg.version="0.60.29";await save("package.json",JSON.stringify(pkg,null,2)+"\n");
await save("src/version.js",'export const APP_VERSION="0.60.29";\n');

let index=await text("index.html");
index=replaceRequired(index,'"./src/version.js?v=60010":"./src/version.js?v=60028"','"./src/version.js?v=60010":"./src/version.js?v=60029"',"version cache token");
index=replaceRequired(index,'src="app.js?v=60028"','src="app.js?v=60029"',"app cache token");
await save("index.html",index);

for(const path of ["test/nonblocking-turn-sync.test.js","test/progressive-world-builder-v05410.test.js"]){
  let s=await text(path);
  s=replaceRequired(s,
    '/finishPlayerActionFlight\\(action,ctrl\\.signal\\.aborted\\?"scene_aborted":"scene_settled"\\)/',
    '/finishPlayerActionFlight\\(action,ctrl\\.signal\\.aborted\\?"scene_aborted":"scene_settled",actionFlightEpoch\\)/',
    `${path} flight ownership assertion`);
  await save(path,s);
}

let controls=await text("test/ai-autotest-controls-v0544.test.js");
controls=replaceRequired(controls,
  ' assert.match(app,/if\\(firstButtonFast\\)await waitForAutotestActionReady\\(config\\.disableTimeout===true\\?90000:38000\\);else await waitForAutotestIdle\\(config\\.disableTimeout===true\\?90000:38000\\)/)',
  ' assert.match(block,/!playerActionFlight\\.active/);\n assert.match(app,/AUTOTEST_PLAYER_ACTION_STILL_RUNNING/);\n assert.match(app,/AUTOTEST_FOREGROUND_STILL_RUNNING/)',
  "AutoTest barrier assertion");
await save("test/ai-autotest-controls-v0544.test.js",controls);

const releaseTests=[
  "test/v06027-suggestion-freshness-regression.test.js",
  "test/version-0551-release.test.js",
  "test/v06015-ja-live-regressions.test.js",
  "test/v06027-debug-visibility-boundary.test.js",
  "test/v06023-ja-weather-helper-background-regressions.test.js",
  "test/v06019-ja-manual-regressions.test.js",
  "test/version-ui.test.js",
  "test/v06014-manual-regressions.test.js",
  "test/v06021-ja-manual-regressions.test.js",
  "test/v06025-observation-narrative-regression.test.js",
  "test/v06011-ja-runtime-coherence.test.js",
];
for(const path of releaseTests){
  let s=await text(path);
  s=s.replaceAll("through the v0.60.28 release","through the v0.60.29 release");
  s=s.replaceAll("through the v0.60.28 wrapper chain","through the v0.60.29 wrapper chain");
  s=s.replaceAll("underneath the v0.60.28 AI-first compiler wrapper","underneath the v0.60.29 release wiring");
  s=s.replaceAll("v0.60.28 release wiring keeps","v0.60.29 release wiring keeps");
  s=s.replaceAll("v0.60.28 is the canonical app and browser cache release","v0.60.29 is the canonical app and browser cache release");
  s=s.replaceAll("Official v0.60.28 release contract","Official v0.60.29 release contract");
  s=s.replaceAll("// v0.60.28 release contract","// v0.60.29 release contract");
  s=s.replaceAll('"0.60.28"','"0.60.29"');
  s=s.replaceAll('APP_VERSION="0\\.60\\.28"','APP_VERSION="0\\.60\\.29"');
  s=s.replaceAll('app\\.js\\?v=60028','app\\.js\\?v=60029');
  s=s.replaceAll('src\\/version\\.js\\?v=60028','src\\/version\\.js\\?v=60029');
  s=s.replaceAll('version\\.js\\?v=60028','version\\.js\\?v=60029');
  s=s.replaceAll('Focused v0\\.60\\.28 regressions','Focused v0\\.60\\.29 regressions');
  s=s.replaceAll('v0\\\\\\.60\\\\\\.28','v0\\\\\\.60\\\\\\.29');
  await save(path,s);
}

await save("test/v06029-action-flight-regression.test.js",`import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("v0.60.29 stale Scene cleanup cannot unlock a newer player action flight", () => {
  const finishStart = app.indexOf('function finishPlayerActionFlight');
  const finishEnd = app.indexOf('function setPlayerActionControlsLocked', finishStart);
  const finishBlock = app.slice(finishStart, finishEnd);
  assert.match(finishBlock, /expectedEpoch=null/);
  assert.match(finishBlock, /playerActionFlight\\.epoch!==expectedEpoch/);
  assert.match(finishBlock, /PLAYER_ACTION_UNLOCK_STALE_IGNORED/);
  const narrationStart = app.indexOf('function startNonblockingPlayerNarration');
  const narrationEnd = app.indexOf('function removePersistedDeferredTurn', narrationStart);
  const narrationBlock = app.slice(narrationStart, narrationEnd);
  assert.match(narrationBlock, /actionFlightEpoch=null/);
  assert.match(narrationBlock, /finishPlayerActionFlight\\(action,ctrl\\.signal\\.aborted\\?"scene_aborted":"scene_settled",actionFlightEpoch\\)/);
  assert.match(app, /finishPlayerActionFlight\\(playerActionFlight\\.label,"global_watchdog",epoch\\)/);
  assert.match(app, /startNonblockingPlayerNarration\\(\\{action:effective,[^\\n]+actionFlightEpoch\\}\\)/);
  assert.match(app, /finishPlayerActionFlight\\(effective,ctrl\\.signal\\.aborted\\?"scene_aborted":"scene_settled",actionFlightEpoch\\)/);
});

test("v0.60.29 AutoTest waits for the entire foreground action and treats timeout as failure", () => {
  const idleStart = app.indexOf('function autotestForegroundIdle');
  const idleEnd = app.indexOf('function cancelAutotestBackgroundWork', idleStart);
  const idleBlock = app.slice(idleStart, idleEnd);
  assert.match(idleBlock, /!aiBusy&&!turnSyncBusy&&!playerActionFlight\\.active&&!nonblockingScene\\.controller&&!deferredDirector\\.running/);
  assert.match(app, /AUTOTEST_FOREGROUND_STILL_RUNNING/);
  const loopStart = app.indexOf('for(let turn=1;turn<=config.maxTurns;turn++)');
  const loopEnd = app.indexOf('result.status=', loopStart);
  const loopBlock = app.slice(loopStart, loopEnd);
  assert.ok(loopStart >= 0, 'AutoTest turn loop missing');
  assert.ok((loopBlock.match(/if\\(!ready\\)throw new Error\\("AUTOTEST_PLAYER_ACTION_STILL_RUNNING"\\)/g)||[]).length >= 2,
    'FIRST_BUTTON must check readiness before and after the action');
  assert.ok((loopBlock.match(/if\\(!ready\\)throw new Error\\("AUTOTEST_FOREGROUND_STILL_RUNNING"\\)/g)||[]).length >= 2,
    'AI decision mode must check foreground idle before and after the action');
});

test("v0.60.29 release wiring uses cache token 60029", async () => {
  const [pkg, version, index] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../src/version.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);
  assert.equal(JSON.parse(pkg).version, "0.60.29");
  assert.match(version, /APP_VERSION="0\\.60\\.29"/);
  assert.match(index, /app\\.js\\?v=60029/);
  assert.match(index, /\\.\\/src\\/version\\.js\\?v=60029/);
});
`);

let workflow=await text(".github/workflows/pages.yml");
workflow=replaceRequired(workflow,"Focused v0.60.28 regressions","Focused v0.60.29 regressions","workflow focused label");
workflow=replaceRequired(workflow,"run: node --test test/v06028-ai-first-suggestions-regression.test.js","run: node --test test/v06029-action-flight-regression.test.js test/v06028-ai-first-suggestions-regression.test.js","workflow new regression");
workflow=replaceRequired(workflow,"test/ai-autotest-first-button-hotfix.test.js test/v05904-creator-locale-regressions.test.js","test/ai-autotest-first-button-hotfix.test.js test/ai-autotest-controls-v0544.test.js test/v05904-creator-locale-regressions.test.js","workflow autotest controls");
workflow=replaceRequired(workflow,"Verify deployed v0.60.28 source and rendered badge","Verify deployed v0.60.29 source and rendered badge","live smoke label");
workflow=replaceRequired(workflow,'version_url="${site}src/version.js?v=60028"','version_url="${site}src/version.js?v=60029"\n          app_url="${site}app.js?v=60029"',"live smoke URLs");
workflow=replaceRequired(workflow,'version_body="$(curl -fsSL --retry 2 --retry-delay 1 "$version_url" || true)"','version_body="$(curl -fsSL --retry 2 --retry-delay 1 "$version_url" || true)"\n            app_body="$(curl -fsSL --retry 2 --retry-delay 1 "$app_url" || true)"',"live smoke app fetch");
workflow=replaceRequired(workflow,"if grep -q 'APP_VERSION=\"0.60.28\"' <<<\"$version_body\" && grep -q 'V06028_SCENE_TIMEOUT_MS=10500' <<<\"$settings_body\" && grep -q 'recoverPriorAiSuggestions' <<<\"$compiler_body\"; then","if grep -q 'APP_VERSION=\"0.60.29\"' <<<\"$version_body\" && grep -q 'PLAYER_ACTION_UNLOCK_STALE_IGNORED' <<<\"$app_body\" && grep -q '!playerActionFlight.active&&!nonblockingScene.controller' <<<\"$app_body\" && grep -q 'V06028_SCENE_TIMEOUT_MS=10500' <<<\"$settings_body\" && grep -q 'recoverPriorAiSuggestions' <<<\"$compiler_body\"; then","live smoke source checks");
workflow=replaceRequired(workflow,"v0\\.60\\.28</div>","v0\\.60\\.29</div>","live smoke badge");
await save(".github/workflows/pages.yml",workflow);

console.log("v0.60.29 patch applied");
