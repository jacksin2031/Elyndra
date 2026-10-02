import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("creator exposes player naming and gameplay uses dynamic action container",async()=>{
 const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/id="playerName"/);
 assert.match(html,/id="choices"/);
 assert.match(html,/id="npcDock"/);
 assert.match(html,/id="freeActionForm" class="free-action hidden"/);
 assert.doesNotMatch(html,/data-action="forest"|data-action="road"|data-action="coin"|data-action="lia"|莉亞/)
});

test("browser runtime groups primary risky and free contextual actions",async()=>{
 const [app,css]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../styles.css",import.meta.url),"utf8")
 ]);
 assert.match(app,/主要建議/);
 assert.match(app,/高風險行動/);
 assert.match(app,/自由行動/);
 assert.match(app,/id="otherActionBtn"/);
 assert.match(app,/data-suggestion-index/);
 assert.match(app,/runAction\("free",localizedActionText\(x\.action,x\.kind\),\{suggestion:x\}\)/);
 assert.match(app,/suggestionPresentation\(gameState,x\)/);
 assert.match(css,/\.progression-action/);
 assert.match(css,/\.danger-action/);
 assert.match(css,/\.action-meta/);
 assert.match(app,/openNpcConversation/);
 assert.match(app,/playerVisibleEvents/);
 assert.doesNotMatch(app,/action==="forest"|霧狼|莉亞|第三軍團|查明陌生銅幣/)
});

test("runtime source has no legacy world canon hard-coded into engine paths",async()=>{
 const files=["../src/game-engine.js","../src/world-simulation.js","../src/world-registry.js","../src/adventure-engine.js","../api/narrate.js","../api/turn.js"];
 const joined=(await Promise.all(files.map(x=>readFile(new URL(x,import.meta.url),"utf8")))).join("\n");
 assert.doesNotMatch(joined,/霧門城|北境道路|第三軍團|霧狼|NPC-lia|key:"lia"|action==="forest"|action==="road"|action==="coin"|action==="lia"/)
});
