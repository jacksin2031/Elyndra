import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {localizeV06015JapaneseVisibleText,isV06015JapaneseSceneFallback,v06015JapaneseFallbackNarrative} from "../src/v06015-ja-visible-text.js";
import {coherentActionAssessment} from "../src/v06011-game-engine-hotfix.js";
import {preservePlayerVisibleAdjustedAction} from "../src/v06017-ai-client-hotfix.js";
import {projectSuccessfulTravel,projectPermissionGrant} from "../src/v06014-turn-projection.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"小型",danger:2,magic:2,politics:2,playHours:8,prompt:"v0.60.18 live regression"};
function stateWithRoutes(){
 const state=newGame(seed),a={id:"LOC-A",name:"北側灯台巡視路の石垣脇",region:"サルナ湾",type:"道路",description:"灯台沿い",known:true,accessRequirements:[]},b={id:"LOC-B",name:"潮霧津の荷揚げ場",region:"Harbor_District",type:"港",description:"港湾區域の荷揚げ場",known:true,accessRequirements:[]},c={id:"LOC-C",name:"石階下港路",region:"Harbor_District",type:"道路",description:"港へ下る石段",known:true,accessRequirements:[]};
 state.world.registry.locations=[a,b,c];state.world.registry.npcs=[];state.player.location=a.name;state.world.state.location=a.name;state.world.state.region=a.region;state.world.travel={version:1,routes:[{id:"R1",fromId:a.id,toId:b.id,distanceKm:1,terrain:"ROAD",hazard:1,baseMinutes:20,open:true,canonical:true},{id:"R2",fromId:a.id,toId:c.id,distanceKm:1,terrain:"ROAD",hazard:1,baseMinutes:20,open:true,canonical:true}]};return {state,a,b,c}
}

test("v0.60.18 Japanese visible text covers reproduced panel, processing, map and weather leaks",()=>{
 const rows=new Map([
  ["保留現代地球的一般生活、衛生與基礎科學常識。","現代地球の一般的な生活・衛生・基礎科学の常識を保持しています。"],
  ["尚未形成固定路線；第一次選擇天賦會確立主要成長方向。","まだ固定された成長ルートはありません。最初の才能選択で主な成長方向が定まります。"],
  ["目前沒有具判定加成的装備","判定に補正を与える装備は現在ありません。"],
  ["目前沒有具判定加成的裝備","判定に補正を与える装備は現在ありません。"],
  ["人物關係","人物関係"],["個人追求","個人的な目標"],["世界立場","世界への立場"],["目前聚焦","現在フォーカス中"],["設為聚焦","フォーカスする"],["確認告一段落","区切りを確認"],["暫時放下","いったん保留"],
  ["你還沒有指定自己的長期牽掛。世界會繼續運作，但不會自動替你決定人生主線。","まだ長期目標を指定していません。世界は進み続けますが、あなたの人生の主軸を自動で決めることはありません。"],
  ["WORLD CAMPAIGN SCAFFOLD · 世界會自行推進","WORLD CAMPAIGN SCAFFOLD · 世界は自律的に進行します"],
  ["AI 正在解析 Action Intent 並判斷必要前提…","AIが行動意図と必要条件を解析しています…"],
  ["AI 正在解析 Action Intent 並判斷必要前提… · 4s","AIが行動意図と必要条件を解析しています… · 4s"],
  ["AI 正在處理你的行動…","AIがあなたの行動を処理しています…"],
  ["STATE SYNC：完成後即可繼續行動","STATE SYNC：完了後に次の行動へ進めます"],
  ["正在處理已選行動…","選択した行動を処理中…"],
  ["AI World Compiler 正在分段建立世界…","AI World Compiler が世界を段階的に構築しています…"],
  ["旅途助手正在整理你已知的情報…","旅の助手が既知の情報を整理しています…"],
  ["找出能推進目前目標的具體證據","現在の目標を進められる具体的な証拠を探す"],
  ["Harbor_District","港湾地区"],["港湾區域","港湾区域"],["冷たい霧狀の細雨","冷たい霧状の細雨"]
 ]);
 for(const [source,expected] of rows)assert.equal(localizeV06015JapaneseVisibleText(source),expected,source);
 assert.equal(localizeV06015JapaneseVisibleText("港番人 正在對你展示的物品作出反應…"),"港番人が提示されたアイテムに反応しています…")
});

test("v0.60.18 runtime observes CSS-visible thinking, syncing and recovery attributes",async()=>{
 const ui=await readFile(new URL("../src/v06015-runtime-ui-hotfix.js",import.meta.url),"utf8");
 for(const attr of ["data-thinking","data-syncing","data-recovery"])assert.match(ui,new RegExp(`VISIBLE_JA_ATTRIBUTES=.*${attr.replace("-","\\-")}`));
 assert.match(ui,/attributeFilter:VISIBLE_JA_ATTRIBUTES/);assert.match(ui,/querySelectorAll\?\.\(VISIBLE_JA_SELECTOR\)/)
});

test("v0.60.18 recognizes unfinished and both runtime generic scene fallbacks",()=>{
 assert.equal(isV06015JapaneseSceneFallback("日本語表示を準備できなかったため、確定済みのゲーム結果のみ保持しています。"),true);
 assert.equal(isV06015JapaneseSceneFallback("AI 場景敘述未完成；已保留 Engine 的可見結果並重建安全行動。"),true);
 assert.equal(isV06015JapaneseSceneFallback("Engineで確定した結果を反映しました。潮霧津の荷揚げ場での状況を保ったまま、次の行動を選べます。"),true);
 assert.equal(isV06015JapaneseSceneFallback(v06015JapaneseFallbackNarrative()),true);
 assert.match(v06015JapaneseFallbackNarrative(),/Engine/);assert.doesNotMatch(v06015JapaneseFallbackNarrative(),/準備できなかった|場景|敘述/)
});

test("v0.60.18 ALLOW keeps shared identity while ADJUST splits player-visible and Engine identities",()=>{
 const shown="目の前の痕跡を詳しく確認する",allow={verdict:"ALLOW",normalizedAction:"找出能推進目前目標的具體證據",kind:"OBSERVE",actionIntent:{kind:"OBSERVE",intent:"OBSERVE",targetId:"LOC-B",raw:"找出能推進目前目標的具體證據",subActions:["找出能推進目前目標的具體證據"]}};
 const coherent=coherentActionAssessment(allow,shown);
 assert.strictEqual(coherent,allow);assert.equal(allow.normalizedAction,shown);assert.equal(allow.playerVisibleAction,shown);assert.equal(allow.actionIntent.raw,shown);assert.deepEqual(allow.actionIntent.subActions,[shown]);assert.equal(allow.actionIntent.targetId,"LOC-B");assert.equal(allow.actionIntent.intent,"OBSERVE");
 const adjusted="危険な場所には入らず、入口から観察する",requested="橋の向こう側へ進む",rawAdjust={verdict:"ADJUST",normalizedAction:adjusted,kind:"OBSERVE",actionIntent:{kind:"OBSERVE",intent:"OBSERVE",targetId:"LOC-B",raw:adjusted,subActions:[adjusted]}};
 const presented=preservePlayerVisibleAdjustedAction(rawAdjust,requested);
 assert.equal(presented.normalizedAction,requested);assert.equal(presented.playerVisibleAction,requested);assert.equal(presented.engineNormalizedAction,adjusted);assert.equal(presented.actionIntent.raw,requested);assert.deepEqual(presented.actionIntent.subActions,[requested]);assert.equal(presented.actionIntent.targetId,"LOC-B");
 const engineAssessment=coherentActionAssessment(presented,requested);
 assert.notStrictEqual(engineAssessment,presented);assert.equal(engineAssessment.normalizedAction,adjusted);assert.equal(engineAssessment.playerVisibleAction,requested);assert.equal(presented.normalizedAction,requested);assert.equal(presented.actionIntent.raw,requested)
});

test("v0.60.18 ALLOW preserves genuine multi-step semantic decomposition while synchronizing its player-visible identity",()=>{
 const shown="周囲を確認してから入口へ進む",allow={verdict:"ALLOW",normalizedAction:"確認後前進",actionIntent:{kind:"TRAVEL",intent:"TRAVEL",raw:"確認後前進",subActions:["周囲を確認する","入口へ進む"]}};
 coherentActionAssessment(allow,shown);assert.equal(allow.actionIntent.raw,shown);assert.deepEqual(allow.actionIntent.subActions,["周囲を確認する","入口へ進む"])
});

test("v0.60.18 retains exact canonical TRAVEL projection but does not invent a partial ambiguous target",()=>{
 const {state,b}=stateWithRoutes(),exact={roll:{success:true,profile:{kind:"TRAVEL"}},actionKind:"TRAVEL",minutes:40,text:"成功",ruleEffects:{}},assessment={kind:"TRAVEL",actionIntent:{kind:"TRAVEL",intent:"TRAVEL",targetId:b.id}};
 assert.ok(projectSuccessfulTravel(state,"潮霧津の荷揚げ場へ慎重に進む",exact,assessment));assert.equal(state.player.location,b.name);
 const second=stateWithRoutes(),partial={roll:{success:true,profile:{kind:"TRAVEL"}},actionKind:"TRAVEL",minutes:40,text:"成功",ruleEffects:{}},partialAssessment={kind:"TRAVEL",actionIntent:{kind:"TRAVEL",intent:"TRAVEL",targetId:null}};
 assert.equal(projectSuccessfulTravel(second.state,"霧が薄く見える方へ慎重に進む",partial,partialAssessment),null);assert.equal(second.state.player.location,second.a.name)
});

test("v0.60.18 permission projection remains conservative without a grounded NPC",()=>{
 const {state,b}=stateWithRoutes();b.accessRequirements=[{type:"EVENT_OCCURRED",id:"HARBOR_PASS_GRANTED",hint:"通行許可"}];
 const result={roll:{success:true},actionKind:"SOCIAL",text:"交渉成功",ruleEffects:{}},assessment={kind:"SOCIAL",actionIntent:{kind:"SOCIAL",intent:"PERSUADE",targetId:null}};
 assert.equal(projectPermissionGrant(state,"潮霧津の荷揚げ場への通行許可を求める",result,assessment),null);assert.equal(state.events.some(e=>e.type==="HARBOR_PASS_GRANTED"),false)
});

test("v0.60.18 Japanese UI, Engine and AI assessment protections remain wired through v0.60.27",async()=>{
 const [index,pkg,version,engine,ui,aiHotfix,game25,ai25,ai24]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../src/v06011-game-engine-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06015-runtime-ui-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06017-ai-client-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06025-game-engine-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06025-ai-client-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06024-ai-client-hotfix.js",import.meta.url),"utf8")]);
 assert.equal(JSON.parse(pkg).version,"0.60.27");assert.match(version,/APP_VERSION="0\.60\.27"/);
 assert.match(index,/v06027-runtime-ui-hotfix\.js\?v=60027/);assert.match(index,/"\.\/src\/version\.js\?v=60010":"\.\/src\/version\.js\?v=60027"/);assert.match(index,/"\.\/src\/game-engine\.js\?v=60006":"\.\/src\/v06025-game-engine-hotfix\.js\?v=60025"/);assert.match(index,/"\.\/src\/ai-client\.js\?v=60010":"\.\/src\/v06025-ai-client-hotfix\.js\?v=60026"/);assert.match(game25,/v06019-game-engine-hotfix\.js\?v=60019/);assert.match(ai25,/v06024-ai-client-hotfix\.js\?v=60026/);assert.match(ai24,/v06019-ai-client-hotfix\.js\?v=60026/);
 assert.match(engine,/coherentActionAssessment/);assert.match(engine,/synchronizePresentedActionIntent/);assert.match(engine,/engineNormalizedAction/);assert.match(engine,/v06015-ja-visible-text\.js\?v=60018/);assert.match(ui,/v06015-ja-visible-text\.js\?v=60018/);assert.match(ui,/MutationObserver/);assert.match(aiHotfix,/preservePlayerVisibleAdjustedAction/)
});