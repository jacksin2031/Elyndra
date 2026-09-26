import test from "node:test";
import assert from "node:assert/strict";
import {visibleTranslationPayload,missingVisibleTranslations} from "../src/locale-runtime.js";

function stateWithNotes(notes){return {notes,world:{language:"zh-Hant",registry:{npcs:[],locations:[]}},quests:{main:{objectives:[]}},suggestions:[],inventory:[]}}

test("v0.59.2 non-default locale translation accepts the canonical notes array",()=>{
 const state=stateWithNotes([]);
 assert.equal(typeof state.notes.entries,"function");
 assert.doesNotThrow(()=>visibleTranslationPayload(state,"ja"));
 assert.doesNotThrow(()=>missingVisibleTranslations(state,"ja"));
});

test("v0.59.2 locale translation also tolerates the legacy notes.entries array shape",()=>{
 const state=stateWithNotes({entries:[{title:"旅の記録",text:"記録"}]});
 const payload=visibleTranslationPayload(state,"en");
 assert.ok(payload.strings.includes("旅の記録"));
});
