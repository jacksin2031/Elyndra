import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";

test("player-visible location fallbacks follow runtime locale",async()=>{
 globalThis.ELYNDRA_LOCALE="ja";
 const mod=await import(pathToFileURL(new URL("../src/player-location-visibility.js",import.meta.url).pathname).href+"?t="+Date.now());
 const empty={world:{registry:{locations:[]},state:{}},player:{}};
 assert.equal(mod.playerVisibleLocationName(empty),"未知の場所");
 const state={world:{registry:{locations:[{id:"L1",name:"サルナ湾桟橋",known:false,description:"古い桟橋の先に橋が延びている"}]},state:{location:"L1"}},player:{location:"L1"}};
 assert.equal(mod.playerVisibleLocationName(state),"目の前の橋のたもと");
 globalThis.ELYNDRA_LOCALE="zh-Hant";
});

test("foreground AI deadlines are below gameplay watchdog",async()=>{
 const source=await readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8");
 assert.match(source,/PLAYER_TASK_TIMEOUT_CEILINGS=\{action:7000,scene:8000,turn_state_fast:7000,turn_state_deep:9000\}/);
 assert.match(source,/ceiling\?Math\.min\(requestedTimeout,ceiling\):requestedTimeout/);
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const match=app.match(/PLAYER_ACTION_HARD_DEADLINE_MS=(\d+)/);
 assert.ok(match);
 assert.equal(Number(match[1]),12000);
 assert.ok(9000<Number(match[1]));
});
