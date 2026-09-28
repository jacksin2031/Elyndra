import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Official v0.60.29 release contract; this file also anchors the final Pages deployment check.
test("v0.60.29 is the canonical app and browser cache release",async()=>{
 const [pkgText,versionSource,html,app,client25,client24]=await Promise.all([
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06025-ai-client-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06024-ai-client-hotfix.js",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText);
 assert.equal(pkg.version,"0.60.29");
 assert.match(versionSource,/APP_VERSION="0\.60\.29"/);
 assert.match(html,/app\.js\?v=60029/);
 assert.match(html,/v06027-runtime-ui-hotfix\.js\?v=60027/);
 assert.match(html,/"\.\/src\/version\.js\?v=60010":"\.\/src\/version\.js\?v=60029"/);
 assert.match(html,/"\.\/src\/game-engine\.js\?v=60006":"\.\/src\/v06025-game-engine-hotfix\.js\?v=60025"/);
 assert.match(html,/"\.\/src\/ai-client\.js\?v=60010":"\.\/src\/v06025-ai-client-hotfix\.js\?v=60026"/);
 assert.match(html,/"\.\/src\/ai-settings\.js\?v=60010":"\.\/src\/v06028-ai-settings-hotfix\.js\?v=60028"/);
 assert.match(html,/"\.\/src\/turn-compiler\.js\?v=57029":"\.\/src\/v06028-turn-compiler-hotfix\.js\?v=60028"/);
 assert.match(client25,/v06024-ai-client-hotfix\.js\?v=60026/);
 assert.match(client24,/v06019-ai-client-hotfix\.js\?v=60026/);
 assert.match(html,/"\.\/src\/contextual-actions\.js\?v=60010":"\.\/src\/v06021-contextual-actions-hotfix\.js\?v=60021"/);
 assert.match(html,/"\.\/src\/locale-runtime\.js\?v=60010":"\.\/src\/v06011-locale-runtime-hotfix\.js\?v=60013"/);
 assert.match(html,/"\.\/src\/lazy-generation\.js\?v=59014":"\.\/src\/v06011-lazy-generation-hotfix\.js\?v=60013"/);
 assert.match(html,/"\.\/src\/weather-engine\.js\?v=57025":"\.\/src\/v06024-weather-engine-hotfix\.js\?v=60024"/);
 assert.match(html,/"\.\/src\/talent-engine\.js\?v=60004":"\.\/src\/v06024-talent-engine-hotfix\.js\?v=60024"/);
 assert.match(html,/"\.\/src\/world-registry\.js\?v=57025":"\.\/src\/v06023-world-registry-hotfix\.js\?v=60023"/);
 assert.match(html,/"\.\/src\/v06015-ja-visible-text\.js\?v=60018":"\.\/src\/v06024-ja-visible-text-hotfix\.js\?v=60024"/);
 assert.match(html,/styles\.css\?v=59014/);assert.match(html,/creator\.css\?v=59010/);assert.match(html,/world-surfaces\.css\?v=59011/);assert.match(html,/"\.\/src\/origin-runtime\.js\?v=57025":"\.\/src\/origin-runtime\.js\?v=59014"/);
 const tokens=[...app.matchAll(/from "\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(x=>x[1]);
 assert.ok(tokens.length>20);
 assert.ok(tokens.every(x=>["57025","57026","57028","57029","58000","59000","59001","59002","59003","59004","59005","59007","59008","59010","59012","59013","59014","59015","60000","60001","60002","60003","60004","60005","60006","60007","60008","60009","60010"].includes(x)));
 assert.match(app,/\.\/src\/version\.js\?v=60010/);assert.match(app,/\.\/src\/runtime-self-repair\.js\?v=60009/);assert.match(app,/\.\/src\/locale-runtime\.js\?v=60010/);assert.match(app,/\.\/src\/contextual-actions\.js\?v=60010/);assert.match(app,/\.\/src\/origin-runtime\.js\?v=57025/);assert.match(app,/\.\/src\/player-entity-visibility\.js\?v=58000/);assert.match(app,/\.\/src\/acquisition-notifier\.js\?v=58000/);assert.match(app,/\.\/src\/npc-conversation\.js\?v=60005/);assert.match(app,/\.\/src\/world-creation\.js\?v=60010/);
 assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("60004"));assert.ok(tokens.includes("60005"));assert.ok(tokens.includes("60006"));assert.ok(tokens.includes("60009"));
 assert.doesNotMatch(app,/\?v=54017/);assert.doesNotMatch(app,/\?v=54018[A-Za-z]/);
});