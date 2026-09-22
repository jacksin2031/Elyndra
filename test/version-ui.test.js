import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.46.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=46000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.46.0 moves Quality Critic to unseen-only background work",async()=>{
 const [html,app,client,quality,api]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=46000/);assert.match(app,/\.\/src\/ai-client\.js\?v=46000/);assert.match(app,/\.\/src\/world-quality\.js\?v=46000/);
 assert.match(app,/runBackgroundWorldQualityCritic/);assert.match(app,/preemptBackgroundWorldQuality/);
 assert.match(client,/export async function runWorldQualityCritic/);assert.match(client,/BACKGROUND_AI_CRITIC_PENDING/);
 assert.match(quality,/applyUnseenWorldRepair/);assert.match(quality,/backgroundQualityNeed/);
 assert.match(api,/BACKGROUND_AI_CRITIC_PENDING/);assert.doesNotMatch(api,/World Repair Architect/)
});
