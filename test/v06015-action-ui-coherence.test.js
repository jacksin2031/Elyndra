import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {preservePlayerVisibleAdjustedAction} from "../src/v06016-ai-client-hotfix.js";
import {coherentActionAssessment} from "../src/v06011-game-engine-hotfix.js";

test("v0.60.16 keeps one player-visible action identity while Engine retains ADJUST semantics",async()=>{
 const [index,wrapper,engine,app,clientHotfix]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../src/v06015-contextual-actions-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06011-game-engine-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06016-ai-client-hotfix.js",import.meta.url),"utf8")
 ]);
 assert.match(index,/"\.\/src\/contextual-actions\.js\?v=60010":"\.\/src\/v06015-contextual-actions-hotfix\.js\?v=60016"/);
 assert.match(index,/"\.\/src\/ai-client\.js\?v=60010":"\.\/src\/v06016-ai-client-hotfix\.js\?v=60016"/);
 assert.match(wrapper,/label:action/);assert.match(wrapper,/canonicalAction:action/);
 assert.match(clientHotfix,/engineNormalizedAction:adjusted/);assert.match(clientHotfix,/normalizedAction:requested/);
 assert.match(engine,/engineNormalizedAction/);assert.match(engine,/playerVisibleAction/);
 assert.match(app,/const effective=assessment\?\.verdict==="ADJUST"&&assessment\.normalizedAction\?assessment\.normalizedAction:requested/);
 assert.match(app,/startTurnAIJobs\(effective,roll/);assert.match(app,/action:effective/);

 const raw={verdict:"ADJUST",normalizedAction:"危険な場所には入らず、入口から観察する",kind:"OBSERVE"},requested="橋の向こう側へ進む";
 const presented=preservePlayerVisibleAdjustedAction(raw,requested);
 assert.equal(presented.normalizedAction,requested);assert.equal(presented.playerVisibleAction,requested);assert.equal(presented.engineNormalizedAction,raw.normalizedAction);
 const engineAssessment=coherentActionAssessment(presented,requested);
 assert.equal(engineAssessment.normalizedAction,raw.normalizedAction);assert.equal(engineAssessment.playerVisibleAction,requested)
});

test("v0.60.16 Japanese debug panel masks leaked NPC autonomous telemetry detail but keeps event type visible",async()=>{
 const ui=await readFile(new URL("../src/v06015-runtime-ui-hotfix.js",import.meta.url),"utf8");
 assert.match(ui,/NPC_AUTONOMOUS_ACTION/);assert.match(ui,/NPCの自律行動（内部テレメトリ）/);assert.match(ui,/JA_LEAK\.test\(text\)/)
});
