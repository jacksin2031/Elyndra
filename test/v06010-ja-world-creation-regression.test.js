import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createWorldCreationDraft,resolveWorldBlueprint,BLUEPRINT_SOURCES} from "../src/world-creation.js";
import {uiText} from "../src/locale-runtime.js";

test("v0.60.10 explicit Japanese rare-magic intent constrains style-mode blueprint",()=>{
 const draft=createWorldCreationDraft({worldStyle:"王道奇幻",worldStyleMode:"fixed",magicLevel:7,magicLevelMode:"style",customWorldDescription:"魔法は希少。灯台守の失踪をめぐる世界。"});
 const blueprint=resolveWorldBlueprint(draft);
 assert.equal(blueprint.advanced.magicLevel.value,2);
 assert.equal(blueprint.advanced.magicLevel.source,BLUEPRINT_SOURCES.USER);
 const baseline=resolveWorldBlueprint(createWorldCreationDraft({worldStyle:"王道奇幻",worldStyleMode:"fixed",magicLevelMode:"style",masterSeed:"baseline"}));
 assert.equal(baseline.advanced.magicLevel.value,8);
});

test("v0.60.10 Japanese creator progress is localized on first render",()=>{
 assert.equal(uiText("世界身份","ja"),"世界アイデンティティ");
 assert.match(uiText("先用短請求鎖定唯一 World Identity；失敗時由 Seed Contract 安全補上","ja"),/Seed Contract/);
 assert.equal(uiText("雙 AI 編譯 Wave 2","ja"),"2-AI コンパイル Wave 2");
 const detail=uiText("歷史與地理已鎖定；最多兩個 AI 同時生成未來 Timeline 與地方社會，兩者必須引用 Wave 1","ja");
 assert.match(detail,/参照します/);assert.doesNotMatch(detail,/參照|兩者|歷史與地理/);
 assert.equal(uiText("世界生成完成","ja"),"世界生成完了");
 assert.equal(uiText("你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。","ja"),"異世界のコンパイルが完了しました。世界契約を確認してから、渡るかどうかを決めてください。");
});

test("v0.60.10 same-source new worlds cannot be blocked by language-switch repair",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/if\(loc\.sourceLocale===activeLocale\)\{loc\.displayLocale=activeLocale;localeRepairCooldown\.delete\(state\);recordDebug\("LOCALE_SAME_SOURCE_REPAIR_NONBLOCKING"/);
 assert.match(app,/gameState\.localization\.sourceLocale=activeLocale;gameState\.localization\.displayLocale=activeLocale;gameState\.world\.language=activeLocale/);
 assert.match(app,/const message=uiText\("你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。",activeLocale\),title=uiText\("世界生成完成",activeLocale\)/);
 assert.match(app,/new Notification\(notificationTitle,\{body:message/);
});
