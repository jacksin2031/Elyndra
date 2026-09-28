import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectV06021ContextualSet} from "../src/v06021-contextual-actions-hotfix.js";
import {localizeV06021JapaneseVisibleText,v06021JapaneseDebugEventDetail} from "../src/v06021-ja-manual-ui.js";

const withJa=fn=>{const prev=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE="ja";try{return fn()}finally{globalThis.ELYNDRA_LOCALE=prev}};

test("v0.60.21 keeps primary/high-risk/all suggestion rows referentially identical for click lookup",()=>withJa(()=>{
 const primary={id:"S1",kind:"OBSERVE",risk:"LOW",label:"利用現場環境製造一個觀察機會",action:"利用現場環境製造一個觀察機會"};
 const risky={id:"S2",kind:"RISKY",risk:"HIGH",label:"冒険靠近最明顯的危險源",action:"冒険靠近最明顯的危險源"};
 const set=projectV06021ContextualSet({primary:[primary],highRisk:[risky],all:[primary,risky]});
 assert.equal(set.primary[0],set.all[0]);assert.equal(set.highRisk[0],set.all[1]);
 assert.equal(set.all.indexOf(set.primary[0]),0);assert.equal(set.all.indexOf(set.highRisk[0]),1);
 assert.equal(set.primary[0].action,"周囲の環境を利用して観察の機会を作る");
 assert.equal(set.highRisk[0].action,"最も目立つ危険源へあえて近づく")
}));

test("v0.60.21 localizes the reproduced campaign description even when DOM text is split",()=>{
 const full="理解自己身處何地，先確保能夠行動。這不是你的強制主線；你可以介入、忽略、延後或以其他目標生活。";
 assert.equal(localizeV06021JapaneseVisibleText(full),"自分がどこにいるかを理解し、まず行動できる状態を確保します。これは強制的なメインストーリーではありません。介入せずに進む、後回しにする、別の目標で生きることもできます。");
 assert.equal(localizeV06021JapaneseVisibleText("理解自己身處何地，先確保能夠行動。"),"自分がどこにいるかを理解し、まず行動できる状態を確保します。");
 assert.equal(localizeV06021JapaneseVisibleText("這不是你的強制主線；你可以介入、忽略、延後或以其他目標生活。"),"これは強制的なメインストーリーではありません。介入する、無視する、後回しにする、別の目標で生きることもできます。")
});

test("v0.60.21 localizes reproduced FACTION_ACTION detail instead of leaking Traditional Chinese",()=>{
 assert.equal(v06021JapaneseDebugEventDetail("FACTION_ACTION","倉庫管理者の会 維持現有勢力範圍，等待更合適的時機。"),"倉庫管理者の会 は現在の勢力範囲を維持し、より適切な機会を待っています。");
});

test("v0.60.21 fixes remain wired through the v0.60.26 release",async()=>{
 const [html,contextual,runtime,version,pkgText,workflow]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../src/v06021-contextual-actions-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06021-runtime-ui-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8"),readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8")
 ]);
 assert.equal(JSON.parse(pkgText).version,"0.60.26");assert.match(version,/APP_VERSION="0\.60\.26"/);
 assert.match(html,/v06021-contextual-actions-hotfix\.js\?v=60021/);assert.match(html,/v06024-runtime-ui-hotfix\.js\?v=60024/);
 assert.match(contextual,/cache=new Map/);assert.match(contextual,/set\.all\|\|\[\]/);assert.match(runtime,/repairDebugFaction/);assert.match(runtime,/localizeV06021JapaneseVisibleText/);
 assert.match(workflow,/Focused v0\.60\.26 regressions/);assert.match(workflow,/version\.js\?v=60026/);assert.match(workflow,/v0\\\.60\\\.26/)
});
