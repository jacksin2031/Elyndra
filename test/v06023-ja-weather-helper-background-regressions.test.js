import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {localizeV06015JapaneseVisibleText} from "../src/v06023-ja-visible-text-hotfix.js";
import {normalizeWeatherSystem} from "../src/v06023-weather-engine-hotfix.js";
import {validateGeneration,__v06023 as registryHotfix} from "../src/v06023-world-registry-hotfix.js";

const withJa=fn=>{const prev=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE="ja";try{return fn()}finally{globalThis.ELYNDRA_LOCALE=prev}};

test("v0.60.23 repairs reproduced Japanese weather and helper leaks",()=>withJa(()=>{
 assert.equal(localizeV06015JapaneseVisibleText("光線、聲音或空氣質感出現不尋常變化。"),"光や音、空気の質感に異常な変化が現れる。");
 assert.equal(localizeV06015JapaneseVisibleText("皮膚のピリピリ感と金屬的な匂い"),"皮膚のピリピリ感と金属のような匂い");
 assert.equal(localizeV06015JapaneseVisibleText("現時點では確認できる情報が不足しています。"),"現時点では確認できる情報が不足しています。")
}));

test("v0.60.23 projects generic weather fallback text into Japanese without mutating the canonical base",()=>withJa(()=>{
 const sys=normalizeWeatherSystem({},{}),anomaly=sys.phenomena.find(x=>x.id==="WTH-ANOMALY");
 assert.equal(anomaly.name,"異常天候");assert.equal(anomaly.sensoryCue,"光や音、空気の質感に異常な変化が現れる。");
 assert.equal(sys.identity,"天候は、この世界固有の環境法則と時間変化によって形成される。");
 for(const p of sys.phenomena)assert.doesNotMatch([p.name,p.observableName,p.description,p.sensoryCue].join(" "),/[穩與氣處變聲屬]/u)
}));

test("v0.60.23 drops only malformed optional NPC lore before Canon validation",()=>{
 const malformed={locations:[],npcs:[{name:"霧見張り",role:"見張り",description:"港を見張っている",lore:{text:"story field is missing"}}],factions:[],sideQuests:[],definitions:[]};
 const repaired=registryHotfix.repairOptionalNpcLore(malformed);assert.equal(Object.hasOwn(repaired.npcs[0],"lore"),false);
 const report=validateGeneration(malformed);assert.equal(report.valid,true,report.errors.join(","));
 const hardInvalid={...malformed,npcs:[{name:"霧見張り",role:"",description:"港を見張っている",lore:{text:"still malformed"}}]};
 const hardReport=validateGeneration(hardInvalid);assert.equal(hardReport.valid,false);assert.ok(hardReport.errors.includes("NPC_SHAPE_INVALID"))
});

test("v0.60.23 fixes remain wired through the v0.60.31 release",async()=>{
 const [html,pkgText,version,workflow,weather24,visible24]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8"),readFile(new URL("../src/v06024-weather-engine-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06024-ja-visible-text-hotfix.js",import.meta.url),"utf8")
 ]);
 assert.equal(JSON.parse(pkgText).version,"0.60.31");assert.match(version,/APP_VERSION="0\.60\.31"/);
 assert.match(html,/"\.\/src\/version\.js\?v=60010":"\.\/src\/version\.js\?v=60031"/);
 assert.match(html,/"\.\/src\/weather-engine\.js\?v=57025":"\.\/src\/v06024-weather-engine-hotfix\.js\?v=60024"/);
 assert.match(html,/"\.\/src\/world-registry\.js\?v=57025":"\.\/src\/v06023-world-registry-hotfix\.js\?v=60023"/);
 assert.match(html,/"\.\/src\/v06015-ja-visible-text\.js\?v=60018":"\.\/src\/v06024-ja-visible-text-hotfix\.js\?v=60024"/);
 assert.match(weather24,/v06023-weather-engine-hotfix\.js\?v=60023&base=1/);assert.match(visible24,/v06023-ja-visible-text-hotfix\.js\?v=60023&base=1/);
 assert.match(workflow,/run: node --test [^\r\n]*v06031-ai-scene-delivery\.test\.js[^\r\n]*v06023-ja-weather-helper-background-regressions\.test\.js/);assert.match(workflow,/version\.js\?v=60031/);assert.match(workflow,/v0\\\.60\\\.31/)
});
