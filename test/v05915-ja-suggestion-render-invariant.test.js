import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.59.15 renderer cannot silently hide an otherwise valid action set",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/const source=\(gameState\?\.suggestionIntents\?\.length\?gameState\.suggestionIntents:\(gameState\?\.suggestions\?\.length\?gameState\.suggestions:fallbackActionButtons\(\)\)\),set=buildContextualActionSet/);
 assert.match(app,/set\.primary\.map\(card\)\.join\(""\)/);
 assert.match(app,/gameState\.suggestionIntents=set\.all/);
});
