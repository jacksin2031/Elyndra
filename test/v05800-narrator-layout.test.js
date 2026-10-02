import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.58.0 desktop narration stays in one scene-copy flow",async()=>{
 const [css,html,app,client]=await Promise.all([
  readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(css,/v0\.58\.0 narrator layout stabilization/);
 assert.match(css,/#game \.scene-copy\{[\s\S]*?display:flex!important;[\s\S]*?flex-direction:column!important;/);
 assert.match(css,/#game \.scene-copy #narrative\{[\s\S]*?position:static!important;[\s\S]*?margin:0!important;/);
 assert.match(html,/styles\.css\?v=61003/);
 assert.match(app,/\.\/src\/ai-client\.js\?v=60010/);
 assert.match(client,/\.\/ai-runtime-contracts\.js\?v=59000/);
});
