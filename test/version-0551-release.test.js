import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Official v0.59.1 release contract; this file also anchors the final Pages deployment check.
test("v0.59.1 is the canonical app and browser cache release",async()=>{
 const [pkgText,versionSource,html,app]=await Promise.all([
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText);
 assert.equal(pkg.version,"0.59.1");
 assert.match(versionSource,/APP_VERSION="0\.59\.1"/);
 assert.match(html,/app\.js\?v=59001/);
 assert.match(html,/styles\.css\?v=59000/);
 const tokens=[...app.matchAll(/from "\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(x=>x[1]);
 assert.ok(tokens.length>20);
 assert.ok(tokens.every(x=>["57025","57026","57028","57029","58000","59000","59001"].includes(x)));
 assert.match(app,/\.\/src\/version\.js\?v=59001/);
 assert.match(app,/\.\/src\/player-entity-visibility\.js\?v=58000/);
 assert.match(app,/\.\/src\/acquisition-notifier\.js\?v=58000/);
 assert.match(app,/\.\/src\/npc-conversation\.js\?v=57029/);
 assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59001"));
 assert.doesNotMatch(app,/\?v=54017/);
 assert.doesNotMatch(app,/\?v=54018[A-Za-z]/);
});
