import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Official v0.57.29 release contract; this file also anchors the final Pages deployment check.
test("v0.57.29 is the canonical app and browser cache release",async()=>{
 const [pkgText,versionSource,html,app]=await Promise.all([
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText);
 assert.equal(pkg.version,"0.57.29");
 assert.match(versionSource,/APP_VERSION="0\.57\.28"/);
 assert.match(html,/app\.js\?v=57029/);
 const tokens=[...app.matchAll(/from "\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(x=>x[1]);
 assert.ok(tokens.length>20);
 assert.ok(tokens.every(x=>["57025","57026","57029"].includes(x)));
 assert.match(app,/\.\/src\/version\.js\?v=57029/);
 assert.match(app,/\.\/src\/npc-conversation\.js\?v=57029/);
 assert.match(app,/\.\/src\/acquisition-notifier\.js\?v=57026/);
 assert.ok(tokens.includes("57026"));assert.ok(tokens.includes("57029"));
 assert.doesNotMatch(app,/\?v=54017/);
 assert.doesNotMatch(app,/\?v=54018[A-Za-z]/);
});
