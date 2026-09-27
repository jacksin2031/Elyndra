import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Official v0.60.8 release contract; this file also anchors the final Pages deployment check.
test("v0.60.8 is the canonical app and browser cache release",async()=>{
 const [pkgText,versionSource,html,app]=await Promise.all([
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText);
 assert.equal(pkg.version,"0.60.8");
 assert.match(versionSource,/APP_VERSION="0\.60\.8"/);
 assert.match(html,/app\.js\?v=60008/);
 assert.match(html,/styles\.css\?v=59014/);
 assert.match(html,/creator\.css\?v=59010/);
 assert.match(html,/world-surfaces\.css\?v=59011/);
 assert.match(html,/"\.\/src\/origin-runtime\.js\?v=57025":"\.\/src\/origin-runtime\.js\?v=59014"/);
 const tokens=[...app.matchAll(/from "\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(x=>x[1]);
 assert.ok(tokens.length>20);
 assert.ok(tokens.every(x=>["57025","57026","57028","57029","58000","59000","59001","59002","59003","59004","59005","59007","59008","59010","59012","59013","59014","59015","60000","60001","60002","60003","60004","60005","60006","60007","60008"].includes(x)));
 assert.match(app,/\.\/src\/version\.js\?v=60008/);
 assert.match(app,/\.\/src\/runtime-self-repair\.js\?v=60008/);
 assert.match(app,/\.\/src\/origin-runtime\.js\?v=57025/);
 assert.match(app,/\.\/src\/player-entity-visibility\.js\?v=58000/);
 assert.match(app,/\.\/src\/acquisition-notifier\.js\?v=58000/);
 assert.match(app,/\.\/src\/npc-conversation\.js\?v=60005/);
 assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59010"));assert.ok(tokens.includes("60004"));assert.ok(tokens.includes("60005"));assert.ok(tokens.includes("60006"));assert.ok(tokens.includes("60008"));
 assert.doesNotMatch(app,/\?v=54017/);
 assert.doesNotMatch(app,/\?v=54018[A-Za-z]/);
});