import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnPreview} from "../src/turn-compiler.js";

test("v0.60.27 base compiler still marks duplicate structured scene suggestions non-fresh",()=>{
  const previous=[{label:"霧の流れを観察する",action:"霧の流れを観察する",kind:"OBSERVE",risk:"LOW",requirementsSatisfied:true}];
  const preview=sceneTurnPreview({narrative:"状況は続いている。",suggestions:previous},{success:true},{action:"霧を見る",priorSuggestions:previous.map(x=>x.label),priorSuggestionIntents:previous});
  assert.deepEqual(preview.suggestionIntents,[]);
  assert.deepEqual(preview.suggestions,["[object Object]"]);
});

test("app retains earlier AI options when a new Scene has no usable suggestions",async()=>{
  const [app,index]=await Promise.all([readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../index.html",import.meta.url),"utf8")]);
  assert.match(app,/const candidates=checked\.accepted\.length\?checked\.accepted:recoverPriorAiSuggestions\(previousSuggestionIntents,action\)/);
  assert.match(app,/restorePriorAiSuggestions\(state,previousSuggestionIntents,action\)/);
  assert.match(app,/PLAYER_ACTION_SUGGESTIONS_REBUILT/);
  assert.match(app,/SCENE_NO_FRESH_SUGGESTIONS/);
  assert.doesNotMatch(app,/if\(source\.length\)\{const contextual=buildContextualActionSet\(state,checked\.accepted\)/);
  assert.match(index,/app\.js\?v=61007/);
  assert.match(index,/"\.\/src\/turn-compiler\.js\?v=57029":"\.\/src\/v06028-turn-compiler-hotfix\.js\?v=61007"/);
  assert.match(app,/turn-compiler\.js\?v=57029/);
  assert.match(app,/rawSource\.filter\(row=>String\(row\?\.action\|\|row\?\.label\|\|row\|\|""\)\.trim\(\)!=="\[object Object\]"\)/);
});
