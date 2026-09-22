import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.47.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=47000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.47.0 adds History Lazy Deepen without auto-revealing detail",async()=>{
 const [html,app,client,depth,historyFuture,documents,heritage,causal]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/history-depth.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-future.js",import.meta.url),"utf8"),readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-heritage.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=47000/);assert.match(app,/\.\/src\/history-depth\.js\?v=47000/);
 assert.match(client,/export async function generateHistoryDeepening/);assert.match(client,/directorHistoryDepth/);
 assert.match(depth,/HISTORY_DEPTH_LEVELS/);assert.match(depth,/commitHistoryDeepening/);assert.match(depth,/HISTORY_SKELETON_MUTATION_FORBIDDEN/);
 assert.match(historyFuture,/signalHistoryResearch/);assert.match(documents,/registerHistoryDeepeningDocuments/);assert.match(heritage,/registerHistoryRelicSeeds/);
 assert.match(causal,/\.\/history-depth\.js\?v=47000/)
});
