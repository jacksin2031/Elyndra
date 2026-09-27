import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.60.15 suggestion presentation, execution and scene use one action identity",async()=>{
 const [index,wrapper,engine,app]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../src/v06015-contextual-actions-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06011-game-engine-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 assert.match(index,/"\.\/src\/contextual-actions\.js\?v=60010":"\.\/src\/v06015-contextual-actions-hotfix\.js\?v=60015"/);
 assert.match(wrapper,/label:action/);assert.match(wrapper,/canonicalAction:action/);
 assert.match(engine,/coherentActionAssessment/);assert.match(engine,/normalizedAction:presented/);
 assert.match(app,/startTurnAIJobs\(effective,roll/);assert.match(app,/action:effective/)
});

test("v0.60.15 Japanese debug panel masks leaked NPC autonomous telemetry detail but keeps event type visible",async()=>{
 const ui=await readFile(new URL("../src/v06015-runtime-ui-hotfix.js",import.meta.url),"utf8");
 assert.match(ui,/NPC_AUTONOMOUS_ACTION/);assert.match(ui,/NPCの自律行動（内部テレメトリ）/);assert.match(ui,/JA_LEAK\.test\(text\)/)
});
