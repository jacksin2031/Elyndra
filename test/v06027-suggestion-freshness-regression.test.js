import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnPreview} from "../src/turn-compiler.js";

test("v0.60.27 duplicate scene suggestions are intentionally suppressed by the turn compiler",()=>{
  const previous=[{label:"霧の流れを観察する",action:"霧の流れを観察する",kind:"OBSERVE",risk:"LOW",requirementsSatisfied:true}];
  const preview=sceneTurnPreview({narrative:"状況は続いている。",suggestions:previous},{success:true},{action:"霧を見る",priorSuggestions:previous.map(x=>x.label),priorSuggestionIntents:previous});
  assert.deepEqual(preview.suggestionIntents,[]);
  assert.deepEqual(preview.suggestions,[]);
});

test("v0.60.27 app rebuilds contextual suggestions instead of retaining the previous three when scene suggestions are empty",async()=>{
  const [app,index]=await Promise.all([readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../index.html",import.meta.url),"utf8")]);
  assert.match(app,/const contextual=buildContextualActionSet\(state,source\.length\?checked\.accepted:\[\]\);state\.suggestionIntents=contextual\.all;state\.suggestions=contextual\.all\.map\(x=>x\.label\)/);
  assert.match(app,/PLAYER_ACTION_SUGGESTIONS_REBUILT/);
  assert.match(app,/SCENE_NO_FRESH_SUGGESTIONS/);
  assert.doesNotMatch(app,/if\(source\.length\)\{const contextual=buildContextualActionSet\(state,checked\.accepted\)/);
  assert.match(index,/app\.js\?v=60027/);
});
