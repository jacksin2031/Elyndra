import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnPreview,recoverPriorAiSuggestions} from "../src/v06028-turn-compiler-hotfix.js";
import {V06028_SCENE_TIMEOUT_MS as sceneTimeout} from "../src/v06028-ai-settings-hotfix.js";

const ai=(label,overrides={})=>({label,action:label,kind:"OBSERVE",risk:"LOW",approach:"STEADY",requirementsSatisfied:true,causalBasis:"目前場景可直接嘗試",source:"AI",...overrides});

test("v0.60.28 empty Scene suggestions keep prior AI candidates except the action just executed",()=>{
 const previous=[ai("觀察門口人流"),ai("比較最新痕跡"),ai("利用聲音測試反應",{approach:"CREATIVE"}),ai("冒險接近倒塌處",{kind:"RISKY",risk:"HIGH",approach:"BOLD"})];
 const preview=sceneTurnPreview({narrative:"結果已確認。",suggestions:[]},{success:true},{action:"觀察門口人流",priorSuggestionIntents:previous,priorSuggestions:previous.map(x=>x.label)});
 assert.equal(preview.suggestionRecovery,"PRIOR_AI");
 assert.deepEqual(preview.suggestionIntents.map(x=>x.action),["比較最新痕跡","利用聲音測試反應","冒險接近倒塌處"]);
 assert.equal(preview.suggestionIntents.some(x=>x.action==="觀察門口人流"),false)
});

test("v0.60.28 duplicate Scene batch is not converted into the fixed Engine trio after a suggestion click",()=>{
 const previous=[ai("保持距離觀察出口"),ai("查看牆邊的新痕跡"),ai("製造小聲響觀察反應",{approach:"CREATIVE"}),ai("直接接近危險裂口",{kind:"RISKY",risk:"HIGH",approach:"BOLD"})];
 const preview=sceneTurnPreview({narrative:"場景仍然連續。",suggestions:previous},{success:true},{action:"查看牆邊的新痕跡",priorSuggestionIntents:previous,priorSuggestions:previous.map(x=>x.label)});
 assert.equal(preview.suggestionRecovery,"PRIOR_AI");
 assert.equal(preview.suggestionIntents.length,3);
 assert.equal(preview.suggestionIntents.some(x=>x.action==="查看牆邊的新痕跡"),false)
});

test("v0.60.28 Engine fallback history is never misrepresented as prior AI suggestions",()=>{
 const engine=[ai("固定句一",{source:"ENGINE"}),ai("固定句二",{source:"ENGINE"}),ai("固定句三",{source:"ENGINE"})];
 assert.deepEqual(recoverPriorAiSuggestions(engine,"固定句一"),[]);
 const preview=sceneTurnPreview({narrative:"Engine fallback",suggestions:[]},{success:true},{action:"固定句一",priorSuggestionIntents:engine,priorSuggestions:engine.map(x=>x.label)});
 assert.equal(preview.suggestionIntents.length,0);
 assert.notEqual(preview.suggestionRecovery,"PRIOR_AI")
});

test("v0.60.28 genuinely new Scene AI suggestions take precedence over recovered history",()=>{
 const previous=[ai("舊建議A"),ai("舊建議B")],fresh=[ai("新建議A"),ai("新建議B",{approach:"CREATIVE"})];
 const preview=sceneTurnPreview({narrative:"場景改變。",suggestions:fresh},{success:true},{action:"舊建議A",priorSuggestionIntents:previous,priorSuggestions:previous.map(x=>x.label)});
 assert.equal(preview.suggestionRecovery,"FRESH_AI");
 assert.deepEqual(preview.suggestionIntents.map(x=>x.action),["新建議A","新建議B"])
});

test("scene provider has time to complete before the gameplay watchdog",async()=>{
 assert.equal(sceneTimeout,35000);
 assert.ok(sceneTimeout<50000);
 const [settings,app]=await Promise.all([readFile(new URL("../src/v06028-ai-settings-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8")]);
 assert.match(settings,/V06028_SCENE_TIMEOUT_MS=35000/);
 assert.match(settings,/disableTimeout:true/);
 assert.match(app,/PLAYER_ACTION_HARD_DEADLINE_MS=55000/);
 assert.match(app,/PLAYER_ACTION_SCENE_DEADLINE_MS=50000/)
});
