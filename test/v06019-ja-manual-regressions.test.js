import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {classifyJapanesePlayerAction,repairJapanesePlayerAssessment,fastLocalActionAssessment} from "../src/v06019-ai-client-hotfix.js";

const withJa=fn=>{const prev=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE="ja";try{return fn()}finally{globalThis.ELYNDRA_LOCALE=prev}};

test("v0.60.19 Japanese REST and SOCIAL intents are deterministic",()=>withJa(()=>{
 assert.deepEqual(classifyJapanesePlayerAction("台地の縁で短く休み、息を整える。"),{kind:"GENERAL",intent:"REST"});
 assert.deepEqual(classifyJapanesePlayerAction("港への道を知りませんか、と近くの人へ呼びかける。"),{kind:"SOCIAL",intent:"TALK"});
 const rest=fastLocalActionAssessment({world:{registry:{npcs:[],locations:[]},state:{}},player:{}},"少し休憩する");
 assert.equal(rest?.source,"ENGINE_FASTPATH_JA");assert.equal(rest?.actionIntent?.intent,"REST");
}));

test("v0.60.19 adjusted actions keep the requested Japanese identity",()=>withJa(()=>{
 const requested="台地の縁に沿って霧が薄い方へ進み、道を確かめる。";
 const repaired=repairJapanesePlayerAssessment({verdict:"ADJUST",kind:"TRAVEL",normalizedAction:"沿台地邊緣探索薄雾侧的可行路線",actionIntent:{kind:"TRAVEL",intent:"TRAVEL",raw:"中文",subActions:["中文"]}},requested);
 assert.equal(repaired.normalizedAction,requested);assert.equal(repaired.playerVisibleAction,requested);assert.equal(repaired.engineNormalizedAction,"沿台地邊緣探索薄雾侧的可行路線");assert.equal(repaired.actionIntent.raw,requested);assert.deepEqual(repaired.actionIntent.subActions,[requested]);
}));

test("v0.60.19 runtime wiring covers suggestion identity, rest execution, vitals telemetry and Japanese debug events",async()=>{
 const [html,app,contextual,engine,runtime,version,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06019-contextual-actions-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06019-game-engine-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06019-runtime-ui-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 assert.equal(JSON.parse(pkgText).version,"0.60.23");assert.match(version,/APP_VERSION="0\.60\.23"/);
 assert.match(html,/v06019-ai-client-hotfix\.js\?v=60019/);assert.match(html,/v06021-contextual-actions-hotfix\.js\?v=60021/);assert.match(html,/v06019-game-engine-hotfix\.js\?v=60019/);assert.match(html,/v06021-runtime-ui-hotfix\.js\?v=60021/);
 assert.match(contextual,/engineAction/);assert.match(contextual,/action:visible,label:visible/);assert.match(engine,/engineNormalizedAction:"休息"/);
 assert.match(app,/const effective=assessment\?\.playerVisibleAction\|\|requested/);assert.match(app,/GAME_PLAYER_STATE_CHANGED/);assert.match(app,/debugEventDetail/);
 assert.match(runtime,/FACTION_ACTION/);assert.match(runtime,/WORLD_EVENT/);assert.match(runtime,/hasLocaleLeak\(text,"ja"\)/)
});
