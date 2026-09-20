import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("creator exposes player naming and gameplay uses dynamic AI action container",async()=>{
 const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/id="playerName"/);
 assert.match(html,/id="choices"/);
 assert.doesNotMatch(html,/data-action="forest"|data-action="road"|data-action="coin"|data-action="lia"/);
});

test("browser runtime renders state suggestions instead of fixed action bindings",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/gameState\?\.suggestions/);
 assert.match(app,/runAction\("free",b\.textContent\)/);
 assert.doesNotMatch(app,/\$\$\("\[data-action\]"\)/);
});
