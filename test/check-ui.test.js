import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes character abilities and detailed roll modifiers",async()=>{
 const [html,app]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/id="characterBtn">角色能力</);
 assert.match(app,/CHARACTER CHECK PROFILE/);
 for(const label of ["能力","技能","裝備","夥伴","關係","情境"])assert.ok(app.includes(label));
 assert.match(app,/roll\.modifiers/);
 assert.match(app,/技能提升至/);
});

test("inventory allows at most two functional check-bonus tools to be equipped",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/data-equip-id/);
 assert.match(app,/最多同時裝備 2 件/);
 assert.match(app,/gameState\.inventory\.filter\(x=>x\.equipped===true\)\.length>=2/);
});
