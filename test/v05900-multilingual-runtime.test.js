import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {SUPPORTED_LOCALES,languageContract,ensureWorldLocale,applyTranslationBundle,translatedText,missingVisibleTranslations,registerLocalizedOutput,hasLocaleLeak,hasTranslation} from "../src/locale-runtime.js";

test("v0.59.0 keeps four locale channels isolated",()=>{
 assert.deepEqual(Object.keys(SUPPORTED_LOCALES),["zh-Hant","zh-Hans","en","ja"]);
 const contracts=Object.keys(SUPPORTED_LOCALES).map(languageContract);assert.equal(new Set(contracts).size,4);for(const c of contracts)assert.match(c,/RUNTIME LANGUAGE OVERRIDE/);
 const state={world:{name:"霧城",registry:{npcs:[],locations:[]}},sceneTitle:"鐘聲停止",narrative:"街道突然安靜。",quests:{main:{title:"活下來",objectives:["尋找安全地點"]}},suggestions:["觀察四周"],inventory:[]};
 const loc=ensureWorldLocale(state,"zh-Hant");loc.sourceLocale="zh-Hant";loc.displayLocale="zh-Hant";
 applyTranslationBundle(state,"en",{translations:[{source:"街道突然安靜。",translated:"The street suddenly falls silent."}]});
 applyTranslationBundle(state,"ja",{translations:[{source:"街道突然安靜。",translated:"通りが突然静まり返る。"}]});
 assert.equal(translatedText(state,"街道突然安靜。","en"),"The street suddenly falls silent.");
 assert.equal(translatedText(state,"街道突然安靜。","ja"),"通りが突然静まり返る。");
 assert.equal(translatedText(state,"街道突然安靜。","zh-Hant"),"街道突然安靜。");
 assert.equal(state.narrative,"街道突然安靜。");
 registerLocalizedOutput("A new English narration appears.","en");assert.equal(missingVisibleTranslations({...state,narrative:"A new English narration appears."},"en").strings.includes("A new English narration appears."),false);
});

test("v0.59.0 normalizes deterministic volatile gameplay text in non-default locales",()=>{
 const state={world:{name:"English World",registry:{npcs:[],locations:[]}},sceneTitle:"理解眼前狀況",narrative:"戰鬥局勢發生了變化。",quests:{main:{title:"Main Quest",objectives:["Survive"]}},suggestions:["觀察四周"],inventory:[],localization:{sourceLocale:"en",displayLocale:"en",translations:{en:{}}}};
 const missing=missingVisibleTranslations(state,"en").strings;assert.ok(missing.includes("戰鬥局勢發生了變化。"));assert.ok(missing.includes("理解眼前狀況"));assert.ok(missing.includes("觀察四周"));
 applyTranslationBundle(state,"en",{translations:missing.map(source=>({source,translated:"English translation"}))});assert.equal(translatedText(state,"戰鬥局勢發生了變化。","en"),"English translation");
 const traditional={...state,localization:{sourceLocale:"zh-Hant",displayLocale:"zh-Hant",translations:{"zh-Hant":{}}}};assert.equal(missingVisibleTranslations(traditional,"zh-Hant").strings.length,0);
});

test("v0.59.0 narrator is structurally above the action panel",async()=>{
 const [html,css,app,settings,client,server]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/_ai.js",import.meta.url),"utf8")
 ]);
 const artEnd=html.indexOf('</div></div>\n<div class="narrative-panel"'),narrative=html.indexOf('id="narrative"'),decision=html.indexOf('<div class="decision-panel">');
 assert.ok(artEnd>0&&narrative>artEnd&&decision>narrative);assert.doesNotMatch(html,/<div class="scene-copy">[\s\S]*id="narrative"[\s\S]*<\/div><\/div>\n<div class="decision-panel">/);
 assert.match(css,/#game \.scene\{display:grid!important;grid-template-rows:minmax\(0,1fr\) auto auto!important/);assert.match(css,/#game \.narrative-panel\{grid-row:2!important/);assert.match(css,/#game \.decision-panel\{grid-row:3!important/);
 assert.match(html,/id="languageSelect"/);assert.match(app,/ensureGameplayLocale/);assert.match(app,/uiFormat\("npcWait"/);assert.match(app,/uiText\("能力"/);assert.match(app,/missingVisibleTranslations/);assert.match(app,/translation\.sourceLocale=activeLocale|localization\.sourceLocale=activeLocale/);
 assert.match(settings,/languageContract\(locale\)/);assert.match(settings,/registerLocalizedOutput\(result,locale\)/);assert.match(client,/export async function translateVisibleWorld/);assert.match(server,/languageContract\(normalizeLocale\(locale\)\)/);
});


test("multilingual hardening removes language locks and gates every world entry",async()=>{
 const [client,contracts,app,narrate,translate]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-runtime-contracts.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../api/narrate.js",import.meta.url),"utf8"),
  readFile(new URL("../api/translate.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/const locale=normalizeLocale\(args\?\.locale\|\|loadLocale\(\)\)/);
 assert.match(client,/if\(locale==="zh-Hant"\)/);
 assert.doesNotMatch(client,/system:\"你是 Elyndra 的繁體中文敘事者/);
 assert.doesNotMatch(contracts,/4-18字繁體中文|40-180字繁體中文|簡短繁體中文理由|全程使用自然繁體中文|只使用繁體中文/);
 assert.match(contracts,/目前 runtime 選擇語言/);
 assert.match(app,/LOAD_SLOT[\s\S]{0,260}const ready=await refresh\(\)[\s\S]{0,180}if\(!ready\)/);
 assert.match(app,/IMPORT_WORLD[\s\S]{0,260}const ready=await refresh\(\)[\s\S]{0,180}if\(!ready\)/);
 assert.match(narrate,/locale:req\.elyndraLocale/);
 assert.doesNotMatch(narrate,/繁體中文敘事者/);
 assert.match(translate,/actual source language of each string independently/);
});

test("narrator row is an invariant immediately above player actions",async()=>{
 const [html,css]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8")]);
 const n=html.indexOf('<div class="narrative-panel"'),d=html.indexOf('<div class="decision-panel"');
 assert.ok(n>0&&d>n,"narrative-panel must precede decision-panel in the same scene flow");
 assert.match(html,/<p id="narrative"[^>]*><\/p><\/div>\s*<div class="decision-panel">/,"the narrator must remain the last content before the action panel");
 assert.match(css,/#game \.narrative-panel\{grid-row:2!important/);
 assert.match(css,/#game \.decision-panel\{grid-row:3!important/);
 assert.match(css,/#game \.scene\{display:grid!important;grid-template-rows:minmax\(0,1fr\) auto auto!important/);
});


test("Japanese locale repairs null translation maps and detects observed Chinese fragments",()=>{
 const state={world:{name:"霧城",registry:{npcs:[],locations:[]}},localization:{sourceLocale:"zh-Hant",translations:null}};
 const locale=ensureWorldLocale(state,"ja");
 assert.deepEqual(locale.translations.ja,{});
 assert.deepEqual(missingVisibleTranslations(state,"ja").strings,["霧城"]);
 for(const fragment of ["具體的","附近","已選行動","位置、人物或事件"])assert.equal(hasLocaleLeak(fragment,"ja"),true,fragment);
 assert.equal(hasLocaleLeak("近くの具体的な手掛かりを探す","ja"),false);
});


test("Japanese locale includes action text and rejects partial Chinese translation",()=>{
 const state={world:{name:"霧城",registry:{npcs:[],locations:[]}},player:{location:"鎮外破廟"},sceneTitle:"入口",narrative:"目覚めた。",quests:{main:{title:"目標",objectives:["找到可以交流的人"]}},suggestions:[],suggestionIntents:[{label:"詢問陌生人",action:"向眼前的陌生人詢問目前目標"}],inventory:[]};
 const missing=missingVisibleTranslations(state,"ja").strings;
 assert.ok(missing.includes("鎮外破廟"));
 assert.ok(missing.includes("向眼前的陌生人詢問目前目標"));
 applyTranslationBundle(state,"ja",{translations:[{source:"向眼前的陌生人詢問目前目標",translated:"目の前の人に詢問目前目標"}]});
 assert.equal(hasTranslation(state,"向眼前的陌生人詢問目前目標","ja"),false);
 assert.ok(missingVisibleTranslations(state,"ja").strings.includes("向眼前的陌生人詢問目前目標"));
 applyTranslationBundle(state,"ja",{translations:[{source:"向眼前的陌生人詢問目前目標",translated:"目の前の人に現在の目標を尋ねる"}]});
 assert.equal(hasTranslation(state,"向眼前的陌生人詢問目前目標","ja"),true);
});
