import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.49.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=49000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.47.0 adds research-triggered immutable History Lazy Deepen",async()=>{
 const [html,app,client,historyDepth,historyFuture,docs,heritage,worldEngine,api]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/history-depth.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-future.js",import.meta.url),"utf8"),readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-heritage.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../api/history-deepen.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=49000/);assert.match(app,/\.\/src\/history-depth\.js\?v=47000/);
 assert.match(app,/runBackgroundHistoryDeepening/);assert.match(app,/preemptBackgroundHistory/);
 assert.match(client,/export async function generateHistoryDeepening/);assert.match(client,/HISTORY_DEEPENING:"history_deepening"/);
 assert.match(historyDepth,/HISTORY_DEPTH_LEVELS/);assert.match(historyDepth,/validateHistoryDeepeningCandidate/);assert.match(historyDepth,/commitHistoryDeepening/);
 assert.match(historyFuture,/signalHistoryResearch/);assert.match(docs,/registerHistoryDeepeningDocuments/);assert.match(heritage,/registerHistoryRelicSeeds/);
 assert.match(worldEngine,/History Skeleton/);assert.match(api,/History Deepening Architect/)
});


test("v0.49.0 adds build identity, diegetic journal, and journey closure without exposing hidden dashboards",async()=>{
 const [app,talent,journey,progression]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/talent-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/journey-closure.js",import.meta.url),"utf8"),
  readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/talent-engine\.js\?v=49000/);assert.match(app,/\.\/src\/journey-closure\.js\?v=49000/);
 assert.match(talent,/buildIdentitySnapshot/);assert.match(talent,/OTHER_PATH_LOCKED/);assert.match(talent,/specializedSkillGain/);
 assert.match(journey,/maybeJourneyCheckpoint/);assert.match(journey,/recentJourneyCheckpoints/);
 assert.match(progression,/未解之謎/);assert.match(progression,/傳聞與徵兆/);
 assert.match(app,/旅人狀態/);assert.match(app,/旅程回顧/);
 const runtime=app.slice(app.indexOf('$("#runtimeBtn")?.addEventListener'),app.indexOf('$("#impactBtn")?.addEventListener'));
 assert.doesNotMatch(runtime,/WORLD QUALITY|Structural Integrity|AI stages|Runtime Health/)
});
