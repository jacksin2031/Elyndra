import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {ensureSurvival} from "../src/survival-engine.js";
import {clearDebugTelemetry,telemetryEntries} from "../src/debug-telemetry.js";
import {explicitJapaneseActionSemantics,japaneseFastAssessment,applyJapaneseActionSemantics} from "../src/v06019-ja-action-semantics.js";
import {performAction} from "../src/v06011-game-engine-hotfix.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"小型",danger:2,magic:2,politics:2,playHours:8,prompt:"v0.60.19 regression"};

test("v0.60.19 recognizes explicit Japanese REST without degrading to OBSERVE",()=>{
 const semantic=explicitJapaneseActionSemantics("短く休み");
 assert.equal(semantic.intent,"REST");assert.equal(semantic.kind,"GENERAL");assert.equal(semantic.engineAction,"休息一下");
 const assessment=japaneseFastAssessment("短く休み");assert.equal(assessment.source,"ENGINE_FASTPATH_JA");assert.equal(assessment.actionIntent.intent,"REST");assert.equal(assessment.normalizedAction,"短く休み")
});

test("v0.60.19 recognizes Japanese questions to people as SOCIAL/TALK",()=>{
 const semantic=explicitJapaneseActionSemantics("近くの人に港への道を聞く");
 assert.equal(semantic.intent,"TALK");assert.equal(semantic.kind,"SOCIAL");
 const assessment={verdict:"ALLOW",kind:"OBSERVE",normalizedAction:"周囲を観察する",actionIntent:{kind:"OBSERVE",intent:"OBSERVE",targetId:"NPC-1"}};
 applyJapaneseActionSemantics(assessment,"近くの人に港への道を聞く");
 assert.equal(assessment.kind,"SOCIAL");assert.equal(assessment.actionIntent.intent,"TALK");assert.equal(assessment.actionIntent.targetId,"NPC-1");assert.equal(assessment.normalizedAction,"近くの人に港への道を聞く")
});

test("v0.60.19 Japanese REST executes deterministically and records real player-state telemetry",()=>{
 const oldLocale=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE="ja";clearDebugTelemetry();
 try{
  const state=newGame(seed),survival=ensureSurvival(state);survival.satiety=98;survival.fatigue=24;
  const before={satiety:survival.satiety,fatigue:survival.fatigue};const assessment=japaneseFastAssessment("短く休み"),result=performAction(state,"free","短く休み",assessment);
  assert.equal(result.deterministic,true);assert.equal(result.roll,null);assert.equal(result.minutes,120);assert.ok(state.player.survival.fatigue<before.fatigue);assert.ok(state.player.survival.satiety<=before.satiety);assert.match(result.text,/120分休みました/);
  const telemetry=telemetryEntries().filter(x=>x.type==="GAME_PLAYER_STATE_CHANGED");assert.ok(telemetry.length>=1);const last=telemetry.at(-1);assert.ok(last.data.changes.fatigue);assert.match(last.data.summary,/fatigue/)
 }finally{globalThis.ELYNDRA_LOCALE=oldLocale;clearDebugTelemetry()}
});

test("v0.60.19 debug repair covers NPC, faction and world events while retaining fallback diagnostics",async()=>{
 const [ui,engine,client,index,pkg,version]=await Promise.all([
  readFile(new URL("../src/v06015-runtime-ui-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06011-game-engine-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06017-ai-client-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8")
 ]);
 assert.match(ui,/FACTION_ACTION/);assert.match(ui,/WORLD_EVENT/);assert.match(ui,/NPC_AUTONOMOUS_ACTION/);assert.match(ui,/data-thinking/);assert.match(ui,/data-recovery/);
 assert.match(engine,/GAME_PLAYER_STATE_CHANGED/);assert.match(engine,/v06019-ja-action-semantics\.js\?v=60019/);assert.match(client,/japaneseFastAssessment/);
 assert.match(index,/v06017-ai-client-hotfix\.js\?v=60019/);assert.match(index,/v06011-game-engine-hotfix\.js\?v=60019/);assert.match(index,/v06015-runtime-ui-hotfix\.js\?v=60019/);assert.match(index,/version\.js\?v=60019/);
 assert.equal(JSON.parse(pkg).version,"0.60.19");assert.match(version,/APP_VERSION="0\.60\.19"/)
});
