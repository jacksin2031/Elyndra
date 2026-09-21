import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world creation asks for notification permission on the user gesture and notifies after final save",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf('$("#generateBtn").onclick');
 const end=app.indexOf('$("#freeActionForm").onsubmit',start);
 const block=app.slice(start,end);
 assert.match(block,/requestWorldReadyNotificationPermission\(\)/);
 assert.match(block,/await persist\(\);worldProgress\(98/);
 assert.match(block,/worldProgress\(100,"世界生成完成"/);
 assert.match(block,/notifyWorldReady\(\)/);
 assert.ok(block.indexOf("await persist()")<block.indexOf("notifyWorldReady()"))
});

test("world generation completion always has an in-page notification and only uses system notification when permission is granted",async()=>{
 const [app,css]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../styles.css",import.meta.url),"utf8")
 ]);
 assert.match(app,/function notifyWorldReady\(\)/);
 assert.match(app,/id="worldReadyNotice"/);
 assert.match(app,/你的異世界已完成編譯，可以開始冒險/);
 assert.match(app,/Notification\.permission==="granted"/);
 assert.match(app,/new Notification\("Elyndra · 世界生成完成"/);
 assert.match(app,/WORLD_CREATION_NOTIFICATION/);
 assert.match(css,/\.world-ready-notice/);
 assert.match(css,/\.world-ready-notice\.show/)
});

test("world-ready notification never leaks the hidden generated world name",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("function notifyWorldReady");
 const end=app.indexOf("function creatorField",start);
 const block=app.slice(start,end);
 assert.doesNotMatch(block,/gameState\.world\.name|worldName/)
});
