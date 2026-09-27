import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createPlayerDrive,syncPlayerDrivesFromEvents} from "../src/drive-engine.js";
import {projectV06020JapaneseSuggestionIdentity} from "../src/v06020-contextual-actions-hotfix.js";
import {hasV06020JapaneseLeak,localizeV06020JapaneseVisibleText,sanitizeV06020JapaneseSceneTitle,v06020JapaneseDebugEventDetail,v06020RestNoRollState} from "../src/v06020-ja-manual-ui.js";

const withJa=fn=>{const prev=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE="ja";try{return fn()}finally{globalThis.ELYNDRA_LOCALE=prev}};

test("v0.60.20 freezes the Japanese suggestion identity before processing",()=>withJa(()=>{
 const cases=[
  ["利用現場環境製造一個觀察機會","周囲の環境を利用して観察の機会を作る"],
  ["冒険靠近最明顯的危險源","最も目立つ危険源へあえて近づく"],
  ["找出能推進目前目標的具體證據","現在の目標を進められる具体的な証拠を探す"]
 ];
 for(const [raw,expected] of cases){const row=projectV06020JapaneseSuggestionIdentity({label:raw,action:raw,kind:"OBSERVE"});assert.equal(row.label,expected);assert.equal(row.action,expected);assert.equal(row.playerVisibleAction,expected);assert.equal(row.engineAction,raw);assert.equal(hasV06020JapaneseLeak(row.action),false)}
}));

test("v0.60.20 settles deterministic REST without leaving the stale D20 placeholder",()=>{
 assert.deepEqual(v06020RestNoRollState("120分ほど休み、身体を整えました。","今回の判定を処理中"),{d20:"—",label:"D20判定なし",result:"休息はEngineの決定論的処理で解決しました。"});
 assert.equal(v06020RestNoRollState("周囲を観察した。","今回の判定を処理中"),null)
});

test("v0.60.20 normalizes reproduced Japanese copy, scene title, badges and NPC_MOVED telemetry",()=>{
 assert.equal(localizeV06020JapaneseVisibleText("目の當たりで隠された狀態を確認する"),"目の当たりで隠された状態を確認する");
 assert.equal(localizeV06020JapaneseVisibleText("既知の地點"),"既知の地点");
 assert.equal(localizeV06020JapaneseVisibleText("WORLD CAMPAIGN SCAFFOLD · 世界は自律的に進行します"),"世界キャンペーン進行枠 · 世界は自律的に進行します");
 assert.equal(localizeV06020JapaneseVisibleText("PLAYER ACTION / STATE SYNC"),"プレイヤー行動 / 状態同期");
 assert.equal(sanitizeV06020JapaneseSceneTitle("霧鎖荷台、路途受阻"),"霧に閉ざされた荷台、道は塞がれている");
 assert.equal(v06020JapaneseDebugEventDetail("NPC_MOVED","搬運者移動到港灣"),"NPCの移動（内部テレメトリ）");
 assert.equal(v06020JapaneseDebugEventDetail("NPC_AUTONOMOUS_ACTION","繼續自己的港邊生活"),"NPCの自律行動（内部テレメトリ）")
});

test("Drive 4/4 is relevant evidence readiness, not canonical map-route completion",()=>{
 const state={world:{state:{day:1},registry:{locations:[{id:"L1",name:"塩風干し棚広場",known:true}],npcs:[]},travel:{routes:[]}},events:[]};
 const made=createPlayerDrive(state,{type:"MYSTERY",title:"港への道を知る",description:"港への道を調べて理解する",target:4,focus:true});assert.equal(made.ok,true);
 for(let i=1;i<=4;i++)state.events.push({id:`E${i}`,type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",summary:"港への道を調べて手掛かりを確認する",action:"港への道を調べる",day:1,at:i});
 syncPlayerDrivesFromEvents(state);assert.equal(made.drive.progress,4);assert.equal(made.drive.target,4);assert.equal(made.drive.status,"READY");assert.equal(state.world.registry.locations.length,1);assert.equal(state.world.travel.routes.length,0)
});

test("v0.60.20 runtime wiring repairs pending action, Journal progress, no-roll, Debug locale and scene title",async()=>{
 const [runtime,contextual]=await Promise.all([readFile(new URL("../src/v06020-runtime-ui-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06020-contextual-actions-hotfix.js",import.meta.url),"utf8")]);
 assert.match(runtime,/latchedPresentedAction/);assert.match(runtime,/data-suggestion-index/);assert.match(runtime,/pending-action \.action-label/);assert.match(runtime,/v06020RestNoRollState/);assert.match(runtime,/repairDriveProgress/);assert.match(runtime,/関連する経験/);assert.match(runtime,/NPC_MOVED/);assert.match(runtime,/repairAiBadge/);assert.match(runtime,/repairSceneTitle/);
 assert.match(contextual,/action:visible,label:visible,playerVisibleAction:visible/);assert.match(contextual,/engineAction:originalAction\|\|visible/)
});
