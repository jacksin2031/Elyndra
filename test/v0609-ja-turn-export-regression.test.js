import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeContextualSuggestion,suggestionPresentation} from "../src/contextual-actions.js?v=60009";
import {hasLocaleLeak} from "../src/locale-runtime.js?v=59010";

function state(){return {localization:{displayLocale:"ja"},player:{difficulty:"normal",location:"未知"},world:{id:"W",state:{day:1},registry:{locations:[],npcs:[]}},events:[]}}

test("ja suggestion presentation localizes Engine metadata",()=>{
 globalThis.ELYNDRA_LOCALE="ja";
 const s=state(),row=normalizeContextualSuggestion({label:"調べる",action:"調べる",kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",source:"ENGINE"},{state:s,locale:"ja"});
 const p=suggestionPresentation(s,row);assert.equal(p.meta,"知覚 / 観察 · 低リスク");assert.equal(p.approach,"堅実");assert.equal(hasLocaleLeak(p.meta,"ja"),false)
});

test("reported Traditional Chinese tokens are rejected in ja",()=>{
 for(const text of ["狀態","判斷","感知 / 觀察","低風險","穩健","應變","有風險","敏捷 / 體能","荷降し場"])assert.equal(hasLocaleLeak(text,"ja"),true,text)
});

test("creator review and debug export have locale-safe visible feedback",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/イベントの発生機会にのみ影響し、物語を固定しません/);
 assert.match(app,/ダウンロードを要求しました/);
 assert.match(app,/DEBUG_EXPORT_REQUESTED/);
 assert.match(app,/PLAYER_ACTION_STALE_CONTINUATION_DISCARDED/);
 assert.match(app,/foregroundAiLease\+=1/);
 assert.match(app,/safeVisibleText\(playerVisibleLocationName\(gameState\),"location"\)/);
 assert.match(app,/UI_TRANSLATION_BACKOFF/);
 assert.match(app,/locale-runtime\.js\?v=60010/);
 assert.match(app,/contextual-actions\.js\?v=60009/)
});
