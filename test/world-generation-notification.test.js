import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world-ready notification fires when World Contract is ready before crossing",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf('$("#generateBtn").onclick');
 const end=app.indexOf('$("#freeActionForm").onsubmit',start);
 const block=app.slice(start,end);
 const ready=block.indexOf('worldProgress(93,"世界生成完成"');
 const notify=block.indexOf("notifyWorldReady()",ready);
 const confirm=block.indexOf("await confirmWorldContract(contract)",ready);
 const persist=block.indexOf("await persist()",confirm);
 assert.ok(ready>=0);
 assert.ok(notify>ready);
 assert.ok(confirm>notify);
 assert.ok(persist>confirm);
 assert.equal(block.indexOf("notifyWorldReady()",confirm),-1)
});

test("notification copy tells player to review contract before crossing",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/你的異世界已完成編譯，請先確認世界契約，再決定是否穿越/);
 assert.match(app,/phase:"CONTRACT_READY"/);
 assert.match(app,/Notification\.permission==="granted"/);
 assert.match(app,/new Notification\("Elyndra · 世界生成完成"/)
});

test("world-ready notification never leaks the hidden generated world name",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("function notifyWorldReady");
 const end=app.indexOf("function creatorField",start);
 const block=app.slice(start,end);
 assert.doesNotMatch(block,/gameState\.world\.name|worldName/)
});
